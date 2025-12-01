from pydantic import BaseModel, Field
from typing import Any, Optional, List
from datetime import datetime

class TimelineEntry(BaseModel):
    timestamp: datetime
    event_type: str
    source: str
    details: dict[str, Any]

class IncidentTimeline(BaseModel):
    incident_id: str
    score: Optional[int]
    threat_level: Optional[str]
    decision: Optional[str]
    recommended_actions: Optional[List[str]] = Field(default_factory=list)
    events: List[TimelineEntry]
