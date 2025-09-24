import aiohttp
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class ThreatIntelClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://api.abuseipdb.com/api/v2"
    
    async def check_ip(self, ip_address: str) -> Optional[Dict[str, Any]]:
        """
        Check an IP address against AbuseIPDB
        """
        if not self.api_key:
            logger.warning("No AbuseIPDB API key provided")
            return None
        
        try:
            headers = {
                "Key": self.api_key,
                "Accept": "application/json"
            }
            params = {
                "ipAddress": ip_address,
                "maxAgeInDays": 90,
                "verbose": True
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/check",
                    headers=headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"AbuseIPDB API error: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Error querying AbuseIPDB: {e}")
            return None

# Global instance
threat_intel_client = ThreatIntelClient()