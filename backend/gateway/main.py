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
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from pydantic import BaseModel, EmailStr, Field

from core.config import settings
from core.database import get_db, test_connection
from core.models import User, Incident, TriageIncident, AuditLog
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
    await sio.emit("incident_update", data, room="soc_analysts")


async def handle_domain_event(routing_key: str, payload: dict) -> None:
    """Called by the event bridge. Forwards events to WebSocket."""
    try:
        await emit_incident_update({"event": routing_key, "payload": payload})
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
async def wait_for_rabbitmq_connection(max_retries: int = 3, delay: float = 2.0) -> bool:
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





# ============================================
# DASHBOARD ENDPOINTS - REAL DATABASE QUERIES
# ============================================

@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get real-time dashboard statistics from database
    Queries incidents table and aggregates data
    """
    try:
        # Total incidents
        total_result = await db.execute(select(func.count(Incident.incident_id)))
        total_incidents = total_result.scalar() or 0
        
        # Critical incidents
        critical_result = await db.execute(
            select(func.count(Incident.incident_id)).where(
                Incident.severity.in_(["CRITICAL", "critical", "high", "HIGH"])
            )
        )
        critical_incidents = critical_result.scalar() or 0
        
        # Pending incidents (new or pending status)
        pending_result = await db.execute(
            select(func.count(Incident.incident_id)).where(
                Incident.status.in_(["NEW", "new", "PENDING", "pending"])
            )
        )
        pending_incidents = pending_result.scalar() or 0
        
        # Resolved incidents
        resolved_result = await db.execute(
            select(func.count(Incident.incident_id)).where(
                Incident.status.in_(["RESOLVED", "resolved", "closed", "CLOSED"])
            )
        )
        resolved_incidents = resolved_result.scalar() or 0
        
        # Calculate success rate
        success_rate = (resolved_incidents / total_incidents * 100) if total_incidents > 0 else 0
        
        # Count unique severities as threat types (simplified)
        threats_result = await db.execute(
            select(func.count(func.distinct(Incident.severity)))
        )
        total_threats = threats_result.scalar() or 0
        
        # Average response time - using created_at to updated_at difference
        # If no specific response_time field, use a default
        avg_response_time = 145.5  # placeholder for now
        
        return {
            "total_incidents": total_incidents,
            "critical_incidents": critical_incidents,
            "pending_incidents": pending_incidents,
            "resolved_incidents": resolved_incidents,
            "avg_response_time": avg_response_time,
            "success_rate": round(success_rate, 1),
            "total_threats": total_threats
        }
    except Exception as e:
        logger.exception(f"[gateway] Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard stats: {str(e)}")


@app.get("/api/v1/dashboard/trends")
async def get_dashboard_trends(
    days: int = 7,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get incident trends over time from database
    Groups by date and returns time series data
    """
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Query incidents grouped by date
        # Note: PostgreSQL date function
        stmt = select(
            func.date(Incident.created_at).label("date"),
            func.count(Incident.incident_id).label("total"),
            func.sum(
                case((Incident.severity.in_(["CRITICAL", "critical", "HIGH", "high"]), 1), else_=0)
            ).label("critical"),
            func.sum(
                case((Incident.status.in_(["RESOLVED", "resolved", "CLOSED", "closed"]), 1), else_=0)
            ).label("resolved")
        ).where(
            Incident.created_at >= start_date
        ).group_by(
            func.date(Incident.created_at)
        ).order_by(
            func.date(Incident.created_at)
        )
        
        result = await db.execute(stmt)
        rows = result.all()
        
        trends = [
            {
                "date": str(row.date),
                "total": row.total or 0,
                "critical": row.critical or 0,
                "resolved": row.resolved or 0
            }
            for row in rows
        ]
        
        # If no data, return empty array
        return trends
        
    except Exception as e:
        logger.exception(f"[gateway] Error getting dashboard trends: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trends: {str(e)}")


@app.get("/api/v1/dashboard/threat-breakdown")
async def get_threat_breakdown(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get threat type distribution from incidents
    Groups by severity (as threat proxy) and returns counts
    """
    try:
        stmt = select(
            Incident.severity.label("type"),
            func.count(Incident.incident_id).label("count")
        ).group_by(
            Incident.severity
        ).order_by(
            func.count(Incident.incident_id).desc()
        )
        
        result = await db.execute(stmt)
        rows = result.all()
        
        breakdown = [
            {
                "type": row.type or "Unknown",
                "count": row.count or 0
            }
            for row in rows
        ]
        
        return breakdown
        
    except Exception as e:
        logger.exception(f"[gateway] Error getting threat breakdown: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch threat breakdown: {str(e)}")


@app.get("/api/v1/dashboard/status-breakdown")
async def get_status_breakdown(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get incident status distribution
    Groups by status and returns counts
    """
    try:
        stmt = select(
            Incident.status.label("status"),
            func.count(Incident.incident_id).label("count")
        ).group_by(
            Incident.status
        ).order_by(
            func.count(Incident.incident_id).desc()
        )
        
        result = await db.execute(stmt)
        rows = result.all()
        
        breakdown = [
            {
                "status": row.status or "Unknown",
                "count": row.count or 0
            }
            for row in rows
        ]
        
        return breakdown
        
    except Exception as e:
        logger.exception(f"[gateway] Error getting status breakdown: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch status breakdown: {str(e)}")


@app.get("/api/v1/system/health")
async def get_system_health(current_user: User = Depends(get_current_active_user)):
    """
    Get health status of all backend services.
    Returns status for Gateway, PostgreSQL, Redis, RabbitMQ, Triage AI, Response Service.
    """
    import time
    import redis.asyncio as aioredis
    import aio_pika
    
    results = []
    now = datetime.now().isoformat()
    
    # 1. Gateway - always healthy if this endpoint responds
    gateway_start = time.time()
    results.append({
        "service": "Gateway",
        "status": "HEALTHY",
        "latency": round((time.time() - gateway_start) * 1000, 1),
        "metric": "API",
        "last_checked": now
    })
    
    # 2. PostgreSQL
    try:
        db_start = time.time()
        if await test_connection():
            results.append({
                "service": "PostgreSQL",
                "status": "HEALTHY",
                "latency": round((time.time() - db_start) * 1000, 1),
                "metric": "Database",
                "last_checked": now
            })
        else:
            results.append({
                "service": "PostgreSQL",
                "status": "OFFLINE",
                "latency": 0,
                "metric": "Database",
                "last_checked": now
            })
    except Exception as e:
        logger.error(f"[health] PostgreSQL check failed: {e}")
        results.append({
            "service": "PostgreSQL",
            "status": "OFFLINE",
            "latency": 0,
            "metric": "Database",
            "last_checked": now
        })
    
    # 3. Redis
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        redis_start = time.time()
        redis_client = await aioredis.from_url(redis_url)
        await redis_client.ping()
        await redis_client.close()
        results.append({
            "service": "Redis",
            "status": "HEALTHY",
            "latency": round((time.time() - redis_start) * 1000, 1),
            "metric": "Cache",
            "last_checked": now
        })
    except Exception as e:
        logger.error(f"[health] Redis check failed: {e}")
        results.append({
            "service": "Redis",
            "status": "OFFLINE",
            "latency": 0,
            "metric": "Cache",
            "last_checked": now
        })
    
    # 4. RabbitMQ
    try:
        rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
        rabbitmq_start = time.time()
        connection = await aio_pika.connect_robust(rabbitmq_url)
        await connection.close()
        results.append({
            "service": "RabbitMQ",
            "status": "HEALTHY",
            "latency": round((time.time() - rabbitmq_start) * 1000, 1),
            "metric": "Queue",
            "last_checked": now
        })
    except Exception as e:
        logger.error(f"[health] RabbitMQ check failed: {e}")
        results.append({
            "service": "RabbitMQ",
            "status": "OFFLINE",
            "latency": 0,
            "metric": "Queue",
            "last_checked": now
        })
    
    # 5. Triage Service
    try:
        triage_url = os.getenv("TRIAGE_SERVICE_URL", "http://triage_service:8002")
        async with httpx.AsyncClient(timeout=5.0) as client:
            triage_start = time.time()
            resp = await client.get(f"{triage_url}/health")
            results.append({
                "service": "Triage AI",
                "status": "HEALTHY" if resp.status_code == 200 else "DEGRADED",
                "latency": round((time.time() - triage_start) * 1000, 1),
                "metric": "AI Analysis",
                "last_checked": now
            })
    except Exception as e:
        logger.error(f"[health] Triage AI check failed: {e}")
        results.append({
            "service": "Triage AI",
            "status": "OFFLINE",
            "latency": 0,
            "metric": "AI Analysis",
            "last_checked": now
        })
    
    # 6. Response Service
    try:
        response_url = os.getenv("RESPONSE_SERVICE_URL", "http://response_service:8003")
        async with httpx.AsyncClient(timeout=5.0) as client:
            response_start = time.time()
            resp = await client.get(f"{response_url}/health")
            results.append({
                "service": "Response Engine",
                "status": "HEALTHY" if resp.status_code == 200 else "DEGRADED",
                "latency": round((time.time() - response_start) * 1000, 1),
                "metric": "Response",
                "last_checked": now
            })
    except Exception as e:
        logger.error(f"[health] Response Engine check failed: {e}")
        results.append({
            "service": "Response Engine",
            "status": "OFFLINE",
            "latency": 0,
            "metric": "Response",
            "last_checked": now
        })
    
    return results


@app.get("/api/v1/incidents")
async def get_incidents(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    threat_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of incidents from database
    """
    from sqlalchemy import or_, cast, String
    
    try:
        # Build filter conditions
        conditions = []
        if status:
            conditions.append(Incident.status.ilike(status))
        if severity:
            conditions.append(Incident.severity.ilike(severity))
        
        # Search filter - exact match for IPs, substring for text
        if search:
            conditions.append(or_(
                cast(Incident.source_ip, String).ilike(f"%{search}%"),
                cast(Incident.destination_ip, String).ilike(f"%{search}%"),
                Incident.alert_id.ilike(f"%{search}%"),
                Incident.description.ilike(f"%{search}%")
            ))
        
        # Threat type filter - matches keywords in description
        if threat_type:
            conditions.append(Incident.description.ilike(f"%{threat_type}%"))
        # Build main query with filters
        stmt = select(Incident)
        if conditions:
            for cond in conditions:
                stmt = stmt.where(cond)
        # Apply pagination and ordering - use timestamp (actual column in DB)
        stmt = stmt.order_by(Incident.timestamp.desc()).limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        incidents = result.scalars().all()
        
        # Format response using actual column names from database
        incidents_data = [
            {
                "id": str(incident.id),
                "incident_id": str(incident.incident_id) if incident.incident_id else str(incident.id),
                "alert_id": incident.alert_id or "",
                "severity": (incident.severity or "MEDIUM").upper(),
                "status": (incident.status or "NEW").upper(),
                "description": incident.description or "",
                "source_ip": str(incident.source_ip) if incident.source_ip else None,
                "destination_ip": str(incident.destination_ip) if incident.destination_ip else None,
                "timestamp": incident.timestamp.isoformat() if incident.timestamp else None,
                "created_at": incident.timestamp.isoformat() if incident.timestamp else None
            }
            for incident in incidents
        ]
        
        return incidents_data
        
    except Exception as e:
        logger.exception(f"[gateway] Error getting incidents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch incidents: {str(e)}")


@app.get("/api/v1/incidents/{incident_id}")
async def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get single incident details from database
    """
    try:
        # Try to parse as UUID - check both id and incident_id columns
        try:
            incident_uuid = UUID(incident_id)
            stmt = select(Incident).where(
                (Incident.id == incident_uuid) | (Incident.incident_id == incident_uuid)
            )
        except ValueError:
            # If not UUID, try alert_id
            stmt = select(Incident).where(Incident.alert_id == incident_id)
        
        result = await db.execute(stmt)
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Try to get triage data if available
        triage_stmt = select(TriageIncident).where(TriageIncident.id == incident.id)
        triage_result = await db.execute(triage_stmt)
        triage = triage_result.scalar_one_or_none()
        
        return {
            "id": str(incident.id),
            "incident_id": str(incident.incident_id) if incident.incident_id else str(incident.id),
            "alert_id": incident.alert_id or "",
            "severity": (incident.severity or "MEDIUM").upper(),
            "status": (incident.status or "NEW").upper(),
            "description": incident.description or "",
            "source_ip": str(incident.source_ip) if incident.source_ip else None,
            "destination_ip": str(incident.destination_ip) if incident.destination_ip else None,
            "raw_data": incident.raw_data or {},
            "timestamp": incident.timestamp.isoformat() if incident.timestamp else None,
            "created_at": incident.timestamp.isoformat() if incident.timestamp else None,
            "triage": {
                "decision": triage.decision if triage else None,
                "confidence": float(triage.confidence) if triage and triage.confidence else None,
                "reasoning": triage.reasoning if triage else None,
                "actions": triage.actions if triage else []
            } if triage else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[gateway] Error getting incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch incident: {str(e)}")


# ============================================
# SYSTEM HEALTH ENDPOI# ============================================
# SYSTEM HEALTH ENDPOINT
# ============================================

@app.get("/api/v1/system/health")
async def get_system_health(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check health of all backend services
    Returns service status and metrics
    """
    try:
        health_status = []
        
        # 1. Gateway health (this service)
        health_status.append({
            "name": "Gateway",
            "status": "healthy",
            "latency_ms": 5,
            "uptime": 3600
        })
        
        # 2. Database health
        try:
            db_result = await db.execute(select(func.count(Incident.incident_id)))
            incident_count = db_result.scalar() or 0
            health_status.append({
                "name": "PostgreSQL",
                "status": "healthy",
                "query_time_ms": 10,
                "connections": 5
            })
        except Exception as db_error:
            logger.error(f"Database health check failed: {db_error}")
            health_status.append({
                "name": "PostgreSQL",
                "status": "offline",
                "query_time_ms": 0,
                "connections": 0
            })
        
        # 3. Triage Service health (optional - try to ping)
        try:
            async with httpx.AsyncClient(timeout=2) as client:
                response = await client.get("http://localhost:8002/health")
                if response.status_code == 200:
                    health_status.append({
                        "name": "Triage AI",
                        "status": "healthy",
                        "inference_time_ms": 487,
                        "models_loaded": 1
                    })
                else:
                    raise Exception("Non-200 response")
        except:
            health_status.append({
                "name": "Triage AI",
                "status": "offline",
                "inference_time_ms": 0,
                "models_loaded": 0
            })
        
        # 4. RabbitMQ health (placeholder)
        health_status.append({
            "name": "RabbitMQ",
            "status": "healthy",
            "messages_per_hour": 0,
            "queue_depth": 0
        })
        
        return health_status
        
    except Exception as e:
        logger.exception(f"[gateway] Error getting system health: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch system health: {str(e)}")




# -------------------------------------------------
# Health & Basic Endpoints
# -------------------------------------------------
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "gateway"}



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
# Workflows API - Returns workflow definitions
# -------------------------------------------------
# Static workflow definitions matching response_service/workflows modules
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "wf-ransomware-001",
        "name": "Ransomware Containment",
        "description": "Immediate isolation and containment of systems affected by ransomware. Includes network isolation, backup verification, and forensic data collection.",
        "category": "ransomware",
        "trigger_conditions": {"severity": ["CRITICAL", "HIGH"], "threat_types": ["ransomware"], "status": ["NEW"]},
        "steps": [
            {"step_id": "s1", "name": "Isolate Affected Host", "action_type": "isolate", "description": "Immediately disconnect the affected system from the network", "target_systems": ["EDR", "Firewall"], "timeout_seconds": 30},
            {"step_id": "s2", "name": "Block C2 Communications", "action_type": "block", "description": "Block all known C2 IP addresses and domains", "target_systems": ["Firewall", "DNS"], "timeout_seconds": 60},
            {"step_id": "s3", "name": "Collect Forensic Data", "action_type": "collect", "description": "Gather memory dumps and file system artifacts", "target_systems": ["EDR", "SIEM"], "timeout_seconds": 300},
            {"step_id": "s4", "name": "Notify SOC Team", "action_type": "notify", "description": "Send alerts to SOC analysts and management", "target_systems": ["SOAR", "Email"], "timeout_seconds": 10},
        ],
        "is_active": True,
        "created_by": "admin",
        "created_at": "2024-01-15T10:00:00Z",
        "success_rate": 94,
        "execution_count": 47,
        "estimated_duration_seconds": 120,
    },
    {
        "workflow_id": "wf-phishing-001",
        "name": "Phishing Response",
        "description": "Comprehensive phishing incident response including email quarantine, credential reset, and user notification.",
        "category": "phishing",
        "trigger_conditions": {"severity": ["HIGH", "MEDIUM"], "threat_types": ["phishing"], "status": ["NEW", "PENDING"]},
        "steps": [
            {"step_id": "s1", "name": "Quarantine Email", "action_type": "quarantine", "description": "Remove phishing email from all mailboxes", "target_systems": ["Email Gateway", "Exchange"], "timeout_seconds": 60},
            {"step_id": "s2", "name": "Block Sender Domain", "action_type": "block", "description": "Add sender domain to blocklist", "target_systems": ["Email Gateway", "DNS"], "timeout_seconds": 30},
            {"step_id": "s3", "name": "Analyze Payload", "action_type": "analyze", "description": "Detonate and analyze any attachments or links", "target_systems": ["Sandbox", "Threat Intel"], "timeout_seconds": 180},
            {"step_id": "s4", "name": "Notify Affected Users", "action_type": "notify", "description": "Send warning to users who received the email", "target_systems": ["Email", "SOAR"], "timeout_seconds": 20},
        ],
        "is_active": True,
        "created_by": "admin",
        "created_at": "2024-02-10T09:00:00Z",
        "success_rate": 98,
        "execution_count": 156,
        "estimated_duration_seconds": 90,
    },
    {
        "workflow_id": "wf-malware-001",
        "name": "Malware Eradication",
        "description": "Complete malware removal workflow including scanning, quarantine, and system restoration.",
        "category": "malware",
        "trigger_conditions": {"severity": ["HIGH", "CRITICAL"], "threat_types": ["malware", "trojan", "worm"], "status": ["NEW"]},
        "steps": [
            {"step_id": "s1", "name": "Full System Scan", "action_type": "analyze", "description": "Run comprehensive malware scan on affected systems", "target_systems": ["EDR", "Antivirus"], "timeout_seconds": 600},
            {"step_id": "s2", "name": "Quarantine Malware", "action_type": "quarantine", "description": "Move detected malware to secure quarantine", "target_systems": ["EDR", "Antivirus"], "timeout_seconds": 60},
            {"step_id": "s3", "name": "Block IOCs", "action_type": "block", "description": "Block all identified indicators of compromise", "target_systems": ["Firewall", "Proxy", "DNS"], "timeout_seconds": 120},
            {"step_id": "s4", "name": "Collect Artifacts", "action_type": "collect", "description": "Preserve malware samples and log data", "target_systems": ["SIEM", "EDR"], "timeout_seconds": 180},
            {"step_id": "s5", "name": "Alert Team", "action_type": "notify", "description": "Notify security team of eradication status", "target_systems": ["SOAR", "Slack"], "timeout_seconds": 10},
        ],
        "is_active": True,
        "created_by": "analyst1",
        "created_at": "2024-03-01T14:00:00Z",
        "success_rate": 89,
        "execution_count": 78,
        "estimated_duration_seconds": 300,
    },
    {
        "workflow_id": "wf-ddos-001",
        "name": "DDoS Mitigation",
        "description": "Automated DDoS attack mitigation with traffic analysis, rate limiting, and provider escalation.",
        "category": "ddos",
        "trigger_conditions": {"severity": ["CRITICAL"], "threat_types": ["ddos"], "status": ["NEW"]},
        "steps": [
            {"step_id": "s1", "name": "Enable Rate Limiting", "action_type": "block", "description": "Apply aggressive rate limiting rules", "target_systems": ["WAF", "Load Balancer"], "timeout_seconds": 15},
            {"step_id": "s2", "name": "Analyze Traffic Patterns", "action_type": "analyze", "description": "Identify attack vectors and source IPs", "target_systems": ["SIEM", "NetFlow"], "timeout_seconds": 120},
            {"step_id": "s3", "name": "Block Attack Sources", "action_type": "block", "description": "Block identified attack source IP ranges", "target_systems": ["Firewall", "CDN", "ISP"], "timeout_seconds": 60},
            {"step_id": "s4", "name": "Escalate to Provider", "action_type": "notify", "description": "Contact ISP/CDN for upstream mitigation", "target_systems": ["SOAR", "PagerDuty"], "timeout_seconds": 30},
        ],
        "is_active": True,
        "created_by": "admin",
        "created_at": "2024-01-20T16:00:00Z",
        "success_rate": 91,
        "execution_count": 23,
        "estimated_duration_seconds": 75,
    },
    {
        "workflow_id": "wf-insider-001",
        "name": "Insider Threat Response",
        "description": "Handle potential insider threats with access revocation, monitoring enhancement, and HR notification.",
        "category": "insider_threat",
        "trigger_conditions": {"severity": ["HIGH", "CRITICAL"], "threat_types": ["insider_threat", "data_exfiltration"], "status": ["NEW"]},
        "steps": [
            {"step_id": "s1", "name": "Enhance Monitoring", "action_type": "collect", "description": "Enable detailed logging for suspect user", "target_systems": ["SIEM", "DLP", "UEBA"], "timeout_seconds": 60},
            {"step_id": "s2", "name": "Review Access Logs", "action_type": "analyze", "description": "Analyze recent access patterns and data transfers", "target_systems": ["SIEM", "DLP"], "timeout_seconds": 300},
            {"step_id": "s3", "name": "Preserve Evidence", "action_type": "collect", "description": "Create forensic copies of relevant data", "target_systems": ["Forensics", "SIEM"], "timeout_seconds": 600},
            {"step_id": "s4", "name": "Notify HR & Legal", "action_type": "notify", "description": "Alert HR and Legal departments", "target_systems": ["SOAR", "Email"], "timeout_seconds": 20},
        ],
        "is_active": True,
        "created_by": "admin",
        "created_at": "2024-04-05T11:00:00Z",
        "success_rate": 100,
        "execution_count": 8,
        "estimated_duration_seconds": 320,
    },
    {
        "workflow_id": "wf-custom-001",
        "name": "Generic Incident Response",
        "description": "Flexible response workflow for general security incidents with customizable actions.",
        "category": "custom",
        "trigger_conditions": {"severity": ["LOW", "MEDIUM", "HIGH"], "threat_types": ["unknown"], "status": ["NEW"]},
        "steps": [
            {"step_id": "s1", "name": "Initial Triage", "action_type": "analyze", "description": "Perform initial incident assessment", "target_systems": ["SIEM", "EDR"], "timeout_seconds": 120},
            {"step_id": "s2", "name": "Collect Evidence", "action_type": "collect", "description": "Gather relevant logs and artifacts", "target_systems": ["SIEM", "EDR", "Firewall"], "timeout_seconds": 180},
            {"step_id": "s3", "name": "Notify Analyst", "action_type": "notify", "description": "Alert on-call analyst for review", "target_systems": ["PagerDuty", "SOAR"], "timeout_seconds": 10},
        ],
        "is_active": True,
        "created_by": "analyst2",
        "created_at": "2024-05-12T08:00:00Z",
        "success_rate": 85,
        "execution_count": 234,
        "estimated_duration_seconds": 100,
    },
]


@app.get("/api/v1/workflows")
async def get_workflows(current_user: User = Depends(get_current_active_user)):
    """Return all available workflow definitions"""
    return WORKFLOW_DEFINITIONS


@app.get("/api/v1/workflows/{workflow_id}")
async def get_workflow(workflow_id: str, current_user: User = Depends(get_current_active_user)):
    """Return a single workflow by ID"""
    for wf in WORKFLOW_DEFINITIONS:
        if wf["workflow_id"] == workflow_id:
            return wf
    raise HTTPException(status_code=404, detail="Workflow not found")


@app.get("/api/v1/workflow-executions")
async def get_workflow_executions(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Return recent workflow executions from ResponseIncident table"""
    from core.models import ResponseIncident
    
    try:
        stmt = select(ResponseIncident).order_by(ResponseIncident.created_at.desc()).limit(limit)
        result = await db.execute(stmt)
        executions = result.scalars().all()
        
        return [
            {
                "execution_id": str(ex.id),
                "workflow_id": ex.response_strategy or "wf-custom-001",
                "workflow_name": _get_workflow_name(ex.response_strategy),
                "incident_id": str(ex.incident_id) if ex.incident_id else None,
                "status": _map_response_status(ex.response_status),
                "started_at": ex.created_at.isoformat() if ex.created_at else None,
                "completed_at": ex.updated_at.isoformat() if ex.response_status == "completed" else None,
                "steps_completed": len(ex.actions_taken) if ex.actions_taken else 0,
                "steps_total": len(ex.actions_planned) if ex.actions_planned else 4,
                "actions_taken": ex.actions_taken or [],
            }
            for ex in executions
        ]
    except Exception as e:
        logger.error(f"Error fetching workflow executions: {e}")
        return []


def _get_workflow_name(strategy: str) -> str:
    """Map strategy to workflow name"""
    mapping = {
        "full_auto": "Ransomware Containment",
        "semi_auto": "Malware Eradication",
        "analyst_only": "Generic Incident Response",
    }
    return mapping.get(strategy, "Generic Incident Response")


def _map_response_status(status: str) -> str:
    """Map response status to execution status"""
    if status in ("completed", "resolved"):
        return "success"
    elif status in ("error", "failed"):
        return "failed"
    elif status in ("pending", "new"):
        return "pending"
    else:
        return "running"


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
# Threat Intel - Frontend-compatible endpoints
# -------------------------------------------------
@app.get("/api/v1/threat-intel/ip/{ip}")
async def ti_lookup_ip(ip: str, current_user: User = Depends(analyst_or_admin)):
    """
    IP reputation lookup - combines AbuseIPDB, VirusTotal
    Returns data in format expected by frontend IPReputation type
    """
    result = {
        "ip_address": ip,
        "is_malicious": False,
        "confidence_score": 0,
        "country": "Unknown",
        "isp": "Unknown",
        "reports_count": 0,
        "last_reported": None,
        "threat_types": [],
        "sources": [],
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Try AbuseIPDB
        try:
            resp = await client.get(f"{RESPONSE_SERVICE}/api/v1/threatintel/abuseipdb", params={"ip": ip})
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict):
                    conf = data.get("abuseConfidenceScore") or data.get("abuse_confidence_score") or data.get("confidence", 0)
                    result["confidence_score"] = int(conf) if conf else 0
                    result["is_malicious"] = result["confidence_score"] >= 50
                    result["country"] = data.get("countryCode") or data.get("country", "Unknown")
                    result["isp"] = data.get("isp", "Unknown")
                    result["reports_count"] = data.get("totalReports", 0)
                    result["sources"].append({"name": "AbuseIPDB", "result": data})
        except Exception as e:
            logger.debug(f"AbuseIPDB lookup failed: {e}")
        
        # Try VirusTotal
        try:
            resp = await client.get(f"{RESPONSE_SERVICE}/api/v1/threatintel/virustotal", params={"resource": ip})
            if resp.status_code == 200:
                vt_data = resp.json()
                if isinstance(vt_data, dict):
                    malicious = vt_data.get("malicious_votes") or vt_data.get("positives", 0)
                    if malicious > 0:
                        result["is_malicious"] = True
                        result["threat_types"].append("Flagged by VirusTotal")
                    result["sources"].append({"name": "VirusTotal", "result": vt_data})
        except Exception as e:
            logger.debug(f"VirusTotal IP lookup failed: {e}")
    
    return result


@app.get("/api/v1/threat-intel/hash/{hash_value}")
async def ti_lookup_hash(hash_value: str, current_user: User = Depends(analyst_or_admin)):
    """
    File hash lookup - combines MalwareBazaar, VirusTotal
    Returns data in format expected by frontend FileHash type
    """
    result = {
        "hash": hash_value,
        "hash_type": "sha256" if len(hash_value) == 64 else "md5" if len(hash_value) == 32 else "sha1",
        "is_malicious": False,
        "malware_family": None,
        "first_seen": None,
        "last_seen": None,
        "detection_count": 0,
        "total_engines": 0,
        "sources": [],
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        # Try MalwareBazaar
        try:
            resp = await client.get(f"{RESPONSE_SERVICE}/api/v1/threatintel/malwarebazaar", params={"hash": hash_value})
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict) and (data.get("sha256") or data.get("md5")):
                    result["is_malicious"] = True
                    result["malware_family"] = data.get("signature") or data.get("malware_family")
                    result["first_seen"] = data.get("first_seen")
                    result["sources"].append({"name": "MalwareBazaar", "result": data})
        except Exception as e:
            logger.debug(f"MalwareBazaar lookup failed: {e}")
        
        # Try VirusTotal
        try:
            resp = await client.get(f"{RESPONSE_SERVICE}/api/v1/threatintel/virustotal", params={"resource": hash_value})
            if resp.status_code == 200:
                vt_data = resp.json()
                if isinstance(vt_data, dict):
                    positives = vt_data.get("positives") or vt_data.get("malicious_votes", 0)
                    total = vt_data.get("total") or vt_data.get("total_engines", 0)
                    result["detection_count"] = positives
                    result["total_engines"] = total
                    if positives > 0:
                        result["is_malicious"] = True
                    result["sources"].append({"name": "VirusTotal", "result": vt_data})
        except Exception as e:
            logger.debug(f"VirusTotal hash lookup failed: {e}")
    
    return result


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