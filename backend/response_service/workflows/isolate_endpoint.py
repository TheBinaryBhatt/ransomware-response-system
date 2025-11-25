# backend/response_service/workflows/isolate_endpoint.py
import asyncio
from shared_lib.integrations.wazuh_client import wazuh_client


async def isolate_endpoint(agent_id: str):
    if not wazuh_client or not wazuh_client.is_configured():
        return {"status": "skipped", "reason": "Wazuh not configured", "agent_id": agent_id}

    async with wazuh_client:
        try:
            return await wazuh_client.quarantine_agent(agent_id)
        except Exception as e:
            return {"status": "error", "agent_id": agent_id, "error": str(e)}
