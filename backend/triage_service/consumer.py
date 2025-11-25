# backend/triage_service/consumer.py

import asyncio
import logging
from typing import Dict

from shared_lib.events.rabbitmq import start_consumer, publish_event
from .local_ai.triage_agent import triage_agent  # your AI agent

logger = logging.getLogger(__name__)

QUEUE_NAME = "triage.events"
BINDING_KEYS = ["incident.received"]


async def _handle_event(routing_key: str, payload: Dict):
    """Async handler for triage logic."""
    logger.info("[Triage] Handling event %s -> %s", routing_key, payload)

    incident_id = payload.get("incident_id")

    # >>> Run your triage agent here
    result = await triage_agent.analyze_incident(payload)

    from .models import TriageIncident
    from core.database import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as db:
            # Check if incident already exists
            from sqlalchemy import select
            result = await db.execute(
                select(TriageIncident).where(TriageIncident.id == incident_id)
            )
            existing = result.scalar_one_or_none()

            if existing:
                # Update existing
                existing.decision = result.get("decision")
                existing.confidence = result.get("confidence", 0.0)
                existing.reasoning = result.get("reasoning", "")
                existing.status = "triaged"
                existing.actions = str(result.get("recommended_actions", []))
            else:
                # Create new
                triage_incident = TriageIncident(
                    id=incident_id,
                    siem_alert_id=payload.get("raw_data", {}).get("alert_id", "unknown"),
                    source=payload.get("raw_data", {}).get("source", "unknown"),
                    raw_data=payload.get("raw_data", {}),
                    decision=result.get("decision"),
                    confidence=result.get("confidence", 0.0),
                    reasoning=result.get("reasoning", ""),
                    status="triaged",
                    actions=str(result.get("recommended_actions", []))
                )
                db.add(triage_incident)

            await db.commit()
    except Exception as e:
        logger.exception("[Triage] Failed to save triage result to database: %s", e)

    # >>> Publish triage completion event
    await publish_event("triage.completed", {
        "incident_id": incident_id,
        "triage_result": result,
    })

    logger.info("[Triage] Published triage.completed for %s", incident_id)


def start_consumer_background(loop: asyncio.AbstractEventLoop):
    """To be called from FastAPI startup."""
    logger.info("[Triage] Starting async consumer (queue=%s)", QUEUE_NAME)

    # Uses aio-pika start_consumer inside an asyncio task
    loop.create_task(
        start_consumer(
            queue_name=QUEUE_NAME,
            binding_keys=BINDING_KEYS,
            handler=_handle_event,
            rabbitmq_host="rabbitmq",
            prefetch=5,  # optional
        )
    )
