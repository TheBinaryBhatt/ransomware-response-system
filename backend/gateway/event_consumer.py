import asyncio
import logging
from typing import Awaitable, Callable

from core.rabbitmq_utils import start_consumer_thread

logger = logging.getLogger(__name__)

EventCallback = Callable[[str, dict], Awaitable[None]]


def start(callback: EventCallback, binding_keys: list[str] | None = None) -> None:
    """
    Start a background RabbitMQ consumer that forwards domain events
    to the provided async callback (typically used to fan-out via WebSockets).
    """

    if callback is None:
        raise ValueError("callback is required")

    keys = binding_keys or [
        "incident.*",
        "response.*",
        "security.*",
        "user.*",
    ]

    def _handler(routing_key: str, payload: dict) -> None:
        logger.info("Gateway event bridge received %s", routing_key)
        try:
            asyncio.run(callback(routing_key, payload or {}))
        except RuntimeError as exc:
            # If the default event loop is already running (should not happen because
            # consumer thread is non-async), log and drop to avoid recursive loops.
            logger.error("Failed to forward event %s: %s", routing_key, exc)

    start_consumer_thread(
        queue_name="gateway_bridge",
        binding_keys=keys,
        handler=_handler,
    )

