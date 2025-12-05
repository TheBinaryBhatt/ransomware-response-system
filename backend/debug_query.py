import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func, and_
from core.models import Incident, Base
from core.config import settings

# Setup DB connection
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/ransomware_db"
engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def test_query():
    async with AsyncSessionLocal() as db:
        print("Testing count query...")
        try:
            # Test count query
            count_stmt = select(func.count()).select_from(Incident)
            result = await db.execute(count_stmt)
            count = result.scalar()
            print(f"Count: {count}")
        except Exception as e:
            print(f"Count query failed: {e}")

        print("\nTesting list query...")
        try:
            # Test list query
            stmt = select(Incident).order_by(Incident.received_at.desc()).limit(5)
            result = await db.execute(stmt)
            incidents = result.scalars().all()
            print(f"Found {len(incidents)} incidents")
            if incidents:
                print(f"First incident ID: {incidents[0].id}")
        except Exception as e:
            print(f"List query failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_query())
