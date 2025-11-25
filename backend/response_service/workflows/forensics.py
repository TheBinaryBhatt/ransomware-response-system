# backend/response_service/workflows/forensics.py

async def collect_forensics_data(incident_id: str):
    return {
        "incident_id": incident_id,
        "forensics": "collected",
        "artifacts": ["memory", "registry", "network-connections"]
    }
