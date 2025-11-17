import hashlib
import json
import uuid
from sqlalchemy import Column, Integer, String, TIMESTAMP, JSON, Boolean, event
from sqlalchemy.sql import func
from core.database import Base


def _generate_log_id() -> str:
    return str(uuid.uuid4())


class AuditLog(Base):
    """Immutable audit trail entry."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    log_id = Column(String(64), unique=True, nullable=False, default=_generate_log_id)
    actor = Column(String(128), nullable=False, default="system")
    action = Column(String(255), nullable=False)
    target = Column(String(255), nullable=True)
    resource_type = Column(String(64), nullable=False, default="system")
    status = Column(String(50), nullable=False, default="info")
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    integrity_hash = Column(String(128), nullable=False)
    immutable = Column(Boolean, nullable=False, default=True)

    def _payload_for_hash(self) -> str:
        payload = {
            "log_id": self.log_id,
            "actor": self.actor,
            "action": self.action,
            "target": self.target,
            "resource_type": self.resource_type,
            "status": self.status,
            "details": self.details or {},
            "created_at": str(self.created_at) if self.created_at else "",
        }
        return json.dumps(payload, sort_keys=True, default=str)


@event.listens_for(AuditLog, "before_insert")
def _set_integrity_hash(mapper, connection, target: AuditLog):
    payload = target._payload_for_hash()
    target.integrity_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()


@event.listens_for(AuditLog, "before_update")
def _prevent_mutation(mapper, connection, target):
    raise ValueError("Audit logs are immutable and cannot be modified")
