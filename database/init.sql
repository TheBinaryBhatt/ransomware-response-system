\c ransomware_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
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

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(100) UNIQUE NOT NULL,
    source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    source_ip INET,
    affected_host VARCHAR(100),
    file_hash VARCHAR(64),
    process_name VARCHAR(100),
    severity VARCHAR(20) NOT NULL,
    detection_time TIMESTAMP NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'new',
    priority VARCHAR(20) DEFAULT 'medium',
    ai_analysis JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create response_actions table
CREATE TABLE IF NOT EXISTS response_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id),
    action_type VARCHAR(50) NOT NULL,
    target VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (username, email, password_hash, is_active, is_superuser, role) 
VALUES (
    'admin', 
    'admin@ransomware-response.local', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWMfSIPc1fVm', -- hash for 'admin123'
    TRUE, 
    TRUE, 
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Insert default SOC analyst user
INSERT INTO users (username, email, password_hash, is_active, is_superuser, role) 
VALUES (
    'soc_analyst', 
    'analyst@ransomware-response.local', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWMfSIPc1fVm', -- hash for 'analyst123'
    TRUE, 
    FALSE, 
    'analyst'
) ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_alert_id ON incidents(alert_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Grant permissions to soc_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO soc_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO soc_user;