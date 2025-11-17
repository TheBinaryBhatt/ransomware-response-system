# Demo Playbook

Follow this sequence to demonstrate the full ransomware response workflow.

## 1. Boot the platform

```bash
docker-compose up -d
```

- Wait for `triage_service` health to become `200 OK` (model load can take a few minutes).
- Create the default users if needed:
  ```bash
  docker exec ransomware-response-system-gateway python backend/create_admin.py
  ```

## 2. Authenticate

```bash
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" \
  http://localhost:8000/api/v1/token
```

Capture the returned bearer token for subsequent requests.

## 3. Trigger an alert

```bash
curl -X POST http://localhost:8000/siem/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "demo-001",
    "source": "wazuh",
    "event_type": "ransomware",
    "severity": "high",
    "source_ip": "203.0.113.25",
    "agent_id": "agent-12"
  }'
```

## 4. Observe the workflow

- Monitor WebSocket updates in the dashboard (`http://localhost:3000`).
- Tail service logs for event-driven activity:
  ```bash
  docker-compose logs -f ingestion_service triage_service response_service audit_service
  ```

## 5. Review analytics

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/v1/incidents/stats
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/v1/logs
```

## 6. Toggle integrations

To demonstrate resiliency, edit `backend/.env` (or export variables) and restart services:

- Disable pfSense: `ENABLED_INTEGRATIONS=wazuh,abuseipdb,malwarebazaar`
- Disable auto-response: `AUTO_RESPONSE_ENABLED=false`

Re-run the alert injection to show graceful degradation and immutable audit logging.

