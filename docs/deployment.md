# Production Deployment Guide

This guide walks you through deploying the Ransomware Response System behind an automatic HTTPS reverse proxy using Caddy + Let's Encrypt.

## 1. Prepare environment variables

Create a production `.env` file (for example `backend/.env.prod`) that contains your secrets, database connection strings, and integration keys. Minimum variables:

```env
DATABASE_URL=postgresql+asyncpg://admin:supersecretpassword@postgres:5432/ransomware_db
SECRET_KEY=replace_with_32_char_secret
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
ENABLED_INTEGRATIONS=wazuh,pfsense,abuseipdb,malwarebazaar
AUTO_RESPONSE_ENABLED=true
```

For integrations, add:

```env
WAZUH_API_URL=https://your-wazuh.example.com
WAZUH_USERNAME=...
WAZUH_PASSWORD=...
PFSENSE_API_URL=https://your-firewall.example.com
PFSENSE_API_TOKEN=...
ABUSEIPDB_API_KEY=...
MALWAREBAZAAR_API_KEY=...
```

## 2. Configure HTTPS domain

Set the following environment variables before launching the stack:

```bash
export APP_DOMAIN=security.example.com
export LETSENCRYPT_EMAIL=secops@example.com
```

`APP_DOMAIN` is the public domain that end users will hit (Caddy issues the certificate for this domain).

## 3. Launch with Caddy reverse proxy

Start the base services and the production overlay:

```bash
docker compose --env-file backend/.env.prod up -d
docker compose --env-file backend/.env.prod -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d caddy
```

The overlay file defines a lightweight Caddy container that automatically provisions Let's Encrypt certificates and reverse proxies traffic to the API gateway (`/api`, WebSocket) and React frontend.

## 4. Hardened container guidance

- Application services in `docker-compose.yml` run with `no-new-privileges` to prevent privilege escalation.
- Mount volumes as read-only wherever possible. Models or writable directories can be shared via dedicated volumes.
- Consider moving secrets to Docker secrets or a vault in production.

## 5. Post-deploy checklist

- Confirm health endpoints: `https://security.example.com/api/v1/health` and `https://security.example.com`.
- Run automated regression suite (see README Quality Gates).
- Rotate default credentials (`admin` / `admin123`) and create SOC analyst accounts via `backend/create_admin.py`.
- Monitor the `audit_logs` table to ensure immutable event ingestion is active.

For air-gapped or alternative environments, adapt the Caddy deployment to your preferred reverse proxy (Traefik, Nginx) using the same upstream targets (`gateway:8000`, `frontend:3000`).*** End Patch

