# backend/response_service/routes.py

from fastapi import (
    APIRouter, HTTPException, Depends, Query, status, Header, Request
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel, Field, ValidationError
from core.database import get_db
from core.models import ResponseIncident, AuditLog
from shared_lib.integrations.abuseipdb_client import abuseipdb_client
from shared_lib.integrations.malwarebazaar_client import malwarebazaar_client
from shared_lib.integrations.virustotal_client import virustotal_client
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi.security import OAuth2PasswordRequestForm

from .auth import authenticate_user, create_access_token, get_current_user
from .tasks import execute_response_actions

from .schemas.timeline import IncidentTimeline, TimelineEntry
from audit_service.local_ai.audit_agent import audit_agent

from datetime import datetime, timezone
import asyncio
import uuid
import os


router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Optional SIEM webhook secret
SIEM_WEBHOOK_KEY = os.environ.get("SIEM_WEBHOOK_KEY", None)


# ---------------------------
# Triage validation schema
# ---------------------------

class TriageResultModel(BaseModel):
    threat_score: Optional[int] = Field(None, ge=0, le=100)
    score: Optional[int] = Field(None, ge=0, le=100)
    threat_level: Optional[str]
    decision: Optional[str]
    recommended_actions: Optional[list] = None
    suggested_actions: Optional[list] = None

    class Config:
        extra = "allow"


# ---------------------------
# Authentication
# ---------------------------

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------
# SIEM Webhook — no OAuth required
# ---------------------------

@router.post("/webhook/siem")
@limiter.limit("10/minute")
async def receive_siem_alert(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_siem_key: Optional[str] = Header(None),
):
    """
    SIEM webhook receiver.
    - If SIEM_WEBHOOK_KEY is defined, requires X-SIEM-KEY header.
    """
    if SIEM_WEBHOOK_KEY and x_siem_key != SIEM_WEBHOOK_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized webhook")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    alert_id = payload.get("alert_id") or f"incident_{uuid.uuid4()}"

    # Parse timestamp safely
    timestamp_str = payload.get("timestamp")
    timestamp = None
    if timestamp_str:
        try:
            if timestamp_str.endswith("Z"):
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            else:
                timestamp = datetime.fromisoformat(timestamp_str)
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
        except Exception:
            timestamp = datetime.utcnow().replace(tzinfo=timezone.utc)
    else:
        timestamp = datetime.utcnow().replace(tzinfo=timezone.utc)

    # Safely build raw_data JSON
    raw_data = payload.copy()

    # normalized fields
    for field in ("source_ip", "agent_id", "file_hash"):
        if field in payload:
            raw_data[field] = payload[field]

    incident = ResponseIncident(
        id=alert_id,
        source="siem_webhook",
        raw_data=raw_data,
        timestamp=timestamp,
        response_status="pending",
    )

    db.add(incident)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Failed to create incident: {e}")

    return {"status": "success", "incident_id": incident.id}


# ---------------------------
# Trigger Response Workflow
# ---------------------------

@router.post("/incidents/{incident_id}/respond")
@limiter.limit("5/minute")
async def respond_to_incident(
    request: Request,
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)

):
    # Enforce that only analysts/admins can trigger responses
    role = user.get("role")
    if role not in ("analyst", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only analysts or admins can trigger automated responses",
        )
    data = await request.json()
    is_automated = data.get("automated", False)

    triage_result_raw = data.get("triage_result")
    analysis = data.get("analysis", {}) or {}
    agent_id = analysis.get("agent_id") or user.get("username")

    # Fetch incident
    result = await db.execute(
        select(ResponseIncident).where(ResponseIncident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(404, "Incident not found")

    # Validate triage if present
    triage_model = None
    if triage_result_raw:
        try:
            triage_model = TriageResultModel(**triage_result_raw)
        except ValidationError as ve:
            raise HTTPException(400, f"Invalid triage_result: {ve}")

    if triage_model:
        incident.triage_result = triage_model.dict()

    if analysis:
        incident.analysis = analysis

    incident.response_status = "pending"
    incident.updated_at = datetime.utcnow()

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(500, "Failed to persist incident before triggering response")

    # Record audit log for response trigger - FIX: Use 'target' field
    try:
        await audit_agent.record_action(
            action="response_triggered",
            target=str(incident_id),
            status="initiated",
            actor=user.get("username", "unknown"),
            resource_type="incident",
            details={
                "automated": is_automated,
                "agent_id": agent_id,
                "triage_provided": bool(triage_model),
            },
        )
    except Exception:
        # We don't block the response on audit failure
        pass

    # Trigger Celery workflow
    async_result = execute_response_actions.delay(incident_id, agent_id)

    incident.current_task_id = async_result.id
    incident.updated_at = datetime.utcnow()

    try:
        await db.commit()
        await db.refresh(incident)
    except Exception as e:
        await db.rollback()
        # Still return task_id even if DB update failed
        return {
            "status": "workflow_triggered",
            "incident_id": incident_id,
            "task_id": async_result.id,
            "warning": f"Task triggered but DB update failed: {e}",
        }

    return {
        "status": "workflow_triggered",
        "incident_id": incident_id,
        "task_id": async_result.id,
        "triage_ingested": bool(triage_model),
        "triggered_by": agent_id,
    }



# ---------------------------
# Workflow Status
# ---------------------------

@router.get("/workflows/{incident_id}/status")
async def get_workflow_status(
    request: Request,
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user)
):
    result = await db.execute(
        select(ResponseIncident).where(ResponseIncident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(404, "Incident not found")

    task_id = incident.current_task_id
    if not task_id:
        return {"status": "not_started"}

    from celery.result import AsyncResult
    async_result = AsyncResult(task_id)
    return {"state": async_result.state, "info": async_result.info}


# ---------------------------
# Threat Intel Endpoints
# ---------------------------

@router.get("/threatintel/abuseipdb")
@limiter.limit("10/minute")
async def query_abuseipdb(
    request: Request,
    ip: str = Query(...),
    user=Depends(get_current_user)
):
    if not abuseipdb_client.is_configured():
        raise HTTPException(400, "AbuseIPDB integration not configured")
    try:
        async with abuseipdb_client:
            data = await abuseipdb_client.check_ip(ip)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(500, f"AbuseIPDB query failed: {e}")


@router.get("/threatintel/malwarebazaar")
@limiter.limit("10/minute")
async def query_malwarebazaar(
    request: Request,
    hash: str = Query(...),
    user=Depends(get_current_user)
):
    if not malwarebazaar_client.is_configured():
        raise HTTPException(400, "MalwareBazaar integration not configured")
    try:
        async with malwarebazaar_client:
            data = await malwarebazaar_client.query_hash(hash)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(500, f"MalwareBazaar query failed: {e}")


@router.get("/threatintel/virustotal")
@limiter.limit("10/minute")
async def query_virustotal(
    request: Request,
    resource: str = Query(...),
    user=Depends(get_current_user)
):
    if not virustotal_client or not virustotal_client.is_configured():
        raise HTTPException(400, "VirusTotal integration not configured")

    loop = asyncio.get_running_loop()

    def is_hash(v: str):
        return len(v) in (32, 40, 64) and all(c in "0123456789abcdefABCDEF" for c in v)

    def is_ip(v: str):
        return "." in v and v.replace(".", "").isdigit()

    try:
        if is_ip(resource):
            result = await loop.run_in_executor(None, virustotal_client.get_ip_report, resource)
        elif is_hash(resource):
            result = await loop.run_in_executor(None, virustotal_client.get_file_report, resource)
        else:
            result = await loop.run_in_executor(None, virustotal_client.get_domain_report, resource)

        return {"status": "success", "data": result}

    except Exception as e:
        raise HTTPException(500, f"VirusTotal lookup failed: {e}")


# ---------------------------
# INCIDENT TIMELINE
# ---------------------------

# ---------------------------
# INCIDENT TIMELINE (UPGRADED)
# ---------------------------

@router.get("/incidents/{incident_id}/timeline", response_model=IncidentTimeline)
async def get_incident_timeline(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)

):
    # 1) Load incident
    result = await db.execute(
        select(ResponseIncident).where(ResponseIncident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(404, "Incident not found")

    triage = incident.triage_result or {}
    analysis = incident.analysis or {}

    # 2) Load audit logs - FIX: Use 'target' column
    audit_rows = await db.execute(
        select(AuditLog)
        .where(AuditLog.target == incident_id)  # Now exists
        .order_by(AuditLog.created_at.asc())
    )
    audit_logs = audit_rows.scalars().all()

    events: List[TimelineEntry] = []

    for row in audit_logs:
        events.append(
            TimelineEntry(
                timestamp=row.created_at,  # Alias works
                event_type=row.action,  # Corrected column name
                source=row.actor,  # Corrected column name
                details=row.details or {},
            )
        )

    # 3) Include synthetic events for triage + response metadata

    # --- TRIAGE SUMMARY ---
    events.insert(
        0,
        TimelineEntry(
            timestamp=incident.timestamp,
            event_type="triage_summary",
            source="triage_agent",
            details={
                "threat_score": triage.get("threat_score"),
                "threat_level": triage.get("threat_level"),
                "decision": triage.get("decision"),
                "confidence": triage.get("confidence"),
                "recommended_actions": triage.get("recommended_actions") or triage.get("suggested_actions"),
                "sigma_matches": triage.get("sigma_matches"),
                "yara_matches": triage.get("yara_matches"),
                "intel": triage.get("intel"),
                "reasoning": triage.get("reasoning"),
            },
        ),
    )

    # --- RESPONSE SUMMARY ---
    events.append(
        TimelineEntry(
            timestamp=datetime.utcnow().replace(tzinfo=timezone.utc),
            event_type="response_summary",
            source="response_agent",
            details={
                "response_strategy": incident.response_strategy,
                "actions_planned": incident.actions_planned,
                "actions_taken": incident.actions_taken,
                "response_status": incident.response_status,
            },
        )
    )

    # 4) Sort again just in case
    events = sorted(events, key=lambda x: x.timestamp)

    # 5) Return final SOC-friendly timeline
    return IncidentTimeline(
        incident_id=incident_id,
        score=triage.get("threat_score") or triage.get("score"),
        threat_level=triage.get("threat_level"),
        decision=triage.get("decision"),
        recommended_actions=triage.get("recommended_actions") or triage.get("suggested_actions"),
        events=events,
    )
