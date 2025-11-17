import hashlib
import json
import uuid
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean, Float, Text, event

from .database import Base, GUID

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, default="analyst")
    created_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String, unique=True, index=True, default=generate_uuid)
    siem_alert_id = Column(String, index=True)
    severity = Column(String)
    description = Column(String)
    source_ip = Column(String)
    destination_ip = Column(String)
    received_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="detected")
    raw_alert = Column(JSON)
    actions_taken = Column(JSON, default=[])
    is_processed = Column(Boolean, default=False)
    
    # AI analysis fields
    ai_confidence = Column(Float, default=0.0)
    ai_reasoning = Column(Text)
    ai_analysis = Column(JSON, default={})
    requires_human_review = Column(Boolean, default=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(String, unique=True, index=True, default=generate_uuid, nullable=False)
    actor = Column(String, nullable=False, default="system")
    action = Column(String, nullable=False)
    target = Column(String, nullable=True)
    resource_type = Column(String, nullable=False, default="system")
    status = Column(String, nullable=False, default="info")
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    integrity_hash = Column(String, nullable=False)
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
def _set_core_integrity(mapper, connection, target: AuditLog):
    payload = target._payload_for_hash()
    target.integrity_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()


@event.listens_for(AuditLog, "before_update")
def _prevent_core_mutation(mapper, connection, target):
    raise ValueError("Audit logs are immutable and cannot be modified")