from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database import get_db
from core.models import Incident  # Unified model
from datetime import datetime
import uuid
import logging

from audit_service.local_ai.audit_agent import audit_agent

# Use the NEW async RabbitMQ implementation
from shared_lib.events.rabbitmq import publish_event

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/webhook")
async def handle_siem_webhook(alert_data: dict, db: AsyncSession = Depends(get_db)):
    """
    Stores the SIEM alert and emits 'incident.received'.
    This event triggers the triage agent.
    """
    try:
        # Use UUID for id consistency with core models
        incident_id = uuid.uuid4()
        
        # FIX: Parse timestamp string to datetime
        timestamp_str = alert_data.get("timestamp")
        timestamp = None
        if timestamp_str:
            try:
                if timestamp_str.endswith("Z"):
                    timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                else:
                    timestamp = datetime.fromisoformat(timestamp_str)
                if timestamp.tzinfo is None:
                    timestamp = timestamp.replace(tzinfo=datetime.timezone.utc)
            except ValueError:
                logger.warning(f"Invalid timestamp '{timestamp_str}', using now")
                timestamp = datetime.now(datetime.timezone.utc)

        incident = Incident(
            incident_id=incident_id,
            alert_id=alert_data.get("alert_id", "unknown"),
            severity=alert_data.get("severity", "medium"),
            status="new",
            description=alert_data.get("description", ""),
            source_ip=alert_data.get("source_ip"),
            raw_data=alert_data,
            timestamp=timestamp,  # Now datetime object
        )

        db.add(incident)
        await db.commit()
        await db.refresh(incident)

        event_body = {
            "incident_id": str(incident_id),
            "raw_data": incident.raw_data
        }

        # IMPORTANT: RabbitMQ publish must be awaited - ADD logging for debug
        try:
            await publish_event("incident.received", event_body)
            logger.info(f"[Ingestion] Successfully published to 'incident.received' for incident {incident_id}")
        except Exception as pub_e:
            logger.error(f"[Ingestion] Failed to publish event for {incident_id}: {pub_e}")
            # Don't fail the ingestion, but log for troubleshooting

        # Record an audit log for ingestion
        try:
            await audit_agent.record_action(
                action="incident_ingested",
                target=str(incident_id),
                status="success",
                actor="ingestion_service",
                resource_type="incident",
                details={
                    "source": "siem_webhook",
                    "raw_alert_id": alert_data.get("id") or alert_data.get("rule", {}).get("id"),
                },
            )
        except Exception:
            # Don't break ingestion if audit fails
            logger.warning("[Ingestion] Audit log failed")

        # FIX: Stringify ID in response
        return {"status": "success", "incident_id": str(incident_id)}


    except Exception as e:
        logger.error(f"[Ingestion] Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/incidents")
async def get_ingested_incidents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident))  # Unified
    return result.scalars().all()