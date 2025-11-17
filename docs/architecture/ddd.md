# Domain-Driven Architecture Overview

The Ransomware Response System applies Domain-Driven Design (DDD) to keep microservices aligned with business capabilities. Each bounded context owns its data model and asynchronous contracts, making the platform horizontally scalable and cloud-friendly.

## Bounded Contexts

| Context   | Service(s)                 | Aggregate Roots                 | Responsibilities |
|-----------|---------------------------|---------------------------------|------------------|
| Ingestion | `ingestion_service`       | `IngestionIncident`             | Normalize SIEM/webhook alerts, publish `incident.received` events. |
| Triage    | `triage_service`          | `TriageIncident`                | Apply AI/agent analysis, derive decisions, publish `incident.triaged`. |
| Response  | `response_service`        | `ResponseIncident`, `Workflow`  | Execute playbooks, integrate with Wazuh/pfSense, publish `response.*`. |
| Audit     | `audit_service`           | `AuditLog`                      | Immutable logs with hash-chain integrity, subscribe to `incident.*`, `response.*`, `security.*`. |
| Gateway   | `gateway`                 | `User`, `Session`               | Auth, RBAC, WebSocket fan-out, API orchestration. |

Each bounded context relies on RabbitMQ (`ransomware_events` topic exchange) for cross-context communication. Events follow `{domain}.{action}` naming, e.g., `incident.received`, `response.workflow.completed`, `security.login.success`.

## Aggregate Rules

- Aggregates are mutated only inside their owning service. Example: only the Triage service can update `TriageIncident`.
- Whenever an aggregate changes state, it MUST publish an event describing the transition. Responses and audit services should never read another service’s database.
- Commands (HTTP) are synchronous and scoped to the owning context. Cross-context side-effects use events to remain loosely coupled.

## Config-Driven Integrations

All integrations (Wazuh, pfSense, AbuseIPDB, MalwareBazaar) are toggled and configured via:

```
config/integrations.yaml   # copy from integrations.example.yaml
```

`enabled_integrations` determines which clients initialize, and per-integration settings override environment variables. This makes cloud deployments declarative: ship a different YAML per environment or mount via secrets.

## Target Cloud Topology

- Deploy services to separate containers or Kubernetes deployments per bounded context.
- Use dedicated PostgreSQL schemas/instances per context for fault isolation.
- Leverage managed RabbitMQ (or AWS MQ) and Redis (or ElastiCache) instances.
- Horizontal scaling: increase replica counts per context based on queue depth (`cloud.replica_count` hint in the integration config).

## Reference Event Flow

1. Ingestion persists alert ➜ emits `incident.received`.
2. Triage consumer picks event, runs AI ➜ emits `incident.triaged`.
3. Response consumer triggers Celery workflow ➜ emits `response.workflow.started/completed`.
4. Audit consumer persists every event with immutable hashes.
5. Gateway bridge listens to all events and relays them to WebSocket clients.

Following this structure keeps microservices autonomous, observability-friendly, and ready for hybrid-cloud rollouts.

