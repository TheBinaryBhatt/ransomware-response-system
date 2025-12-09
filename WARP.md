# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Key workflows & commands

### Run the full stack with Docker (recommended)

From the repo root:

- Start all services (PostgreSQL, Redis, RabbitMQ, backend microservices, Celery worker, frontend):
  - `docker compose up -d`
- Production-like overlay (adds Caddy / hardening options):
  - `docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d`
- View logs and troubleshoot:
  - `docker compose logs`
  - `docker compose restart response_service gateway triage_service`
  - `docker compose down && docker compose up -d`

Once running, the main dashboard is at `http://localhost:3000` and the backend gateway at `http://localhost:8000`.

### Database initialization & seed data

These commands assume Python 3.11+ is available on the host and Docker services (Postgres, etc.) are reachable at `localhost`.

From the repo root:

- Initialize schema (destructive for existing data):
  - `python backend/init_db.py`
- Seed example incidents:
  - `python backend/seed_incidents.py`
- Create or reset an admin user from the host (pointing at a local Postgres instance):
  - `python backend/create_admin.py --username admin --password admin123 --role admin --db-url postgresql+asyncpg://admin:supersecretpassword@localhost:5432/ransomware_db`

### Backend development & tests

#### Install dependencies

If you want to work on the backend without Docker:

- Install backend and test requirements:
  - `pip install -r backend/requirements.txt`
  - `pip install -r requirements-test.txt`

#### Run backend tests

- Full backend test suite (matches CI job):
  - `pytest backend/tests -q`
- Run only integration tests:
  - `pytest backend/tests/integration/ -v`
- Run a single test or test case (standard pytest node-id syntax):
  - `pytest backend/tests/test_<file>.py::TestClass::test_case_name`

#### Linting and security checks (Python)

CI uses Ruff and Bandit with the following commands; mirror these locally when changing backend code:

- Ruff linting:
  - `ruff check backend`
- Bandit security scan:
  - `bandit -c bandit.yaml -r backend`

### Frontend development & tests

From `frontend/`:

- Install dependencies:
  - `npm install` (or `npm ci` to match CI)
- Start the dev server (Vite, defaults to port 3000):
  - `npm run dev`
- Build production assets:
  - `npm run build`
- Lint TypeScript/React code:
  - `npm run lint`
- Run frontend tests (as in CI):
  - `CI=true npm test -- --watch=false`

### End-to-end backend verification (PowerShell, Windows)

There are two PowerShell helpers at the repo root that exercise cross-service flows end-to-end. Use these when making changes that span multiple backend services.

- Scenario-style test that creates an incident, authenticates, triggers triage and response, inspects Celery and RabbitMQ, then checks the incident timeline and threat intel:
  - `./test-backend.ps1`
- More granular, sectioned test suite with per-section PASS/WARN/FAIL summary:
  - `./test-backend-full.ps1`

Both scripts assume the Docker stack is already running (`docker compose up -d`) and will hit the services on `http://localhost:8000–8004`.

## High-level architecture

### Overall system layout

This repo implements an event-driven, microservices-based ransomware response platform. At a high level:

- **Frontend (React + TypeScript)** exposes a SOC dashboard and management UI.
- **API Gateway** (`backend/gateway`) is the single entry point for the frontend and external API clients, aggregating data across services and exposing WebSocket streams.
- **Domain microservices** (`backend/ingestion_service`, `triage_service`, `response_service`, `audit_service`, `alerting_service`) each own one part of the incident lifecycle.
- **Shared infrastructure** is provided by PostgreSQL, Redis, RabbitMQ and Celery workers, orchestrated via `docker-compose.yml`.
- **Shared libraries** (`backend/core`, `backend/shared_lib`) centralize configuration, database models, messaging, and third-party integrations.

The primary data and control flow is:

1. Alerts arrive from external systems (e.g., Wazuh) into the **Ingestion Service**.
2. Ingestion normalizes and validates the event, persists it, and emits domain events to RabbitMQ using a topic exchange (`ransomware_events`).
3. The **Triage Service** consumes these events, enriches them (threat intel + local AI analysis), and publishes updated triage results.
4. The **Response Service** consumes triage outputs and executes automated workflows (firewall blocks, host isolation, etc.), again emitting events as actions progress.
5. The **Audit Service** observes key actions across the flow and records immutable audit logs with integrity hashes.
6. The **Gateway** subscribes to event streams and surfaces them to the frontend via REST and WebSocket, driving real-time UI updates.

### Backend structure & responsibilities

Backend code lives under `backend/` and is organized by bounded context:

- `backend/core`
  - Central configuration (Pydantic settings), database engine setup, SQLAlchemy models, security utilities (JWT, password hashing), and Celery/RabbitMQ helpers.
  - Models define the core entities: users, incidents, triage/response records, and audit logs.
- `backend/shared_lib`
  - Reusable building blocks shared across services:
    - `events/` (RabbitMQ abstraction and event helpers)
    - `integrations/` (clients for Wazuh, pfSense, AbuseIPDB, MalwareBazaar, VirusTotal, Sigma/YARA engines)
    - `schemas/` (Pydantic schemas for incidents and related payloads)
- `backend/gateway`
  - FastAPI application that exposes the public REST API and WebSocket endpoints.
  - Key endpoint groups (non-exhaustive): authentication and user management, incident listing/detail and response triggers, system health, dashboard analytics, threat intel lookup, and audit log proxying.
  - Includes a RabbitMQ consumer that listens for domain events and pushes them into WebSocket channels consumed by the frontend.
- `backend/ingestion_service`
  - FastAPI service that accepts alerts from SIEM/EDR sources (e.g., `/api/v1/webhook` and gateway `/siem/webhook`).
  - Normalizes incoming alerts, persists new incidents, and publishes `alert.received` events into the `ransomware_events` exchange.
- `backend/triage_service`
  - FastAPI + Celery service that performs AI-powered triage.
  - Consumes `alert.received` (and related) events, calls into `local_ai/` modules for LLM-based reasoning and threat enrichment, and publishes `alert.triaged` updates.
- `backend/response_service`
  - FastAPI + Celery service responsible for automated containment and remediation.
  - Uses `shared_lib.integrations` to talk to Wazuh (host isolation), pfSense (firewall rules), and threat intel APIs.
  - Encapsulates reusable workflows in `workflows/` (e.g., isolate endpoint, block IOCs, perform forensics, notify SOC).
  - Emits `response.triggered` and `response.task.completed` events as workflows execute.
- `backend/audit_service`
  - FastAPI service that maintains an immutable audit log with SHA-256 hash chaining for compliance.
  - Exposes log retrieval and integrity verification endpoints, which are in turn proxied by the gateway to the frontend.
- `backend/alerting_service`
  - Handles outbound notifications (e.g., email or other channels) based on important events in the incident lifecycle.

Several services have `local_ai/` subpackages, which encapsulate prompts, LLM loading, and task-specific AI logic (e.g., triage reasoning, audit summarization, response recommendations). These are designed so that the rest of the service code can treat AI outputs as just another enrichment source.

### Event bus and real-time behavior

The platform uses RabbitMQ as a topic-based event bus and Socket.IO/WebSockets for UI updates:

- **RabbitMQ topic exchange**: `ransomware_events`
  - Typical routing keys include `alert.received`, `alert.triaged`, `response.triggered`, `response.task.completed`, and `audit.log.created`.
  - Ingestion, triage, response, and audit services all publish and/or consume from this exchange.
- **Gateway event bridge**:
  - A dedicated consumer (`backend/gateway/event_consumer.py`) listens for events on `ransomware_events` and forwards them to connected WebSocket clients.
  - Frontend listeners subscribe to event types such as `incident.received` and `response.task.completed` to trigger refetches or live updates.

### Frontend architecture

Frontend code lives under `frontend/src` and is structured by responsibility:

- **App shell & routing**
  - `App.tsx` wires up React Router and wraps pages in a shared layout (sidebar, header, notification center).
- **Core services & types**
  - `services/api.ts` defines an Axios-based client divided into domain-specific modules (auth, incidents, dashboard metrics, threat intel, system health, workflows, audit logs, integrations, users).
  - `services/websocket.ts` encapsulates the Socket.IO client and connection lifecycle.
  - `types/` contains shared TypeScript models for incidents, workflows, audit logs, threat intel, and API responses.
- **Custom hooks**
  - `hooks/useApi.ts` handles API calls with retry, cancellation, 401 handling, and error categorization.
  - `hooks/useWebSocket.ts` abstracts subscription to WebSocket events and reconnection handling.
  - `hooks/useLocalStorage.ts` provides persistent client-side state where needed.
- **Pages & feature areas**
  - **Dashboard** and **Incidents** pages are fully integrated with live backend APIs and WebSocket events.
  - **Threat Intel** page calls backend threat intel endpoints with a robust fallback to mock data if the backend is unavailable.
  - **Workflows** and **Audit Logs** pages have production-ready UIs but currently use in-memory mock data; backend integration (via `workflowsApi` and `auditLogsApi`) is the main remaining frontend task.
  - **Settings** page provides a complete UI for user and system preferences but does not yet persist settings to the backend.

When modifying backend APIs, keep in mind that many frontend components depend on the shapes defined in `frontend/src/types` and the modules in `frontend/src/services/api.ts`. Changes to response schemas should be coordinated across both sides.

### Configuration & integrations

- Environment is primarily configured via `.env` files in `backend/` and `frontend/` and Docker Compose environment variables.
- Critical variables include:
  - `DATABASE_URL` / `*_DB_URL` for the core and per-service Postgres connections.
  - `SECRET_KEY` for JWT signing.
  - `REDIS_URL`, `CELERY_BROKER_URL`, and `CELERY_RESULT_BACKEND` for Celery and caching.
  - `ENABLED_INTEGRATIONS` to toggle integrations such as `wazuh`, `pfsense`, `abuseipdb`, `malwarebazaar`.
  - Per-integration settings like `WAZUH_API_URL`, `PFSENSE_API_URL`, `ABUSEIPDB_API_KEY`, etc.
- Integration-specific logic is centralized in `backend/shared_lib/integrations/`, and configuration schemas/documentation are in `config/` and `docs/` (e.g., Wazuh and pfSense guides, threat intel configuration, cloud readiness and security hardening docs).

This high-level view should be sufficient for future Warp instances to quickly locate the right service or layer when implementing new features or debugging cross-service flows.