# backend/triage_service/tasks.py
from celery import shared_task
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from core.config import settings
import logging
import json

# Import from the correct location
from triage_service.models import TriageIncident

# Try to import the agent, but handle if it doesn't exist yet
try:
    from .local_ai.triage_agent import triage_agent
    HAS_AGENT = True
except ImportError:
    HAS_AGENT = False
    logging.warning("Triage agent not available - running in fallback mode")

# Sync SQLAlchemy engine for Celery worker
engine = create_engine(str(settings.database_url or settings.triage_db_url), future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

logger = logging.getLogger(__name__)


def build_prompt(incident):
    """Creates structured prompt for the agent."""
    return {
        "incident_id": str(incident.id),
        "source": incident.source,
        "severity": incident.raw_data.get("severity", "unknown"),
        "source_ip": incident.raw_data.get("source_ip", "unknown"),
        "destination_ip": incident.raw_data.get("destination_ip", "unknown"),
        "file_hash": incident.raw_data.get("file_hash", ""),
        "event_type": incident.raw_data.get("event_type", ""),
        "raw": incident.raw_data,
    }


@shared_task
def triage_incident(incident_id: str):
    """Celery worker performing AI triage on an incident."""
    db = SessionLocal()
    try:
        incident = db.query(TriageIncident).filter(TriageIncident.id == incident_id).first()
        if not incident:
            logger.error(f"Incident {incident_id} not found")
            return {"status": "error", "error": "Incident not found"}

        logger.info(f"Running AI triage for incident {incident_id}")

        incident_data = build_prompt(incident)

        if HAS_AGENT:
            # Run async AI agent inside Celery
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(triage_agent.analyze_incident(incident_data))
            loop.close()
        else:
            # Fallback logic when agent is not available
            logger.warning("Using fallback triage logic - AI agent not available")
            result = {
                "decision": "suspicious",
                "confidence": 0.5,
                "reasoning": "Fallback analysis - AI agent not configured",
                "recommendations": ["escalate_for_review"]
            }

        # Update DB
        incident.decision = result.get("decision", "unknown")
        incident.confidence = float(result.get("confidence", 0.0))
        incident.reasoning = result.get("reasoning", "")
        incident.actions = result.get("recommendations", [])
        incident.status = "triaged"

        db.commit()

        logger.info(f"Triage completed for incident {incident_id}: {incident.decision}")

        return {
            "status": "success",
            "incident_id": incident_id,
            "decision": incident.decision,
        }

    except Exception as e:
        logger.error(f"Error triaging incident {incident_id}: {e}")
        db.rollback()
        return {"status": "error", "error": str(e)}

    finally:
        db.close()