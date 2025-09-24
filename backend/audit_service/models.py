from sqlalchemy import Column, String, JSON, DateTime
from core.database import Base
import uuid
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String, nullable=False)  # e.g., "firewall_block", "quarantine"
    target = Column(String, nullable=False)  # e.g., "host-123", "192.168.1.100"
    status = Column(String, nullable=False)  # e.g., "success", "failed"
    details = Column(JSON)  # Additional information about the action