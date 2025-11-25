# backend/response_service/consumer.py
import os
import logging
import asyncio
from typing import Dict

from sqlalchemy import select

from core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Try to import both possible helpers (compat layer). One of these should exist in shared_lib.events.rabbitmq
try:
    # preferred helper if available (spawns a thread running an async consumer)
    from shared_lib.events.rabbitmq import start_consumer_thread as _start_consumer_helper
except Exception:
    try:
        # older/simpler name
        from shared_lib.events.rabbitmq import start_consumer as _start_consumer_helper
    except Exception:
        _start_consumer_helper = None

from shared_lib.events.rabbitmq import publish_event

# Local agent
from response_service.local_ai.response_agent import response_agent
from .models import ResponseIncident

# Config
QUEUE_NAME = os.getenv("RESPONSE_QUEUE", "response.incidents")
BINDING_KEYS = os.getenv("RESPONSE_BINDINGS", "triage.completed,incident.triaged").split(",")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")


async def _process_and_publish(payload: Dict):
    """
    Async processing pipeline:
      - call response_agent.analyze_incident (async)
      - publish response.selected with complete decision + intel
    """
    incident_id = payload.get("incident_id")
    triage_result = payload.get("triage_result", {})
    try:
        # call the async analyze_incident (agent returns dict)
        decision = await response_agent.analyze_incident({
            "id": incident_id,
            "incident_id": incident_id,
            **triage_result,
            "raw_data": payload.get("raw_data") or {}
        })

        # Create or update ResponseIncident
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ResponseIncident).where(ResponseIncident.id == incident_id)
            )
            incident = result.scalar_one_or_none()
            
            if not incident:
                # Extract data from payload
                triage_result = payload.get("triage_result", {})
                raw_data = payload.get("raw_data") or payload.get("triage_result", {}).get("raw_data", {})
                
                incident = ResponseIncident(
                    id=incident_id,
                    siem_alert_id=raw_data.get("alert_id", incident_id),
                    source=raw_data.get("source", "triage_service"),
                    raw_data=raw_data,
                    triage_result=triage_result,
                    response_status="pending"
                )
                db.add(incident)
            else:
                # Update existing incident with triage result
                incident.triage_result = payload.get("triage_result", {})
                incident.response_status = "pending"
            
            await db.commit()
    
        event_body = {
            "incident_id": incident_id,
            "decision": decision.get("decision", None) or decision.get("decision_text", None) or decision.get("decision_text", ""),
            "score": decision.get("score", decision.get("score", None)),
            "confidence": decision.get("confidence", None),
            "suggested_actions": decision.get("suggested_actions") or decision.get("actions") or [],
            "full_decision": decision,  # full payload for audit / UI
        }

        await publish_event("response.selected", event_body, rabbitmq_host=RABBITMQ_HOST)
        logger.info("[Response] Published response.selected for %s (score=%s)", incident_id, event_body.get("score"))

    except Exception as e:
        logger.exception("[Response] analyze/publish failed for %s: %s", incident_id, e)
        await publish_event("response.failed", {"incident_id": incident_id, "error": str(e)}, rabbitmq_host=RABBITMQ_HOST)


def _handle_event(routing_key: str, payload: Dict):
    """
    Synchronous handler invoked by the thread-based consumer.
    We start a short-lived asyncio task to run the async pipeline (safe in worker thread).
    """
    logger.info("[Response] Received %s -> %s", routing_key, {"incident_id": payload.get("incident_id")})
    try:
        # asyncio.run is safe for short blocking tasks executed in a thread (created by start_consumer_thread)
        asyncio.run(_process_and_publish(payload))
    except Exception:
        # final safety net (should be logged in _process_and_publish)
        logger.exception("[Response] Unexpected failure handling event for %s", payload.get("incident_id"))
        try:
            asyncio.run(publish_event("response.failed", {"incident_id": payload.get("incident_id"), "error": "handler_crash"}, rabbitmq_host=RABBITMQ_HOST))
        except Exception:
            logger.exception("[Response] Failed to publish response.failed")


_consumer_thread = None


def start(rabbitmq_host: str = None):
    """
    Start the background consumer. This function is called from response_service.main startup.
    """
    global _consumer_thread
    rabbitmq_host = rabbitmq_host or RABBITMQ_HOST

    if _start_consumer_helper is None:
        logger.error("[Response] No consumer-start helper found in shared_lib.events.rabbitmq. Cannot start consumer.")
        return None

    # if already started, return existing
    try:
        # if the helper is a start_consumer style (async consumer starter), it may return a task or tag
        _consumer_thread = _start_consumer_helper(
            QUEUE_NAME,
            BINDING_KEYS,
            _handle_event,
            rabbitmq_host=rabbitmq_host,
        )
        logger.info("[Response] Consumer started (queue=%s bindings=%s host=%s)", QUEUE_NAME, BINDING_KEYS, rabbitmq_host)
    except Exception as e:
        logger.exception("[Response] Failed starting consumer: %s", e)
        _consumer_thread = None

    return _consumer_thread
