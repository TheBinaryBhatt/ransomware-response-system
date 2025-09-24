from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

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
    log_id = Column(String, unique=True, index=True, default=generate_uuid)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String, index=True)
    action = Column(String)
    resource_type = Column(String)
    resource_id = Column(String, index=True)
    details = Column(JSON)
    ip_address = Column(String)
    user_agent = Column(Text)
    previous_state = Column(JSON)
    new_state = Column(JSON)