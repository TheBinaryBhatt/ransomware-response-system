from sqlalchemy import Column, String
from core.database import IncidentBase

class IngestionIncident(IncidentBase):
    __tablename__ = "ingestion_incidents"

    status = Column(String, default="received")
