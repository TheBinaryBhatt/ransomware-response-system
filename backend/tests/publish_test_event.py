# backend/tests/publish_test_event.py
import asyncio
from shared_lib.events.rabbitmq import init_event_bus, publish_event, close_event_bus

async def main():
    await init_event_bus("rabbitmq")
    body = {
        "incident_id": "T-TEST-1",
        "id": "T-TEST-1",
        "source_ip": "8.8.8.8",
        "file_hash": None,
        "severity": "high",
        "original": {"destination_ip": "8.8.8.8"},
        "triage": {"triage_id": "T-TEST-1"}
    }
    await publish_event("triage.completed", body)
    await asyncio.sleep(1)
    await close_event_bus()

if __name__ == "__main__":
    asyncio.run(main())
