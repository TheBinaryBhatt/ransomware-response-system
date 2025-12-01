# triage_service/models.py
from sqlalchemy import Column, String, Float, Text, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from core.database import Base

class TriageIncident(Base):
    __tablename__ = "triage_incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source = Column(String, nullable=False)
    raw_data = Column(JSON, nullable=False)
    decision = Column(String)  # malicious, benign, suspicious
    confidence = Column(Float)
    reasoning = Column(Text)
    actions = Column(JSON, default=list)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)