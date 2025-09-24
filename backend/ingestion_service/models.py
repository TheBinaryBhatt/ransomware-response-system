from sqlalchemy import Column, String, JSON
from core.database import IncidentBase

class IngestionIncident(IncidentBase):
    __tablename__ = "ingestion_incidents"
    
    # Additional fields specific to ingestion
    status = Column(String, default="received")
