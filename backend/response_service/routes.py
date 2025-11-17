from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from .models import ResponseIncident
from .integrations.abuseipdb_client import abuseipdb_client
from .integrations.malwarebazaar_client import malwarebazaar_client
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import RequestValidationError
from fastapi.security import OAuth2PasswordRequestForm
from .auth import authenticate_user, create_access_token, get_current_user
from .tasks import trigger_full_response
from datetime import datetime
import uuid
from celery.result import AsyncResult

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/webhook/siem")
@limiter.limit("10/minute")
async def receive_siem_alert(request: Request, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """
    Endpoint to receive SIEM webhook alerts.
    Parses payload, creates incident record.
    """
    payload = await request.json()

    # Basic validation: check required fields, example
    alert_id = payload.get("alert_id")
    if not alert_id:
        alert_id = "incident_" + str(uuid.uuid4())

    source_ip = payload.get("source_ip")
    agent_id = payload.get("agent_id")
    file_hash = payload.get("file_hash")
    timestamp_str = payload.get("timestamp")
    raw_data = payload  # store full raw JSON for audit/debug

    if not timestamp_str:
        timestamp = datetime.utcnow()
    else:
        try:
            timestamp = datetime.fromisoformat(timestamp_str)
        except ValueError:
            timestamp = datetime.utcnow()

    # Create an incident
    incident = ResponseIncident(
        id=alert_id,
        source="siem_webhook",
        raw_data=raw_data,
        timestamp=timestamp,
        status="new",
        response_status="pending",
    )

    # Optional extra metadata
    if source_ip:
        incident.raw_data["source_ip"] = source_ip
    if agent_id:
        incident.raw_data["agent_id"] = agent_id
    if file_hash:
        incident.raw_data["file_hash"] = file_hash

    # Save incident
    db.add(incident)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create incident: {e}")

    return {"status": "success", "incident_id": incident.id}

@router.post("/incidents/{incident_id}/respond")
@limiter.limit("5/minute")
async def respond_to_incident(request: Request, incident_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """
    Trigger the response workflow for this incident.
    Allows both automated AI-agent triggers and analyst-initiated actions.
    """
    # Parse request body (JSON)
    data = await request.json()
    is_automated = data.get("automated", False)
    analysis = data.get("analysis", {})
    agent_id = analysis.get("agent_id", None) or (user["username"] if user else "agentic-ai")

    # Fetch incident
    result = await db.execute(select(ResponseIncident).where(ResponseIncident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Authorization: allow if automated trigger or a real user (analyst)
    if is_automated or user:
        # Optionally: store AI analysis summary if present
        if analysis:
            incident.analysis = analysis  # assuming you have an 'analysis' JSON/Text column
        incident.response_status = "pending"
        
        # Trigger response workflow (Celery/async task/logic)
        task_id = trigger_full_response(incident_id, agent_id)
        incident.current_task_id = task_id
        await db.commit()

        return {
            "status": "workflow_triggered",
            "incident_id": incident_id,
            "task_id": task_id,
            "triggered_by": "AI agent" if is_automated else agent_id
        }
    else:
        raise HTTPException(status_code=403, detail="Unauthorized (must be analyst or automated)")


@router.get("/workflows/{incident_id}/status")
async def get_workflow_status(request: Request, incident_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(ResponseIncident).where(ResponseIncident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    task_id = getattr(incident, "current_task_id", None)
    if not task_id:
        return {"status": "not_started"}

    async_result = AsyncResult(task_id)
    state = async_result.state
    info = async_result.info

    return {"state": state, "info": info}

@router.get("/threatintel/abuseipdb")
@limiter.limit("10/minute")
async def query_abuseipdb(request: Request, ip: str = Query(..., description="IP address"), user=Depends(get_current_user)):
    if not abuseipdb_client.is_configured():
        raise HTTPException(status_code=400, detail="AbuseIPDB integration not configured")
    try:
        async with abuseipdb_client:
            data = await abuseipdb_client.check_ip(ip)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AbuseIPDB query failed: {e}") from e

@router.get("/threatintel/malwarebazaar")
@limiter.limit("10/minute")
async def query_malwarebazaar(request: Request, hash: str = Query(..., description="File hash"), user=Depends(get_current_user)):
    try:
        async with malwarebazaar_client:
            data = await malwarebazaar_client.query_hash(hash)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MalwareBazaar query failed: {e}") from e

# Rate limit exception handler will be added to main app, not router
