-- Run this script to add the quarantined_ips table to an existing database
-- Execute with: docker exec -i postgres_container psql -U ransomware_user -d ransomware_db < database/add_quarantine_table.sql

-- Quarantined IPs table (for security middleware auto-blocking)
CREATE TABLE IF NOT EXISTS quarantined_ips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    reason VARCHAR(500),
    attack_type VARCHAR(50),
    quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    quarantined_by VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    related_incident_id UUID,
    block_count VARCHAR(10) DEFAULT '1',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_quarantine_ip ON quarantined_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_quarantine_status ON quarantined_ips(status);
CREATE INDEX IF NOT EXISTS idx_quarantine_expires ON quarantined_ips(expires_at);

-- Verify table was created
SELECT 'quarantined_ips table created successfully' AS status;
