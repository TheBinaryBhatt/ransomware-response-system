# backend/triage_service/local_ai/agent.py
import json
import logging
import asyncio
from typing import Any, Dict, List
from core.rabbitmq_utils import publish_event

from .llm_loader import LocalLLM

logger = logging.getLogger(__name__)

# Load model once at import time if available. If not available, infer_fn is None.
try:
    llm = LocalLLM.get_instance()
    _infer_fn = llm.infer
except Exception:
    _infer_fn = None

# Prompt template used when LLM is available.
_PROMPT_TEMPLATE = """
You are a cybersecurity triage assistant. Given the raw alert JSON (below),
produce a JSON object with these fields:
- decision: one of ["confirmed_ransomware","false_positive","escalate_human"]
- confidence: a number between 0.0 and 1.0 (two decimals)
- reasoning: a short explanation (1-3 sentences)
- recommended_actions: array of action strings from ["quarantine_host","block_ip","notify_analyst","collect_forensics","isolate_network","none"]

Respond ONLY with valid JSON (no commentary) — example:
{{"decision":"confirmed_ransomware","confidence":0.92,"reasoning":"...","recommended_actions":["quarantine_host","block_ip","notify_analyst"]}}

ALERT_JSON:
{alert_json}
"""

# Lightweight heuristics fallback
def heuristic_triage(alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fast deterministic heuristics to approximate triage decision when LLM not available.
    Returns the same schema as LLM.
    """
    text_blob = json.dumps(alert).lower()
    score = 0.0
    reasons: List[str] = []

    # Indicators that increase ransomware likelihood
    ransomware_indicators = [
        "ransom", "encrypt", "encryption", "encrypted", "locker", "ransomware",
        ".wallet", ".locky", ".crypt", "c2", "command-and-control", "c & c", "c2 server",
        "file encryption", "mass file modifications", "encrypting files"
    ]

    for kw in ransomware_indicators:
        if kw in text_blob:
            score += 0.18
            reasons.append(f"found indicator '{kw}'")

    # suspicious filenames or extensions
    suspicious_exts = [".exe", ".dll", ".scr", ".locked", ".crypted", ".wallet"]
    for ext in suspicious_exts:
        if ext in text_blob:
            score += 0.06

    # presence of known suspicious processes or known cmd patterns
    if "psexec" in text_blob or "wmic" in text_blob or "schtasks" in text_blob:
        score += 0.12
        reasons.append("suspicious lateral movement tooling")

    # source IP reputation hint (if flagged high severity)
    sev = str(alert.get("severity", "")).lower()
    if sev in ("critical", "high"):
        score += 0.12
        reasons.append(f"alert severity {sev}")

    # presence of malware hash
    if "hash" in alert.get("raw_data", {}) or "file_hash" in alert.get("raw_data", {}):
        score += 0.08
        reasons.append("file hash present")

    # clamp score
    confidence = min(0.99, round(score, 2))
    # decide thresholds
    if confidence >= 0.8:
        decision = "confirmed_ransomware"
    elif confidence >= 0.35:
        decision = "escalate_human"
    else:
        decision = "false_positive"

    reasoning = " ; ".join(reasons) if reasons else "No high-confidence indicators found; heuristic suggests low risk."

    recommended_actions = []
    if decision == "confirmed_ransomware":
        recommended_actions = ["quarantine_host", "block_ip", "notify_analyst", "collect_forensics"]
    elif decision == "escalate_human":
        recommended_actions = ["notify_analyst", "collect_forensics"]
    else:
        recommended_actions = ["notify_analyst"]  # keep analyst in the loop for low-confidence

    result = {
        "decision": decision,
        "confidence": float(confidence),
        "reasoning": reasoning,
        "recommended_actions": recommended_actions,
    }
    return result

async def _call_llm_in_thread(prompt: str) -> str:
    """
    Run the synchronous LLM inference function in a thread to avoid blocking the event loop.
    """
    if _infer_fn is None:
        raise RuntimeError("LLM not available")
    loop = asyncio.get_running_loop()
    # run sync function in a thread
    text = await loop.run_in_executor(None, lambda: _infer_fn(prompt, max_tokens=512, temp=0.0))
    return text

async def analyze_incident(alert: Dict[str, Any]) -> Dict[str, Any]:
    """
    Primary entrypoint used by triage_service.routes.
    Returns the triage JSON object and publishes an 'incident.triaged' event.
    """
    # Try LLM first if present
    if _infer_fn:
        try:
            prompt = _PROMPT_TEMPLATE.format(alert_json=json.dumps(alert, default=str))
            raw_out = await _call_llm_in_thread(prompt)
            # Try to parse JSON from model output robustly
            parsed = None
            try:
                parsed = json.loads(raw_out.strip())
            except Exception:
                # Some LLMs may add backticks or explanation - attempt simple extraction
                import re
                m = re.search(r'(\{.*\})', raw_out, flags=re.DOTALL)
                if m:
                    try:
                        parsed = json.loads(m.group(1))
                    except Exception:
                        parsed = None

            if parsed and isinstance(parsed, dict):
                # normalize confidence to float
                try:
                    parsed["confidence"] = float(parsed.get("confidence", 0.0))
                except Exception:
                    parsed["confidence"] = 0.0
                # ensure keys exist
                parsed.setdefault("decision", parsed.get("decision", "escalate_human"))
                parsed.setdefault("reasoning", parsed.get("reasoning", "LLM produced result"))
                parsed.setdefault("recommended_actions", parsed.get("recommended_actions", []))
                # publish event
                try:
                    publish_event("incident.triaged", {"incident_id": alert.get("id") or alert.get("incident_id"), "triage": parsed})
                except Exception as e:
                    logger.debug("Failed to publish triaged event: %s", e)
                return parsed
            else:
                logger.warning("LLM returned unparsable output; falling back to heuristic. output=%s", raw_out)
        except Exception as e:
            logger.exception("LLM analyze failed, falling back to heuristics: %s", e)

    # Fallback: heuristic
    triage = heuristic_triage(alert)
    try:
        publish_event("incident.triaged", {"incident_id": alert.get("id") or alert.get("incident_id"), "triage": triage})
    except Exception as e:
        logger.debug("Failed to publish triaged event (heuristic): %s", e)
    return triage

# =============================================================
# Exported Agent Object (Required by triage_service.routes)
# =============================================================

class TriageAgent:
    async def analyze_incident(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        return await analyze_incident(alert)

# This is what routes.py imports
triage_agent = TriageAgent()

