# backend/gateway/event_consumer.py
"""
RabbitMQ -> ASGI event bridge.

Usage:
    - Called from FastAPI startup (async) as:
        await start(callback=your_async_callback, binding_keys=[...], rabbitmq_host="rabbitmq")
    - The callback signature must be: async def callback(routing_key: str, payload: dict) -> None
"""
import asyncio
import logging
from typing import Awaitable, Callable, Optional, Tuple

from shared_lib.events.rabbitmq import start_consumer_thread

logger = logging.getLogger(__name__)

EventCallback = Callable[[str, dict], Awaitable[None]]

# module state
_asgi_loop: Optional[asyncio.AbstractEventLoop] = None
_event_queue: Optional[asyncio.Queue] = None
_queue_consumer_task: Optional[asyncio.Task] = None
_consumer_thread = None
_started = False


async def _queue_consumer(callback: EventCallback):
    """Background task running on the ASGI loop. Reads from queue and forwards to callback."""
    assert _event_queue is not None, "event queue not initialized"
    logger.info("[gateway.event_bridge] Queue consumer started")
    while True:
        try:
            routing_key, payload = await _event_queue.get()
            try:
                await callback(routing_key, payload or {})
            except Exception:
                logger.exception("[gateway.event_bridge] Error in callback for %s", routing_key)
            finally:
                # mark task done (not required for simple queue but kept for completeness)
                try:
                    _event_queue.task_done()
                except Exception:
                    pass
        except asyncio.CancelledError:
            logger.info("[gateway.event_bridge] Queue consumer cancelled")
            break
        except Exception:
            logger.exception("[gateway.event_bridge] Unexpected error in queue consumer")
            await asyncio.sleep(1)


def _thread_handler(routing_key: str, payload: dict) -> None:
    """
    Function executed in the RabbitMQ consumer thread for each message.
    Safely schedule a coroutine to put the event into the ASGI loop queue.
    """
    global _asgi_loop, _event_queue
    if _asgi_loop is None or _event_queue is None:
        logger.warning("[gateway.event_bridge] ASGI loop / queue not ready, dropping event %s", routing_key)
        return

    try:
        # schedule queue.put on the ASGI loop
        asyncio.run_coroutine_threadsafe(_event_queue.put((routing_key, payload or {})), _asgi_loop)
    except Exception:
        logger.exception("[gateway.event_bridge] Failed to schedule event into ASGI queue for %s", routing_key)


async def start(callback: EventCallback,
                binding_keys: Optional[list[str]] = None,
                rabbitmq_host: str = "rabbitmq",
                queue_maxsize: int = 1000):
    """
    Initialize the in-ASGI queue and start:
      - an ASGI background task that consumes the queue and calls `callback`
      - a RabbitMQ consumer thread that calls the thread handler for incoming messages

    Call this from FastAPI startup (async).
    """
    global _asgi_loop, _event_queue, _queue_consumer_task, _consumer_thread, _started

    if _started:
        logger.info("[gateway.event_bridge] Already started")
        return

    if callback is None:
        raise ValueError("callback is required")

    # capture ASGI event loop and create queue/task
    _asgi_loop = asyncio.get_running_loop()
    _event_queue = asyncio.Queue(maxsize=queue_maxsize)

    # start queue consumer task on the ASGI loop
    _queue_consumer_task = _asgi_loop.create_task(_queue_consumer(callback))

    # default binding keys
    keys = binding_keys or [
        "incident.*",
        "response.*",
        "security.*",
        "user.*",
    ]

    # start the rabbitmq consumer thread (non-blocking)
    try:
        _consumer_thread = start_consumer_thread(
            queue_name="gateway_bridge",
            binding_keys=keys,
            handler=_thread_handler,
            rabbitmq_host=rabbitmq_host,
        )
        logger.info("[gateway.event_bridge] RabbitMQ consumer thread started (thread=%s)", getattr(_consumer_thread, "name", str(_consumer_thread)))
    except Exception:
        logger.exception("[gateway.event_bridge] Failed to start RabbitMQ consumer thread")

    _started = True


async def stop():
    """Stop the bridge: cancel the queue consumer and attempt to stop consumer thread if possible."""
    global _queue_consumer_task, _event_queue, _consumer_thread, _started
    _started = False

    if _queue_consumer_task:
        _queue_consumer_task.cancel()
        try:
            await _queue_consumer_task
        except Exception:
            pass
        _queue_consumer_task = None

    _event_queue = None
    # Note: stopping the background consumer thread depends on shared_lib implementation.
    # If start_consumer_thread returns a handle with stop/close, call it here.
    logger.info("[gateway.event_bridge] Stopped")
