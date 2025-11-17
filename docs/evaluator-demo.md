# Evaluator Demo Script (Phase 9)

Use this runbook to showcase the platform end-to-end.

## 1. Pre-Demo Checklist

1. `cp backend/.env.example backend/.env` and set secrets/DSNs.
2. `cp frontend/.env.example frontend/.env` and set `REACT_APP_API_URL`.
3. Copy `config/integrations.example.yaml` ➜ `config/integrations.yaml`, populate integration credentials.
4. Start the stack:

```bash
docker compose up -d postgres redis rabbitmq
docker compose up -d ingestion_service triage_service response_service audit_service gateway frontend
```

5. Create an admin:

```bash
python backend/create_admin.py --username admin --password admin123 --role admin
```

## 2. Demo Flow (≈10 minutes)

1. **Login Experience**
   - Visit `http://localhost:3000`, log in as `admin`.
   - Highlight the secure login screen, RBAC, and WebSocket connection banner.

2. **Real-Time Dashboard**
   - Explain Incident Velocity, Threat Breakdown, Response Status, and live incident table.
   - Show that filters, drilldowns, and the details panel update without page refresh (WebSockets).

3. **Agentic Workflow Trigger**
   - In a terminal, run:
     ```bash
     python monitor_microservices.py
     ```
   - This sends a synthetic alert to `/siem/webhook`. Show logs describing ingestion ➜ triage ➜ response.
   - Observe new card entries in the dashboard and confirm response workflow completion.

4. **Audit & Compliance**
   - Call the gateway audit endpoint:
     ```bash
     http :8000/api/v1/logs "Authorization:Bearer <token>"
     ```
   - Point out immutable hashes and timestamps ensuring SOC compliance.

5. **Threat Intel Panel**
   - In the UI, open **Threat Intel** page, run an AbuseIPDB lookup (use a benign IP if the key is configured).

## 3. Wrap-Up Talking Points

- Microservices follow DDD boundaries (see `docs/architecture/ddd.md`).
- Config-driven integrations enable rapid cloud redeployments (`docs/cloud-readiness.md`).
- Automated pipelines (GitHub Actions + `scripts/run_tests.py` + `scripts/security_checks.py`) cover Phase 10 CI/CD.
- Open-source readiness: README, architecture diagrams, and demo scripts are all checked in under `docs/`.

With these steps you can consistently deliver a polished evaluation in under 15 minutes.

