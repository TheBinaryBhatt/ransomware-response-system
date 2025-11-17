import logging
import asyncio
from datetime import datetime
from celery import shared_task, chain
from celery.exceptions import Reject
from core.database import get_db
from sqlalchemy.orm import Session
from .models import ResponseIncident
from .integrations.wazuh_client import wazuh_client
from .integrations.pfsense_client import pfsense_client
from .integrations.abuseipdb_client import abuseipdb_client
from .integrations.malwarebazaar_client import malwarebazaar_client
from audit_service.tasks import log_action
import pika
import json
from core.rabbitmq_utils import publish_event
import os
from core.config import settings

logger = logging.getLogger(__name__)
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'rabbitmq')


@shared_task(bind=True, default_retry_delay=30, max_retries=3)
def quarantine_host(self, incident_id: str, agent_id: str):
    db: Session = next(get_db())
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()

    try:
        if not settings.is_integration_enabled("wazuh"):
            logger.info("Wazuh integration disabled; skipping quarantine action")
            if incident:
                actions = incident.actions_taken or []
                actions.append("quarantine_host_skipped")
                incident.actions_taken = actions
                incident.response_status = "quarantine_skipped"
                incident.updated_at = datetime.utcnow()
                db.commit()
            return {"incident_id": incident_id, "agent_id": agent_id, "skipped": True}

        async def run_quarantine():
            async with wazuh_client:
                return await wazuh_client.quarantine_agent(agent_id)

        result = asyncio.run(run_quarantine())
        logger.info(f"Wazuh quarantined agent {agent_id}: {result}")

        actions = incident.actions_taken or []
        actions.append("quarantine_host")
        incident.actions_taken = actions
        incident.response_status = "quarantined_host"
        incident.updated_at = datetime.utcnow()
        db.commit()

        # Publish event notifying quarantine completion
        publish_event(
            'response.quarantine_host.completed',
            {'incident_id': incident_id, 'agent_id': agent_id, 'result': result},
            rabbitmq_host=RABBITMQ_HOST
        )

        return {"incident_id": incident_id, "agent_id": agent_id}

    except Exception as exc:
        logger.error(f"Failed to quarantine host {agent_id}: {exc}")
        if incident:
            incident.response_status = "error"
            incident.error_message = str(exc)
            incident.updated_at = datetime.utcnow()
            db.commit()

        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            raise Reject(exc, requeue=False)

        

@shared_task(bind=True, default_retry_delay=30, max_retries=3)
def block_ip(self, context: dict):
    incident_id = context["incident_id"]
    db: Session = next(get_db())
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
    ip = incident.raw_data.get("source_ip")

    try:
        if not settings.is_integration_enabled("pfsense"):
            logger.info("pfSense integration disabled; skipping block_ip action")
            if incident:
                actions = incident.actions_taken or []
                actions.append("block_ip_skipped")
                incident.actions_taken = actions
                incident.response_status = "block_ip_skipped"
                incident.updated_at = datetime.utcnow()
                db.commit()
            context = dict(context)
            context["ip"] = ip
            context["block_ip_skipped"] = True
            return context

        async def run_block():
            async with pfsense_client:
                return await pfsense_client.block_ip(ip)

        result = asyncio.run(run_block())
        logger.info(f"pfSense blocked IP {ip}: {result}")

        actions = incident.actions_taken or []
        actions.append("block_ip")
        incident.actions_taken = actions
        incident.response_status = "blocked_ip"
        incident.updated_at = datetime.utcnow()
        db.commit()
        publish_event(
            'response.block_ip.completed',
            {'incident_id': incident_id, 'ip': ip}
        )
        context = dict(context)
        context["ip"] = ip
        return context
    except Exception as exc:
        logger.error(f"Failed to block IP {ip}: {exc}")
        if incident:
            incident.response_status = "error"
            incident.error_message = str(exc)
            incident.updated_at = datetime.utcnow()
            db.commit()
        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            raise Reject(exc, requeue=False)


@shared_task
def enrich_threat_intel(context: dict):
    incident_id = context["incident_id"]
    db: Session = next(get_db())
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
    intel = {}

    if not settings.is_integration_enabled("abuseipdb") and not settings.is_integration_enabled("malwarebazaar"):
        logger.info("Threat intel integrations disabled; skipping enrichment")
        incident.threat_intel = {}
        incident.updated_at = datetime.utcnow()
        db.commit()
        context = dict(context)
        context["intel"] = {}
        context["escalate"] = False
        return context

    async def gather_intel():
        intel_data = {}
        ip = incident.raw_data.get("source_ip")
        file_hash = incident.raw_data.get("file_hash")

        if ip and settings.is_integration_enabled("abuseipdb"):
            try:
                if not abuseipdb_client.is_configured():
                    logger.warning("AbuseIPDB client not configured; skipping IP enrichment")
                else:
                    async with abuseipdb_client:
                        abuse_data = await abuseipdb_client.check_ip(ip)
                        intel_data["abuseipdb"] = abuse_data
                        if abuse_data.get("confidence", 0) > 80:
                            intel_data["high_risk_ip"] = True
            except Exception as e:
                logger.error(f"AbuseIPDB query failed for {ip}: {e}")

        if file_hash and settings.is_integration_enabled("malwarebazaar"):
            try:
                async with malwarebazaar_client:
                    mb_data = await malwarebazaar_client.query_hash(file_hash)
                    intel_data["malwarebazaar"] = mb_data
                    if mb_data.get("query_status") == "ok" and mb_data.get("data"):
                        intel_data["malicious_file_detected"] = True
            except Exception as e:
                logger.error(f"MalwareBazaar query failed for {file_hash}: {e}")

        return intel_data

    intel = asyncio.run(gather_intel())
    logger.info(f"Threat intel gathered for incident {incident_id}: {intel}")

    incident.threat_intel = intel
    incident.updated_at = datetime.utcnow()
    db.commit()

    context["intel"] = intel
    context["escalate"] = intel.get("high_risk_ip", False) or intel.get("malicious_file_detected", False)

    return context


@shared_task
def escalate_response(context: dict):
    incident_id = context["incident_id"]
    db: Session = next(get_db())
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()

    logger.info(f"Escalation triggered for incident {incident_id}")

    incident.response_status = "escalated"
    incident.updated_at = datetime.utcnow()
    db.commit()

    # Add additional escalation logic here if needed.

    return context


@shared_task
def conditional_escalation(context: dict):
    if context.get("escalate"):
        return escalate_response(context)
    else:
        return context


@shared_task
def finalize_response(context: dict):
    incident_id = context["incident_id"]
    intel = context.get("intel", {})
    db: Session = next(get_db())
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()

    incident.response_status = "action_taken"
    actions = incident.actions_taken or []
    if "quarantine_host" not in actions:
        actions.append("quarantine_host")
    if "block_ip" not in actions:
        actions.append("block_ip")
    incident.actions_taken = actions
    incident.threat_intel = intel
    incident.updated_at = datetime.utcnow()

    db.commit()

    log_action.delay(
        action="ransomware_response",
        target=incident_id,
        status="success",
        details={"actions": incident.actions_taken, "threat_intel": intel},
    )

    publish_event(
        "response.workflow.completed",
        {
            "incident_id": incident_id,
            "actions": incident.actions_taken,
            "threat_intel": intel,
            "status": incident.response_status,
        },
    )

    logger.info(f"Finalized response for incident {incident_id}")
    return {"incident_id": incident_id}


def trigger_full_response(incident_id: str, agent_id: str):
    workflow = chain(
        quarantine_host.s(incident_id, agent_id),
        block_ip.s(),
        enrich_threat_intel.s(),
        conditional_escalation.s(),
        finalize_response.s(),
    )
    publish_event(
        "response.workflow.started",
        {"incident_id": incident_id, "agent_id": agent_id},
    )
    result = workflow.apply_async()
    logger.info(f"Triggered full response workflow for incident {incident_id} with task id {result.id}")
    return result.id


@shared_task
def execute_response_actions(incident_id: str):
    db: Session = next(get_db())
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()

    if not incident:
        logger.error(f"Incident {incident_id} not found")
        return {"status": "error", "error": "Incident not found"}

    agent_id = incident.raw_data.get("agent_id")
    if agent_id:
        trigger_full_response(incident_id, agent_id)
        return {"status": "workflow_triggered", "incident_id": incident_id}
    else:
        logger.error(f"No agent_id found for incident {incident_id}")
        return {"status": "error", "error": "No agent_id found"}


@shared_task(bind=True)
def handle_workflow_failure(self, incident_id: str, exc: Exception):
    db: Session = next(get_db())
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
    if not incident:
        logger.error(f"Workflow failure for unknown incident {incident_id}")
        return

    incident.response_status = "error"
    incident.error_message = str(exc)
    incident.updated_at = datetime.utcnow()
    db.commit()

    from alerting_service.tasks import send_alert
    send_alert.delay(
        target=incident.id,
        message=f"Automated response workflow failed: {exc}",
        severity="critical",
    )

    log_action.delay(
        action="ransomware_response_failed",
        target=incident.id,
        status="failed",
        details={"error": str(exc)},
    )
    logger.error(f"Workflow failure for incident {incident_id}: {exc}")
