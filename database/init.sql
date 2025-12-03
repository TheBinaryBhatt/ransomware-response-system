-- Connect to DB (if needed)
\c ransomware_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop and recreate tables if needed (for reset; comment out in production)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- Users table (matches core/models.py)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Incidents table (matches core/models.py)
CREATE TABLE IF NOT EXISTS incidents (
    incident_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(255) UNIQUE NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    description TEXT,
    source_ip INET,
    destination_ip INET,
    raw_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incidents_alert_id ON incidents(alert_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp);

-- Triage incidents table (matches core/models.py)
CREATE TABLE IF NOT EXISTS triage_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(255),
    raw_data JSONB,
    decision VARCHAR(100),
    confidence FLOAT,
    reasoning TEXT,
    actions JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_triage_created_at ON triage_incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_triage_status ON triage_incidents(status);

-- Response incidents table (matches core/models.py)
CREATE TABLE IF NOT EXISTS response_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(incident_id),
    siem_alert_id VARCHAR(255),
    source VARCHAR(255),
    raw_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE,
    response_status VARCHAR(50) DEFAULT 'pending',
    actions_taken JSONB,
    actions_planned JSONB,
    response_strategy VARCHAR(100),
    triage_result JSONB,
    analysis TEXT,
    current_task_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_response_incident_id ON response_incidents(incident_id);
CREATE INDEX IF NOT EXISTS idx_response_task_id ON response_incidents(current_task_id);
CREATE INDEX IF NOT EXISTS idx_response_status ON response_incidents(response_status);

-- Audit logs table (MATCHES audit_service/models.py for integrity features)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id VARCHAR(64) UNIQUE NOT NULL,
    actor VARCHAR(128) NOT NULL DEFAULT 'system',
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255),
    resource_type VARCHAR(64) NOT NULL DEFAULT 'system',
    status VARCHAR(50) NOT NULL DEFAULT 'info',
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    integrity_hash VARCHAR(128) NOT NULL,
    immutable BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Audit events table (if still needed; optional)
CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NO HARDCODED USERS: Let create_admin.py handle to avoid hash mismatches
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);