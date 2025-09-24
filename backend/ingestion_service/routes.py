from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database import get_db
from .models import IngestionIncident
import uuid
from .tasks import forward_to_triage

router = APIRouter()

# SIEM webhook endpoint
@router.post("/webhook")
async def handle_siem_webhook(alert_data: dict, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """
    Accepts incoming SIEM alerts, stores in ingestion DB,
    and forwards to triage service.
    """
    try:
        # Create new incident in ingestion DB
        incident = IngestionIncident(
            id=str(uuid.uuid4()),
            siem_alert_id=alert_data.get("alert_id", "unknown"),
            source=alert_data.get("source", "unknown"),
            raw_data=alert_data
        )

        db.add(incident)
        await db.commit()
        await db.refresh(incident)

        # Forward incident to triage service in background
        background_tasks.add_task(forward_to_triage, incident)

        return {"status": "success", "incident_id": str(incident.id)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get all ingested incidents
@router.get("/incidents")
async def get_ingested_incidents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IngestionIncident))
    return result.scalars().all()
