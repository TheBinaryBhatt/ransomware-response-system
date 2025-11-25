# backend/response_service/workflows/block_iocs.py
import asyncio
from shared_lib.integrations.pfsense_client import pfsense_client


async def block_ip_firewall(ip: str):
    if not pfsense_client or not pfsense_client.is_configured():
        return {"status": "skipped", "reason": "pfSense not configured", "ip": ip}

    async with pfsense_client:
        try:
            return await pfsense_client.block_ip(ip)
        except Exception as e:
            return {"status": "error", "error": str(e), "ip": ip}
