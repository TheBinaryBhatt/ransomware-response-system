from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
import json
import logging

from app.models.incident import Incident
from app.utils.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/webhook/siem")
async def siem_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        # Parse the incoming alert
        alert_data = await request.json()
        logger.info(f"Received SIEM alert: {alert_data}")
        
        # Create a new incident
        incident = Incident(
            siem_alert_id=alert_data.get("id", "unknown"),
            severity=alert_data.get("severity", "medium"),
            description=alert_data.get("description", "No description"),
            source_ip=alert_data.get("source_ip", "unknown"),
            destination_ip=alert_data.get("destination_ip", "unknown"),
            raw_alert=alert_data,
            received_at=datetime.utcnow(),
            status="detected"
        )
        
        db.add(incident)
        db.commit()
        db.refresh(incident)
        
        logger.info(f"Created incident {incident.incident_id} from SIEM alert")
        
        return {
            "status": "success", 
            "incident_id": incident.incident_id,
            "message": "Incident created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))