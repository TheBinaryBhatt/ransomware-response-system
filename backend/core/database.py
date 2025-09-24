import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
import uuid
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String
from sqlalchemy.engine import Dialect

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


# Detect service name from environment, fallback to "ingestion"
service_name = os.getenv("SERVICE_NAME", "ingestion").upper()
env_var = f"{service_name}_DB_URL"

# Pick service-specific DB URL, fallback to DATABASE_URL
DATABASE_URL = os.getenv(env_var, os.getenv("DATABASE_URL"))

if not DATABASE_URL:
    raise ValueError(f"Database URL not set for {service_name} service.")

engine = create_async_engine(DATABASE_URL, future=True, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Base model shared by all services
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

class IncidentBase(Base):
    __abstract__ = True
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    siem_alert_id = Column(String, nullable=False)
    source = Column(String, default="wazuh")
    raw_data = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Add this after the IncidentBase class definition
# Create a function to initialize models for each service
async def init_models():
    async with engine.begin() as conn:
        # Create tables for the current service's models
        # Each service should import this function and call it on startup
        from backend.core import pathhelper
        service_models = pathhelper.get_service_models()
        if service_models:
            await conn.run_sync(Base.metadata.create_all)