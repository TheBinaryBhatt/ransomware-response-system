from celery import shared_task
from core.celery_app import celery_app
from .models import AuditLog
from core.database import get_db
from sqlalchemy.orm import Session

@shared_task
def log_action(action: str, target: str, status: str, details: dict = None):
    """Log an action to the audit system"""
    try:
        db = next(get_db())
        log_entry = AuditLog(
            action=action,
            target=target,
            status=status,
            details=details or {}
        )
        db.add(log_entry)
        db.commit()
        return {"status": "success", "log_id": str(log_entry.id)}
    except Exception as e:
        return {"status": "error", "error": str(e)}