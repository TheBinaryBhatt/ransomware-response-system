from sqlalchemy import Column, String, JSON, DateTime
from core.database import IncidentBase
import uuid
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String as SAString
from sqlalchemy.engine import Dialect
from datetime import datetime


class ResponseIncident(IncidentBase):
    __tablename__ = "response_incidents"

    # Response lifecycle state
    response_status = Column(String, default="pending", nullable=False)

    # Planned & executed actions
    actions_taken = Column(JSON, default=lambda: [], nullable=False)
    actions_planned = Column(JSON, default=lambda: [], nullable=False)
    response_strategy = Column(String, nullable=True)  # full_auto, semi_auto, analyst_only

    # JSON from triage engine
    triage_result = Column(JSON, nullable=True)

    # Free-form analysis (AI agent or analyst)
    analysis = Column(JSON, default=lambda: {}, nullable=False)

    # Celery task tracking
    current_task_id = Column(String, nullable=True, index=True)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Optional UUID type (defined but not used currently)
class GUID(TypeDecorator):
    """Platform-independent GUID type.

    Uses PostgreSQL UUID type, otherwise uses VARCHAR(36).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(SAString(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value
        return uuid.UUID(value) if isinstance(value, str) else value
