from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database import get_db
from .models import IngestionIncident
import uuid

# Use the NEW async RabbitMQ implementation
from shared_lib.events.rabbitmq import publish_event

router = APIRouter()


@router.post("/webhook")
async def handle_siem_webhook(alert_data: dict, db: AsyncSession = Depends(get_db)):
    """
    Stores the SIEM alert and emits 'incident.received'.
    This event triggers the triage agent.
    """
    try:
        incident = IngestionIncident(
            id=str(uuid.uuid4()),
            siem_alert_id=alert_data.get("alert_id", "unknown"),
            source=alert_data.get("source", "unknown"),
            raw_data=alert_data,
        )

        db.add(incident)
        await db.commit()
        await db.refresh(incident)

        event_body = {
            "incident_id": str(incident.id),
            "raw_data": incident.raw_data
        }

        # IMPORTANT: RabbitMQ publish must be awaited
        await publish_event("incident.received", event_body)

        return {"status": "success", "incident_id": str(incident.id)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incidents")
async def get_ingested_incidents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IngestionIncident))
    return result.scalars().all()
