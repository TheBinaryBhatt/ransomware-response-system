from sqlalchemy import Column, String, Float, Text
from sqlalchemy.dialects.postgresql import UUID
import uuid
from core.database import IncidentBase

class TriageIncident(IncidentBase):
    __tablename__ = "triage_incidents"

    decision = Column(String)  # e.g. confirmed_ransomware, false_positive, escalate_human
    confidence = Column(Float)
    reasoning = Column(Text)
    status = Column(String, default="pending")
