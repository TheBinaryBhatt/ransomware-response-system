# backend/response_service/consumer.py
import os
import logging
import asyncio
from typing import Dict, Optional
from sqlalchemy import select
from core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Load consumer starter
try:
    from shared_lib.events.rabbitmq import start_consumer_thread as _start_consumer_helper
except Exception:
    try:
        from shared_lib.events.rabbitmq import start_consumer as _start_consumer_helper
    except Exception:
        _start_consumer_helper = None

from shared_lib.events.rabbitmq import publish_event
from response_service.local_ai.response_agent import response_agent
from .models import ResponseIncident

QUEUE_NAME = os.getenv("RESPONSE_QUEUE", "response.incidents")
BINDING_KEYS = os.getenv("RESPONSE_BINDINGS", "triage.completed,incident.triaged").split(",")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")

# main_loop will be set by the caller (startup) so we always schedule DB operations on the main uvicorn loop
MAIN_LOOP: Optional[asyncio.AbstractEventLoop] = None


async def _process(payload: Dict):
    incident_id = payload.get("incident_id")
    triage_result = payload.get("triage_result", {}) or {}
    raw_data = payload.get("raw_data") or triage_result.get("raw_data", {})

    try:
        # AI agent (async)
        decision = await response_agent.analyze_incident({
            "incident_id": incident_id,
            **(triage_result if isinstance(triage_result, dict) else {}),
            "raw_data": raw_data
        })

        # DB save/update performed inside AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(ResponseIncident).where(ResponseIncident.id == incident_id))
            incident = result.scalar_one_or_none()

            if not incident:
                incident = ResponseIncident(
                    id=incident_id,
                    siem_alert_id=(raw_data.get("alert_id") if isinstance(raw_data, dict) else incident_id),
                    source=(raw_data.get("source") if isinstance(raw_data, dict) else "triage_service"),
                    raw_data=raw_data,
                    triage_result=triage_result,
                    response_status="pending"
                )
                db.add(incident)
            else:
                incident.triage_result = triage_result
                incident.response_status = "pending"

            await db.commit()

        # Publish decision (publish_event is async)
        await publish_event("response.selected", {
            "incident_id": incident_id,
            "decision": decision.get("decision") if isinstance(decision, dict) else decision,
            "score": decision.get("score") if isinstance(decision, dict) else None,
            "confidence": decision.get("confidence") if isinstance(decision, dict) else None,
            "suggested_actions": decision.get("actions") if isinstance(decision, dict) else [],
            "full_decision": decision
        }, rabbitmq_host=RABBITMQ_HOST)

        logger.info("[Response] Published decision for %s", incident_id)

    except Exception as e:
        logger.exception("[Response] Error processing %s: %s", incident_id, e)
        try:
            await publish_event("response.failed",
                {"incident_id": incident_id, "error": str(e)},
                rabbitmq_host=RABBITMQ_HOST
            )
        except Exception:
            logger.exception("[Response] Failed publishing response.failed for %s", incident_id)


def _handle_event(routing_key: str, payload: Dict):
    """
    Runs inside consumer thread → schedule onto MAIN_LOOP (the server's loop) to avoid cross-loop futures.
    If MAIN_LOOP is not set, fallback to the current loop (best-effort).
    """
    global MAIN_LOOP

    # If MAIN_LOOP set, then schedule coroutine thread-safely onto that loop
    if MAIN_LOOP:
        try:
            asyncio.run_coroutine_threadsafe(_process(payload), MAIN_LOOP)
            return
        except Exception:
            logger.exception("[Response] Failed to schedule on MAIN_LOOP, falling back to local create_task")

    # Fallback: try to use current running loop
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(_process(payload))
    except RuntimeError:
        # no running loop in this thread — spawn a new background task on a new loop
        def _run():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(_process(payload))
            loop.close()
        t = __import__("threading").Thread(target=_run, daemon=True)
        t.start()


def start(rabbitmq_host: str = None, main_loop: Optional[asyncio.AbstractEventLoop] = None):
    """
    Start the consumer. Pass `main_loop` (the uvicorn/fastapi running loop) so DB coroutines are scheduled there.
    """
    global _start_consumer_helper, MAIN_LOOP
    rabbitmq_host = rabbitmq_host or RABBITMQ_HOST

    # record main loop for scheduling
    if main_loop:
        MAIN_LOOP = main_loop

    if _start_consumer_helper is None:
        logger.error("No RabbitMQ consumer helper available.")
        return None

    return _start_consumer_helper(
        QUEUE_NAME,
        BINDING_KEYS,
        _handle_event,
        rabbitmq_host=rabbitmq_host,
    )
