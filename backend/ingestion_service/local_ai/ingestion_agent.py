"""
backend/ingestion_service/local_ai/ingestion_agent.py

Lightweight rule-based ingestion agent:
 - normalize_alert(alert: dict) -> dict
 - extract_iocs(alert: dict) -> dict
 - score_severity(alert: dict) -> float  (0.0 - 1.0)
 - detect_ransomware_indicators(alert: dict) -> dict
 - enrich_alert(alert: dict) -> dict  (combines all)

Designed to be free (no external ML models) and async-friendly.
"""

import re
import uuid
import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional

from core.rabbitmq_utils import publish_event

logger = logging.getLogger(__name__)
DEFAULT_SEVERITY_THRESHOLD = 0.6

# Simple regexes for IOCs
IPV4_RE = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
)
DOMAIN_RE = re.compile(
    r"\b((?:[a-zA-Z0-9-]{1,63}\.)+(?:[a-zA-Z]{2,63}))\b"
)
SHA256_RE = re.compile(r"\b[a-fA-F0-9]{64}\b")
MD5_RE = re.compile(r"\b[a-fA-F0-9]{32}\b")
SHA1_RE = re.compile(r"\b[a-fA-F0-9]{40}\b")
FILENAME_RE = re.compile(r"([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]{1,6})")
RANSOM_EXTS = {
    # Some common ransomware-encrypted file extensions observed in the wild
    ".locky", ".crypt", ".crypted", ".locked", ".enc", ".encrypted", ".cryptolocker", ".ncry",
    ".zepto", ".zzzzz", ".kraken", ".ryuk", ".thor", ".paycrypt", ".aes256"
}
RANSOM_NOTE_KEYWORDS = [
    "ransom", "pay", "bitcoin", "decrypt", "instead", "contact", "private key", "tor", "readme",
    "how to recover", "recover files", "decryptor", "payment", "ransome"  # common misspellings
]
SUSPICIOUS_PROCESS_KEYWORDS = [
    "vssadmin", "wmic", "cipher", "powershell", "cmd.exe", "regsvr32", "rundll32", "schtasks"
]


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _make_incident_uuid() -> str:
    return str(uuid.uuid4())


def _unique_list(seq: List[str]) -> List[str]:
    seen = set()
    out = []
    for s in seq:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out


async def normalize_alert(alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize incoming alert into consistent structure.
    Keeps original payload under `raw` key.
    """
    # Non-blocking placeholder
    await asyncio.sleep(0)

    normalized = {
        "incident_id": alert.get("incident_id") or _make_incident_uuid(),
        "source": alert.get("source", alert.get("device", "unknown")),
        "received_at": alert.get("received_at") or _now_iso(),
        "raw": alert,  # keep original
        "summary": alert.get("summary") or alert.get("message") or alert.get("title") or "SIEM alert",
    }

    # Common fields mapping (non-exhaustive)
    for k in ("alert_id", "alert_id", "device", "host", "host_name", "hostname"):
        if k in alert:
            normalized.setdefault("host", alert.get(k))

    # severity if provided (map common numeric/text forms)
    severity = alert.get("severity")
    if severity is not None:
        normalized["original_severity"] = severity
        # try to normalize to numeric 0.0-1.0
        try:
            if isinstance(severity, str):
                s = severity.lower()
                if s in ("low", "info", "informational"):
                    normalized["provided_severity_score"] = 0.2
                elif s in ("medium", "moderate"):
                    normalized["provided_severity_score"] = 0.5
                elif s in ("high", "critical"):
                    normalized["provided_severity_score"] = 0.9
                else:
                    normalized["provided_severity_score"] = float(s)
            else:
                # assume numeric in 0-10 or 0-100 scale; normalize heuristically
                val = float(severity)
                if val > 10:
                    # assume 0-100
                    normalized["provided_severity_score"] = min(1.0, val / 100.0)
                else:
                    normalized["provided_severity_score"] = min(1.0, val / 10.0)
        except Exception:
            normalized["provided_severity_score"] = 0.5
    else:
        normalized["provided_severity_score"] = None

    return normalized


async def extract_iocs(text_sources: List[str]) -> Dict[str, List[str]]:
    """
    Extract simple IOCs from a list of strings (IPs, domains, hashes, filenames).
    """
    await asyncio.sleep(0)
    ips = []
    domains = []
    sha256 = []
    md5 = []
    sha1 = []
    filenames = []

    for text in text_sources:
        if not text:
            continue
        # ensure text is str
        txt = str(text)

        ips += IPV4_RE.findall(txt)
        domains += DOMAIN_RE.findall(txt)
        sha256 += SHA256_RE.findall(txt)
        md5 += MD5_RE.findall(txt)
        sha1 += SHA1_RE.findall(txt)
        filenames += FILENAME_RE.findall(txt)

    return {
        "ips": _unique_list(ips),
        "domains": _unique_list(domains),
        "sha256": _unique_list(sha256),
        "md5": _unique_list(md5),
        "sha1": _unique_list(sha1),
        "filenames": _unique_list(filenames),
    }


async def detect_ransomware_indicators(alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply simple heuristic checks for ransomware indicators:
     - presence of ransom note keywords in message or files
     - encrypted file extensions in filenames
     - suspicious process names
    Returns dict with boolean flags and confidence heuristic 0.0-1.0
    """
    await asyncio.sleep(0)

    text_candidates = []

    # Candidate fields that may contain ransom notes or filenames
    for k in ("summary", "message", "description", "detail", "raw_message", "raw"):
        v = alert.get(k)
        if isinstance(v, str):
            text_candidates.append(v)
        elif isinstance(v, dict):
            text_candidates.append(str(v))

    # include raw JSON dump
    text_candidates.append(str(alert.get("raw", alert)))

    concat_text = " ".join(text_candidates).lower()

    ransom_note_hits = sum(1 for kw in RANSOM_NOTE_KEYWORDS if kw in concat_text)
    suspicious_process_hits = sum(1 for kw in SUSPICIOUS_PROCESS_KEYWORDS if kw in concat_text)

    # check filenames extension matches known ransom ext patterns
    filenames = alert.get("iocs", {}).get("filenames", []) or []
    enc_ext_hits = 0
    matched_exts = []
    for fn in filenames:
        lower = fn.lower()
        for ext in RANSOM_EXTS:
            if lower.endswith(ext):
                enc_ext_hits += 1
                matched_exts.append(ext)

    # Basic confidence calculation
    score = 0.0
    score += min(1.0, ransom_note_hits * 0.3)  # ransom note words are strong signal
    score += min(0.6, suspicious_process_hits * 0.15)
    score += min(0.8, enc_ext_hits * 0.5)

    # Clamp score
    confidence = max(0.0, min(1.0, score))

    detected = {
        "is_possible_ransomware": confidence >= DEFAULT_SEVERITY_THRESHOLD,
        "ransom_note_hits": ransom_note_hits,
        "suspicious_process_hits": suspicious_process_hits,
        "encrypted_extension_hits": enc_ext_hits,
        "matched_extensions": _unique_list(matched_exts),
        "confidence": confidence,
    }

    return detected


async def score_severity(enriched: Dict[str, Any]) -> Tuple[float, str]:
    """
    Heuristic severity scoring combining:
     - provided severity (if any)
     - presence of IOCs (public IPs, file hashes)
     - ransomware indicator confidence
    Returns (score, category)
    """
    await asyncio.sleep(0)

    base = 0.1
    # use provided score if present
    provided = enriched.get("provided_severity_score")
    if provided:
        base = max(base, provided * 0.9)

    iocs = enriched.get("iocs", {})
    ioc_count = sum(len(v) for v in iocs.values() if isinstance(v, list))

    # each IOC increases severity slightly
    base += min(0.4, ioc_count * 0.05)

    # ransomware indicator is a major multiplier
    rinfo = enriched.get("ransomware", {})
    rconf = rinfo.get("confidence", 0.0)
    if rconf > 0:
        # boost severity significantly
        base = base + (rconf * 0.5)

    # clamp
    score = max(0.0, min(1.0, base))

    # map to category
    if score >= 0.85:
        cat = "critical"
    elif score >= 0.6:
        cat = "high"
    elif score >= 0.35:
        cat = "medium"
    else:
        cat = "low"

    return score, cat


async def enrich_alert(alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entrypoint used by ingestion service to enrich incoming alerts.
    Produces a dict containing:
     - normalized metadata
     - iocs
     - ransomware heuristics
     - severity score + category
     - recommended action (light)
    """
    # Normalize
    normalized = await normalize_alert(alert)

    # Prepare text sources for IOC extraction
    text_sources = []
    text_sources.append(normalized.get("summary"))
    # flatten some raw fields that commonly contain useful text
    raw = alert
    for key in ("message", "description", "details", "raw_message"):
        if key in raw:
            text_sources.append(raw.get(key))
    # include entire raw JSON as fallback
    text_sources.append(str(raw))

    iocs = await extract_iocs(text_sources)
    normalized["iocs"] = iocs
    normalized["iocs_count"] = sum(len(v) for v in iocs.values())

    # Detect ransomware heuristics
    ransomware_info = await detect_ransomware_indicators({**normalized, "raw": raw, "iocs": iocs})
    normalized["ransomware"] = ransomware_info

    # Score severity
    provided_score = normalized.get("provided_severity_score")
    # merge provided_score to top-level for scoring function convenience
    normalized["provided_severity_score"] = provided_score
    severity_score, severity_category = await score_severity(normalized)
    normalized["severity_score"] = severity_score
    normalized["severity_category"] = severity_category

    # recommended action (naive)
    recommended_actions = []
    if ransomware_info.get("is_possible_ransomware"):
        recommended_actions.append("isolate_host")
        recommended_actions.append("notify_incident_response_team")
        recommended_actions.append("collect_memory_and_disk_images")
    else:
        # based on severity thresholds
        if severity_score >= 0.85:
            recommended_actions.append("investigate_immediately")
            recommended_actions.append("isolate_host")
        elif severity_score >= 0.6:
            recommended_actions.append("investigate_with_priority")
        elif severity_score >= 0.35:
            recommended_actions.append("investigate")
        else:
            recommended_actions.append("queue_for_review")

    normalized["recommended_actions"] = recommended_actions

    # Optionally publish an ingestion event (non-blocking)
    try:
        asyncio.create_task(
            publish_event(
                "ingestion.enriched",
                {
                    "incident_id": normalized["incident_id"],
                    "severity_score": severity_score,
                    "severity_category": severity_category,
                    "is_possible_ransomware": ransomware_info.get("is_possible_ransomware", False),
                },
            )
        )
    except Exception as e:
        logger.debug("Failed to publish ingestion.enriched event: %s", e)


    return normalized


# Small example / quick test harness
if __name__ == "__main__":
    # local quick test when you run the module directly
    sample = {
        "alert_id": "A-1000",
        "source": "wazuh",
        "message": "Multiple files renamed to file.enc and ransom note readme.txt ...",
        "host": "host-01.example.com",
        "severity": "high",
    }

    async def run_test():
        enriched = await enrich_alert(sample)
        import json
        print("ENRICHED:")
        print(json.dumps(enriched, indent=2))

    asyncio.run(run_test())

