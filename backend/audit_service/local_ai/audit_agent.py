# backend/audit_service/local_ai/audit_agent.py
import logging
import httpx
import os
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

AUDIT_SERVICE_URL = os.getenv("AUDIT_SERVICE_URL", "http://audit_service:8004/api/v1/log")

class AuditAgent:
    """
    Simple audit agent that POSTs audit logs to audit_service API.
    """
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or AUDIT_SERVICE_URL

    async def record_action(self, action: str, target: str = None, status: str = "info", details: Dict[str, Any] = None, actor: str = "system", resource_type: str = "system"):
        payload = {
            "action": action,
            "target": target,
            "status": status,
            "details": details or {},
            "actor": actor,
            "resource_type": resource_type
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(self.base_url, json=payload)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.exception("Failed to record audit log: %s", e)
            # If audit service unreachable, fallback to local log only
            logger.info("AUDIT FALLBACK: %s %s %s", action, target, details)
            return {"status": "failed", "error": str(e)}

# singleton
audit_agent = AuditAgent()
