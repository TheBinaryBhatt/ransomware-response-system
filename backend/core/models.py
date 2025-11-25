# backend/core/models.py
import uuid
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean, Float, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

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
