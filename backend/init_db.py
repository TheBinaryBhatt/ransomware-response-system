#!/usr/bin/env python3
"""
Database schema fix script
Run this to fix the UUID vs integer ID mismatch
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def fix_database_schema():
    """Fix the database schema to use UUID properly"""
    
    # Database connection details from environment
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'ransomware_db')
    db_user = os.getenv('DB_USER', 'admin')
    db_password = os.getenv('DB_PASSWORD', 'password')
    
    conn_string = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    print(f"Connecting to database: {db_name} as {db_user}")
    
    conn = await asyncpg.connect(conn_string)
    
    try:
        print("Fixing database schema...")
        
        # Drop and recreate tables with correct UUID types
        await conn.execute('''
            DROP TABLE IF EXISTS response_incidents CASCADE;
            DROP TABLE IF EXISTS triage_incidents CASCADE;
            DROP TABLE IF EXISTS incidents CASCADE;
            DROP TABLE IF EXISTS audit_logs CASCADE;
        ''')
        
        # Create incidents table with UUID
        await conn.execute('''
            CREATE TABLE incidents (
                incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                alert_id VARCHAR(255) NOT NULL UNIQUE,
                severity VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'new',
                description TEXT,
                source_ip INET,
                destination_ip INET,
                raw_data JSONB,
                timestamp TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        ''')
        
        # Create triage_incidents table with UUID
        await conn.execute('''
            CREATE TABLE triage_incidents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                incident_id UUID REFERENCES incidents(incident_id) ON DELETE CASCADE,
                source VARCHAR(255),
                raw_data JSONB,
                decision VARCHAR(100),
                confidence FLOAT,
                reasoning TEXT,
                actions JSONB,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        ''')
        
        # Create response_incidents table with UUID
        await conn.execute('''
            CREATE TABLE response_incidents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                incident_id UUID REFERENCES incidents(incident_id) ON DELETE CASCADE,
                siem_alert_id VARCHAR(255),
                source VARCHAR(255),
                raw_data JSONB,
                timestamp TIMESTAMPTZ,
                response_status VARCHAR(50) DEFAULT 'pending',
                actions_taken JSONB,
                actions_planned JSONB,
                response_strategy VARCHAR(100),
                triage_result JSONB,
                analysis TEXT,
                current_task_id VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        ''')
        
        # Create audit_logs table
        await conn.execute('''
            CREATE TABLE audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                event_type VARCHAR(255) NOT NULL,
                service_name VARCHAR(100) NOT NULL,
                user_id VARCHAR(100),
                description TEXT,
                details JSONB,
                ip_address INET,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        ''')
        
        # Create indexes
        await conn.execute('CREATE INDEX idx_incidents_alert_id ON incidents(alert_id);')
        await conn.execute('CREATE INDEX idx_incidents_created_at ON incidents(created_at);')
        await conn.execute('CREATE INDEX idx_triage_incident_id ON triage_incidents(incident_id);')
        await conn.execute('CREATE INDEX idx_response_incident_id ON response_incidents(incident_id);')
        await conn.execute('CREATE INDEX idx_audit_created_at ON audit_logs(created_at);')
        
        print("✅ Database schema fixed successfully!")
        
    except Exception as e:
        print(f"❌ Error fixing schema: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_database_schema())