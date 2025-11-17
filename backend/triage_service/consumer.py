import asyncio
import logging
from core.rabbitmq_utils import start_consumer_thread, publish_event
from sqlalchemy import select
from core.database import AsyncSessionLocal
from .models import TriageIncident
from .local_ai.agent import triage_agent

logger = logging.getLogger(__name__)

def _handle_event(routing_key: str, payload: dict):
    incident_id = payload.get("incident_id")
    raw_data = payload.get("raw_data", {})
    logger.info(f"Triage consumer received {routing_key} for {incident_id}")
    asyncio.run(_process_incident(incident_id, raw_data))

async def _process_incident(incident_id: str, raw_data: dict):
    async with AsyncSessionLocal() as session:
        # Ensure record exists
        result = await session.execute(select(TriageIncident).where(TriageIncident.id == incident_id))
        existing = result.scalar_one_or_none()
        if not existing:
            incident = TriageIncident(
                id=incident_id,
                siem_alert_id=raw_data.get("alert_id", "unknown"),
                source=raw_data.get("source", "unknown"),
                raw_data=raw_data
            )
            session.add(incident)
            await session.commit()
        # Run AI analysis
        analysis = await triage_agent.analyze_incident(raw_data)
        if existing:
            incident = existing
        # Update incident with AI analysis
        incident.decision = analysis.get("decision", "escalate_human")
        incident.confidence = analysis.get("confidence", 0.5)
        incident.reasoning = analysis.get("reasoning", "AI analysis completed")
        incident.status = "triaged"
        await session.commit()
        # Publish triaged event
        publish_event("incident.triaged", {
            "incident_id": incident_id,
            "analysis": analysis
        })

def start():
    start_consumer_thread(
        queue_name="triage_service",
        binding_keys=["incident.received"],
        handler=_handle_event
    )

