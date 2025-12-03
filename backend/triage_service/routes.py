# backend/triage_service/routes.py

from fastapi import APIRouter, HTTPException, Depends
from .local_ai.triage_agent import triage_agent
from core.models import TriageIncident
from core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
router = APIRouter()


@router.post("/analyze")
async def analyze_incident(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Unified triage endpoint with guaranteed fallback.
    Ensures triage_agent receives a normalized incident dict.
    """
    try:
        incident_id = payload.get("incident_id")
        if not incident_id:
            raise ValueError("Missing incident_id in payload")

        # Normalize payload for triage_agent
        incident = {
            "id": incident_id,
            "source_ip": payload.get("source_ip"),
            "file_hash": payload.get("file_hash"),
            "file_path": payload.get("file_path"),
            "file_bytes": payload.get("file_bytes"),
            "severity": payload.get("severity", "high"),
            "description": payload.get("description", ""),
        }

        # Always returns a valid result (LLM optional)
        result = await triage_agent.analyze_incident(incident)

        # CONVERT STRING TO UUID OBJECT
        try:
            incident_uuid = uuid.UUID(incident_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid UUID format")

        # Correct async DB write - Use Depends for async session
        await TriageIncident.store_result(db, incident_uuid, result)

        return {"status": "ok", "result": result}

    except Exception as e:
        # Log the error for debugging
        print(f"Error in analyze_incident: {e}") 
        raise HTTPException(status_code=500, detail=str(e))