# backend/response_service/consumer.py
import os
import logging
import asyncio
import httpx
from typing import Dict, Optional

from sqlalchemy import select
from core.database import AsyncSessionLocal
from core.config import settings
from shared_lib.events.rabbitmq import publish_event
from audit_service.local_ai.audit_agent import audit_agent

from response_service.local_ai.response_agent import response_agent
from .models import ResponseIncident
from .tasks import execute_response_actions

logger = logging.getLogger(__name__)

# Load consumer starter
try:
    from shared_lib.events.rabbitmq import start_consumer_thread as _start_consumer_helper
except Exception:
    try:
        from shared_lib.events.rabbitmq import start_consumer as _start_consumer_helper
    except Exception:
        _start_consumer_helper = None

QUEUE_NAME = os.getenv("RESPONSE_QUEUE", "response.incidents")
BINDING_KEYS = os.getenv("RESPONSE_BINDINGS", "triage.completed,incident.triaged").split(",")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
GATEWAY_URL = os.getenv("GATEWAY_URL", "http://gateway:8000")

# Confidence thresholds for auto-quarantine
AUTO_QUARANTINE_THRESHOLD = 80  # > 80% confidence → auto-quarantine
ANALYST_REVIEW_THRESHOLD = 60   # 60-80% → recommend but ask analyst

# main_loop will be set by the caller (startup) so we always schedule DB operations on the main uvicorn loop
MAIN_LOOP: Optional[asyncio.AbstractEventLoop] = None


async def _auto_quarantine_if_needed(incident: ResponseIncident, triage_result: Dict, raw_data: Dict) -> bool:
    """
    Auto-quarantine the attacker IP based on AI confidence score.
    
    - Confidence > 80%: Auto-quarantine immediately
    - Confidence 60-80%: Notify analyst with recommendation
    - Confidence < 60%: Leave decision to analyst
    
    Returns True if auto-quarantine was triggered.
    """
    if not settings.auto_response_enabled:
        logger.info("[Response] Auto-response disabled, skipping auto-quarantine check")
        return False
    
    # Extract confidence score (0.0 - 1.0 scale in triage)
    confidence = 0.0
    threat_score = 0
    
    if isinstance(triage_result, dict):
        # Confidence is 0.0-1.0, convert to percentage
        confidence = float(triage_result.get("confidence", 0) or 0) * 100
        threat_score = int(triage_result.get("threat_score", 0) or 0)
    
    # Also consider threat_score (0-100 scale)
    effective_score = max(confidence, threat_score)
    
    # Extract source IP from raw_data
    source_ip = None
    if isinstance(raw_data, dict):
        source_ip = raw_data.get("source_ip") or raw_data.get("client_ip") or raw_data.get("ip")
    
    if not source_ip:
        logger.info("[Response] No source IP found for quarantine decision")
        return False
    
    decision = triage_result.get("decision", "") if isinstance(triage_result, dict) else ""
    incident_id = str(incident.id)
    
    # Determine quarantine action based on confidence
    if effective_score > AUTO_QUARANTINE_THRESHOLD:
        # HIGH CONFIDENCE: Auto-quarantine immediately
        logger.info(f"[Response] HIGH CONFIDENCE ({effective_score:.0f}%) - Auto-quarantining IP {source_ip}")
        
        try:
            # Call the gateway internal quarantine API
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{GATEWAY_URL}/api/internal/security/quarantine",
                    json={
                        "ip_address": source_ip,
                        "reason": f"Auto-quarantined: AI confidence {effective_score:.0f}% (threshold: {AUTO_QUARANTINE_THRESHOLD}%)",
                        "attack_type": raw_data.get("attack_type", "unknown") if isinstance(raw_data, dict) else "unknown",
                        "threat_level": "critical" if effective_score >= 90 else "high",
                    },
                    headers={"X-Service-Auth": "response_service"},
                    timeout=10.0
                )
                
                if resp.status_code in (200, 201):
                    logger.info(f"[Response] Successfully auto-quarantined IP {source_ip}")
                    
                    # Mark incident as auto-quarantined
                    incident.response_status = "auto_quarantined"
                    
                    # Emit WebSocket event
                    await publish_event(
                        "security.auto_quarantine",
                        {
                            "incident_id": incident_id,
                            "ip_address": source_ip,
                            "confidence": effective_score,
                            "decision": decision,
                            "action": "auto_quarantined",
                            "reason": f"AI confidence {effective_score:.0f}% exceeds threshold",
                        },
                        rabbitmq_host=RABBITMQ_HOST,
                    )
                    
                    # Record audit log
                    await audit_agent.record_action(
                        action="auto_quarantine_triggered",
                        target=source_ip,
                        status="success",
                        actor="response_service",
                        resource_type="ip_address",
                        details={
                            "incident_id": incident_id,
                            "confidence": effective_score,
                            "threshold": AUTO_QUARANTINE_THRESHOLD,
                            "decision": decision,
                        },
                    )
                    return True
                else:
                    logger.warning(f"[Response] Failed to quarantine IP {source_ip}: {resp.status_code}")
                    
        except Exception as e:
            logger.exception(f"[Response] Error during auto-quarantine for {source_ip}: {e}")
    
    elif effective_score >= ANALYST_REVIEW_THRESHOLD:
        # MEDIUM CONFIDENCE: Recommend quarantine but notify analyst
        logger.info(f"[Response] MEDIUM CONFIDENCE ({effective_score:.0f}%) - Recommending quarantine for IP {source_ip}")
        
        await publish_event(
            "security.quarantine_recommended",
            {
                "incident_id": incident_id,
                "ip_address": source_ip,
                "confidence": effective_score,
                "decision": decision,
                "action": "analyst_review_required",
                "reason": f"AI confidence {effective_score:.0f}% - analyst confirmation recommended",
            },
            rabbitmq_host=RABBITMQ_HOST,
        )
        
        incident.response_status = "pending_analyst_review"
        
    else:
        # LOW CONFIDENCE: Leave to analyst
        logger.info(f"[Response] LOW CONFIDENCE ({effective_score:.0f}%) - Leaving quarantine decision to analyst for IP {source_ip}")
        
        await publish_event(
            "security.analyst_decision_required",
            {
                "incident_id": incident_id,
                "ip_address": source_ip,
                "confidence": effective_score,
                "decision": decision,
                "action": "analyst_decision_required",
                "reason": f"AI confidence {effective_score:.0f}% - analyst decision required",
            },
            rabbitmq_host=RABBITMQ_HOST,
        )
        
        incident.response_status = "pending_analyst_decision"
    
    return False


async def _auto_trigger_if_needed(incident: ResponseIncident, triage_result: Dict, decision: Dict | str) -> None:
    """Optionally auto-start the response workflow based on triage output and config.

    This respects settings.auto_response_enabled and only triggers when no workflow is running yet.
    """
    if not settings.auto_response_enabled:
        return

    # If a workflow is already running, do nothing
    if incident.current_task_id:
        return

    triage = triage_result or {}
    dec = None
    if isinstance(triage, dict):
        dec = (triage.get("decision") or "").lower()
    score_val = None
    if isinstance(triage, dict):
        score_val = triage.get("threat_score") or triage.get("score")

    try:
        score = int(score_val) if score_val is not None else 0
    except Exception:
        score = 0

    should_auto = bool(dec == "confirmed_ransomware" or score >= 80)

    if not should_auto:
        return

    # Fire the Celery workflow
    async_result = execute_response_actions.delay(str(incident.id))
    incident.current_task_id = async_result.id
    incident.response_status = "workflow_started"

    # Emit event + audit log (best-effort, non-blocking)
    try:
        await publish_event(
            "response.workflow.auto_started",
            {
                "incident_id": str(incident.id),
                "task_id": async_result.id,
                "triage_decision": dec,
                "triage_score": score,
            },
            rabbitmq_host=RABBITMQ_HOST,
        )
    except Exception:
        logger.exception("[Response] Failed publishing response.workflow.auto_started for %s", incident.id)

    try:
        await audit_agent.record_action(
            action="auto_response_triggered",
            target=str(incident.id),
            status="initiated",
            actor="response_service",
            resource_type="incident",
            details={
                "decision": dec,
                "score": score,
            },
        )
    except Exception:
        logger.warning("[Response] Failed to record audit for auto_response_triggered")


async def _process(payload: Dict):
    incident_id = payload.get("incident_id")
    triage_result = payload.get("triage_result", {}) or {}
    raw_data = payload.get("raw_data") or triage_result.get("raw_data", {})

    try:
        # AI agent (async)
        decision = await response_agent.analyze_incident({
            "incident_id": incident_id,
            **(triage_result if isinstance(triage_result, dict) else {}),
            "raw_data": raw_data,
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
                    response_status="pending",
                )
                db.add(incident)
            else:
                incident.triage_result = triage_result
                # Reset to pending if new triage result arrives and nothing has started yet
                if not incident.current_task_id:
                    incident.response_status = "pending"

            # Check confidence-based auto-quarantine (>80% → auto-block)
            await _auto_quarantine_if_needed(incident, triage_result, raw_data)

            # Optionally auto-start workflow based on triage+config
            await _auto_trigger_if_needed(incident, triage_result, decision)

            await db.commit()

        # Publish decision (publish_event is async)
        await publish_event(
            "response.selected",
            {
                "incident_id": incident_id,
                "decision": decision.get("decision") if isinstance(decision, dict) else decision,
                "score": decision.get("score") if isinstance(decision, dict) else None,
                "confidence": decision.get("confidence") if isinstance(decision, dict) else None,
                "suggested_actions": decision.get("actions") if isinstance(decision, dict) else [],
                "full_decision": decision,
            },
            rabbitmq_host=RABBITMQ_HOST,
        )

        logger.info("[Response] Published decision for %s", incident_id)

    except Exception as e:
        logger.exception("[Response] Error processing %s: %s", incident_id, e)
        try:
            await publish_event(
                "response.failed",
                {"incident_id": incident_id, "error": str(e)},
                rabbitmq_host=RABBITMQ_HOST,
            )
        except Exception:
            logger.exception("[Response] Failed publishing response.failed for %s", incident_id)


def _handle_event(routing_key: str, payload: Dict):
    """Runs inside consumer thread → schedule onto MAIN_LOOP (the server's loop) to avoid cross-loop futures.

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
    """Start the consumer.

    Pass `main_loop` (the uvicorn/fastapi running loop) so DB coroutines are scheduled there.
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
