from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from .models import AuditLog

router = APIRouter()

@router.get("/logs")
async def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).all()
    return logs

@router.post("/log")
async def create_audit_log(log_data: dict, db: Session = Depends(get_db)):
    try:
        log = AuditLog(
            action=log_data.get("action"),
            target=log_data.get("target"),
            status=log_data.get("status"),
            details=log_data.get("details", {})
        )
        
        db.add(log)
        db.commit()
        db.refresh(log)
        
        return {"status": "success", "log_id": str(log.id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))