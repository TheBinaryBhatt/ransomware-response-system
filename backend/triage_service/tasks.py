from celery import shared_task
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from core.config import settings
from .models import TriageIncident
from .local_ai.triage_engine import triage_engine

# Use sync engine for Celery tasks
engine = create_engine(settings.TRIAGE_DB_URL, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@shared_task
def triage_incident(incident_id: str):
    """Perform AI triage on an incident"""
    try:
        db = SessionLocal()
        incident = db.query(TriageIncident).filter(TriageIncident.id == incident_id).first()

        if not incident:
            return {"status": "error", "error": "Incident not found"}

        # Perform AI triage
        triage_result = triage_engine.triage_incident(incident.raw_data)

        incident.decision = triage_result["decision"]
        incident.confidence = triage_result["confidence"]
        incident.reasoning = triage_result["reasoning"]

        db.commit()

        # Trigger response if confirmed ransomware
        if incident.decision == "confirmed_ransomware":
            from response_service.tasks import execute_response_actions
            execute_response_actions.delay(str(incident.id))

        return {"status": "success", "incident_id": str(incident.id)}

    except Exception as e:
        return {"status": "error", "error": str(e)}

    finally:
        db.close()
