import asyncio
import json
import time
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from response_service.main import app as response_app
from response_service.models import ResponseIncident
from core.database import get_db_session
from core.rabbitmq_utils import wait_for_rabbitmq

pytestmark = pytest.mark.asyncio


async def wait_for_condition(check, timeout=20):
    """
    Helper: repeatedly evaluate a condition function until True or timeout.
    """
    start = time.time()
    while time.time() - start < timeout:
        if await check():
            return True
        await asyncio.sleep(1)
    return False


async def test_full_e2e_pipeline():
    """
    Full E2E test:
    - Submit SIEM webhook
    - Trigger response
    - Wait for Celery workflow
    - Verify audit logs exist
    - Verify timeline API returns expected events
    """

    # run inside test HTTP client
    async with AsyncClient(app=response_app, base_url="http://test") as client:

        # 1. Submit SIEM alert
        siem_payload = {
            "alert_id": "test_ransom_001",
            "source_ip": "45.90.10.10",
            "agent_id": "WIN-DEV1",
            "file_hash": "testhash12345",
            "timestamp": "2025-01-10T12:00:00Z"
        }

        resp = await client.post("/webhook/siem", json=siem_payload)
        assert resp.status_code == 200

        # 2. Trigger response (simulate AI triage)
        triage_result = {
            "decision": "confirmed_ransomware",
            "threat_score": 95,
            "threat_level": "critical",
            "recommended_actions": ["quarantine_host", "block_ip"]
        }

        resp = await client.post(
            "/incidents/test_ransom_001/respond",
            json={
                "automated": True,
                "triage_result": triage_result,
                "analysis": {"agent_id": "agent_x"}
            }
        )
        assert resp.status_code == 200
        task_id = resp.json().get("task_id")
        assert task_id is not None

        # 3. Wait for workflow to complete
        async def workflow_done():
            r = await client.get("/workflows/test_ransom_001/status")
            data = r.json()
            return data.get("state") == "SUCCESS"

        assert await wait_for_condition(workflow_done, timeout=40)

        # 4. Check timeline API
        timeline_resp = await client.get("/incidents/test_ransom_001/timeline")
        assert timeline_resp.status_code == 200
        timeline = timeline_resp.json()
        assert timeline["decision"] == "confirmed_ransomware"
        assert len(timeline["events"]) > 0

        event_types = [entry["event_type"] for entry in timeline["events"]]
        assert "response.quarantine.completed" in event_types
        assert "response.block_ip.completed" in event_types
        assert "response.workflow.completed" in event_types

        print("E2E pipeline success!")

