import aiohttp
import logging
from typing import Optional

from core.config import settings

logger = logging.getLogger(__name__)


class AbuseIPDBClient:
    BASE_URL = "https://api.abuseipdb.com/api/v2"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.abuseipdb_api_key
        self.session: Optional[aiohttp.ClientSession] = None

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def __aenter__(self):
        if not self.is_configured():
            raise RuntimeError("AbuseIPDB API key not configured")
        self.session = aiohttp.ClientSession(
            headers={"Key": self.api_key, "Accept": "application/json"}
        )
        return self

    async def __aexit__(self, *exc):
        if self.session:
            await self.session.close()
            self.session = None

    async def check_ip(self, ip_address: str, max_age_in_days: int = 90) -> dict:
        """
        Query AbuseIPDB API for a given IPv4 or IPv6 address.
        Returns the JSON response dictionary.
        """
        if not self.session:
            raise RuntimeError("Client session not initialized. Use 'async with'.")

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


# Global instance to be used in tasks/routes
abuseipdb_client = AbuseIPDBClient()
