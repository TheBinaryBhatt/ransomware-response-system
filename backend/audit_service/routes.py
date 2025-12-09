from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from pydantic import BaseModel, Field

from core.database import get_db
from .models import AuditLog

logger = logging.getLogger(__name__)
router = APIRouter()


class AuditLogCreate(BaseModel):
    action: str
    target: Optional[str] = None
    status: str = "info"
    details: Dict[Any, Any] = Field(default_factory=dict)
    actor: str = "system"
    resource_type: str = "system"


class AuditLogResponse(BaseModel):
    id: str  # Changed from int to str to support UUID from database
    log_id: str
    actor: str
    action: str
    target: Optional[str] = None
    status: str
    details: Dict[Any, Any] = Field(default_factory=dict)
    created_at: datetime
    resource_type: str
    integrity_hash: str


@router.get("/api/v1/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(db: AsyncSession = Depends(get_db)):
    """Get all audit logs."""
    try:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
        result = await db.execute(stmt)
        audit_logs = result.scalars().all()

        return [
            AuditLogResponse(
                id=str(log.id),
                log_id=log.log_id,
                actor=log.actor,
                action=log.action,
                target=log.target,
                status=log.status,
                details=log.details or {},
                created_at=log.created_at,
                resource_type=log.resource_type,
                integrity_hash=log.integrity_hash,
            )
            for log in audit_logs
        ]
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/log", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_log(log_data: AuditLogCreate, db: AsyncSession = Depends(get_db)):
    """Create a new audit log."""
    try:
        new_log = AuditLog(
            actor=log_data.actor or "system",
            action=log_data.action,
            target=log_data.target,
            resource_type=log_data.resource_type or "system",
            status=log_data.status,
            details=log_data.details or {},
        )

        db.add(new_log)
        await db.commit()
        await db.refresh(new_log)

        return AuditLogResponse(
            id=str(new_log.id),
            log_id=new_log.log_id,
            actor=new_log.actor,
            action=new_log.action,
            target=new_log.target,
            status=new_log.status,
            details=new_log.details or {},
            created_at=new_log.created_at,
            resource_type=new_log.resource_type,
            integrity_hash=new_log.integrity_hash,
        )
    except Exception as e:
        logger.error(f"Error creating audit log: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(log_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific audit log by ID."""
    try:
        stmt = select(AuditLog).where(AuditLog.id == log_id)
        result = await db.execute(stmt)
        audit_log = result.scalar_one_or_none()

        if not audit_log:
            raise HTTPException(status_code=404, detail="Audit log not found")

        return AuditLogResponse(
            id=str(audit_log.id),
            log_id=audit_log.log_id,
            actor=audit_log.actor,
            action=audit_log.action,
            target=audit_log.target,
            status=audit_log.status,
            details=audit_log.details or {},
            created_at=audit_log.created_at,
            resource_type=audit_log.resource_type,
            integrity_hash=audit_log.integrity_hash,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching audit log {log_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
