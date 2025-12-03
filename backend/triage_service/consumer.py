import asyncio
import logging
import json
import uuid # <--- Ensure this is imported
from typing import Dict, Any

from shared_lib.events.rabbitmq import start_consumer, publish_event
from .local_ai.triage_agent import triage_agent
from audit_service.local_ai.audit_agent import audit_agent
from core.models import TriageIncident  # Import from core
from core.database import AsyncSessionLocal  # Ensure async
from sqlalchemy import select

logger = logging.getLogger(__name__)

QUEUE_NAME = "triage.events"
BINDING_KEYS = ["incident.received"]

def _make_json_serializable(obj: Any):
    try:
        json.dumps(obj)
        return obj
    except Exception:
        if hasattr(obj, "to_dict"):
            try:
                return obj.to_dict()
            except Exception:
                pass
        return str(obj)

async def _handle_event(routing_key: str, payload: Dict):
    logger.info("[Triage] Handling event %s -> %s", routing_key, payload)

    incident_id_str = payload.get("incident_id")
    if not incident_id_str:
        logger.error("[Triage] Missing incident_id in payload")
        return

    # >>> CRITICAL FIX: Convert to UUID Object for Database <<<
    try:
        incident_uuid = uuid.UUID(str(incident_id_str))
    except ValueError:
        logger.error(f"[Triage] Invalid UUID string: {incident_id_str}")
        return

    # Run Agent
    raw_result = await triage_agent.analyze_incident(payload)

    # Normalize Result
    result: Dict[str, Any]
    if isinstance(raw_result, dict):
        result = raw_result
    else:
        try:
            result = dict(raw_result)
        except Exception:
            result = {
                "decision": str(raw_result),
                "confidence": 0.0,
                "reasoning": "",
                "recommended_actions": []
            }

    for k, v in list(result.items()):
        result[k] = _make_json_serializable(v)

    # Database Operation - FIX: Use ORM fully, no raw SQL
    try:
        async with AsyncSessionLocal() as db:
            # Check using UUID object
            existing_stmt = await db.execute(
                select(TriageIncident).where(TriageIncident.id == incident_uuid)
            )
            existing = existing_stmt.scalar_one_or_none()

            if existing:
                existing.decision = result.get("decision")
                existing.confidence = float(result.get("confidence", 0.0) or 0.0)
                existing.reasoning = result.get("reasoning", "")
                existing.status = "triaged"
                existing.actions = result.get("recommended_actions") or result.get("actions") or []
            else:
                # Create new using UUID object - SQLAlchemy binds natively
                triage_incident = TriageIncident(
                    id=incident_uuid,  # Native UUID bind (no cast)
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
            logger.info("[Triage] Saved result for %s", incident_uuid)
    except Exception as e:
        logger.exception("[Triage] Failed to save triage result to database: %s", e)

    # Audit Log
    try:
        await audit_agent.record_action(
            action="triage_completed",
            target=str(incident_uuid),
            status="success",
            actor="triage_service",
            resource_type="incident",
            details=result,
        )
    except Exception:
        logger.warning("[Triage] Failed to record audit log")

    # Publish Event
    try:
        await publish_event("triage.completed", {
            "incident_id": str(incident_uuid),
            "triage_result": result,
        })
    except Exception:
        logger.exception("[Triage] Failed to publish triage.completed")

    logger.info("[Triage] Published triage.completed for %s", incident_uuid)

def start_consumer_background(loop: asyncio.AbstractEventLoop):
    logger.info("[Triage] Starting async consumer (queue=%s)", QUEUE_NAME)
    loop.create_task(
        start_consumer(
            queue_name=QUEUE_NAME,
            binding_keys=BINDING_KEYS,
            handler=_handle_event,
            rabbitmq_host="rabbitmq",
            prefetch=5,
        )
    )