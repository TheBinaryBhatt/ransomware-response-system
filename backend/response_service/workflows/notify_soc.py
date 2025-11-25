# backend/response_service/workflows/notify_soc.py
from core.rabbitmq_utils import publish_event

def notify_soc(incident_id: str, severity: str):
    publish_event("soc.alert", {
        "incident_id": incident_id,
        "severity": severity,
        "message": "Ransomware response workflow triggered"
    })
    return {"status": "sent", "incident_id": incident_id, "severity": severity}
