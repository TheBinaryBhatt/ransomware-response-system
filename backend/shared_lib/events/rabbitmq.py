# backend/shared_lib/events/rabbitmq.py
"""
Async RabbitMQ helper using aio-pika.
Provides:
 - async init_event_bus(rabbitmq_host)
 - async publish_event(routing_key, body)
 - async start_consumer(queue_name, binding_keys, handler, prefetch=1)
 - graceful shutdown helpers
Designed for FastAPI startup/shutdown and async service tasks.
"""

import asyncio
import json
import logging
import threading
from typing import Callable, Iterable, Awaitable, Any, Optional, Dict

import aio_pika
from aio_pika import Message, ExchangeType, RobustConnection, RobustChannel, IncomingMessage

logger = logging.getLogger("shared_lib.events.rabbitmq")

RABBITMQ_HOST = "rabbitmq"
EXCHANGE_NAME = "ransomware_events"
EXCHANGE_TYPE = ExchangeType.TOPIC

# Global singletons (module-level)
_connection: Optional[RobustConnection] = None
_channel: Optional[RobustChannel] = None
_exchange: Optional[aio_pika.Exchange] = None
_init_lock = asyncio.Lock()


async def _build_url(host: str) -> str:
    return f"amqp://guest:guest@{host}:5672/"


async def init_event_bus(rabbitmq_host: str = RABBITMQ_HOST, reconnect_interval: int = 3):
    """
    Initialize global aio-pika RobustConnection and channel.
    Safe to call multiple times (idempotent).
    """
    global _connection, _channel, _exchange

    async with _init_lock:
        if _connection and not _connection.is_closed:
            return

        url = await _build_url(rabbitmq_host)

        # aio-pika RobustConnection will automatically reconnect on failures
        logger.info("Connecting to RabbitMQ at %s", url)

        # Keep trying until connection is available (useful during compose startup)
        while True:
            try:
                _connection = await aio_pika.connect_robust(url)
                _channel = await _connection.channel()
                # set a reasonable prefetch globally; consumers may override
                await _channel.set_qos(prefetch_count=1)
                _exchange = await _channel.declare_exchange(EXCHANGE_NAME, EXCHANGE_TYPE, durable=True)
                logger.info("Connected to RabbitMQ and declared exchange '%s'", EXCHANGE_NAME)
                break
            except Exception as e:
                logger.warning("RabbitMQ connection failed: %s — retrying in %ss", e, reconnect_interval)
                await asyncio.sleep(reconnect_interval)


async def close_event_bus():
    """Close channel and connection gracefully."""
    global _channel, _connection
    try:
        if _channel and not _channel.is_closed:
            await _channel.close()
        if _connection and not _connection.is_closed:
            await _connection.close()
        logger.info("RabbitMQ connection closed")
    except Exception as e:
        logger.exception("Error while closing RabbitMQ connection: %s", e)
    finally:
        _channel = None
        _connection = None


async def publish_event(routing_key: str, body: dict, rabbitmq_host: str = RABBITMQ_HOST):
    """
    Publish an event to the topic exchange.
    This will init the bus if needed.
    """
    global _channel, _exchange
    if _connection is None or (_connection and _connection.is_closed):
        await init_event_bus(rabbitmq_host)

    assert _exchange is not None, "Exchange not declared"

    # Ensure body is JSON-serializable
    try:
        payload = json.dumps(body).encode("utf-8")
    except Exception:
        # fallback: convert non-serializables to strings
        def _safe(o):
            try:
                json.dumps(o)
                return o
            except Exception:
                return str(o)
        safe_body = {k: _safe(v) for k, v in (body.items() if isinstance(body, dict) else [])}
        payload = json.dumps(safe_body).encode("utf-8")

    message = Message(
        payload,
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )
    await _exchange.publish(message, routing_key=routing_key)
    logger.info("[RabbitMQ] Published %s -> %s", routing_key, body)


async def start_consumer(
    queue_name: str,
    binding_keys: Iterable[str],
    handler: Callable[[str, dict], Awaitable[Any]],
    rabbitmq_host: str = RABBITMQ_HOST,
    prefetch: int = 1,
    durable: bool = True,
    auto_delete: bool = False,
):
    """
    Start a consumer bound to the topic exchange.
    - handler should be an async function: async def handler(routing_key: str, payload: dict) -> None
    This function returns an aio-task (consumer task) that will run until cancelled.
    """
    global _channel, _exchange

    if _connection is None or (_connection and _connection.is_closed):
        await init_event_bus(rabbitmq_host)

    assert _channel is not None and _exchange is not None

    logger.info("Declaring queue %s (durable=%s, auto_delete=%s)", queue_name, durable, auto_delete)
    queue = await _channel.declare_queue(queue_name, durable=durable, auto_delete=auto_delete)

    # bind
    for key in binding_keys:
        await queue.bind(_exchange, routing_key=key)
        logger.info("Bound queue %s -> %s", queue_name, key)

    # override qos for this consumer
    await _channel.set_qos(prefetch_count=prefetch)

    async def _process_message(message: IncomingMessage):
        async with message.process(requeue=False):
            try:
                payload = json.loads(message.body.decode())
            except Exception as e:
                logger.exception("Failed to decode message body: %s", e)
                # ack to drop malformed payloads
                return

            routing_key = message.routing_key or ""
            try:
                # allow handler to be sync or async
                result = handler(routing_key, payload)
                if asyncio.iscoroutine(result):
                    await result
                logger.debug("Handler finished for %s", routing_key)
            except Exception as e:
                logger.exception("Handler raised exception for %s: %s", routing_key, e)
                # By default we ack to avoid poison queue looping; adjust if needed.
                # To requeue, raise and remove `requeue=False` above.
                return

    # start consumer and return the consumer tag
    consumer_tag = await queue.consume(_process_message)
    logger.info("Started consumer %s on queue %s (tags=%s)", consumer_tag, queue_name, binding_keys)
    return consumer_tag


def start_consumer_thread(
    queue_name: str,
    binding_keys: Iterable[str],
    handler: Callable[[str, Dict[str, Any]], None],
    rabbitmq_host: str = "rabbitmq",
    prefetch: int = 1,
    durable: bool = True,
    auto_delete: bool = False,
) -> threading.Thread:
    """
    Start a RabbitMQ consumer inside a thread, but DO NOT create a new event loop.
    Instead, schedule the consumer on the main FastAPI event loop.
    This avoids the 'Future attached to a different loop' RuntimeError.
    """

    # Get the already running main event loop used by FastAPI/Uvicorn.
    try:
        main_loop = asyncio.get_running_loop()
    except RuntimeError:
        # If somehow no loop is running (rare), fall back safely.
        main_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(main_loop)

    async def async_handler(routing_key: str, payload: Dict[str, Any]):
        try:
            handler(routing_key, payload)
        except Exception:
            logger.exception("Handler raised in consumer thread")

    # Start the consumer INSIDE the main loop (correct loop)
    async def schedule_consumer():
        await start_consumer(
            queue_name=queue_name,
            binding_keys=binding_keys,
            handler=async_handler,
            rabbitmq_host=rabbitmq_host,
            prefetch=prefetch,
            durable=durable,
            auto_delete=auto_delete,
        )

    # Thread only triggers the scheduling, does NOT run any loop.
    def runner():
        asyncio.run_coroutine_threadsafe(schedule_consumer(), main_loop)

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    return thread



def run_background_consumer(loop: asyncio.AbstractEventLoop, queue_name: str, binding_keys, handler, rabbitmq_host: str = RABBITMQ_HOST):
    """
    Compatibility helper: run an async consumer from a thread or sync environment.
    Example: call in FastAPI startup using asyncio.create_task(...) — or use this helper if you must.
    """
    return loop.create_task(start_consumer(queue_name, binding_keys, handler, rabbitmq_host))


# --- FastAPI-friendly lifespan helpers -------------------------------------
# Usage in FastAPI:
#   from shared_lib.events.rabbitmq import init_event_bus, close_event_bus
#   @app.on_event("startup"): await init_event_bus()
#   @app.on_event("shutdown"): await close_event_bus()
#
# or use lifespan context manager and await these.
# -------------------------------------------------------------------------
