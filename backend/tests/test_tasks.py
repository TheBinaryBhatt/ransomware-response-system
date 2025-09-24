from dotenv import load_dotenv
import os
import uuid

# Load environment variables before any imports that use them
load_dotenv(dotenv_path="backend/.env")
print("INGESTION_DB_URL =", os.getenv("INGESTION_DB_URL"))

import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from response_service.tasks import (
    quarantine_host,
    block_ip,
    enrich_threat_intel,
    conditional_escalation,
    escalate_response,
    finalize_response,
    trigger_full_response,
)
from response_service.models import ResponseIncident
from core.database import Base


@pytest.fixture(scope="module")
def db_engine():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a new session for a test."""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.rollback()  # Rollback any transactions
    session.close()


@pytest.fixture(autouse=True)
def patch_get_db(db_session, monkeypatch):
    """Patch get_db to return the test session."""
    monkeypatch.setattr("response_service.tasks.get_db", lambda: iter([db_session]))


@patch("response_service.integrations.abuseipdb_client.abuseipdb_client.check_ip", new_callable=AsyncMock)
@patch("response_service.integrations.malwarebazaar_client.malwarebazaar_client.query_hash", new_callable=AsyncMock)
def test_enrich_threat_intel(mock_query_hash, mock_check_ip, db_session):
    mock_check_ip.return_value = {"confidence": 90}
    mock_query_hash.return_value = {"query_status": "ok", "data": {"foo": "bar"}}

    # Use a proper UUID for the incident ID
    incident_id = str(uuid.uuid4())
    incident = ResponseIncident(
        id=incident_id,
        siem_alert_id="alert123",
        source="test_source",
        raw_data={"source_ip": "1.2.3.4", "file_hash": "abc"},
        response_status="pending",
    )
    db_session.add(incident)
    db_session.commit()
    context = {"incident_id": incident_id}

    result = enrich_threat_intel(context)
    assert "intel" in result
    assert result["intel"].get("abuseipdb") is not None
    assert result["intel"].get("malwarebazaar") is not None
    assert result.get("escalate") is True


def test_conditional_escalation_no_escalate(db_session):
    incident_id = str(uuid.uuid4())
    context = {"incident_id": incident_id, "escalate": False}
    assert conditional_escalation(context) == context


def test_conditional_escalation_with_escalate(db_session):
    # Use a different UUID for this test to avoid conflicts
    incident_id = str(uuid.uuid4())
    incident = ResponseIncident(
        id=incident_id,
        siem_alert_id="alert456",
        source="test_source",
        raw_data={"source_ip": "1.2.3.4"},
        response_status="pending",
    )
    db_session.add(incident)
    db_session.commit()

    context = {"incident_id": incident_id, "escalate": True}
    result = conditional_escalation(context)
    assert isinstance(result, dict)
    assert result["incident_id"] == incident_id


@patch("response_service.tasks.chain")
def test_trigger_full_response(mock_chain):
    mock_result = mock_chain.return_value.apply_async.return_value
    mock_result.id = "task123"
    incident_id = str(uuid.uuid4())
    task_id = trigger_full_response(incident_id, "agentA")
    assert task_id == "task123"
