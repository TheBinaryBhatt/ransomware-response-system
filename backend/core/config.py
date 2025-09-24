from pydantic_settings import BaseSettings
from pydantic import AnyUrl, PostgresDsn, Field

class Settings(BaseSettings):
    # API Gateway
    host: str = "0.0.0.0"
    port: int = 8000

    # Database URLs (one per service)
    ingestion_db_url: PostgresDsn
    triage_db_url: PostgresDsn
    response_db_url: PostgresDsn
    audit_db_url: PostgresDsn

    # Redis
    redis_url: str = "redis://localhost:6379"

    # JWT Secret Key
    secret_key: str = Field(..., min_length=32)

    # External API Keys
    abuseipdb_api_key: str | None = None

    # CORS Origins for Frontend
    cors_origins: list[str] = ["http://localhost:3000"]

    # Triage Service URL (for ingestion → triage forwarding)
    triage_service_url: AnyUrl = "http://triage_service:8002/api/v1/incidents"

    class Config:
        env_file = ".env"

settings = Settings()
