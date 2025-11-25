# backend/triage_service/config.py
import os


# Sigma rules path used by sigma engine. You can override in docker-compose/env.
SIGMA_RULES_PATH = os.getenv("SIGMA_RULES_PATH", "/app/triage_service/sigma_rules")
