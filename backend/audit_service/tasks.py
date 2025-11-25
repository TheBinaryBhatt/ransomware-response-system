import asyncio
import logging
from celery import shared_task
from core.database import AsyncSessionLocal
from sqlalchemy import insert
from .models import AuditLog

logger = logging.getLogger(__name__)


async def _log_action_async(action: str, target: str, status: str, details: dict | None, actor: str, resource_type: str = "system"):
    async with AsyncSessionLocal() as session:
        stmt = insert(AuditLog).values(
            actor=actor or "system",
            action=action,
            target=target,
            resource_type=resource_type,
            status=status,
            details=details or {},
        )
        await session.execute(stmt)
        await session.commit()


@shared_task
def log_action(action: str, target: str = None, status: str = "info", details: dict = None, actor: str = "system", resource_type: str = "system"):
    """Log an action to the audit system asynchronously via Celery."""
    try:
        # Celery worker is sync; it's ok to run an asyncio loop here.
        asyncio.run(_log_action_async(action, target, status, details, actor, resource_type))
        return {"status": "success"}
    except Exception as exc:
        logger.exception("log_action task failed: %s", exc)
        return {"status": "error", "error": str(exc)}
