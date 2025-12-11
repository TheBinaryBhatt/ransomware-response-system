# backend/core/quarantine_model.py
"""
Database model for IP quarantine tracking.
This model stores quarantined IPs with their metadata and expiration.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from .database import Base


class QuarantinedIP(Base):
    """
    Model for tracking quarantined IP addresses.
    
    Attributes:
        id: Unique identifier
        ip_address: The quarantined IP (IPv4 or IPv6)
        reason: Reason for quarantine
        attack_type: Type of attack detected (sql_injection, brute_force, etc.)
        quarantined_at: When the IP was quarantined
        quarantined_by: User or system that performed the quarantine
        expires_at: When the quarantine expires (NULL = permanent)
        status: Current status (active, expired, released)
        related_incident_id: Link to the triggering incident
    """
    __tablename__ = "quarantined_ips"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ip_address = Column(String(45), unique=True, nullable=False, index=True)  # IPv4/IPv6
    reason = Column(String(500))
    attack_type = Column(String(50))  # sql_injection, brute_force, ssrf, etc.
    quarantined_at = Column(DateTime(timezone=True), server_default=func.now())
    quarantined_by = Column(String(64))  # analyst username or 'security_middleware'
    expires_at = Column(DateTime(timezone=True), nullable=True)  # NULL = permanent
    status = Column(String(20), default="active")  # active, expired, released
    related_incident_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Additional metadata
    block_count = Column(String(10), default="1")  # Times this IP was blocked
    notes = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<QuarantinedIP(ip={self.ip_address}, status={self.status}, attack={self.attack_type})>"
    
    def is_permanent(self) -> bool:
        """Check if this is a permanent ban."""
        return self.expires_at is None
    
    def is_expired(self) -> bool:
        """Check if the quarantine has expired."""
        if self.expires_at is None:
            return False  # Permanent bans don't expire
        return datetime.utcnow() > self.expires_at.replace(tzinfo=None)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "ip_address": self.ip_address,
            "reason": self.reason,
            "attack_type": self.attack_type,
            "quarantined_at": self.quarantined_at.isoformat() if self.quarantined_at else None,
            "quarantined_by": self.quarantined_by,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_permanent": self.is_permanent(),
            "status": self.status,
            "related_incident_id": str(self.related_incident_id) if self.related_incident_id else None,
        }
