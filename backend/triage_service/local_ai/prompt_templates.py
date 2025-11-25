import json
from typing import Dict, Any


def build_triage_prompt(
    incident: Dict[str, Any],
    sigma_matches,
    yara_results,
    threat_intel,
    threat_score: int = None,  
    threat_level: str = None,  
):
    """
    Create deterministic JSON-output prompt for LLM.
    """
    return f"""
You are RRS-TRIAGE-AI, a precise cybersecurity decision model.

Analyze the following incident and output STRICT JSON ONLY.

=== INCIDENT DATA ===
{json.dumps(incident, indent=2)}

=== SIGMA MATCHES ===
{json.dumps(sigma_matches, indent=2)}

=== YARA RESULTS ===
{json.dumps(yara_results, indent=2)}

=== THREAT INTEL ===
{json.dumps(threat_intel, indent=2)}

Respond with ONLY valid JSON in this format:

{{
  "decision": "benign | suspicious | confirmed_ransomware",
  "confidence": 0.0 - 1.0,
  "reasoning": "...",
  "recommended_actions": [
      "quarantine_host",
      "block_ip",
      "enrich",
      "analyst_review",
      "notify_team"
  ]
}}
</analysis>
"""
