# backend/response_service/local_ai/response_agent.py
import asyncio
import logging
from typing import Dict, Any, Optional

import httpx
from urllib.parse import urlparse

from shared_lib.integrations.abuseipdb_client import abuseipdb_client
from shared_lib.integrations.malwarebazaar_client import malwarebazaar_client
from shared_lib.integrations.virustotal_client import virustotal_client
from shared_lib.integrations.sigma_engine import sigma_engine
from shared_lib.integrations.yara_analyzer import yara_analyzer


logger = logging.getLogger(__name__)


class ResponseAgent:
    """
    Decision-making agent for the Response Service.
    """

    def __init__(self):
        self.quarantine_threshold = 70
        self.block_ip_threshold = 60
        self.escalate_threshold = 50

    # --------------------------------------------------------------------
    # INTEL QUERIES
    # --------------------------------------------------------------------

    async def _query_abuseipdb(self, ip: str) -> Optional[dict]:
        if not ip:
            return None
        try:
            if not abuseipdb_client.is_configured():
                logger.debug("AbuseIPDB not configured")
                return None
            async with abuseipdb_client:
                return await abuseipdb_client.check_ip(ip)
        except Exception as e:
            logger.exception("AbuseIPDB query failed: %s", e)
            return None

    async def _query_malwarebazaar(self, file_hash: str) -> Optional[dict]:
        if not file_hash:
            return None
        try:
            async with malwarebazaar_client:
                return await malwarebazaar_client.query_hash(file_hash)
        except Exception as e:
            logger.exception("MalwareBazaar query failed: %s", e)
            return None

    async def _query_virustotal(self, ip: Optional[str], file_hash: Optional[str], domain: Optional[str]) -> dict:
        loop = asyncio.get_running_loop()
        result = {}

        if not virustotal_client or not virustotal_client.is_configured():
            return result

        try:
            if ip:
                vt_ip = await loop.run_in_executor(None, virustotal_client.get_ip_report, ip)
                result["virustotal_ip"] = vt_ip

            if file_hash:
                vt_file = await loop.run_in_executor(None, virustotal_client.get_file_report, file_hash)
                result["virustotal_file"] = vt_file

            if domain:
                vt_domain = await loop.run_in_executor(None, virustotal_client.get_domain_report, domain)
                result["virustotal_domain"] = vt_domain

        except Exception as e:
            logger.exception("VirusTotal lookup failed: %s", e)

        return result

    # --------------------------------------------------------------------
    # SCORING
    # --------------------------------------------------------------------

    def _score_from_intel(self, intel: Dict[str, Any]) -> int:
        score = 0

        # AbuseIPDB
        ab = intel.get("abuseipdb")
        if ab:
            # support both flat and nested formats
            conf = (
                ab.get("confidence")
                or ab.get("abuseConfidenceScore")
                or ab.get("data", {}).get("abuseConfidenceScore")
                or 0
            )
            try:
                conf = int(conf)
            except Exception:
                conf = 0

            if conf >= 90:
                score += 40
            elif conf >= 60:
                score += 20
            elif conf >= 30:
                score += 10

        # MalwareBazaar
        mb = intel.get("malwarebazaar")
        if mb and mb.get("query_status") == "ok" and mb.get("data"):
            score += 30

        # VirusTotal
        vt_file = intel.get("virustotal_file")
        if vt_file:
            try:
                attrs = vt_file.get("data", {}).get("attributes", {})
                stats = attrs.get("last_analysis_stats", {})
                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)
                score += min(40, malicious * 10 + suspicious * 5)
            except Exception:
                pass

        # Sigma
        sigma_matches = intel.get("sigma_matches", [])
        score += len(sigma_matches) * 10

        # YARA
        for match in intel.get("yara_matches", []):
            meta = match.get("meta", {}) or {}
            sev = (meta.get("severity") or meta.get("Severity") or "").lower()

            if sev == "high":
                score += 30
            elif sev == "medium":
                score += 15
            else:
                score += 5

        return max(0, min(100, score))

    # --------------------------------------------------------------------
    # MAIN ANALYSIS
    # --------------------------------------------------------------------

    async def analyze_incident(self, incident: dict) -> Dict[str, Any]:
        # Extract inputs
        ip = incident.get("source_ip")
        file_hash = incident.get("file_hash")

        # Add URL → domain extraction
        domain = incident.get("domain")
        if not domain and "url" in incident:
            try:
                parsed = urlparse(incident["url"])
                domain = parsed.hostname
                if domain:
                    logger.debug(f"Extracted domain '{domain}' from URL: {incident['url']}")
            except Exception:
                pass

        # Gather intel concurrently
        tasks = [
            self._query_abuseipdb(ip),
            self._query_malwarebazaar(file_hash),
            self._query_virustotal(ip, file_hash, domain),
        ]

        abuse_result, mb_result, vt_results = await asyncio.gather(*tasks)

        # Sigma rules
        sigma_matches = sigma_engine.match_rules(incident) if sigma_engine else []

        # YARA scanning
        yara_matches = []
        try:
            file_path = incident.get("file_path")
            data_b64 = incident.get("file_data_b64")

            loop = asyncio.get_running_loop()

            if file_path and yara_analyzer.rules_loaded():
                yara_matches = await loop.run_in_executor(None, yara_analyzer.scan_file, file_path)

            elif data_b64 and yara_analyzer.rules_loaded():
                import base64

                raw = base64.b64decode(data_b64)
                yara_matches = await loop.run_in_executor(
                    None,
                    lambda: yara_analyzer.scan_data(raw, incident.get("incident_id", "unknown")),
                )
        except Exception as e:
            logger.exception("YARA scanning failed: %s", e)

        # Build intel object
        intel = {
            "abuseipdb": abuse_result,
            "malwarebazaar": mb_result,
            **(vt_results or {}),
            "sigma_matches": sigma_matches,
            "yara_matches": yara_matches,
        }

        # Score
        score = self._score_from_intel(intel)

        # Decide
        if score >= self.quarantine_threshold:
            actions = ["quarantine_host", "block_ip"]
            decision_text = "quarantine+block"

        elif score >= self.block_ip_threshold:
            actions = ["block_ip"]
            decision_text = "block_ip"

        elif score >= self.escalate_threshold:
            actions = []
            decision_text = "escalate_human"

        else:
            actions = []
            decision_text = "monitor"

        reasoning = (
            f"score={score}; sigma={len(sigma_matches)}; "
            f"yara={len(yara_matches)}; "
            f"abuse_conf={getattr(abuse_result,'get',lambda k,d: d)('confidence','N/A')}"
        )

        return {
            "score": score,
            "decision": decision_text,
            "suggested_actions": actions,
            "confidence": score / 100.0,
            "reasoning": reasoning,
            "intel": intel,
        }


# Global instance
response_agent = ResponseAgent()
