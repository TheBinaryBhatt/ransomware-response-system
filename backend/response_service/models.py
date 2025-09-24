from sqlalchemy import Column, String, JSON
from core.database import IncidentBase
import uuid
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String
from sqlalchemy.engine import Dialect

class ResponseIncident(IncidentBase):
    __tablename__ = "response_incidents"
    
    # Response-specific fields
    response_status = Column(String)  # pending, action_taken, failed
    actions_taken = Column(JSON)  # List of actions taken
    current_task_id = Column(String, nullable=True, index=True)

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
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value
        if not isinstance(value, str):
            return str(value)
        else:
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value
        return uuid.UUID(value) if isinstance(value, str) else value