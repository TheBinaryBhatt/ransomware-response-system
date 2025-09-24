import logging
import httpx
from core.config import settings
from .models import IngestionIncident

logging.basicConfig(level=logging.INFO)
TRIAGE_URL = settings.triage_service_url  # AnyUrl type

async def forward_to_triage(incident: IngestionIncident):
    """Send the stored incident to the triage service."""
    payload = {
        "incident_id": str(incident.id),
        "alert_id": incident.siem_alert_id,
        "source": incident.source,
        "raw_data": incident.raw_data
    }
    url_str = str(TRIAGE_URL)  # explicitly convert to string for httpx
    logging.info(f"Forwarding incident {incident.id} to triage: {url_str} with payload {payload}")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(url_str, json=payload, timeout=10.0)
            r.raise_for_status()
            logging.info(f"Successfully forwarded incident {incident.id} to triage: {r.status_code}")
    except Exception as e:
        logging.error(f"Failed to forward incident {incident.id} to triage service: {e}")


# Optional: Existing Celery task (unchanged)
from celery import shared_task
from core.database import get_db
from .models import IngestionIncident

@shared_task
def process_incoming_alert(alert_data: dict):
    """Process incoming SIEM alert asynchronously"""
    try:
        db = next(get_db())
        incident = IngestionIncident(
            siem_alert_id=alert_data.get("siem_alert_id"),
            source=alert_data.get("source", "unknown"),
            raw_data=alert_data
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        # Trigger triage process
        return {"status": "success", "incident_id": str(incident.id)}
    except Exception as e:
        return {"status": "error", "error": str(e)}
