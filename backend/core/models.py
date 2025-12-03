from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import synonym
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default='analyst')  # admin, analyst, auditor, viewer
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Incident(Base):
    __tablename__ = "incidents"
    
    incident_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(String(255), nullable=False, unique=True)
    severity = Column(String(50), nullable=False)
    status = Column(String(50), default='new')
    description = Column(Text)
    source_ip = Column(INET)
    destination_ip = Column(INET)
    raw_data = Column(JSONB)
    timestamp = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TriageIncident(Base):
    __tablename__ = "triage_incidents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # incident_id = Column(UUID(as_uuid=True), ForeignKey('incidents.incident_id'))  # Optional FK; commented out for direct id use
    source = Column(String(255))
    raw_data = Column(JSONB)
    decision = Column(String(100))
    confidence = Column(Float)
    reasoning = Column(Text)
    actions = Column(JSONB)
    status = Column(String(50), default='pending')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @classmethod
    async def store_result(cls, db: AsyncSession, incident_id: uuid.UUID, result: dict):
        """
        Helper to save triage results with UPSERT logic.
        If incident_id already exists, update it; otherwise create new.
        """
        # Check if exists
        stmt = select(cls).where(cls.id == incident_id)
        result_obj = await db.execute(stmt)
        existing = result_obj.scalar_one_or_none()
        
        if existing:
            # Update existing record
            existing.decision = result.get("decision")
            existing.confidence = float(result.get("confidence", 0.0))
            existing.reasoning = result.get("reasoning", "")
            existing.actions = result.get("recommended_actions") or []
            existing.status = "triaged"
            existing.updated_at = func.now()
        else:
            # Create new record
            instance = cls(
                id=incident_id,
                source="manual_api",
                raw_data={},
                decision=result.get("decision"),
                confidence=float(result.get("confidence", 0.0)),
                reasoning=result.get("reasoning", ""),
                actions=result.get("recommended_actions") or [],
                status="triaged"
            )
            db.add(instance)
        
        await db.commit()

class ResponseIncident(Base):
    __tablename__ = "response_incidents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey('incidents.incident_id'))
    siem_alert_id = Column(String(255))
    source = Column(String(255))
    raw_data = Column(JSONB)
    timestamp = Column(DateTime(timezone=True))
    response_status = Column(String(50), default='pending')
    actions_taken = Column(JSONB)
    actions_planned = Column(JSONB)
    response_strategy = Column(String(100))
    triage_result = Column(JSONB)
    analysis = Column(Text)
    current_task_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    log_id = Column(String(64), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    actor = Column(String(128), nullable=False, default='system')
    action = Column(String(255), nullable=False)
    target = Column(String(255))
    resource_type = Column(String(64), nullable=False, default='system')
    status = Column(String(50), nullable=False, default='info')
    details = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    integrity_hash = Column(String(128), nullable=False, default='')
    immutable = Column(Boolean, nullable=False, default=True)
    
    # Aliases for backward compatibility with response_service
    timestamp = synonym('created_at')
    event_type = synonym('action')
    service_name = synonym('actor')
    user_id = synonym('actor')