# backend/response_service/events.py

RESPONSE_WORKFLOW_STARTED = "response.workflow.started"
RESPONSE_WORKFLOW_COMPLETED = "response.workflow.completed"

ACTION_QUARANTINE_DONE = "response.quarantine.completed"
ACTION_BLOCK_IP_DONE = "response.block_ip.completed"
ACTION_ESCALATE_TRIGGERED = "response.escalation.triggered"
ACTION_FORENSICS_COLLECTED = "response.forensics.collected"

__all__ = [
    "RESPONSE_WORKFLOW_STARTED",
    "RESPONSE_WORKFLOW_COMPLETED",
    "ACTION_QUARANTINE_DONE",
    "ACTION_BLOCK_IP_DONE",
    "ACTION_ESCALATE_TRIGGERED",
    "ACTION_FORENSICS_COLLECTED"
]
