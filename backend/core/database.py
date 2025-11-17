import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
import uuid
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy import String, text
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

# Use a simple, direct database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://admin:supersecretpassword@postgres:5432/ransomware_db")

print(f"[DB] Using URL: {DATABASE_URL.replace('supersecretpassword', '***')}")

# Create engine and session
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    future=True,
    pool_pre_ping=True  # Add connection health checks
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

# Dependency to get database session
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Test database connection - FIXED: Use text() for raw SQL
async def test_connection():
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            await session.commit()
        print("[DB] Connection successful")
        return True
    except Exception as e:
        print(f"[DB] Connection failed: {e}")
        return False

# Base model shared by all services
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

# Initialize models
async def init_models():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created/verified")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")