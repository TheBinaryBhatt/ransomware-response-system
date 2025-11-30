# backend/core/config.py
from pathlib import Path
from typing import Optional, List, Any, Dict

import yaml
from pydantic import AnyUrl, PostgresDsn, Field
from pydantic_settings import BaseSettings
import logging

logger = logging.getLogger(__name__)


def _load_yaml(path: Optional[str]) -> Dict[str, Any]:
    if not path:
        return {}
    file_path = Path(path)
    if not file_path.exists():
        return {}
    try:
        with file_path.open("r", encoding="utf-8") as handle:
            return yaml.safe_load(handle) or {}
    except Exception:
        logger.exception("Failed loading integration config YAML")
        return {}


class Settings(BaseSettings):
    # API Gateway default bind (can be overridden per service)
    host: str = "0.0.0.0"  # nosec B104 - required for container networking
    port: int = 8000

    # Service identification (optional)
    service_name: Optional[str] = None

    # Per-service database URLs (optional). If individual service URL is not provided
    # services/consumers can fall back to `database_url`.
    ingestion_db_url: Optional[PostgresDsn] = None
    triage_db_url: Optional[PostgresDsn] = None
    response_db_url: Optional[PostgresDsn] = None
    audit_db_url: Optional[PostgresDsn] = None

    # General database URL fallback
    database_url: Optional[PostgresDsn] = None

    # PostgreSQL container defaults (only used if you build URLs dynamically)
    postgres_user: str = "admin"
    postgres_password: str = "supersecretpassword"
    postgres_db: str = "ransomware_db"

    # Redis
    redis_url: str = "redis://redis:6379"

    # JWT Secret Key - required
    secret_key: str = Field(..., min_length=32)

    # External API Keys / Integrations
    abuseipdb_api_key: Optional[str] = None
    malwarebazaar_api_key: Optional[str] = None
    wazuh_api_url: AnyUrl = "https://localhost:55000"
    wazuh_username: str = "wazuh_user"
    wazuh_password: str = "wazuh_pass"
    pfsense_api_url: AnyUrl = "https://pfsense.example.com"
    pfsense_api_token: Optional[str] = None

    enabled_integrations: List[str] = Field(
        default_factory=lambda: ["wazuh", "pfsense", "abuseipdb", "malwarebazaar"]
    )
    auto_response_enabled: bool = True

    # CORS Origins for Frontend
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    # Service URLs (optional, can be overridden via env)
    triage_service_url: Optional[str] = None
    response_service_url: Optional[str] = None

    integration_config_path: Optional[str] = "config/integrations.yaml"

    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra environment variables

    def model_post_init(self, __context: Any) -> None:
        """
        Called after the settings model is initialised (pydantic v2).
        Loads integration overrides from YAML (if present).
        """
        overrides = _load_yaml(self.integration_config_path)
        if not overrides:
            return

        enabled = overrides.get("enabled_integrations")
        if isinstance(enabled, list) and enabled:
            self.enabled_integrations = enabled

        integrations = overrides.get("integrations", {})
        wazuh_cfg = integrations.get("wazuh", {})
        if wazuh_cfg:
            self.wazuh_api_url = wazuh_cfg.get("api_url", self.wazuh_api_url)
            self.wazuh_username = wazuh_cfg.get("username", self.wazuh_username)
            self.wazuh_password = wazuh_cfg.get("password", self.wazuh_password)

        pfsense_cfg = integrations.get("pfsense", {})
        if pfsense_cfg:
            self.pfsense_api_url = pfsense_cfg.get("api_url", self.pfsense_api_url)
            self.pfsense_api_token = pfsense_cfg.get("api_token", self.pfsense_api_token)

        abuse_cfg = integrations.get("abuseipdb", {})
        if abuse_cfg:
            self.abuseipdb_api_key = abuse_cfg.get("api_key", self.abuseipdb_api_key)

        mb_cfg = integrations.get("malwarebazaar", {})
        if mb_cfg:
            self.malwarebazaar_api_key = mb_cfg.get("api_key", self.malwarebazaar_api_key)

    def is_integration_enabled(self, name: str) -> bool:
        return name in (self.enabled_integrations or [])


# Single global settings instance used by services
from os import getenv

if not getenv("BUILDING_DOCKER_IMAGE"):
    settings = Settings()
else:
    # dummy object with only required fields
    settings = Settings(secret_key="x"*32)

