import aiohttp
import logging
from core.config import settings

logger = logging.getLogger(__name__)

class AbuseIPDBClient:
    BASE_URL = "https://api.abuseipdb.com/api/v2"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.abuseipdb_api_key
        if not self.api_key:
            raise ValueError("AbuseIPDB API key not configured")
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={"Key": self.api_key, "Accept": "application/json"}
        )
        return self

    async def __aexit__(self, *exc):
        if self.session:
            await self.session.close()

    async def check_ip(self, ip_address: str, max_age_in_days: int = 90) -> dict:
        """
        Query AbuseIPDB API for a given IPv4 or IPv6 address.
        Returns the JSON response dictionary.
        """
        url = f"{self.BASE_URL}/check"
        params = {"ipAddress": ip_address, "maxAgeInDays": str(max_age_in_days)}

        try:
            async with self.session.get(url, params=params) as resp:
                resp.raise_for_status()
                data = await resp.json()
                return data.get("data", {})
        except Exception as e:
            logger.error(f"AbuseIPDB query failed for {ip_address}: {e}")
            raise

# Global instance to be used in tasks
abuseipdb_client = AbuseIPDBClient()
