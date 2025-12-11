# backend/gateway/security_middleware.py
"""
Security Middleware for Attack Detection and Logging.

This middleware inspects every incoming request for attack patterns,
logs security events to the audit system, triggers real-time notifications,
and can auto-quarantine IPs when AI confidence exceeds 90%.
"""

import asyncio
import logging
import time
import json
import re
from datetime import datetime, timedelta
from typing import Dict, Set, Tuple, Optional, Any, List
from collections import defaultdict
from dataclasses import dataclass, field

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession

from .attack_patterns import (
    AttackType, 
    ThreatLevel,
    detect_attack,
    detect_all_attacks,
    get_threat_level,
    get_quarantine_duration,
    SUSPICIOUS_USER_AGENTS,
)

logger = logging.getLogger(__name__)


# ============================================================
# In-Memory Tracking for Rate Limiting / Brute Force
# ============================================================
@dataclass
class IPTracker:
    """Track request patterns for an IP address."""
    failed_logins: int = 0
    requests_per_minute: int = 0
    last_request_time: float = 0.0
    blocked_until: float = 0.0
    attacks_detected: List[Tuple[str, float]] = field(default_factory=list)
    
    def is_blocked(self) -> bool:
        return time.time() < self.blocked_until


# Global tracking dictionaries (in production, use Redis)
_ip_trackers: Dict[str, IPTracker] = defaultdict(IPTracker)
_quarantined_ips: Set[str] = set()

# Rate limiting thresholds
BRUTE_FORCE_THRESHOLD = 10  # Failed logins before alert
BRUTE_FORCE_WINDOW = 300  # 5 minutes
REQUEST_RATE_LIMIT = 100  # Requests per minute before warning
MAX_BODY_SIZE = 10 * 1024 * 1024  # 10MB


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware that inspects requests for attack patterns.
    
    Detection capabilities:
    - SQL Injection (OWASP A03)
    - Brute Force authentication (OWASP A07)
    - SSRF attempts (OWASP A10)
    - Suspicious User-Agents (OWASP A06)
    - Directory traversal (OWASP A05)
    - Malformed/oversized input (OWASP A04)
    - Broken Access Control (OWASP A01)
    - XSS attempts
    - Command injection
    """
    
    def __init__(self, app, sio=None):
        super().__init__(app)
        self.sio = sio  # Socket.IO server for real-time alerts
        
        # Paths that require authentication
        self.protected_paths = {
            "/admin",
            "/api/v1/users",
            "/api/v1/logs",
        }
        
        # Login endpoint patterns for brute force detection
        self.login_endpoints = {
            "/token",
            "/api/v1/token",
            "/login",
        }

    async def dispatch(self, request: Request, call_next) -> Response:
        """Process each request through security checks."""
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        
        # Check if IP is quarantined
        if self._is_quarantined(client_ip):
            logger.warning(f"[Security] Blocked request from quarantined IP: {client_ip}")
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "Access denied. Your IP has been quarantined due to suspicious activity.",
                    "contact": "security@organization.com"
                }
            )
        
        # Track request rate
        tracker = _ip_trackers[client_ip]
        current_time = time.time()
        
        # Reset counter if window expired
        if current_time - tracker.last_request_time > 60:
            tracker.requests_per_minute = 0
        
        tracker.requests_per_minute += 1
        tracker.last_request_time = current_time
        
        # Perform security checks
        security_alerts: List[Dict[str, Any]] = []
        
        try:
            # 1. Check URL path for attacks
            path_alerts = await self._check_path(request, client_ip)
            security_alerts.extend(path_alerts)
            
            # 2. Check User-Agent
            ua_alerts = await self._check_user_agent(request, client_ip)
            security_alerts.extend(ua_alerts)
            
            # 3. Check request body (for POST/PUT/PATCH)
            if request.method in ("POST", "PUT", "PATCH"):
                body_alerts = await self._check_body(request, client_ip)
                security_alerts.extend(body_alerts)
            
            # 4. Check for broken access control
            access_alerts = await self._check_access_control(request, client_ip)
            security_alerts.extend(access_alerts)
            
            # Process any detected attacks
            if security_alerts:
                await self._process_security_alerts(security_alerts, request, client_ip)
                
                # Check if any alert requires blocking
                for alert in security_alerts:
                    if alert.get("block_request", False):
                        return JSONResponse(
                            status_code=403,
                            content={
                                "detail": f"Request blocked: {alert.get('attack_type', 'Security violation')}",
                                "incident_id": alert.get("incident_id", "")
                            }
                        )
            
            # Call the actual endpoint
            response = await call_next(request)
            
            # 5. Check for brute force (on login failure)
            if request.url.path in self.login_endpoints:
                await self._check_brute_force(request, response, client_ip)
            
            return response
            
        except Exception as e:
            logger.exception(f"[Security] Error in security middleware: {e}")
            # Don't block legitimate requests due to middleware errors
            return await call_next(request)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP, handling proxies."""
        # Check X-Forwarded-For header first (for proxied requests)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        
        # Fall back to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"

    def _is_quarantined(self, ip: str) -> bool:
        """Check if IP is in quarantine list."""
        return ip in _quarantined_ips

    async def _check_path(self, request: Request, client_ip: str) -> List[Dict[str, Any]]:
        """Check URL path for attack patterns."""
        alerts = []
        path = request.url.path
        query = str(request.url.query) if request.url.query else ""
        full_url = f"{path}?{query}" if query else path
        
        # Check for directory traversal
        is_attack, desc = detect_attack(full_url, AttackType.DIRECTORY_TRAVERSAL)
        if is_attack:
            alerts.append({
                "attack_type": AttackType.DIRECTORY_TRAVERSAL,
                "description": desc,
                "evidence": full_url[:200],
                "threat_level": ThreatLevel.HIGH,
                "block_request": True,
            })
        
        # Check for reconnaissance
        is_attack, desc = detect_attack(full_url, AttackType.RECONNAISSANCE)
        if is_attack:
            alerts.append({
                "attack_type": AttackType.RECONNAISSANCE,
                "description": desc,
                "evidence": full_url[:200],
                "threat_level": ThreatLevel.MEDIUM,
                "block_request": False,  # Log but don't block recon
            })
        
        # Check query string for SQL injection
        if query:
            is_attack, desc = detect_attack(query, AttackType.SQL_INJECTION)
            if is_attack:
                alerts.append({
                    "attack_type": AttackType.SQL_INJECTION,
                    "description": desc,
                    "evidence": query[:200],
                    "threat_level": ThreatLevel.CRITICAL,
                    "block_request": True,
                })
        
        return alerts

    async def _check_user_agent(self, request: Request, client_ip: str) -> List[Dict[str, Any]]:
        """Check User-Agent for suspicious patterns."""
        alerts = []
        user_agent = request.headers.get("User-Agent", "")
        
        is_attack, desc = detect_attack(user_agent, AttackType.SUSPICIOUS_UA)
        if is_attack:
            alerts.append({
                "attack_type": AttackType.SUSPICIOUS_UA,
                "description": desc,
                "evidence": user_agent[:200],
                "threat_level": ThreatLevel.LOW,
                "block_request": False,  # Just log, don't block
            })
        
        return alerts

    async def _check_body(self, request: Request, client_ip: str) -> List[Dict[str, Any]]:
        """Check request body for attack patterns."""
        alerts = []
        
        try:
            # Get body bytes
            body_bytes = await request.body()
            
            # Check for oversized input (OWASP A04)
            if len(body_bytes) > MAX_BODY_SIZE:
                alerts.append({
                    "attack_type": AttackType.MALFORMED_INPUT,
                    "description": f"Oversized request body: {len(body_bytes)} bytes",
                    "evidence": f"Body size: {len(body_bytes)}",
                    "threat_level": ThreatLevel.MEDIUM,
                    "block_request": True,
                })
                return alerts
            
            # Try to parse as JSON or form data
            body_str = body_bytes.decode("utf-8", errors="ignore")
            
            # Check for SQL injection in body
            is_attack, desc = detect_attack(body_str, AttackType.SQL_INJECTION)
            if is_attack:
                alerts.append({
                    "attack_type": AttackType.SQL_INJECTION,
                    "description": desc,
                    "evidence": body_str[:200],
                    "threat_level": ThreatLevel.CRITICAL,
                    "block_request": True,
                })
            
            # Check for SSRF in body (especially for URL fields)
            is_attack, desc = detect_attack(body_str, AttackType.SSRF)
            if is_attack:
                alerts.append({
                    "attack_type": AttackType.SSRF,
                    "description": desc,
                    "evidence": body_str[:200],
                    "threat_level": ThreatLevel.CRITICAL,
                    "block_request": True,
                })
            
            # Check for XSS
            is_attack, desc = detect_attack(body_str, AttackType.XSS)
            if is_attack:
                alerts.append({
                    "attack_type": AttackType.XSS,
                    "description": desc,
                    "evidence": body_str[:200],
                    "threat_level": ThreatLevel.HIGH,
                    "block_request": True,
                })
            
            # Check for command injection
            is_attack, desc = detect_attack(body_str, AttackType.COMMAND_INJECTION)
            if is_attack:
                alerts.append({
                    "attack_type": AttackType.COMMAND_INJECTION,
                    "description": desc,
                    "evidence": body_str[:200],
                    "threat_level": ThreatLevel.CRITICAL,
                    "block_request": True,
                })
            
            # Check for malformed JSON with very long strings (OWASP A04)
            try:
                content_type = request.headers.get("Content-Type", "")
                if "json" in content_type.lower():
                    data = json.loads(body_str)
                    if self._has_oversized_fields(data):
                        alerts.append({
                            "attack_type": AttackType.MALFORMED_INPUT,
                            "description": "Oversized field in JSON payload",
                            "evidence": "Field exceeds 10KB",
                            "threat_level": ThreatLevel.MEDIUM,
                            "block_request": True,
                        })
            except json.JSONDecodeError:
                # Invalid JSON is handled by FastAPI
                pass
                
        except Exception as e:
            logger.debug(f"[Security] Error reading request body: {e}")
        
        return alerts

    def _has_oversized_fields(self, data: Any, max_field_size: int = 10240) -> bool:
        """Recursively check for oversized string fields."""
        if isinstance(data, str):
            return len(data) > max_field_size
        elif isinstance(data, dict):
            return any(self._has_oversized_fields(v, max_field_size) for v in data.values())
        elif isinstance(data, list):
            return any(self._has_oversized_fields(item, max_field_size) for item in data)
        return False

    async def _check_access_control(self, request: Request, client_ip: str) -> List[Dict[str, Any]]:
        """Check for broken access control (OWASP A01)."""
        alerts = []
        path = request.url.path
        
        # Check if accessing protected path without auth
        for protected_path in self.protected_paths:
            if path.startswith(protected_path):
                auth_header = request.headers.get("Authorization")
                if not auth_header:
                    alerts.append({
                        "attack_type": AttackType.BROKEN_ACCESS,
                        "description": f"Unauthenticated access to protected path: {protected_path}",
                        "evidence": path,
                        "threat_level": ThreatLevel.MEDIUM,
                        "block_request": False,  # Let the endpoint handle auth
                    })
                break
        
        return alerts

    async def _check_brute_force(self, request: Request, response: Response, client_ip: str):
        """Track failed login attempts for brute force detection."""
        tracker = _ip_trackers[client_ip]
        
        # Check if login failed (status 400 or 401)
        if response.status_code in (400, 401):
            tracker.failed_logins += 1
            tracker.attacks_detected.append(("failed_login", time.time()))
            
            # Clean old entries
            cutoff = time.time() - BRUTE_FORCE_WINDOW
            tracker.attacks_detected = [
                (t, ts) for t, ts in tracker.attacks_detected if ts > cutoff
            ]
            
            # Count recent failed logins
            recent_failures = sum(
                1 for t, ts in tracker.attacks_detected 
                if t == "failed_login"
            )
            
            if recent_failures >= BRUTE_FORCE_THRESHOLD:
                # Trigger brute force alert
                await self._process_security_alerts([{
                    "attack_type": AttackType.BRUTE_FORCE,
                    "description": f"Brute force detected: {recent_failures} failed logins in {BRUTE_FORCE_WINDOW}s",
                    "evidence": f"IP: {client_ip}, Attempts: {recent_failures}",
                    "threat_level": ThreatLevel.HIGH,
                    "block_request": False,  # Already too late to block this request
                    "auto_quarantine": True,
                }], request, client_ip)
        else:
            # Successful login - reset counter
            tracker.failed_logins = 0

    async def _process_security_alerts(
        self, 
        alerts: List[Dict[str, Any]], 
        request: Request, 
        client_ip: str
    ):
        """Process detected attacks: log, audit, notify, and potentially quarantine."""
        import uuid
        from datetime import datetime
        
        for alert in alerts:
            attack_type = alert["attack_type"]
            if isinstance(attack_type, AttackType):
                attack_type_str = attack_type.value
            else:
                attack_type_str = str(attack_type)
            
            threat_level = alert.get("threat_level", ThreatLevel.MEDIUM)
            if isinstance(threat_level, ThreatLevel):
                threat_level_str = threat_level.value
            else:
                threat_level_str = str(threat_level)
            
            incident_id = str(uuid.uuid4())
            alert["incident_id"] = incident_id
            
            # 1. Log to console
            logger.warning(
                f"[SECURITY ALERT] {attack_type_str.upper()} from {client_ip} | "
                f"Level: {threat_level_str} | {alert.get('description', '')}"
            )
            
            # 2. Create audit log entry
            audit_data = {
                "action": f"security_alert_{attack_type_str}",
                "target": incident_id,
                "status": "detected",
                "actor": "security_middleware",
                "resource_type": "security_event",
                "details": {
                    "attack_type": attack_type_str,
                    "threat_level": threat_level_str,
                    "source_ip": client_ip,
                    "path": str(request.url.path),
                    "method": request.method,
                    "description": alert.get("description", ""),
                    "evidence": alert.get("evidence", "")[:500],  # Truncate evidence
                    "user_agent": request.headers.get("User-Agent", "")[:200],
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }
            
            # Record audit asynchronously
            asyncio.create_task(self._record_audit(audit_data))
            
            # 3. Emit WebSocket event for real-time notification
            if self.sio:
                ws_event = {
                    "incident_id": incident_id,
                    "attack_type": attack_type_str,
                    "threat_level": threat_level_str,
                    "source_ip": client_ip,
                    "description": alert.get("description", ""),
                    "path": str(request.url.path),
                    "method": request.method,
                    "timestamp": datetime.utcnow().isoformat(),
                    "recommended_action": "quarantine_ip" if threat_level in (ThreatLevel.CRITICAL, ThreatLevel.HIGH) else "investigate",
                    "severity": "CRITICAL" if threat_level == ThreatLevel.CRITICAL else "HIGH" if threat_level == ThreatLevel.HIGH else "MEDIUM",
                }
                asyncio.create_task(self._emit_security_event(ws_event))
            
            # 4. Check for auto-quarantine (>90% confidence + CRITICAL threat)
            if alert.get("auto_quarantine") or (
                threat_level == ThreatLevel.CRITICAL and 
                alert.get("confidence", 1.0) >= 0.9
            ):
                await self._auto_quarantine(
                    client_ip, 
                    attack_type_str, 
                    threat_level,
                    incident_id
                )
            
            # 5. Create incident in database
            asyncio.create_task(self._create_incident(alert, request, client_ip, incident_id))

    async def _record_audit(self, audit_data: Dict[str, Any]):
        """Record security event to audit service."""
        try:
            from audit_service.local_ai.audit_agent import audit_agent
            await audit_agent.record_action(
                action=audit_data["action"],
                target=audit_data["target"],
                status=audit_data["status"],
                actor=audit_data["actor"],
                resource_type=audit_data["resource_type"],
                details=audit_data["details"],
            )
        except Exception as e:
            logger.debug(f"[Security] Failed to record audit: {e}")

    async def _emit_security_event(self, event_data: Dict[str, Any]):
        """Emit security alert via WebSocket."""
        try:
            if self.sio:
                await self.sio.emit("security.attack_detected", event_data)
                await self.sio.emit("incident.received", event_data)  # Also trigger general incident event
                logger.info(f"[Security] Emitted security alert: {event_data['attack_type']}")
        except Exception as e:
            logger.debug(f"[Security] Failed to emit WebSocket event: {e}")

    async def _auto_quarantine(
        self, 
        ip: str, 
        attack_type: str, 
        threat_level: ThreatLevel,
        incident_id: str
    ):
        """Auto-quarantine IP when AI confidence is high and threat is critical."""
        logger.warning(f"[Security] AUTO-QUARANTINE: IP {ip} for {attack_type}")
        
        # Add to in-memory quarantine list
        _quarantined_ips.add(ip)
        
        # Calculate duration based on threat level
        duration = get_quarantine_duration(threat_level)
        
        # Try to block in pfSense
        try:
            from shared_lib.integrations.pfsense_client import pfsense_client
            if pfsense_client and pfsense_client.is_configured():
                await pfsense_client.block_ip(
                    ip, 
                    reason=f"Auto-quarantine: {attack_type} (Incident: {incident_id})"
                )
                logger.info(f"[Security] Blocked IP {ip} in pfSense firewall")
        except Exception as e:
            logger.warning(f"[Security] Failed to block IP in pfSense: {e}")
        
        # Store in database
        try:
            await self._store_quarantine(ip, attack_type, threat_level, duration, incident_id)
        except Exception as e:
            logger.warning(f"[Security] Failed to store quarantine record: {e}")
        
        # Emit quarantine event
        if self.sio:
            try:
                await self.sio.emit("security.ip_quarantined", {
                    "ip": ip,
                    "attack_type": attack_type,
                    "threat_level": threat_level.value if isinstance(threat_level, ThreatLevel) else threat_level,
                    "duration_seconds": duration,
                    "incident_id": incident_id,
                    "timestamp": datetime.utcnow().isoformat(),
                })
            except Exception:
                pass

    async def _store_quarantine(
        self, 
        ip: str, 
        attack_type: str, 
        threat_level: ThreatLevel,
        duration: int,
        incident_id: str
    ):
        """Store quarantine record in database."""
        try:
            from core.database import async_session_factory
            from datetime import datetime, timedelta
            
            async with async_session_factory() as session:
                from sqlalchemy import text
                
                # Calculate expiration (0 = permanent)
                expires_at = None
                if duration > 0:
                    expires_at = datetime.utcnow() + timedelta(seconds=duration)
                
                await session.execute(text("""
                    INSERT INTO quarantined_ips (id, ip_address, reason, attack_type, 
                        quarantined_at, quarantined_by, expires_at, status, related_incident_id)
                    VALUES (gen_random_uuid(), :ip, :reason, :attack_type, 
                        NOW(), 'security_middleware', :expires_at, 'active', :incident_id)
                    ON CONFLICT (ip_address) DO UPDATE SET
                        status = 'active',
                        quarantined_at = NOW(),
                        expires_at = :expires_at
                """), {
                    "ip": ip,
                    "reason": f"Auto-quarantine: {attack_type}",
                    "attack_type": attack_type,
                    "expires_at": expires_at,
                    "incident_id": incident_id,
                })
                await session.commit()
        except Exception as e:
            logger.debug(f"[Security] Database quarantine failed: {e}")

    async def _create_incident(
        self, 
        alert: Dict[str, Any], 
        request: Request, 
        client_ip: str,
        incident_id: str
    ):
        """Create incident in the database for security alerts."""
        try:
            from core.database import async_session_factory
            from core.models import Incident
            import uuid
            
            attack_type = alert.get("attack_type")
            if isinstance(attack_type, AttackType):
                attack_type_str = attack_type.value
            else:
                attack_type_str = str(attack_type)
            
            threat_level = alert.get("threat_level", ThreatLevel.MEDIUM)
            if isinstance(threat_level, ThreatLevel):
                threat_level_str = threat_level.value
            else:
                threat_level_str = str(threat_level)
            
            # Map threat level to severity
            severity_map = {
                "critical": "CRITICAL",
                "high": "HIGH",
                "medium": "MEDIUM",
                "low": "LOW",
                "info": "LOW",
            }
            severity = severity_map.get(threat_level_str, "MEDIUM")
            
            async with async_session_factory() as session:
                incident = Incident(
                    incident_id=uuid.UUID(incident_id),
                    alert_id=f"SEC-{attack_type_str.upper()[:10]}-{incident_id[:8]}",
                    severity=severity,
                    status="NEW",
                    description=f"Security Alert: {alert.get('description', attack_type_str)}",
                    source_ip=client_ip,
                    raw_data={
                        "attack_type": attack_type_str,
                        "threat_level": threat_level_str,
                        "path": str(request.url.path),
                        "method": request.method,
                        "evidence": alert.get("evidence", "")[:1000],
                        "user_agent": request.headers.get("User-Agent", "")[:500],
                        "source": "security_middleware",
                        "auto_quarantined": alert.get("auto_quarantine", False),
                    },
                    timestamp=datetime.utcnow(),
                )
                session.add(incident)
                await session.commit()
                logger.info(f"[Security] Created incident {incident_id} for {attack_type_str}")
        except Exception as e:
            logger.debug(f"[Security] Failed to create incident: {e}")


# ============================================================
# Utility Functions for External Use
# ============================================================

def quarantine_ip(ip: str, reason: str = "Manual quarantine"):
    """Manually quarantine an IP address."""
    _quarantined_ips.add(ip)
    logger.info(f"[Security] Manually quarantined IP: {ip} - {reason}")


def release_ip(ip: str):
    """Release an IP from quarantine."""
    _quarantined_ips.discard(ip)
    logger.info(f"[Security] Released IP from quarantine: {ip}")


def get_quarantined_ips() -> Set[str]:
    """Get the set of currently quarantined IPs."""
    return _quarantined_ips.copy()


def is_ip_quarantined(ip: str) -> bool:
    """Check if an IP is quarantined."""
    return ip in _quarantined_ips
