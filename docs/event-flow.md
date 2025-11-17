# Event-Driven Workflow

```mermaid
sequenceDiagram
    autonumber
    participant SIEM as External SIEM
    participant Gateway as API Gateway
    participant Ingestion as Ingestion Service
    participant Bus as RabbitMQ
    participant Triage as Triage Service
    participant Response as Response Service
    participant Audit as Audit Service

    SIEM->>Gateway: POST /siem/webhook (alert payload)
    Gateway->>Ingestion: Forward alert
    Ingestion->>Ingestion: Persist raw alert
    Ingestion->>Bus: Publish incident.received
    Bus->>Triage: incident.received
    Triage->>Triage: AI/local model analysis
    Triage->>Bus: Publish incident.triaged
    Bus->>Response: incident.triaged
    Response->>Response: Conditional auto-response
    Response->>Bus: Publish response.* updates
    Bus->>Audit: incident.* & response.* events
    Audit->>Audit: Immutable log storage
    Gateway-->>Frontend: WebSocket updates
```

**Key takeaways**

- All cross-service communication happens via the `ransomware_events` topic exchange.
- Integrations (Wazuh, pfSense, threat intel) are switched on/off through `ENABLED_INTEGRATIONS`.
- Auto-response can be disabled globally via `AUTO_RESPONSE_ENABLED=false`.

