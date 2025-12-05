"""Fix the corrupted gateway/main.py file"""

# Read the file
with open('gateway/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# The new incidents endpoints code with proper implementation
new_incidents_code = '''

# ============================================
# INCIDENTS ENDPOINTS - REAL DATABASE QUERIES
# ============================================

@app.get("/api/v1/incidents")
async def get_incidents(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of incidents with filtering and pagination
    Queries real database with filters
    """
    try:
        # Build query
        stmt = select(Incident)
        
        # Apply filters - case insensitive matching
        if status:
            stmt = stmt.where(Incident.status.ilike(status))
        
        if severity:
            stmt = stmt.where(Incident.severity.ilike(severity))
        
        # Get total count (before pagination)
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering - use received_at (actual column in DB)
        stmt = stmt.order_by(Incident.received_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        incidents = result.scalars().all()
        
        # Format response using actual column names from database
        incidents_data = [
            {
                "id": str(incident.id),
                "incident_id": str(incident.incident_id) if incident.incident_id else str(incident.id),
                "alert_id": incident.siem_alert_id or "",
                "severity": (incident.severity or "MEDIUM").upper(),
                "status": (incident.status or "NEW").upper(),
                "description": incident.description or "",
                "source_ip": str(incident.source_ip) if incident.source_ip else None,
                "destination_ip": str(incident.destination_ip) if incident.destination_ip else None,
                "timestamp": incident.received_at.isoformat() if incident.received_at else None,
                "created_at": incident.received_at.isoformat() if incident.received_at else None
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
            # If not UUID, try siem_alert_id
            stmt = select(Incident).where(Incident.siem_alert_id == incident_id)
        
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
            "alert_id": incident.siem_alert_id or "",
            "severity": (incident.severity or "MEDIUM").upper(),
            "status": (incident.status or "NEW").upper(),
            "description": incident.description or "",
            "source_ip": str(incident.source_ip) if incident.source_ip else None,
            "destination_ip": str(incident.destination_ip) if incident.destination_ip else None,
            "raw_data": incident.raw_alert or {},
            "timestamp": incident.received_at.isoformat() if incident.received_at else None,
            "created_at": incident.received_at.isoformat() if incident.received_at else None,
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
# SYSTEM HEALTH ENDPOINT
# ============================================
'''

# Find the start of the broken section (after status-breakdown endpoint)
marker_start = 'raise HTTPException(status_code=500, detail=f"Failed to fetch status breakdown: {str(e)}")'
marker_end = '# ============================================\n# SYSTEM HEALTH ENDPOINT'

start_idx = content.find(marker_start)
if start_idx == -1:
    print("Could not find start marker!")
    exit(1)

# Find where the status-breakdown function ends
start_idx = start_idx + len(marker_start)

# Find where SYSTEM HEALTH starts
end_idx = content.find(marker_end)
if end_idx == -1:
    # Try with \r\n
    marker_end = '# ============================================\r\n# SYSTEM HEALTH ENDPOINT'
    end_idx = content.find(marker_end)

if end_idx == -1:
    print("Could not find end marker!")
    exit(1)

# Replace the section
new_content = content[:start_idx] + new_incidents_code + content[end_idx + len(marker_end.split('\n')[0]) + 1:]

# Also need to append the SYSTEM HEALTH header properly
# Actually, let's just keep the end marker

new_content = content[:start_idx] + new_incidents_code[:-50] + content[end_idx:]

# Write back
with open('gateway/main.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Fixed gateway/main.py successfully!")
