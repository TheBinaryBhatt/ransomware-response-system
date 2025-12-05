"""
Seed Test Incidents for RRS Testing
"""

import psycopg2
import uuid
import json
from datetime import datetime, timedelta
import random

# Database connection
conn = psycopg2.connect(
    host="localhost",
    database="ransomware_db",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

# Test data
SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']
STATUSES = ['new', 'investigating', 'resolved', 'escalated', 'pending']
THREAT_TYPES = ['Ransomware', 'Phishing', 'Malware', 'DDoS', 'Data Exfiltration']

SAMPLE_IPS = [
    '192.168.1.100', '192.168.1.101', '10.0.0.50', '172.16.0.25',
    '185.143.223.12', '45.33.32.156', '104.248.121.33', '203.0.113.50'
]

SAMPLE_DESCRIPTIONS = {
    'Ransomware': ['LockBit 3.0 ransomware detected', 'Conti ransomware variant', 'BlackCat/ALPHV ransomware'],
    'Phishing': ['Credential harvesting attempt', 'Malicious phishing email', 'Spear phishing attack'],
    'Malware': ['Emotet trojan detected', 'Cobalt Strike beacon', 'TrickBot malware'],
    'DDoS': ['Volumetric DDoS attack', 'SYN flood attack', 'Application layer DDoS'],
    'Data Exfiltration': ['Large data transfer', 'Sensitive files uploaded', 'Unusual outbound data']
}

print("Creating test incidents...")

for i in range(15):
    threat_type = random.choice(THREAT_TYPES)
    severity = random.choice(SEVERITIES)
    status = random.choice(STATUSES)
    source_ip = random.choice(SAMPLE_IPS)
    description = random.choice(SAMPLE_DESCRIPTIONS[threat_type])
    
    timestamp = datetime.utcnow() - timedelta(
        days=random.randint(0, 7),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59)
    )
    
    incident_id = str(uuid.uuid4())
    siem_alert_id = f"ALERT-{i+1:04d}-{uuid.uuid4().hex[:8].upper()}"
    raw_alert = json.dumps({"threat_type": threat_type, "indicators": ["ioc1", "ioc2"]})
    
    try:
        cur.execute("""
            INSERT INTO incidents (
                incident_id, siem_alert_id, severity, status, description, 
                source_ip, destination_ip, received_at, raw_alert, is_processed
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            incident_id,
            siem_alert_id,
            severity,
            status,
            f"[{threat_type}] {description}",
            source_ip,
            '10.0.0.1',
            timestamp,
            raw_alert,
            False
        ))
        print(f"  ✓ {siem_alert_id} | {severity.upper():8} | {threat_type}")
    except Exception as e:
        print(f"  ✗ Error: {e}")
        conn.rollback()

conn.commit()
print(f"\n✅ Created 15 test incidents!")

# Verify
cur.execute("SELECT COUNT(*) FROM incidents")
count = cur.fetchone()[0]
print(f"Total incidents in database: {count}")

cur.close()
conn.close()
