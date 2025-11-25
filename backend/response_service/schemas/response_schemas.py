from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime


class ResponseAction(BaseModel):
    action: str                      # renamed from action_type
    status: str                      # pending / executed / failed
    result: Optional[Dict[str, Any]] = None


class ResponseRequest(BaseModel):
    """
    Incoming request to trigger response workflow.
    Matches what /incidents/{id}/respond expects.
    """
    automated: Optional[bool] = False
    triage_result: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None


class ResponseResult(BaseModel):
    response_id: str
    actions: Optional[List[ResponseAction]] = []
    timestamp: datetime
    triage_result: Optional[Dict[str, Any]] = None


class ResponseWorkflowCreate(BaseModel):
    """
    Internal workflow creation schema.
    triage_result = triage agent output
    actions = planned actions
    """
    triage_result: Dict[str, Any]
    actions: List[str]
