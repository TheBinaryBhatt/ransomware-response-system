# backend/core/database.py
import os
import logging
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
import uuid
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String, text
from sqlalchemy.engine import Dialect
from typing import Optional

from .config import settings

logger = logging.getLogger(__name__)

class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value


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

# Create engine and session factory with connection retry settings
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=30,
    max_overflow=20,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Alias for backwards compatibility with other modules
async_session_factory = AsyncSessionLocal

Base = declarative_base()


# Dependency to get database session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Test database connection with better error handling
async def test_connection() -> bool:
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        logger.info("[DB] Connection successful")
        return True
    except Exception as e:
        logger.error(f"[DB] Connection failed: {str(e)}")
        return False


# Wait for database with retry logic
async def wait_for_db(max_retries: int = 30, delay: float = 2.0) -> bool:
    """Wait for database to be ready with retry logic."""
    for attempt in range(max_retries):
        if await test_connection():
            logger.info(f"[DB] Database connection established on attempt {attempt + 1}")
            return True
        logger.warning(f"[DB] Database connection failed (attempt {attempt + 1}/{max_retries}), retrying in {delay}s...")
        await asyncio.sleep(delay)
    logger.error("[DB] Database connection failed after all retries")
    return False


# Base model shared by all services (example)
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from datetime import datetime

class IncidentBase(Base):
    __abstract__ = True
    
    # Change from String to UUID type
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    siem_alert_id = Column(String, index=True)
    source = Column(String)
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