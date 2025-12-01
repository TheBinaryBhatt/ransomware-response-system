#!/usr/bin/env python3
"""
Reset database for development
"""
import os
import asyncio
import asyncpg
from core.config import settings

async def reset_database():
    print("🚀 Resetting database...")
    
    # Connect to default postgres database
    conn = await asyncpg.connect(
        host="localhost",
        port=5432,
        user="admin",
        password="supersecretpassword",
        database="postgres"
    )
    
    # Terminate existing connections
    await conn.execute(f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = 'ransomware_db'
        AND pid <> pg_backend_pid();
    """)
    
    # Drop and recreate database
    await conn.execute("DROP DATABASE IF EXISTS ransomware_db")
    await conn.execute("CREATE DATABASE ransomware_db")
    
    print("✅ Database reset completed!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(reset_database())