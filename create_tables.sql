CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

INSERT INTO users (username, email, password_hash, is_active, is_superuser, role)
VALUES (
    'admin',
    'admin@ransomware-response.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWMfSIPc1fVm',
    TRUE,
    TRUE,
    'admin'
) ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, email, password_hash, is_active, is_superuser, role)
VALUES (
    'soc_analyst',
    'analyst@ransomware-response.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdCvWMfSIPc1fVm',
    TRUE,
    FALSE,
    'analyst'
) ON CONFLICT (username) DO NOTHING;