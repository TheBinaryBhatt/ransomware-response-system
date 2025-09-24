from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional

class TriageDecision(str, Enum):
    CONFIRMED_RANSOMWARE = "confirmed_ransomware"
    FALSE_POSITIVE = "false_positive"
    ESCALATE_HUMAN = "escalate_human"

class IncidentCreate(BaseModel):
    siem_alert_id: str
    source: str = "wazuh"
    raw_data: dict
    timestamp: datetime

class IncidentTriageResult(BaseModel):
    incident_id: str
    decision: TriageDecision
    confidence: float = Field(..., ge=0.0, le=1.0)
    reasoning: str
    recommended_actions: list[str] = []