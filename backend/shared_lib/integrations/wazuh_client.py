import aiohttp
import logging
from typing import Optional, Dict, Any
from core.config import settings

logger = logging.getLogger(__name__)

class WazuhClient:
    def __init__(self, base_url: Optional[str] = None, 
                 username: Optional[str] = None, 
                 password: Optional[str] = None,
                 verify_ssl: bool = False):
        self.base_url = base_url or str(settings.wazuh_api_url)
        self.username = username or settings.wazuh_username
        self.password = password or settings.wazuh_password
        self.verify_ssl = verify_ssl
        self.session = None
    
    def is_configured(self) -> bool:
        return bool(self.base_url and self.username and self.password)
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            base_url=self.base_url,
            auth=aiohttp.BasicAuth(self.username, self.password),
            connector=aiohttp.TCPConnector(ssl=self.verify_ssl)
        )
        return self
    
    async def __aexit__(self, *exc):
        if self.session:
            await self.session.close()
    
    async def quarantine_agent(self, agent_id: str) -> Dict[str, Any]:
        """Quarantine a Wazuh agent"""
        try:
            async with self.session.post(
                f"/active-response/{agent_id}",
                json={
                    "command": "firewall-drop",
                    "arguments": ["-", "Ransomware incident auto-containment"]
                }
            ) as response:
                response.raise_for_status()
                return await response.json()
        except Exception as e:
            logger.error(f"Failed to quarantine agent {agent_id}: {e}")
            raise

# Global instance
wazuh_client = WazuhClient()