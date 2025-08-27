from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.models.incident import Incident
from app.utils.database import get_db

router = APIRouter()

@router.get("/incidents", response_model=List[dict])
async def get_incidents(db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.received_at.desc()).all()
    return [
        {
            "id": inc.incident_id,
            "severity": inc.severity,
            "description": inc.description,
            "source_ip": inc.source_ip,
            "status": inc.status,
            "received_at": inc.received_at.isoformat(),
            "actions_taken": inc.actions_taken
        }
        for inc in incidents
    ]

@router.post("/incidents/{incident_id}/respond")
async def trigger_response(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Simulate response actions
    actions = [
        {
            "action": "firewall_block",
            "target": incident.source_ip,
            "status": "success",
            "timestamp": "2024-01-01T12:00:00Z",
            "message": "Blocked IP in firewall"
        },
        {
            "action": "endpoint_isolate",
            "target": "endpoint-123",
            "status": "success", 
            "timestamp": "2024-01-01T12:00:01Z",
            "message": "Isolated endpoint from network"
        }
    ]
    
    # Update incident
    incident.actions_taken = actions
    incident.status = "action_taken"
    incident.is_processed = True
    db.commit()
    
    return {
        "status": "success",
        "incident_id": incident_id,
        "actions": actions
    }