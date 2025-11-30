# triage_service/models.py
from sqlalchemy import Column, String, Float, Text, JSON
from core.database import IncidentBase

class TriageIncident(IncidentBase):
    __tablename__ = "triage_incidents"

    decision = Column(String)
    confidence = Column(Float)
    reasoning = Column(Text)
    status = Column(String, default="pending")
    actions = Column(JSON, default=[])  # Changed from Text to JSON