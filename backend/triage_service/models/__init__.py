# backend/triage_service/models/__init__.py
from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class TriageIncident(Base):
    __tablename__ = "triage_incidents"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source = Column(String(100), nullable=False)
    raw_data = Column(JSON, nullable=False)
    decision = Column(String(50), default="pending")  # pending, benign, suspicious, malicious
    confidence = Column(Float, default=0.0)
    reasoning = Column(Text)
    actions = Column(JSON)  # Store recommendations as JSON
    status = Column(String(20), default="new")  # new, processing, triaged, error
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<TriageIncident(id={self.id}, source={self.source}, decision={self.decision})>"

# Export the model
__all__ = ['TriageIncident', 'Base']