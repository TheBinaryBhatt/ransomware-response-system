import asyncio
from celery import shared_task
from core.database import AsyncSessionLocal
from sqlalchemy import insert
from .models import AuditLog


async def _log_action_async(action: str, target: str, status: str, details: dict | None, actor: str):
    async with AsyncSessionLocal() as session:
        stmt = insert(AuditLog).values(
            actor=actor or "system",
            action=action,
            target=target,
            status=status,
            details=details or {},
        )
        await session.execute(stmt)
        await session.commit()


@shared_task
def log_action(action: str, target: str, status: str, details: dict = None, actor: str = "system"):
    """Log an action to the audit system asynchronously via Celery."""
    try:
        asyncio.run(_log_action_async(action, target, status, details, actor))
        return {"status": "success"}
    except Exception as exc:
        return {"status": "error", "error": str(exc)}