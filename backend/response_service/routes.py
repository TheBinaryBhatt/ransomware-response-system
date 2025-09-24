from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
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
async def receive_siem_alert(request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
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
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create incident: {e}")

    return {"status": "success", "incident_id": incident.id}


@router.post("/incidents/{incident_id}/respond")
@limiter.limit("5/minute")
async def respond_to_incident(incident_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    agent_id = incident.raw_data.get("agent_id")
    if not agent_id:
        raise HTTPException(status_code=400, detail="Incident missing agent_id for response")

    # Trigger the full async workflow
    task_id = trigger_full_response(incident_id, agent_id)

    # Save task id for monitoring
    incident.current_task_id = task_id
    db.commit()

    return {"status": "workflow_triggered", "incident_id": incident_id, "task_id": task_id}


@router.get("/workflows/{incident_id}/status")
async def get_workflow_status(incident_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    incident = db.query(ResponseIncident).filter(ResponseIncident.id == incident_id).first()
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
async def query_abuseipdb(ip: str = Query(..., description="IP address"), user=Depends(get_current_user)):
    try:
        async with abuseipdb_client:
            data = await abuseipdb_client.check_ip(ip)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AbuseIPDB query failed: {e}")


@router.get("/threatintel/malwarebazaar")
@limiter.limit("10/minute")
async def query_malwarebazaar(hash: str = Query(..., description="File hash"), user=Depends(get_current_user)):
    try:
        async with malwarebazaar_client:
            data = await malwarebazaar_client.query_hash(hash)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MalwareBazaar query failed: {e}")

@router.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
