#!/usr/bin/env python3
"""
Seed script to insert 100 test incidents into the database.
Run this inside the gateway container.
"""
import asyncio
import random
import uuid
from datetime import datetime, timedelta

# Import from gateway's core modules
from core.database import async_session_factory
from core.models import Incident

# Sample data for realistic incidents
SEVERITY_CHOICES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
SEVERITY_WEIGHTS = [0.1, 0.25, 0.35, 0.3]  # 10% critical, 25% high, 35% medium, 30% low

STATUS_CHOICES = ["NEW", "INVESTIGATING", "PENDING"]
THREAT_TYPES = [
    "Ransomware detected on endpoint",
    "Suspicious outbound connection to C2 server",
    "Phishing email with malicious attachment",
    "Brute force SSH login attempt",
    "SQL injection attack detected",
    "Malware signature matched in network traffic",
    "Unauthorized data exfiltration attempt",
    "Cryptominer process detected",
    "Lateral movement activity detected",
    "Privilege escalation attempt",
    "DDoS attack on web server",
    "Suspicious PowerShell execution",
    "File integrity violation detected",
    "Anomalous user login behavior",
    "Man-in-the-middle attack detected",
]

# Source IP ranges (simulating various attack sources)
def random_ip():
    """Generate a random IP address."""
    if random.random() < 0.3:
        # Internal IPs
        return f"192.168.{random.randint(1, 254)}.{random.randint(1, 254)}"
    elif random.random() < 0.5:
        # Known bad ranges (simulated)
        return f"{random.choice([45, 91, 185, 193])}.{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}"
    else:
        # Random external
        return f"{random.randint(1, 223)}.{random.randint(1, 254)}.{random.randint(1, 254)}.{random.randint(1, 254)}"

def random_dest_ip():
    """Generate internal destination IPs."""
    return f"10.0.{random.randint(1, 50)}.{random.randint(1, 254)}"

async def seed_incidents(count: int = 100):
    """Seed the database with test incidents."""
    print(f"[seed] Starting to create {count} test incidents...")
    
    async with async_session_factory() as session:
        incidents_created = 0
        
        for i in range(count):
            # Random timestamp within last 7 days
            days_ago = random.randint(0, 7)
            hours_ago = random.randint(0, 23)
            incident_time = datetime.now() - timedelta(days=days_ago, hours=hours_ago)
            
            # Create incident
            incident = Incident(
                id=uuid.uuid4(),
                incident_id=uuid.uuid4(),
                alert_id=f"ALERT-{datetime.now().strftime('%Y%m%d')}-{i+1:04d}",
                severity=random.choices(SEVERITY_CHOICES, weights=SEVERITY_WEIGHTS)[0],
                status=random.choice(STATUS_CHOICES),
                description=random.choice(THREAT_TYPES),
                source_ip=random_ip(),
                destination_ip=random_dest_ip(),
                timestamp=incident_time,
                raw_data={
                    "rule_id": f"RULE-{random.randint(1000, 9999)}",
                    "source": random.choice(["Wazuh", "Suricata", "SIEM", "EDR"]),
                    "hostname": f"host-{random.randint(1, 100)}.corp.local",
                }
            )
            
            session.add(incident)
            incidents_created += 1
            
            if (i + 1) % 25 == 0:
                print(f"[seed] Created {i + 1} incidents...")
        
        await session.commit()
        print(f"[seed] Successfully created {incidents_created} test incidents!")

if __name__ == "__main__":
    asyncio.run(seed_incidents(100))
