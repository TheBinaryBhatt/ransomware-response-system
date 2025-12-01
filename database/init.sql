\c ransomware_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (MATCHES core/models.py)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'analyst',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create incidents table (MATCHES core/models.py)
CREATE TABLE IF NOT EXISTS incidents (
    incident_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(255) UNIQUE NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    description TEXT,
    source_ip INET,
    destination_ip INET,
    raw_data JSONB,
    timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table (MATCHES audit_service/models.py)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    log_id VARCHAR(64) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text,
    actor VARCHAR(128) NOT NULL DEFAULT 'system',
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255),
    resource_type VARCHAR(64) NOT NULL DEFAULT 'system',
    status VARCHAR(50) NOT NULL DEFAULT 'info',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    integrity_hash VARCHAR(128) NOT NULL,
    immutable BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create triage_incidents table (MATCHES core/models.py AND triage_service/models.py)
CREATE TABLE IF NOT EXISTS triage_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(incident_id),
    source VARCHAR(255),
    raw_data JSONB,
    decision VARCHAR(100),
    confidence FLOAT,
    reasoning TEXT,
    actions JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create response_incidents table (MATCHES core/models.py AND response_service/models.py)
CREATE TABLE IF NOT EXISTS response_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(incident_id),
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_events table
CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (username, email, password_hash, is_active, is_superuser, role) 
VALUES (
    'admin', 
    'admin@ransomware-response.local', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWMfSIPc1fVm',
    TRUE, 
    TRUE, 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Insert default SOC analyst user
INSERT INTO users (username, email, password_hash, is_active, is_superuser, role) 
VALUES (
    'soc_analyst', 
    'analyst@ransomware-response.local', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWMfSIPc1fVm',
    TRUE, 
    FALSE, 
    'analyst'
) ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_alert_id ON incidents(alert_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);

CREATE INDEX IF NOT EXISTS idx_triage_incidents_incident_id ON triage_incidents(incident_id);
CREATE INDEX IF NOT EXISTS idx_triage_incidents_status ON triage_incidents(status);

CREATE INDEX IF NOT EXISTS idx_response_incidents_incident_id ON response_incidents(incident_id);
CREATE INDEX IF NOT EXISTS idx_response_incidents_response_status ON response_incidents(response_status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_log_id ON audit_logs(log_id);