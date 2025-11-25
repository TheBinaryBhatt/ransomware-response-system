# backend/core/database.py
import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
import uuid
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String, text
from sqlalchemy.engine import Dialect
from typing import Optional

from .config import settings

logger = logging.getLogger(__name__)

class GUID(TypeDecorator):
    """Platform-independent GUID type.

    Uses PostgreSQL UUID type, otherwise uses VARCHAR(36).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        # if using Postgres, leave UUID objects as-is (asyncpg accepts uuid.UUID)
        if dialect.name == "postgresql":
            return value
        # otherwise store string representation
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        # convert string to uuid.UUID for non-postgres backends
        return uuid.UUID(value) if isinstance(value, str) else value


# Build the canonical DATABASE_URL:
# Prefer explicit DATABASE_URL env var, else fall back to settings.database_url
_env_db = os.getenv("DATABASE_URL")
DATABASE_URL = _env_db or (str(settings.database_url) if settings.database_url else None)

if not DATABASE_URL:
    # As a last resort, construct an asyncpg URL from postgres_user/postgres_password/postgres_db and a host env var.
    pg_host = os.getenv("POSTGRES_HOST", "postgres")
    DATABASE_URL = (
        f"postgresql+asyncpg://{settings.postgres_user}:{settings.postgres_password}@{pg_host}/{settings.postgres_db}"
    )

# Mask password when logging
masked = DATABASE_URL
try:
    # naive mask of 'password' in URL for logging
    if "@" in DATABASE_URL and ":" in DATABASE_URL.split("@")[0]:
        masked = DATABASE_URL.replace(settings.postgres_password, "***")
except Exception:
    masked = "[masked]"

logger.info("[DB] Using URL: %s", masked)

# Create engine and session factory
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # set to True temporarily for debugging but False in production
    future=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


# Dependency to get database session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            # session context manager will close, but keep explicit call for clarity
            await session.close()


# Test database connection
async def test_connection() -> bool:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            # do not commit for read-only check
        logger.info("[DB] Connection successful")
        return True
    except Exception as e:
        logger.exception("[DB] Connection failed")
        return False


# Base model shared by all services (example)
from sqlalchemy import Column, String, DateTime, JSON, Boolean, Text
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


# Initialize models helper
async def init_models():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables created/verified")
    except Exception:
        logger.exception("❌ Error creating tables")
