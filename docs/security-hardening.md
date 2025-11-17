# Security Hardening Playbook

This guide captures the operational steps that complete **Phase 7** of the roadmap. It is split into four focus areas you can run end-to-end on every deployment.

---

## 1. Static Analysis & Secure Coding Gates

Run all static checks with a single helper:

```bash
python scripts/security_checks.py
```

The script executes the following tools with the repository-native configuration files (`ruff.toml`, `bandit.yaml`, `.eslintrc.cjs`):

| Tool   | Scope   | Command                                              |
|--------|---------|------------------------------------------------------|
| Ruff   | Python lint/style | `ruff check backend`                       |
| Bandit | Python security   | `bandit -c bandit.yaml -r backend`         |
| ESLint | React/TypeScript  | `npm run lint` (inside `frontend/`)        |

Options: `--skip-python`, `--skip-frontend`, `--verbose`.

Recommended cadence:

- **CI**: run on every pull request (fast, <1 min).
- **Pre-release**: run with additional `pip-audit`/`npm audit` and unit tests.

---

## 2. HTTPS with Let's Encrypt (Caddy)

TLS termination lives in `deploy/Caddyfile`. To enable certificates:

1. Set the environment variables:
   - `APP_DOMAIN=rrs.yourdomain.com`
   - `LETSENCRYPT_EMAIL=security-team@yourdomain.com`
2. Deploy with the production compose overlay:

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d
```

The Caddyfile already injects modern security headers (`HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) and negotiates HTTP/2 with automatic certificate renewal.

---

## 3. Vulnerability Scanning & Dependency Hygiene

### Containers & Filesystem

```bash
# Scan the working tree for OS/package CVEs
trivy fs --exit-code 1 --severity HIGH,CRITICAL .

# Scan built images (example tags)
docker build -t rrs/gateway backend/gateway
trivy image --exit-code 1 --severity HIGH,CRITICAL rrs/gateway
```

### Python

```bash
pip install pip-audit
pip-audit -r requirements-test.txt -r backend/requirements.txt
```

### Node.js

```bash
cd frontend
npm audit --audit-level=high
```

Document any exceptions in `docs/security-exceptions.md` (create on demand) so reviewers can track deferred fixes.

---

## 4. Docker / Runtime Hardening

Core services already run without privileged ports. For additional protection:

- Set `read_only: true`, `cap_drop: [ALL]`, `security_opt: ["no-new-privileges:true"]` per service inside `docker-compose.yml`.
- Mount secrets via Docker/Swarm secrets or environment files with `chmod 600`.
- Place RabbitMQ, Postgres, and Redis behind a private network (`networks.secure` is already defined).
- Enable resource limits to mitigate DoS: e.g. `deploy.resources.limits.cpus: "0.50"`, `memory: 512M`.

Example snippet:

```yaml
services:
  gateway:
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
```

---

## 5. Continuous Monitoring

- Pipe `docker logs` into the audit service (already subscribed to `security.*` events) so every login attempt, workflow trigger, and automation result is recorded immutably.
- Alert on failed security gates by wiring `scripts/security_checks.py` + `trivy` into CI (GitHub Actions or Jenkins) and failing the pipeline on non-zero exits.

With these steps automated, Phase 7 is considered **complete**: static analysis is reproducible, HTTPS is enforced, vulnerability scanning is documented, and runtime hardened defaults are defined. Continuous improvements (e.g., SAST/DAST integration) can be layered on top without additional architectural changes.

