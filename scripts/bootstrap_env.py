#!/usr/bin/env python3
"""
Create starter .env files for backend and frontend if they do not exist.
Usage: python scripts/bootstrap_env.py
"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

BACKEND_ENV = """SECRET_KEY=supersecretkey_supersecretkey_supersecretkey_123
DATABASE_URL=postgresql+asyncpg://admin:supersecretpassword@localhost:5432/ransomware_db
INGESTION_DB_URL=${DATABASE_URL}
TRIAGE_DB_URL=${DATABASE_URL}
RESPONSE_DB_URL=${DATABASE_URL}
AUDIT_DB_URL=${DATABASE_URL}
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=${REDIS_URL}
CELERY_RESULT_BACKEND=${REDIS_URL}
RABBITMQ_HOST=localhost
ABUSEIPDB_API_KEY=
MALWAREBAZAAR_API_KEY=
WAZUH_API_URL=https://localhost:55000
WAZUH_USERNAME=wazuh_user
WAZUH_PASSWORD=wazuh_pass
PFSENSE_API_URL=https://pfsense.example.com
PFSENSE_API_TOKEN=
INTEGRATION_CONFIG_PATH=config/integrations.yaml
"""

FRONTEND_ENV = """REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WS_URL=http://localhost:8000
"""


def write_file(path: Path, contents: str) -> None:
    if path.exists():
        print(f"Skipping {path} (already exists)")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")
    print(f"Created {path}")


def main() -> None:
    write_file(REPO_ROOT / "backend" / ".env", BACKEND_ENV)
    write_file(REPO_ROOT / "frontend" / ".env", FRONTEND_ENV)
    integration_sample = REPO_ROOT / "config" / "integrations.yaml"
    if not integration_sample.exists() and (REPO_ROOT / "config" / "integrations.example.yaml").exists():
        data = (REPO_ROOT / "config" / "integrations.example.yaml").read_text(encoding="utf-8")
        integration_sample.write_text(data, encoding="utf-8")
        print(f"Copied config/integrations.yaml from example")


if __name__ == "__main__":
    main()

