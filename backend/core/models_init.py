# backend/core/models_init.py

"""
This file ensures SQLAlchemy loads ALL models across all microservices
before Base.metadata.create_all() is executed.
"""

# Import all incident models to register them with Base metadata
from ingestion_service.models import IngestionIncident
from triage_service.models import TriageIncident
from response_service.models import ResponseIncident

# Optional (if needed later): from alerting_service.models import Something
# Optional: from audit_service.models import Something
