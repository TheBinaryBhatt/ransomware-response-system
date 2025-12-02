# backend/triage_service/models.py
from sqlalchemy import Column, String, Float, Text, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from datetime import datetime
from core.database import Base

class TriageIncident(Base):
    __tablename__ = "triage_incidents"

    # Use PG_UUID(as_uuid=True) for proper Postgres mapping
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    siem_alert_id = Column(String, nullable=True)
    source = Column(String, nullable=False, default="unknown")
    raw_data = Column(JSON, nullable=True)
    decision = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    reasoning = Column(Text, nullable=True)
    actions = Column(JSON, default=list)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Add this method if your code calls .store_result() (which was in your previous error logs)
    @classmethod
    async def store_result(cls, db, incident_id, result):
        # Implementation of store_result needed by routes.py
        instance = cls(
            id=incident_id,
            decision=result.get("decision"),
            confidence=float(result.get("confidence", 0.0) or 0.0),
            reasoning=result.get("reasoning", ""),
            actions=result.get("recommended_actions") or [],
            status="triaged"
        )
        db.add(instance)
        await db.commit()