import asyncio
import logging
from core.rabbitmq_utils import start_consumer_thread
from sqlalchemy import insert
from core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def _persist_event(event_type: str, payload: dict):
    try:
        from core.models import AuditLog as CoreAuditLog

        actor = payload.get("actor") or payload.get("username") or "system"
        target = (
            payload.get("incident_id")
            or payload.get("user_id")
            or payload.get("target")
        )
        details = payload or {}
        resource_type = event_type.split(".", 1)[0]

        async with AsyncSessionLocal() as session:
            stmt = insert(CoreAuditLog).values(
                actor=actor,
                action=event_type,
                target=target,
                resource_type=resource_type,
                status=details.get("status", "info"),
                details=details,
            )
            await session.execute(stmt)
            await session.commit()
    except Exception as e:
        logger.error(f"Failed to persist audit event {event_type}: {e}")


def _handle_event(routing_key: str, payload: dict):
    logger.info(f"Audit consumer captured %s", routing_key)
    asyncio.run(_persist_event(routing_key, payload))


def start():
    start_consumer_thread(
        queue_name="audit_service",
        binding_keys=["incident.*", "response.*", "security.*", "user.*"],
        handler=_handle_event,
    )
