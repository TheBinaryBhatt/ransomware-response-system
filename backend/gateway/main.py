"""
API Gateway (FastAPI + Socket.IO) - Option A (merged ASGI app)

Run with:
    uvicorn gateway.main:socket_app --host 0.0.0.0 --port 8000
"""
import os
import logging
import asyncio
from datetime import timedelta, datetime
from uuid import UUID
from typing import Optional, Literal, Any

import httpx
import socketio
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from pydantic import BaseModel, EmailStr, Field

from core.config import settings
from core.database import get_db, test_connection
from core.models import User, Incident
from core.rabbitmq_utils import publish_event
from core.security import (
    verify_password,
    create_access_token,
    get_current_active_user,
    roles_required,
    get_password_hash,
)

from .event_consumer import start as start_event_bridge, stop as stop_event_bridge

logger = logging.getLogger(__name__)

# -------------------------------------------------
# FastAPI + Socket.IO shared ASGI app
# -------------------------------------------------
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting API Gateway...")
    if not await wait_for_db_connection():
        logger.error("[gateway] Database connection failed on startup")
    if not await wait_for_rabbitmq_connection():
        logger.warning("[gateway] RabbitMQ connection failed on startup")
    try:
        await start_event_bridge(handle_domain_event)
        logger.info("[gateway] Event bridge started")
    except Exception:
        logger.exception("[gateway] Event bridge init failed")
    yield  # App runs here
    # Shutdown
    logger.info("[gateway] Shutting down event bridge")
    try:
        await stop_event_bridge()
    except Exception:
        logger.exception("[gateway] Error stopping event bridge")

app = FastAPI(title="API Gateway", version="1.0.0", lifespan=lifespan)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app: Any = socketio.ASGIApp(sio, other_asgi_app=app)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/token")

# -------------------------------------------------
# CORS
# -------------------------------------------------
allowed_origins = os.getenv("GATEWAY_CORS_ORIGINS", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origins] if allowed_origins != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------
# Internal service URLs
# -------------------------------------------------
INGESTION_SERVICE = os.getenv("INGESTION_SERVICE_URL", "http://ingestion_service:8001")
TRIAGE_SERVICE = os.getenv("TRIAGE_SERVICE_URL", "http://triage_service:8002")
RESPONSE_SERVICE = os.getenv("RESPONSE_SERVICE_URL", "http://response_service:8003")
AUDIT_SERVICE = os.getenv("AUDIT_SERVICE_URL", "http://audit_service:8004")

ALLOWED_ROLES = ("admin", "analyst", "auditor", "viewer")


# -------------------------------------------------
# Pydantic models - FIXED: Use Field instead of constr
# -------------------------------------------------
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: Literal["admin", "analyst", "auditor", "viewer"] = "analyst"
    is_active: bool = True


class UserUpdate(BaseModel):
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[Literal["admin", "analyst", "auditor", "viewer"]] = None
    is_active: Optional[bool] = None


def _serialize_user(user: User) -> dict:
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "created_at": user.created_at,
    }


# -------------------------------------------------
# WebSocket Event Helpers
# -------------------------------------------------
async def emit_incident_update(data):
    """Emit a generic incident_update event used by the dashboard widgets."""
    await sio.emit("incident_update", data)


async def handle_domain_event(routing_key: str, payload: dict) -> None:
    """Called by the event bridge. Forwards events to WebSocket.

    We emit both a generic `incident_update` event and a specific event whose
    name matches the RabbitMQ routing key (e.g. `incident.received`,
    `triage.completed`, `response.workflow.completed`). This lets the
    frontend subscribe directly to rich domain events while keeping
    backwards-compatible behaviour for existing widgets.
    """
    try:
        # Generic event for dashboards that just care that *something* changed
        await emit_incident_update({"event": routing_key, "payload": payload})

        # Specific event so hooks like useWebSocketEvent('incident.received') work
        await sio.emit(routing_key, payload)
    except Exception:
        logger.exception("[gateway] Failed forwarding event %s", routing_key)


# -------------------------------------------------
# Database Connection Retry Logic
# -------------------------------------------------
async def wait_for_db_connection(max_retries: int = 30, delay: float = 2.0) -> bool:
    """Wait for database to be ready with retry logic."""
    for attempt in range(max_retries):
        if await test_connection():
            logger.info(f"[gateway] Database connection established on attempt {attempt + 1}")
            return True
        logger.warning(f"[gateway] Database connection failed (attempt {attempt + 1}/{max_retries}), retrying in {delay}s...")
        await asyncio.sleep(delay)
    logger.error("[gateway] Database connection failed after all retries")
    return False


# -------------------------------------------------
# RabbitMQ Connection Retry Logic - ACTUAL IMPLEMENTATION
# -------------------------------------------------
async def wait_for_rabbitmq_connection(max_retries: int = 30, delay: float = 2.0) -> bool:
    """Wait for RabbitMQ to be ready by testing the connection."""
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
    
    for attempt in range(max_retries):
        try:
            # Test RabbitMQ connection by trying to connect
            import aio_pika
            connection = await aio_pika.connect_robust(rabbitmq_url)
            await connection.close()
            logger.info(f"[gateway] RabbitMQ connection established on attempt {attempt + 1}")
            return True
        except Exception as e:
            logger.warning(f"[gateway] RabbitMQ connection failed (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                await asyncio.sleep(delay)
    
    logger.error("[gateway] RabbitMQ connection failed after all retries")
    return False


# -------------------------------------------------
# Authentication
# -------------------------------------------------
@app.post("/token")
async def login_compat(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    return await login(form_data, db)


@app.post("/api/v1/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # 1. Fetch User
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()

    # 2. Check User existence
    if not user:
        print(f"[Auth Debug] User {form_data.username} not found")
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    # 3. Verify Password
    is_valid = verify_password(form_data.password, user.password_hash)
    if not is_valid:
        print(f"[Auth Debug] Password mismatch for {form_data.username}")
        # Debug helper: print hashes (remove in production!)
        # print(f"Stored: {user.password_hash} vs Input: {form_data.password}") 
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # 4. Generate Token
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=30),
    )
    return {"access_token": access_token, "token_type": "bearer"}


# -------------------------------------------------
# User Management
# -------------------------------------------------
@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return _serialize_user(current_user)


analyst_or_admin = roles_required("admin", "analyst")


@app.get("/api/v1/users", dependencies=[Depends(roles_required("admin"))])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return [_serialize_user(u) for u in result.scalars().all()]


@app.get("/api/v1/users/{user_id}", dependencies=[Depends(roles_required("admin"))])
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _serialize_user(user)


@app.post("/api/v1/users", dependencies=[Depends(roles_required("admin"))])
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    if user_in.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Unsupported role")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=user_in.is_active,
        is_superuser=user_in.role == "admin",
    )

    db.add(new_user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Username/email exists")

    await db.refresh(new_user)
    publish_event("user.created", {"user": new_user.username})
    return _serialize_user(new_user)


@app.patch("/api/v1/users/{user_id}", dependencies=[Depends(roles_required("admin"))])
async def update_user(user_id: str, payload: UserUpdate, db: AsyncSession = Depends(get_db)):
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Not found")

    updates = {}

    if payload.password:
        user.password_hash = get_password_hash(payload.password)
        updates["password"] = True

    if payload.role:
        if payload.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail="Unsupported role")
        user.role = payload.role
        user.is_superuser = payload.role == "admin"
        updates["role"] = payload.role

    if payload.is_active is not None:
        user.is_active = payload.is_active
        updates["is_active"] = payload.is_active

    await db.commit()
    await db.refresh(user)

    publish_event("user.updated", {"user": user.username, "changes": updates})
    return _serialize_user(user)


# -------------------------------------------------
# Health & Basic Endpoints
# -------------------------------------------------
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "gateway"}


@app.get("/")
async def root():
    return {"status": "ok", "service": "gateway"}


class ServiceHealth(BaseModel):
    service: str
    status: str
    latency: float
    metric: str
    last_checked: str


@app.get("/api/v1/system/health", response_model=list[ServiceHealth])
async def system_health() -> list[ServiceHealth]:
    """Aggregate health information from core services.

    This powers the frontend System Health panel. It is best-effort:
    individual service failures are reflected in their own status without
    breaking the whole response.
    """

    services = [
        ("Gateway", None),  # handled locally
        ("Ingestion", f"{INGESTION_SERVICE}/health"),
        ("Triage", f"{TRIAGE_SERVICE}/health"),
        ("Response", f"{RESPONSE_SERVICE}/health"),
        ("Audit", f"{AUDIT_SERVICE}/health"),
    ]

    results: list[ServiceHealth] = []

    # Local gateway health (no network call)
    now = datetime.utcnow().isoformat() + "Z"
    results.append(
        ServiceHealth(
            service="Gateway",
            status="HEALTHY",
            latency=0.0,
            metric="0ms",
            last_checked=now,
        )
    )

    # Query downstream services concurrently
    async with httpx.AsyncClient(timeout=2.0) as client:
        tasks = []
        for name, url in services[1:]:  # skip Gateway (index 0)
            if not url:
                continue
            tasks.append(_probe_service(client, name, url))

        probed = await asyncio.gather(*tasks, return_exceptions=True)
        for item in probed:
            if isinstance(item, ServiceHealth):
                results.append(item)
            else:
                # In case of unexpected error, mark unknown
                results.append(
                    ServiceHealth(
                        service="unknown",
                        status="OFFLINE",
                        latency=0.0,
                        metric="error",
                        last_checked=datetime.utcnow().isoformat() + "Z",
                    )
                )

    return results


async def _probe_service(client: httpx.AsyncClient, name: str, url: str) -> ServiceHealth:
    start = asyncio.get_event_loop().time()
    try:
        resp = await client.get(url)
        elapsed_ms = (asyncio.get_event_loop().time() - start) * 1000
        if resp.status_code == 200:
            return ServiceHealth(
                service=name,
                status="HEALTHY",
                latency=round(elapsed_ms, 1),
                metric=f"{round(elapsed_ms, 1)}ms",
                last_checked=datetime.utcnow().isoformat() + "Z",
            )
        else:
            return ServiceHealth(
                service=name,
                status="DEGRADED",
                latency=round(elapsed_ms, 1),
                metric=f"{resp.status_code} {round(elapsed_ms, 1)}ms",
                last_checked=datetime.utcnow().isoformat() + "Z",
            )
    except Exception as e:
        elapsed_ms = (asyncio.get_event_loop().time() - start) * 1000
        logger.warning("[gateway] Health probe failed for %s: %s", name, e)
        return ServiceHealth(
            service=name,
            status="OFFLINE",
            latency=round(elapsed_ms, 1),
            metric="unreachable",
            last_checked=datetime.utcnow().isoformat() + "Z",
        )


# -------------------------------------------------
# Incidents API - Query / mutate Incidents
# -------------------------------------------------
@app.get("/api/v1/incidents")
async def get_incidents(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of incidents from database"""
    try:
        stmt = select(Incident)
        if status:
            stmt = stmt.where(Incident.status.ilike(status))
        if severity:
            stmt = stmt.where(Incident.severity.ilike(severity))
        stmt = stmt.order_by(Incident.timestamp.desc()).limit(limit).offset(offset)

        result = await db.execute(stmt)
        incidents = result.scalars().all()

        return [
            {
                "incident_id": str(incident.incident_id),
                "alert_id": incident.alert_id or "",
                "severity": (incident.severity or "MEDIUM").upper(),
                "status": (incident.status or "NEW").upper(),
                "description": incident.description or "",
                "source_ip": str(incident.source_ip) if incident.source_ip else None,
                "destination_ip": str(incident.destination_ip) if incident.destination_ip else None,
                "timestamp": incident.timestamp.isoformat() if incident.timestamp else None,
                "created_at": incident.timestamp.isoformat() if incident.timestamp else None,
                "raw_data": incident.raw_data or {},
            }
            for incident in incidents
        ]
    except Exception as e:
        logger.exception(f"Error getting incidents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/incidents/{incident_id}/ignore", dependencies=[Depends(analyst_or_admin)])
async def ignore_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark an incident as a false positive / ignored.

    This updates Incident.status to FALSE_POSITIVE and records an audit log.
    """
    try:
        try:
            incident_uuid = UUID(incident_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid incident ID format")

        result = await db.execute(select(Incident).where(Incident.incident_id == incident_uuid))
        incident = result.scalar_one_or_none()
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        old_status = incident.status or "NEW"
        incident.status = "FALSE_POSITIVE"

        await db.commit()

        # Best-effort audit + event. Avoid circular imports at module import time.
        try:
            from audit_service.local_ai.audit_agent import audit_agent as _audit_agent  # type: ignore

            await _audit_agent.record_action(
                action="incident_marked_false_positive",
                target=str(incident_id),
                status="success",
                actor="gateway",
                resource_type="incident",
                details={"previous_status": old_status},
            )
        except Exception:
            logger.warning("[gateway] Failed to record audit for incident_marked_false_positive")

        try:
            await publish_event(
                "incident.ignored",
                {
                    "incident_id": incident_id,
                    "previous_status": old_status,
                },
            )
        except Exception:
            logger.debug("[gateway] Failed to publish incident.ignored for %s", incident_id)

        return {"status": "success", "incident_id": incident_id, "new_status": "FALSE_POSITIVE"}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error ignoring incident %s: %s", incident_id, e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/incidents/{incident_id}")
async def get_incident_detail(
    incident_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get single incident details"""
    try:
        incident_uuid = UUID(incident_id)
        stmt = select(Incident).where(Incident.incident_id == incident_uuid)
        result = await db.execute(stmt)
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        return {
            "incident_id": str(incident.incident_id),
            "alert_id": incident.alert_id or "",
            "severity": (incident.severity or "MEDIUM").upper(),
            "status": (incident.status or "NEW").upper(),
            "description": incident.description or "",
            "source_ip": str(incident.source_ip) if incident.source_ip else None,
            "destination_ip": str(incident.destination_ip) if incident.destination_ip else None,
            "timestamp": incident.timestamp.isoformat() if incident.timestamp else None,
            "created_at": incident.timestamp.isoformat() if incident.timestamp else None,
            "raw_data": incident.raw_data or {},
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID format")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting incident: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------
# SIEM Webhook → Ingestion Service
# -------------------------------------------------
@app.post("/siem/webhook")
async def siem_webhook(request: Request):
    alert_data = await request.json()
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{INGESTION_SERVICE}/api/v1/webhook", json=alert_data)
            return resp.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Ingestion unavailable")


# -------------------------------------------------
# Response Actions
# -------------------------------------------------
@app.post("/api/v1/incidents/{incident_id}/respond")
async def respond_to_incident(
    incident_id: str,
    request: Request,
    current_user: User = Depends(analyst_or_admin),
):
    auth_header = request.headers.get("Authorization")
    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header

    try:
        body = await request.json()
    except Exception:
        body = {}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{RESPONSE_SERVICE}/api/v1/incidents/{incident_id}/respond",
                headers=headers,
                json=body,
            )

            # Correctly forward non-JSON responses
            try:
                return resp.json()
            except Exception:
                return {"status": "error", "detail": resp.text}

        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Response service unavailable")


# ADD: Timeline proxy
@app.get("/api/v1/incidents/{incident_id}/timeline")
async def proxy_timeline(
    incident_id: str,
    request: Request,
    current_user: User = Depends(analyst_or_admin),
):
    auth_header = request.headers.get("Authorization")
    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{RESPONSE_SERVICE}/api/v1/incidents/{incident_id}/timeline",
                headers=headers,
            )
            return resp.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Timeline service unavailable")


# -------------------------------------------------
# Audit Logs
# -------------------------------------------------
@app.get("/api/v1/logs")
async def get_audit_logs(current_user: User = Depends(roles_required("admin"))):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{AUDIT_SERVICE}/api/v1/logs")
            return resp.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Audit service unavailable")


# -------------------------------------------------
# Threat Intel (proxy to response service)
# -------------------------------------------------
@app.get("/api/v1/threatintel/abuseipdb")
async def ti_abuseipdb(ip: str, current_user: User = Depends(analyst_or_admin)):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{RESPONSE_SERVICE}/api/v1/threatintel/abuseipdb", params={"ip": ip})
            return resp.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Threat intel unavailable")


@app.get("/api/v1/threatintel/malwarebazaar")
async def ti_malwarebazaar(hash: str, current_user: User = Depends(analyst_or_admin)):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{RESPONSE_SERVICE}/api/v1/threatintel/malwarebazaar", params={"hash": hash})
            return resp.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Threat intel unavailable")


# -------------------------------------------------
# Socket.IO events
# -------------------------------------------------
@sio.event
async def connect(sid, environ):
    logger.info(f"[gateway] Client {sid} connected")


@sio.event
async def disconnect(sid):
    logger.info(f"[gateway] Client {sid} disconnected")


@sio.event
async def join_room(sid, room):
    await sio.enter_room(sid, room)
    logger.info(f"[gateway] Client {sid} joined {room}")


# -------------------------------------------------
# Local dev run
# -------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "gateway.main:socket_app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
    )