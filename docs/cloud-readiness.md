# Cloud Readiness Checklist (Phase 8)

This document summarizes the steps needed to deploy the Ransomware Response System across cloud environments (AWS/Azure/GCP).

## 1. Configuration & Secrets

- **Environment variables** remain the primary override. For multi-region support, mount a per-environment `config/integrations.yaml` to the containers and set `INTEGRATION_CONFIG_PATH` if needed.
- Use managed secret stores (AWS Secrets Manager, Azure Key Vault) to inject:
  - Database DSNs (`*_DB_URL`)
  - JWT secret (`SECRET_KEY`)
  - Integration API keys (AbuseIPDB, MalwareBazaar, pfSense, Wazuh)

## 2. Data Stores

- PostgreSQL: use managed services (AWS RDS, Azure Database for PostgreSQL, Cloud SQL). Each bounded context can point to its own database or schema for isolation.
- Redis/RabbitMQ: leverage Elasticache + Amazon MQ (or Azure Cache + Azure Service Bus). Update the respective URLs in `.env`.

## 3. Container Orchestration

- Build images per service (`docker compose build gateway`, etc.) and push to ECR/ACR/GCR.
- Recommended Kubernetes deployment:
  - Namespace per environment (`rrs-dev`, `rrs-prod`).
  - Deployments for gateway/ingestion/triage/response/audit.
  - Stateful services (Postgres, RabbitMQ) run as managed services or stateful sets.
  - Leverage Horizontal Pod Autoscaler using RabbitMQ queue depth metrics.

## 4. Networking & Security

- Place services on a private subnet; expose only the gateway via a load balancer (ALB/NLB).
- Terminate TLS at the edge (ALB) or keep Caddy in front of the gateway for auto-renewing certificates.
- Use security groups / NSGs to limit traffic (e.g., only gateway can reach ingestion).
- Enable WAF rules for `/siem/webhook`.

## 5. Observability

- Forward FastAPI and Celery logs to a centralized stack (CloudWatch, Azure Monitor, Stackdriver).
- Export RabbitMQ metrics (Prometheus) and set alerts on dead-letter queues.
- Add synthetic tests that hit `/health` endpoints through the load balancer.

## 6. Disaster Recovery

- Nightly snapshots of PostgreSQL databases.
- Retain integration YAMLs and `.env` templates in secure storage.
- Scripted bootstrap: `docker compose` files + `scripts/security_checks.py` and `scripts/run_tests.py` for smoke tests before/after failover.

Following this checklist satisfies the Phase 8 “Scalability & Cloud Integration” milestone without altering core runtime semantics.

