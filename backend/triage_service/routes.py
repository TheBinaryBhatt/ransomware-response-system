# backend/triage_service/routes.py

from fastapi import APIRouter, HTTPException
from .local_ai.triage_agent import triage_agent
from .models import TriageIncident
from core.database import get_db
from sqlalchemy.orm import Session
from core.models import TriageIncident

router = APIRouter()

@router.post("/analyze")
async def analyze_incident(payload: dict):
    """
    Compatibility endpoint.
    Allows ingestion service or manual requests to trigger AI triage.
    """
    try:
        incident_id = payload.get("incident_id")
        if not incident_id:
            raise ValueError("Missing incident_id in payload")

        # Run AI analysis
        result = await triage_agent.analyze_incident(payload)

        # Sync DB session (works inside async route since DB engine is async)
        db: Session = next(get_db())
        TriageIncident.store_result(db, incident_id, result)

        return {"status": "ok", "result": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
