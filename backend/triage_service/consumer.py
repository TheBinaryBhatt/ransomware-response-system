# backend/triage_service/consumer.py

import asyncio
import logging
import json
from typing import Dict, Any

from shared_lib.events.rabbitmq import start_consumer, publish_event
from .local_ai.triage_agent import triage_agent  # your AI agent
from core.models import TriageIncident
from core.models import ResponseIncident
from audit_service.local_ai.audit_agent import audit_agent
import uuid
logger = logging.getLogger(__name__)

QUEUE_NAME = "triage.events"
BINDING_KEYS = ["incident.received"]


def _make_json_serializable(obj: Any):
    """
    Small helper to coerce objects into JSON-serializable equivalents.
    If complex, fallback to str(obj).
    """
    try:
        # quick test
        json.dumps(obj)
        return obj
    except Exception:
        # attempt to convert common container types
        if hasattr(obj, "to_dict"):
            try:
                return obj.to_dict()
            except Exception:
                pass
        # fallback to string
        return str(obj)


async def _handle_event(routing_key: str, payload: Dict):
    """Async handler for triage logic."""
    logger.info("[Triage] Handling event %s -> %s", routing_key, payload)

    incident_id_str = payload.get("incident_id")
    if not incident_id_str:
        logger.error("[Triage] Missing incident_id in payload")
        return

    # >>> CRITICAL FIX: Convert string to UUID for database query
    try:
        incident_id = uuid.UUID(str(incident_id_str))
    except ValueError:
        logger.error("[Triage] Invalid UUID format for incident_id: %s", incident_id_str)
        return

    # >>> Run your triage agent here
    raw_result = await triage_agent.analyze_incident(payload)

    # Normalize result to a plain dict we can persist/publish
    result: Dict[str, Any]
    if isinstance(raw_result, dict):
        result = raw_result
    else:
        # try to coerce into a dict
        try:
            result = dict(raw_result)
        except Exception:
            # best-effort extraction of common fields
            result = {
                "decision": getattr(raw_result, "decision", None) or getattr(raw_result, "label", None) or str(raw_result),
                "confidence": getattr(raw_result, "confidence", 0.0),
                "reasoning": getattr(raw_result, "reasoning", "") or getattr(raw_result, "explanation", "") or "",
                "recommended_actions": getattr(raw_result, "recommended_actions", []) or getattr(raw_result, "actions", []) or []
            }

    # Ensure all values are JSON-serializable
    for k, v in list(result.items()):
        result[k] = _make_json_serializable(v)

    from .models import TriageIncident
    from core.database import AsyncSessionLocal
    from sqlalchemy import select

    try:
        async with AsyncSessionLocal() as db:
            # Check if incident already exists - USING THE UUID OBJECT
            existing_stmt = await db.execute(
                select(TriageIncident).where(TriageIncident.id == incident_id)
            )
            existing = existing_stmt.scalar_one_or_none()

            if existing:
                # Update existing
                existing.decision = result.get("decision")
                existing.confidence = float(result.get("confidence", 0.0) or 0.0)
                existing.reasoning = result.get("reasoning", "")
                existing.status = "triaged"
                existing.actions = result.get("recommended_actions") or result.get("actions") or []
            else:
                # Create new
                triage_incident = TriageIncident(
                        id=incident_id,  # Only use 'id'
                        # incident_id=incident_id,  <--- REMOVED THIS LINE
                        source=payload.get("raw_data", {}).get("source", "unknown"),
                        raw_data=payload.get("raw_data", {}),
                        decision=result.get("decision"),
                        confidence=float(result.get("confidence", 0.0) or 0.0),
                        reasoning=result.get("reasoning", ""),
                        status="triaged",
                        actions=result.get("recommended_actions") or result.get("actions") or []
                )
                db.add(triage_incident)

            await db.commit()
    except Exception as e:
        logger.exception("[Triage] Failed to save triage result to database: %s", e)
    
    # ... rest of the function remains the same ...
    # Record audit log for triage completion
    try:
        await audit_agent.record_action(
            action="triage_completed",
            target=str(incident_id),
            status="success",
            actor="triage_service",
            resource_type="incident",
            details={
                "decision": result.get("decision"),
                "threat_score": result.get("threat_score") or result.get("score"),
                "threat_level": result.get("threat_level"),
                "recommended_actions": result.get("recommended_actions") or result.get("actions"),
            },
        )
    except Exception:
        logger.warning("[Triage] Failed to record audit log", exc_info=True)

    # >>> Publish triage completion event with JSON-serializable body
    try:
        await publish_event("triage.completed", {
            "incident_id": str(incident_id), # Convert back to string for JSON payload
            "triage_result": result,
        })
    except Exception:
        logger.exception("[Triage] Failed to publish triage.completed")

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
