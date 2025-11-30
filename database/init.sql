\c ransomware_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (MATCHES core/models.py)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'analyst',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create incidents table (MATCHES core/models.py)
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(100) UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text,
    siem_alert_id VARCHAR(100),
    severity VARCHAR(20),
    description TEXT,
    source_ip INET,
    destination_ip INET,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'detected',
    raw_alert JSONB,
    actions_taken JSONB DEFAULT '[]',
    is_processed BOOLEAN DEFAULT FALSE,
    ai_confidence FLOAT DEFAULT 0.0,
    ai_reasoning TEXT,
    ai_analysis JSONB DEFAULT '{}',
    requires_human_review BOOLEAN DEFAULT TRUE
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
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    integrity_hash VARCHAR(128) NOT NULL,
    immutable BOOLEAN NOT NULL DEFAULT TRUE
);

-- Create triage_incidents table (MATCHES triage_service/models.py)
CREATE TABLE IF NOT EXISTS triage_incidents (
    id SERIAL PRIMARY KEY,
    siem_alert_id VARCHAR(100),
    source VARCHAR(50),
    raw_data JSONB,
    decision VARCHAR(100),
    confidence FLOAT,
    reasoning TEXT,
    actions JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create response_incidents table (MATCHES response_service/models.py)
CREATE TABLE IF NOT EXISTS response_incidents (
    id SERIAL PRIMARY KEY,
    siem_alert_id VARCHAR(100),
    source VARCHAR(50),
    raw_data JSONB,
    response_status VARCHAR(50) DEFAULT 'pending',
    actions_taken JSONB DEFAULT '[]',
    actions_planned JSONB DEFAULT '[]',
    response_strategy VARCHAR(50),
    triage_result JSONB,
    analysis JSONB DEFAULT '{}',
    current_task_id VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX IF NOT EXISTS idx_incidents_incident_id ON incidents(incident_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_log_id ON audit_logs(log_id);

CREATE INDEX IF NOT EXISTS idx_triage_incidents_siem_alert_id ON triage_incidents(siem_alert_id);
CREATE INDEX IF NOT EXISTS idx_response_incidents_siem_alert_id ON response_incidents(siem_alert_id);