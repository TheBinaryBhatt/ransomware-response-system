from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import httpx
import socketio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from datetime import timedelta
import logging
from uuid import UUID
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, constr

from core.config import settings
from core.database import get_db, test_connection
from core.models import User
from core.rabbitmq_utils import publish_event
from core.security import (
    verify_password,
    create_access_token,
    get_current_active_user,
    roles_required,
    get_password_hash,
)
from .event_consumer import start as start_event_bridge

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="API Gateway", version="1.0.0")

# Socket.IO server in ASGI mode
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, app)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/token")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
INGESTION_SERVICE = "http://ingestion_service:8001"
TRIAGE_SERVICE = "http://triage_service:8002"
RESPONSE_SERVICE = "http://response_service:8003"
AUDIT_SERVICE = "http://audit_service:8004"

ALLOWED_ROLES = ("admin", "analyst", "auditor", "viewer")


class UserCreate(BaseModel):
    username: constr(min_length=3, max_length=64)
    email: EmailStr
    password: constr(min_length=8)
    role: Literal["admin", "analyst", "auditor", "viewer"] = "analyst"
    is_active: bool = True


class UserUpdate(BaseModel):
    password: Optional[constr(min_length=8)] = None
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


async def handle_domain_event(routing_key: str, payload: dict) -> None:
    """Forward domain events to connected WebSocket clients."""
    await emit_incident_update({"event": routing_key, "payload": payload})


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting API Gateway...")
    success = await test_connection()
    if not success:
        logger.error("❌ Database connection failed on startup")
    # Bridge RabbitMQ events to WebSocket clients
    start_event_bridge(handle_domain_event)

# Fixed Authentication endpoint
@app.post("/api/v1/token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    try:
        logger.info(f"🔐 Login attempt for user: {form_data.username}")
        
        # Find user by username
        result = await db.execute(
            select(User).where(User.username == form_data.username)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning(f"❌ User {form_data.username} not found")
            publish_event(
                "security.login.failure",
                {"username": form_data.username, "reason": "user_not_found"},
            )
            raise HTTPException(
                status_code=400, 
                detail="Incorrect username or password"
            )
        
        logger.info(f"✅ User found: {user.username}")
        
        # Verify password
        if not verify_password(form_data.password, user.password_hash):
            logger.warning(f"❌ Password verification failed for {form_data.username}")
            publish_event(
                "security.login.failure",
                {"username": form_data.username, "reason": "bad_password"},
            )
            raise HTTPException(
                status_code=400, 
                detail="Incorrect username or password"
            )
        
        logger.info(f"✅ Password verified for {form_data.username}")
        
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        
        # Create access token
        access_token = create_access_token(
            data={"sub": user.username, "role": user.role},
            expires_delta=timedelta(minutes=30)
        )
        
        logger.info(f"✅ Token created for {user.username}")
        publish_event(
            "security.login.success",
            {"username": user.username, "role": user.role},
        )
        return {"access_token": access_token, "token_type": "bearer"}
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"❌ Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "role": current_user.role,
    }


@app.get("/api/v1/users", dependencies=[Depends(roles_required("admin"))])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [_serialize_user(user) for user in users]


@app.get("/api/v1/users/{user_id}", dependencies=[Depends(roles_required("admin"))])
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.execute(select(User).where(User.id == user_uuid))
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
        raise HTTPException(status_code=400, detail="Username or email already exists")
    await db.refresh(new_user)

    publish_event(
        "user.created",
        {"user_id": str(new_user.id), "username": new_user.username, "role": new_user.role},
    )
    return _serialize_user(new_user)


@app.patch("/api/v1/users/{user_id}", dependencies=[Depends(roles_required("admin"))])
async def update_user(
    user_id: str,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user id")

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updated_fields = {}

    if payload.password:
        user.password_hash = get_password_hash(payload.password)
        updated_fields["password"] = True

    if payload.role:
        if payload.role not in ALLOWED_ROLES:
            raise HTTPException(status_code=400, detail="Unsupported role")
        user.role = payload.role
        user.is_superuser = payload.role == "admin"
        updated_fields["role"] = payload.role

    if payload.is_active is not None:
        user.is_active = payload.is_active
        updated_fields["is_active"] = payload.is_active

    await db.commit()
    await db.refresh(user)

    publish_event(
        "user.updated",
        {
            "user_id": str(user.id),
            "username": user.username,
            "role": user.role,
            "changes": updated_fields,
        },
    )
    return _serialize_user(user)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "gateway"}

@app.get("/")
async def root():
    return {"status": "ok", "service": "gateway"}

# SIEM webhook endpoint (can be public or protected)
@app.post("/siem/webhook")
async def siem_webhook(request: Request):
    alert_data = await request.json()
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{INGESTION_SERVICE}/api/v1/webhook",
                json=alert_data,
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Ingestion service unavailable: {e}")
            raise HTTPException(status_code=502, detail="Ingestion service unavailable")

# Protected endpoints with authentication
analyst_or_admin = roles_required("admin", "analyst", "auditor", "viewer")

@app.get("/api/v1/incidents")
async def get_incidents(current_user: User = Depends(analyst_or_admin)):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{TRIAGE_SERVICE}/api/v1/incidents",
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Triage service unavailable: {e}")
            raise HTTPException(status_code=502, detail="Triage service unavailable")

@app.get("/api/v1/incidents/{incident_id}")
async def get_incident(incident_id: str, current_user: User = Depends(analyst_or_admin)):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{TRIAGE_SERVICE}/api/v1/incidents/{incident_id}",
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Triage service unavailable: {e}")
            raise HTTPException(status_code=502, detail="Triage service unavailable")

# Response endpoints
@app.post("/api/v1/incidents/{incident_id}/respond")
async def respond_to_incident(incident_id: str, current_user: User = Depends(roles_required("admin"))):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{RESPONSE_SERVICE}/api/v1/incidents/{incident_id}/respond",
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Response service unavailable: {e}")
            raise HTTPException(status_code=502, detail="Response service unavailable")

# Audit logs endpoint
@app.get("/api/v1/logs")
async def get_audit_logs(current_user: User = Depends(roles_required("admin"))):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{AUDIT_SERVICE}/api/v1/logs",
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Audit service unavailable: {e}")
            raise HTTPException(status_code=502, detail="Audit service unavailable")

# Statistics endpoint
@app.get("/api/v1/incidents/stats")
async def get_incident_stats(current_user: User = Depends(analyst_or_admin)):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{TRIAGE_SERVICE}/api/v1/incidents/stats",
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Triage service unavailable: {e}")
            raise HTTPException(status_code=502, detail="Triage service unavailable")

@app.get("/api/v1/threatintel/abuseipdb")
async def threatintel_abuseipdb(ip: str, current_user: User = Depends(analyst_or_admin)):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{RESPONSE_SERVICE}/api/v1/threatintel/abuseipdb",
                params={"ip": ip},
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Response service threat intel endpoint unavailable: {e}")
            raise HTTPException(status_code=502, detail="Threat intel service unavailable")

@app.get("/api/v1/threatintel/malwarebazaar")
async def threatintel_malwarebazaar(hash: str, current_user: User = Depends(analyst_or_admin)):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{RESPONSE_SERVICE}/api/v1/threatintel/malwarebazaar",
                params={"hash": hash},
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"Response service threat intel endpoint unavailable: {e}")
            raise HTTPException(status_code=502, detail="Threat intel service unavailable")

# WebSocket event handlers
@sio.event
async def connect(sid, environ):
    logger.info(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    logger.info(f"Client {sid} disconnected")

@sio.event
async def join_room(sid, room):
    await sio.enter_room(sid, room)
    logger.info(f"Client {sid} joined room {room}")


async def emit_incident_update(incident_data):
    await sio.emit('incident_update', incident_data, room='soc_analysts')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)  # nosec B104