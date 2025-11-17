import logging
import httpx
from core.config import settings
from .models import IngestionIncident

logging.basicConfig(level=logging.INFO)
TRIAGE_URL = settings.triage_service_url  # AnyUrl type, expected to be like http://triage_service:8002/api/v1/incidents

# Async function: forward incident to triage and trigger AI agent analysis
async def forward_to_triage(incident: IngestionIncident):
    """
    Send the stored incident to the triage service and trigger AI analysis.
    """
    payload = {
        "incident_id": str(incident.id),
        "raw_data": incident.raw_data
    }
    triage_incident_url = str(TRIAGE_URL)
    triage_analyze_url = triage_incident_url.replace("/incidents", "/analyze")

    logging.info(f"Forwarding incident {incident.id} to triage: {triage_incident_url} with payload {payload}")
    try:
        async with httpx.AsyncClient() as client:
            # 1. Send incident to triage for DB-record/storage
            resp = await client.post(triage_incident_url, json=payload, timeout=10.0)
            resp.raise_for_status()
            logging.info(f"Successfully forwarded incident {incident.id} to triage: {resp.status_code}")

            # 2. Trigger AI analysis (agentic AI step)
            ai_payload = {
                "incident_id": str(incident.id),
                "incident": incident.raw_data
            }
            ai_resp = await client.post(triage_analyze_url, json=ai_payload, timeout=30.0)
            ai_resp.raise_for_status()
            ai_result = ai_resp.json()
            logging.info(f"AI analysis result for incident {incident.id}: {ai_result}")

            # 3. Optional: if AI decides auto-response, trigger response
            analysis = ai_result.get('analysis', {})
            if analysis.get('decision') == 'confirmed_ransomware' and analysis.get('auto_response', False):
                await trigger_automated_response(str(incident.id), analysis)
    except Exception as e:
        logging.error(f"Failed to forward incident/trigger AI for {incident.id}: {e}")

async def trigger_automated_response(incident_id: str, analysis_result: dict):
    """
    Trigger automated response actions if dictated by triage AI agent.
    """
    RESPONSE_URL = settings.response_service_url  # e.g. http://response_service:8003/api/v1/incidents/{id}/respond
    response_url = f"{RESPONSE_URL}/{incident_id}/respond"
    payload = {
        "incident_id": incident_id,
        "analysis": analysis_result,
        "automated": True
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(response_url, json=payload, timeout=20.0)
            resp.raise_for_status()
            logging.info(f"Automated response for incident {incident_id} triggered: {resp.status_code}")
    except Exception as e:
        logging.error(f"Automated response for incident {incident_id} failed: {e}")

# Optional: Existing Celery task (unchanged, still works with agentic system)
from celery import shared_task
from core.database import get_db
from .models import IngestionIncident

@shared_task
def process_incoming_alert(alert_data: dict):
    """Process incoming SIEM alert asynchronously (legacy Celery)"""
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
        # Could launch forward_to_triage using asyncio or other means in actual prod.
        return {"status": "success", "incident_id": str(incident.id)}
    except Exception as e:
        return {"status": "error", "error": str(e)}
