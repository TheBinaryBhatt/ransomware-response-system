# backend/gateway/attack_patterns.py
"""
Centralized attack pattern definitions for OWASP Top 10 and common attack detection.
These patterns are used by the security middleware to identify malicious requests.
"""

import re
from typing import Dict, List, Tuple
from enum import Enum


class AttackType(str, Enum):
    """Attack type classification for logging and quarantine decisions."""
    SQL_INJECTION = "sql_injection"
    BRUTE_FORCE = "brute_force"
    SSRF = "ssrf"
    XSS = "xss"
    DIRECTORY_TRAVERSAL = "directory_traversal"
    COMMAND_INJECTION = "command_injection"
    BROKEN_ACCESS = "broken_access"
    SUSPICIOUS_UA = "suspicious_user_agent"
    MALFORMED_INPUT = "malformed_input"
    CRYPTOGRAPHIC_FAILURE = "cryptographic_failure"
    DATA_INTEGRITY = "data_integrity"
    RECONNAISSANCE = "reconnaissance"
    RANSOMWARE = "ransomware_behavior"
    PRIVILEGE_ESCALATION = "privilege_escalation"


class ThreatLevel(str, Enum):
    """Threat level for determining quarantine duration."""
    CRITICAL = "critical"  # Permanent ban
    HIGH = "high"          # 7 days
    MEDIUM = "medium"      # 24 hours
    LOW = "low"            # 1 hour
    INFO = "info"          # Log only, no block


# Mapping attack type to default threat level
ATTACK_THREAT_LEVELS: Dict[AttackType, ThreatLevel] = {
    AttackType.SQL_INJECTION: ThreatLevel.CRITICAL,
    AttackType.BRUTE_FORCE: ThreatLevel.HIGH,
    AttackType.SSRF: ThreatLevel.CRITICAL,
    AttackType.XSS: ThreatLevel.HIGH,
    AttackType.DIRECTORY_TRAVERSAL: ThreatLevel.HIGH,
    AttackType.COMMAND_INJECTION: ThreatLevel.CRITICAL,
    AttackType.BROKEN_ACCESS: ThreatLevel.MEDIUM,
    AttackType.SUSPICIOUS_UA: ThreatLevel.LOW,
    AttackType.MALFORMED_INPUT: ThreatLevel.MEDIUM,
    AttackType.CRYPTOGRAPHIC_FAILURE: ThreatLevel.LOW,
    AttackType.DATA_INTEGRITY: ThreatLevel.MEDIUM,
    AttackType.RECONNAISSANCE: ThreatLevel.MEDIUM,
    AttackType.RANSOMWARE: ThreatLevel.CRITICAL,
    AttackType.PRIVILEGE_ESCALATION: ThreatLevel.CRITICAL,
}


# Quarantine duration in seconds based on threat level
QUARANTINE_DURATION: Dict[ThreatLevel, int] = {
    ThreatLevel.CRITICAL: 0,       # 0 = permanent
    ThreatLevel.HIGH: 7 * 24 * 3600,  # 7 days
    ThreatLevel.MEDIUM: 24 * 3600,    # 24 hours
    ThreatLevel.LOW: 3600,            # 1 hour
    ThreatLevel.INFO: 0,              # No quarantine
}


# ============================================================
# SQL Injection Patterns (OWASP A03)
# ============================================================
SQL_INJECTION_PATTERNS: List[Tuple[str, str]] = [
    # Basic authentication bypass
    (r"('|\")\s*(OR|AND)\s*('|\")?\d+\s*=\s*\d+", "SQL auth bypass: OR 1=1 pattern"),
    (r"('|\")\s*(OR|AND)\s*('|\")?\w+\s*=\s*\1\w+", "SQL auth bypass: OR 'a'='a' pattern"),
    (r"'\s*OR\s*'1'\s*=\s*'1", "SQL auth bypass: classic pattern"),
    
    # SQL comment injection
    (r"--\s*$", "SQL comment termination"),
    (r"#\s*$", "MySQL comment termination"),
    (r"/\*.*\*/", "SQL block comment"),
    
    # Union-based injection
    (r"UNION\s+(ALL\s+)?SELECT", "UNION-based SQL injection"),
    (r"UNION\s+SELECT\s+NULL", "UNION NULL injection"),
    
    # Stacked queries
    (r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE)\s+", "Stacked SQL command"),
    (r";\s*EXEC\s+", "SQL Server EXEC injection"),
    (r";\s*xp_", "SQL Server extended procedure"),
    
    # Boolean-based blind injection
    (r"AND\s+\d+\s*=\s*\d+", "Boolean-based SQL injection"),
    (r"OR\s+\d+\s*=\s*\d+", "Boolean-based SQL injection"),
    
    # Time-based blind injection
    (r"SLEEP\s*\(\s*\d+\s*\)", "Time-based SQL injection (SLEEP)"),
    (r"BENCHMARK\s*\(", "Time-based SQL injection (BENCHMARK)"),
    (r"WAITFOR\s+DELAY", "Time-based SQL injection (WAITFOR)"),
    (r"pg_sleep\s*\(", "PostgreSQL time-based injection"),
    
    # Information gathering
    (r"SELECT\s+.*\s+FROM\s+(information_schema|pg_catalog|sys\.)", "Schema enumeration"),
    (r"@@version", "SQL Server version probe"),
    (r"version\(\)", "MySQL/PostgreSQL version probe"),
]

# ============================================================
# SSRF Patterns (OWASP A10)
# ============================================================
SSRF_PATTERNS: List[Tuple[str, str]] = [
    # Localhost variants
    (r"127\.0\.0\.1", "SSRF: localhost IPv4"),
    (r"localhost", "SSRF: localhost hostname"),
    (r"0\.0\.0\.0", "SSRF: all interfaces"),
    (r"\[::1\]", "SSRF: localhost IPv6"),
    
    # Private network ranges
    (r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}", "SSRF: private class A"),
    (r"172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}", "SSRF: private class B"),
    (r"192\.168\.\d{1,3}\.\d{1,3}", "SSRF: private class C"),
    
    # Cloud metadata endpoints
    (r"169\.254\.169\.254", "SSRF: AWS/GCP metadata"),
    (r"metadata\.google\.internal", "SSRF: GCP metadata"),
    (r"169\.254\.170\.2", "SSRF: AWS ECS metadata"),
    
    # Internal service names
    (r"(http|https)://internal", "SSRF: internal hostname"),
    (r"(http|https)://backend", "SSRF: backend hostname"),
    (r"(http|https)://(db|database|mysql|postgres|redis|rabbitmq)", "SSRF: database hostname"),
    
    # File protocol
    (r"file://", "SSRF: file protocol"),
    (r"gopher://", "SSRF: gopher protocol"),
    (r"dict://", "SSRF: dict protocol"),
]

# ============================================================
# XSS Patterns (OWASP A07)
# ============================================================
XSS_PATTERNS: List[Tuple[str, str]] = [
    (r"<script[^>]*>", "XSS: script tag"),
    (r"javascript:", "XSS: javascript protocol"),
    (r"on(load|error|click|mouseover|submit)\s*=", "XSS: event handler"),
    (r"<iframe[^>]*>", "XSS: iframe injection"),
    (r"<svg[^>]*onload", "XSS: SVG onload"),
    (r"<img[^>]*onerror", "XSS: IMG onerror"),
    (r"expression\s*\(", "XSS: CSS expression"),
    (r"eval\s*\(", "XSS: eval injection"),
]

# ============================================================
# Directory Traversal Patterns (OWASP A05)
# ============================================================
DIRECTORY_TRAVERSAL_PATTERNS: List[Tuple[str, str]] = [
    (r"\.\./", "Directory traversal: ../"),
    (r"\.\.\\", "Directory traversal: ..\\"),
    (r"%2e%2e%2f", "Directory traversal: URL encoded"),
    (r"%2e%2e/", "Directory traversal: partial encoded"),
    (r"\.\.%2f", "Directory traversal: partial encoded"),
    (r"%252e%252e%252f", "Directory traversal: double encoded"),
    (r"/etc/passwd", "Directory traversal: passwd file"),
    (r"/etc/shadow", "Directory traversal: shadow file"),
    (r"c:\\windows", "Directory traversal: Windows path"),
    (r"c:/windows", "Directory traversal: Windows path"),
]

# ============================================================
# Command Injection Patterns
# ============================================================
COMMAND_INJECTION_PATTERNS: List[Tuple[str, str]] = [
    (r";\s*(cat|ls|whoami|id|pwd|uname|wget|curl|nc|bash|sh|python|perl|ruby)", "Command injection: shell command"),
    (r"\|\s*(cat|ls|whoami|id|pwd|uname)", "Command injection: pipe"),
    (r"`[^`]+`", "Command injection: backtick"),
    (r"\$\([^)]+\)", "Command injection: subshell"),
    (r"&&\s*(cat|ls|whoami|id|pwd)", "Command injection: AND chain"),
    (r"\|\|\s*(cat|ls|whoami|id)", "Command injection: OR chain"),
]

# ============================================================
# Suspicious User-Agent Patterns (OWASP A06)
# ============================================================
SUSPICIOUS_USER_AGENTS: List[Tuple[str, str]] = [
    (r"sqlmap", "Scanner: sqlmap"),
    (r"nikto", "Scanner: nikto"),
    (r"nmap", "Scanner: nmap"),
    (r"nessus", "Scanner: nessus"),
    (r"openvas", "Scanner: openvas"),
    (r"acunetix", "Scanner: acunetix"),
    (r"burpsuite", "Scanner: burpsuite"),
    (r"dirbuster", "Scanner: dirbuster"),
    (r"gobuster", "Scanner: gobuster"),
    (r"wfuzz", "Scanner: wfuzz"),
    (r"hydra", "Scanner: hydra"),
    (r"masscan", "Scanner: masscan"),
    (r"zgrab", "Scanner: zgrab"),
    (r"OutdatedBrowser", "Suspicious: outdated browser"),
    (r"python-requests/1\.", "Suspicious: old python-requests"),
    (r"^curl/[0-6]\.", "Suspicious: old curl"),
    (r"^$", "Suspicious: empty user-agent"),
]

# ============================================================
# Reconnaissance Patterns
# ============================================================
RECON_PATTERNS: List[Tuple[str, str]] = [
    (r"/\.git", "Recon: git directory"),
    (r"/\.env", "Recon: env file"),
    (r"/\.htaccess", "Recon: htaccess"),
    (r"/\.htpasswd", "Recon: htpasswd"),
    (r"/wp-config\.php", "Recon: WordPress config"),
    (r"/config\.php", "Recon: config file"),
    (r"/phpinfo\.php", "Recon: phpinfo"),
    (r"/server-status", "Recon: Apache status"),
    (r"/actuator", "Recon: Spring actuator"),
    (r"/swagger", "Recon: API documentation"),
    (r"/graphql", "Recon: GraphQL endpoint"),
    (r"/\.aws/credentials", "Recon: AWS credentials"),
    (r"/\.docker", "Recon: Docker config"),
    (r"/backup", "Recon: backup files"),
    (r"\.(sql|bak|backup|old|orig|save|swp)$", "Recon: backup extension"),
]

# ============================================================
# Ransomware Behavior Patterns
# ============================================================
RANSOMWARE_PATTERNS: List[Tuple[str, str]] = [
    (r"\.(locked|encrypted|enc|crypto|crypt)$", "Ransomware: encrypted extension"),
    (r"ransom", "Ransomware: ransom keyword"),
    (r"decrypt", "Ransomware: decrypt keyword"),
    (r"bitcoin", "Ransomware: bitcoin payment"),
    (r"monero", "Ransomware: monero payment"),
    (r"YOUR_FILES", "Ransomware: common message"),
]

# ============================================================
# Compiled Pattern Cache
# ============================================================
_compiled_patterns: Dict[AttackType, List[Tuple[re.Pattern, str]]] = {}


def get_compiled_patterns(attack_type: AttackType) -> List[Tuple[re.Pattern, str]]:
    """
    Get compiled regex patterns for an attack type.
    Uses caching to avoid recompilation.
    """
    if attack_type in _compiled_patterns:
        return _compiled_patterns[attack_type]
    
    patterns_map = {
        AttackType.SQL_INJECTION: SQL_INJECTION_PATTERNS,
        AttackType.SSRF: SSRF_PATTERNS,
        AttackType.XSS: XSS_PATTERNS,
        AttackType.DIRECTORY_TRAVERSAL: DIRECTORY_TRAVERSAL_PATTERNS,
        AttackType.COMMAND_INJECTION: COMMAND_INJECTION_PATTERNS,
        AttackType.SUSPICIOUS_UA: SUSPICIOUS_USER_AGENTS,
        AttackType.RECONNAISSANCE: RECON_PATTERNS,
        AttackType.RANSOMWARE: RANSOMWARE_PATTERNS,
    }
    
    raw_patterns = patterns_map.get(attack_type, [])
    compiled = [(re.compile(pattern, re.IGNORECASE), desc) for pattern, desc in raw_patterns]
    _compiled_patterns[attack_type] = compiled
    return compiled


def detect_attack(content: str, attack_type: AttackType) -> Tuple[bool, str]:
    """
    Check content for specific attack patterns.
    
    Returns:
        Tuple of (is_attack, description)
    """
    patterns = get_compiled_patterns(attack_type)
    for pattern, description in patterns:
        if pattern.search(content):
            return True, description
    return False, ""


def detect_all_attacks(content: str) -> List[Tuple[AttackType, str]]:
    """
    Check content against all attack patterns.
    
    Returns:
        List of (attack_type, description) for all matches
    """
    matches = []
    for attack_type in AttackType:
        is_attack, desc = detect_attack(content, attack_type)
        if is_attack:
            matches.append((attack_type, desc))
    return matches


def get_threat_level(attack_type: AttackType, confidence: float = 1.0) -> ThreatLevel:
    """
    Get threat level for an attack type, potentially adjusted by confidence.
    """
    base_level = ATTACK_THREAT_LEVELS.get(attack_type, ThreatLevel.MEDIUM)
    
    # If confidence is very high (>0.9), don't downgrade
    if confidence >= 0.9:
        return base_level
    
    # Lower confidence might reduce threat level
    if confidence < 0.5:
        # Reduce by one level
        level_order = [ThreatLevel.INFO, ThreatLevel.LOW, ThreatLevel.MEDIUM, ThreatLevel.HIGH, ThreatLevel.CRITICAL]
        current_idx = level_order.index(base_level)
        if current_idx > 0:
            return level_order[current_idx - 1]
    
    return base_level


def get_quarantine_duration(threat_level: ThreatLevel) -> int:
    """
    Get quarantine duration in seconds for a threat level.
    Returns 0 for permanent ban.
    """
    return QUARANTINE_DURATION.get(threat_level, 3600)
