# backend/core/rabbitmq_utils.py
import logging
from typing import Optional, Callable, Dict, Any, Iterable
import threading
import asyncio

from shared_lib.events.rabbitmq import (
    publish_event as _publish_event,
    start_consumer,
    start_consumer_thread as _start_consumer_thread,
)

logger = logging.getLogger(__name__)


async def _publish_wrapper(event_type: str, event_body: dict, rabbitmq_host: Optional[str] = None):
    await _publish_event(event_type, event_body, rabbitmq_host=rabbitmq_host)


def publish_event(event_type: str, event_body: dict, rabbitmq_host: Optional[str] = None):
    """
    Wrapper for backward compatibility.
    event_type -> routing_key
    event_body -> JSON body
    Works in both sync and async contexts.
    """
    logger.info("[RabbitMQ] publish_event -> %s", event_type)
    try:
        loop = asyncio.get_running_loop()
        return asyncio.create_task(_publish_wrapper(event_type, event_body, rabbitmq_host))
    except RuntimeError:
        return asyncio.run(_publish_wrapper(event_type, event_body, rabbitmq_host))


def start_consumer_thread(queue_name, binding_keys, handler, rabbitmq_host: Optional[str] = None):
    """
    Wrapper for backward compatibility - creates a thread for sync handlers.
    """
    logger.info("[RabbitMQ] start_consumer_thread -> queue=%s", queue_name)
    
    return _start_consumer_thread(
        queue_name=queue_name, 
        binding_keys=binding_keys, 
        handler=handler, 
        rabbitmq_host=rabbitmq_host or "rabbitmq"
    )


def consume_events(queue_name, binding_keys, handler, rabbitmq_host: Optional[str] = None):
    """
    Compatibility wrapper used by old services.
    """
    return start_consumer_thread(queue_name, binding_keys, handler, rabbitmq_host=rabbitmq_host)