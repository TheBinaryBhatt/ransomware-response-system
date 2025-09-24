import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from datetime import datetime, timedelta

from core.database import get_db
from .models import TriageIncident

logging.basicConfig(level=logging.INFO)
router = APIRouter()

# -------------------
# POST: Receive incident from ingestion
# -------------------
@router.post("/incidents")
async def create_incident_from_ingestion(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    Accept forwarded incidents from ingestion service.
    """
    logging.info(f"Received forwarded incident payload: {payload}")
    incident_id = payload.get("incident_id")
    raw_data = payload.get("raw_data", {})

    # Check for duplicates
    result = await db.execute(select(TriageIncident).where(TriageIncident.id == incident_id))
    existing = result.scalar_one_or_none()
    if existing:
        logging.info(f"Incident {incident_id} already exists in triage DB")
        return {"status": "already_exists", "incident_id": incident_id}

    incident = TriageIncident(
        id=incident_id,
        siem_alert_id=raw_data.get("alert_id", "unknown"),
        source=raw_data.get("source", "unknown"),
        raw_data=raw_data
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    logging.info(f"Incident {incident_id} stored in triage DB")
    return {"status": "success", "incident_id": str(incident.id)}

# -------------------
# GET: All incidents
# -------------------
@router.get("/incidents")
async def get_incidents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TriageIncident))
    incidents = result.scalars().all()
    logging.info(f"Returning {len(incidents)} incidents from triage DB")
    return incidents

# -------------------
# POST: AI triage of an incident
# -------------------
@router.post("/incidents/{incident_id}/triage")
async def triage_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TriageIncident).where(TriageIncident.id == incident_id))
    incident = result.scalar_one_or_none()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Placeholder AI logic
    incident.decision = "confirmed_ransomware"
    incident.confidence = 0.95
    incident.reasoning = "AI analysis detected ransomware patterns"

    await db.commit()
    await db.refresh(incident)

    return {"status": "success", "incident": incident}

# -------------------
# GET: Stats for dashboard
# -------------------
@router.get("/incidents/stats")
async def get_incident_stats(db: AsyncSession = Depends(get_db)):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    # Daily trends
    daily_trends = await db.execute(
        select(
            func.date(TriageIncident.timestamp).label("date"),
            func.count(case((TriageIncident.decision == "confirmed_ransomware", 1))).label("ransomware"),
            func.count(case((TriageIncident.decision == "false_positive", 1))).label("false_positive"),
            func.count().label("total")
        )
        .where(TriageIncident.timestamp >= seven_days_ago)
        .group_by(func.date(TriageIncident.timestamp))
        .order_by(func.date(TriageIncident.timestamp))
    )

    # Incident types
    incident_types = await db.execute(
        select(
            TriageIncident.decision,
            func.count().label("count")
        )
        .group_by(TriageIncident.decision)
    )

    # Status distribution
    status_dist = await db.execute(
        select(
            TriageIncident.status,
            func.count().label("count")
        )
        .group_by(TriageIncident.status)
    )

    return {
        "trends": [
            {"date": str(row.date), "ransomware": row.ransomware, "falsePositive": row.false_positive, "total": row.total}
            for row in daily_trends
        ],
        "types": [
            {"name": row.decision or "unknown", "value": row.count}
            for row in incident_types
        ],
        "status": [
            {"status": row.status, "count": row.count}
            for row in status_dist
        ]
    }
