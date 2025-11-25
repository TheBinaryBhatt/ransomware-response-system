import logging
import asyncio
from datetime import datetime
from celery import shared_task, chain
from celery.exceptions import Reject
from sqlalchemy.orm import Session
from core.database import get_db
from core.rabbitmq_utils import publish_event
from core.config import settings

from .models import ResponseIncident
from audit_service.tasks import log_action

import os

logger = logging.getLogger(__name__)
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")


# ---------------------------
# Strategy logic (sync helper)
# ---------------------------
def select_response_strategy_logic(incident: ResponseIncident):
    """
    Given a loaded ResponseIncident instance, return (strategy, actions).
    Kept as pure logic so it can be called synchronously inside the worker.
    """
    triage = incident.triage_result or {}
    decision = triage.get("decision", "unknown")

    # triage agent may use threat_score or score
    score = triage.get("threat_score", triage.get("score", 0))

    try:
        score = int(score)
    except Exception:
        score = 0

    # Decision logic
    if decision == "confirmed_ransomware" or score >= 80:
        strategy = "full_auto"
        actions = ["quarantine_host", "block_ip", "escalate", "collect_forensics"]

    elif decision == "escalate_human" or 40 <= score < 80:
        strategy = "semi_auto"
        actions = ["block_ip", "escalate"]

    else:
        strategy = "analyst_only"
        actions = ["escalate"]

    return strategy, actions


# ============================================================
# Celery wrapper version (optional async strategy selection)
# ============================================================
@shared_task
def select_response_strategy(incident_id: str):
    db: Session = next(get_db())
    try:
        incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
        if not incident:
            logger.error(f"Incident {incident_id} not found for strategy selection")
            return {"error": "not_found"}

        strategy, actions = select_response_strategy_logic(incident)

        incident.response_strategy = strategy
        incident.actions_planned = actions
        incident.updated_at = datetime.utcnow()
        db.commit()

        publish_event("response.strategy.selected", {
            "incident_id": incident_id,
            "strategy": strategy,
            "actions_planned": actions
        })

        return {"incident_id": incident_id, "strategy": strategy, "actions": actions}
    finally:
        db.close()


# ============================================================
# Helper to guarantee actions_taken is a list
# ============================================================
def _ensure_actions_list(incident: ResponseIncident):
    if incident.actions_taken is None:
        incident.actions_taken = []
    if not isinstance(incident.actions_taken, list):
        try:
            incident.actions_taken = list(incident.actions_taken)
        except Exception:
            incident.actions_taken = []


# ============================================================
# EXECUTION TASKS (now using workflow modules)
# ============================================================

@shared_task(bind=True, default_retry_delay=30, max_retries=3)
def quarantine_host(self, incident_id: str, agent_id: str):
    from .workflows.isolate_endpoint import isolate_endpoint

    db: Session = next(get_db())
    try:
        incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
        if not incident:
            logger.error(f"quarantine_host: Incident {incident_id} not found")
            return {"error": "not_found"}

        try:
            result = asyncio.run(isolate_endpoint(agent_id))

            _ensure_actions_list(incident)
            incident.actions_taken.append("quarantine_host")
            incident.response_status = "quarantined"
            incident.updated_at = datetime.utcnow()
            db.commit()

            publish_event("response.quarantine.completed", {
                "incident_id": incident_id,
                "agent_id": agent_id,
                "result": result
            })

            return {"incident_id": incident_id, "agent_id": agent_id, "result": result}

        except Exception as exc:
            logger.exception("Quarantine failed for %s: %s", agent_id, exc)
            try:
                raise self.retry(exc=exc)
            except self.MaxRetriesExceededError:
                raise Reject(exc, requeue=False)
    finally:
        db.close()


@shared_task(bind=True, default_retry_delay=30, max_retries=3)
def block_ip(self, incident_id: str):
    from .workflows.block_iocs import block_ip_firewall

    db: Session = next(get_db())
    try:
        incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
        if not incident:
            return {"error": "not_found"}

        ip = (incident.raw_data or {}).get("source_ip")
        if not ip:
            logger.warning(f"No source_ip in incident {incident_id}")
            return {"incident": incident_id, "skipped": True}

        try:
            result = asyncio.run(block_ip_firewall(ip))

            _ensure_actions_list(incident)
            incident.actions_taken.append("block_ip")
            incident.response_status = "ip_blocked"
            incident.updated_at = datetime.utcnow()
            db.commit()

            publish_event("response.block_ip.completed", {
                "incident_id": incident_id,
                "ip": ip,
                "result": result
            })

            return {"incident_id": incident_id, "ip": ip, "result": result}

        except Exception as exc:
            logger.exception("block_ip failed for %s: %s", ip, exc)
            try:
                raise self.retry(exc=exc)
            except self.MaxRetriesExceededError:
                raise Reject(exc, requeue=False)
    finally:
        db.close()


@shared_task
def escalate(incident_id: str):
    from .workflows.notify_soc import notify_soc

    notify_soc(incident_id, severity="high")

    db: Session = next(get_db())
    try:
        incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()

        if incident:
            _ensure_actions_list(incident)
            incident.actions_taken.append("escalate")
            incident.response_status = "escalation_sent"
            incident.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

    publish_event("response.escalation.triggered", {"incident_id": incident_id})
    return {"incident_id": incident_id}




@shared_task
def collect_forensics(incident_id: str):
    from .workflows.forensics import collect_forensics_data

    result = asyncio.run(collect_forensics_data(incident_id))

    db: Session = next(get_db())
    try:
        incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()

        if incident:
            _ensure_actions_list(incident)
            incident.actions_taken.append("collect_forensics")
            incident.updated_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

    publish_event("response.forensics.collected", result)
    return {"incident_id": incident_id, "result": result}


@shared_task
def finalize_response(incident_id: str):
    db: Session = next(get_db())
    try:
        incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
        if not incident:
            return {"error": "not_found"}

        _ensure_actions_list(incident)
        incident.response_status = "completed"
        incident.updated_at = datetime.utcnow()
        db.commit()

        try:
            log_action.delay(
                action="automated_response_completed",
                target=incident_id,
                status="success",
                details={"actions": incident.actions_taken}
            )
        except Exception:
            logger.exception("Failed to call audit log_action")
    finally:
        db.close()

    publish_event("response.workflow.completed", {
        "incident_id": incident_id,
        "actions": incident.actions_taken
    })

    return {"incident_id": incident_id}
    


# ============================================================
# MAIN WORKFLOW BUILDER
# ============================================================

def build_workflow(strategy: str, incident_id: str, agent_id: str):
    """
    Creates Celery chain depending on selected strategy.
    """
    if strategy == "full_auto":
        return chain(
            quarantine_host.s(incident_id, agent_id),
            block_ip.s(),
            escalate.s(),
            collect_forensics.s(),
            finalize_response.s()
        )

    if strategy == "semi_auto":
        return chain(
            block_ip.s(),
            escalate.s(),
            finalize_response.s()
        )

    if strategy == "analyst_only":
        return chain(
            escalate.s(),
            finalize_response.s()
        )


# ============================================================
# ENTRYPOINT (called by routes)
# ============================================================

@shared_task
def execute_response_actions(incident_id: str, agent_id: str = None):
    """
    Main entrypoint:
    1. Ensure triage exists
    2. Select strategy
    3. Build workflow chain
    4. Execute asynchronously
    """
    db: Session = next(get_db())
    try:
        incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()

        if not incident:
            logger.error("execute_response_actions: incident not found %s", incident_id)
            return {"error": "incident_not_found"}

        triage = incident.triage_result or {}
        if not triage:
            logger.info("[Fallback] Running ResponseAgent triage for %s", incident_id)
            try:
                from .local_ai.response_agent import response_agent
                triage = asyncio.run(response_agent.analyze_incident(incident.raw_data or {}))
                incident.triage_result = triage
                db.commit()
            except Exception:
                logger.exception("Fallback triage failed for %s", incident_id)

        strategy, actions = select_response_strategy_logic(incident)

        incident.response_strategy = strategy
        incident.actions_planned = actions
        incident.updated_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()

    if not strategy:
        return {"error": "strategy_missing"}

    agent_id = agent_id or (incident.raw_data or {}).get("agent_id") or "system"
    workflow = build_workflow(strategy, incident_id, agent_id)
    async_result = workflow.apply_async()

    publish_event("response.workflow.started", {
        "incident_id": incident_id,
        "strategy": strategy,
        "actions": actions,
        "task_id": async_result.id
    })

    logger.info("[Workflow] Started %s for incident %s (task=%s)", strategy, incident_id, async_result.id)

    return {"status": "started", "task_id": async_result.id}


# ============================================================
# Trigger helper (used by API routes)
# ============================================================

def trigger_full_response(incident_id: str, agent_id: str):
    """
    Called by API route.
    Schedules the entire response workflow.
    Returns Celery AsyncResult for execute_response_actions.
    """
    return execute_response_actions.delay(incident_id)
