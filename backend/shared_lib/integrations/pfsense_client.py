import aiohttp
import logging
from typing import Optional, Dict, Any
from core.config import settings

logger = logging.getLogger(__name__)

class PfSenseClient:
    def __init__(self, base_url: Optional[str] = None, 
                 api_key: Optional[str] = None):
        self.base_url = base_url or str(settings.pfsense_api_url)
        self.api_key = api_key or settings.pfsense_api_token

    def is_configured(self) -> bool:
        return bool(self.base_url and self.api_key)
    
    async def block_ip(self, ip_address: str, reason: str = "Ransomware incident") -> Dict[str, Any]:
        """Block an IP address in pfSense"""
        try:
            if not self.api_key:
                raise RuntimeError("pfSense API token not configured")
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/v1/firewall/alias",
                    headers=headers,
                    json={
                        "name": "Ransomware_Blocklist",
                        "type": "host",
                        "address": ip_address,
                        "descr": reason
                    }
                ) as response:
                    response.raise_for_status()
                    return await response.json()
        except Exception as e:
            logger.error(f"Failed to block IP {ip_address}: {e}")
            raise

# Global instance
pfsense_client = PfSenseClient()