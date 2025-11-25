# backend/triage_service/local_ai/triage_agent.py
import json
import logging
import asyncio
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# lazy import LocalLLM to avoid circular import issues
try:
    from .llm_loader import LocalLLM
except Exception:
    LocalLLM = None  # will attempt lazy init in __init__

from .prompt_templates import build_triage_prompt

# Existing integrations (you said these exist)
from shared_lib.integrations.sigma_engine import sigma_engine
from shared_lib.integrations.yara_analyzer import yara_analyzer
from shared_lib.integrations.abuseipdb_client import abuseipdb_client
from shared_lib.integrations.malwarebazaar_client import malwarebazaar_client
from shared_lib.integrations.virustotal_client import virustotal_client

# Optional integrations — code treats missing/unfinished clients gracefully.
# # If you don't want some providers (e.g. shodan), it's OK; code will skip them.
# try:
#     from response_service.integrations.shodan_client import shodan_client
# except Exception:
#     shodan_client = None

# try:
#     from response_service.integrations.otx_client import otx_client
# except Exception:
#     otx_client = None

# try:
#     from response_service.integrations.censys_client import censys_client
# except Exception:
#     censys_client = None

# try:
#     from response_service.integrations.urlscan_client import urlscan_client
# except Exception:
#     urlscan_client = None


class TriageAgent:
    """
    TriageAgent:
      - runs Sigma & YARA
      - queries multiple TI providers (resiliently)
      - computes threat_score and threat_level
      - formats a prompt and calls local LLM if available (otherwise still returns intel + heuristics)
    """

    def __init__(self):
        # lazy initialize LLM instance to avoid import-time circular deps
        self.llm = None
        if LocalLLM is not None:
            try:
                # instantiate might be expensive; keep simple
                self.llm = LocalLLM()
            except Exception as e:
                logger.warning("LocalLLM init failed, continuing without LLM: %s", e)
                self.llm = None

    async def _run_sync(self, fn, *args, **kwargs):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, lambda: fn(*args, **kwargs))

    async def _gather_intel(self, source_ip: Optional[str], file_hash: Optional[str], file_path: Optional[str], file_bytes: Optional[bytes]) -> Dict[str, Any]:
        """
        Query TI providers in parallel. Each lookup returns either a provider-specific dict
        or an {'error': ..} dict. This function always returns a dict (never raises).
        """

        intel: Dict[str, Any] = {}

        async def abuseipdb_lookup():
            if not source_ip or abuseipdb_client is None:
                return None
            try:
                # abuseipdb_client is implemented as async context manager in your codebase
                async with abuseipdb_client:
                    return await abuseipdb_client.check_ip(source_ip, timeout=10)
            except Exception as e:
                logger.debug("AbuseIPDB lookup error: %s", e)
                return {"error": str(e)}

        async def malwarebazaar_lookup():
            if not file_hash or malwarebazaar_client is None:
                return None
            try:
                async with malwarebazaar_client:
                    return await malwarebazaar_client.query_hash(file_hash, timeout=10)
            except Exception as e:
                logger.debug("MalwareBazaar lookup error: %s", e)
                return {"error": str(e)}

        async def virustotal_lookup():
            if (not file_hash and not source_ip) or virustotal_client is None:
                return None
            try:
                vt = {}
                if file_hash:
                    # virustotal_client is sync in many setups — wrap
                    vt["file"] = await self._run_sync(virustotal_client.get_file_report, file_hash)
                if source_ip:
                    vt["ip"] = await self._run_sync(virustotal_client.get_ip_report, source_ip)
                return vt
            except Exception as e:
                logger.debug("VirusTotal lookup error: %s", e)
                return {"error": str(e)}

        # async def shodan_lookup():
        #     if not source_ip or shodan_client is None:
        #         return None
        #     try:
        #         # client may be async or sync - try async context, else call sync
        #         if hasattr(shodan_client, "__aenter__"):
        #             async with shodan_client:
        #                 return await shodan_client.search_ip(source_ip, timeout=8)
        #         else:
        #             return await self._run_sync(shodan_client.search_ip, source_ip)
        #     except Exception as e:
        #         logger.debug("Shodan lookup error: %s", e)
        #         return {"error": str(e)}

        # async def otx_lookup():
        #     if otx_client is None or (not source_ip and not file_hash):
        #         return None
        #     try:
        #         if hasattr(otx_client, "__aenter__"):
        #             async with otx_client:
        #                 res = {}
        #                 if source_ip:
        #                     res["ip"] = await otx_client.get_ip_indicators(source_ip, timeout=8)
        #                 if file_hash:
        #                     res["hash"] = await otx_client.get_file_pulses(file_hash, timeout=8)
        #                 return res
        #         else:
        #             # sync wrappers
        #             res = {}
        #             if source_ip:
        #                 res["ip"] = await self._run_sync(otx_client.get_ip_indicators, source_ip)
        #             if file_hash:
        #                 res["hash"] = await self._run_sync(otx_client.get_file_pulses, file_hash)
        #             return res
        #     except Exception as e:
        #         logger.debug("OTX lookup error: %s", e)
        #         return {"error": str(e)}

        # async def censys_lookup():
        #     if not source_ip or censys_client is None:
        #         return None
        #     try:
        #         if hasattr(censys_client, "search_ip_async"):
        #             async with censys_client:
        #                 return await censys_client.search_ip_async(source_ip, timeout=8)
        #         elif hasattr(censys_client, "__aenter__"):
        #             async with censys_client:
        #                 return await censys_client.search_ip(source_ip, timeout=8)
        #         else:
        #             return await self._run_sync(censys_client.search_ip, source_ip)
        #     except Exception as e:
        #         logger.debug("Censys lookup error: %s", e)
        #         return {"error": str(e)}

        # async def urlscan_lookup():
        #     url_to_scan = None
        #     if file_path and isinstance(file_path, str) and file_path.startswith("http"):
        #         url_to_scan = file_path
        #     if urlscan_client is None or not url_to_scan:
        #         return None
        #     try:
        #         if hasattr(urlscan_client, "__aenter__"):
        #             async with urlscan_client:
        #                 return await urlscan_client.scan_url(url_to_scan, timeout=12)
        #         else:
        #             return await self._run_sync(urlscan_client.scan_url, url_to_scan)
        #     except Exception as e:
        #         logger.debug("URLScan lookup error: %s", e)
        #         return {"error": str(e)}

        # schedule lookups
        tasks = [
            abuseipdb_lookup(),
            malwarebazaar_lookup(),
            virustotal_lookup(),
            # shodan_lookup(),
            # otx_lookup(),
            # censys_lookup(),
            # urlscan_lookup(),
        ]

        # gather resiliently
        results = await asyncio.gather(*tasks, return_exceptions=True)

        intel_keys = ["abuseipdb", "malwarebazaar", "virustotal"] 
        # we'll include the shodan, otx, censys,urlscan in future

        for k, r in zip(intel_keys, results):
            if r is None:
                continue
            # if r is an exception, log and continue
            if isinstance(r, Exception):
                logger.debug("Intel task %s raised: %s", k, r)
                continue
            intel[k] = r

        # ----------- Basic normalization & short flags for LLM --------------
        derived = {"ip_reputation": "unknown", "file_reputation": "unknown", "vt_malicious_count": 0, "abuse_confidence": 0}
        try:
            a = intel.get("abuseipdb")
            if isinstance(a, dict):
                acs = a.get("abuseConfidenceScore") or a.get("abuse_confidence_score") or a.get("confidence", 0)
                if acs is not None:
                    try:
                        acs_val = int(acs)
                    except Exception:
                        acs_val = 0
                    derived["abuse_confidence"] = acs_val
                    if acs_val >= 75:
                        derived["ip_reputation"] = "malicious"
                    elif acs_val >= 30:
                        derived["ip_reputation"] = "suspicious"
                    else:
                        derived.setdefault("ip_reputation", "unknown")

            vt = intel.get("virustotal")
            if isinstance(vt, dict):
                file_report = vt.get("file")
                if isinstance(file_report, dict):
                    # common VT fields vary by client; look for positives or malicious_votes or malicious_count
                    positives = file_report.get("positives") or file_report.get("malicious_votes") or file_report.get("malicious_count") or 0
                    try:
                        positives = int(positives)
                    except Exception:
                        positives = 0
                    derived["vt_malicious_count"] = positives
                    if positives > 5:
                        derived["file_reputation"] = "malicious"
                    elif positives > 0:
                        derived["file_reputation"] = "suspicious"

            # MalwareBazaar often returns metadata describing if sample known malicious
            mb = intel.get("malwarebazaar")
            if isinstance(mb, dict):
                # sample presence or tags
                if mb.get("is_malicious") or mb.get("verdict") == "malicious" or mb.get("sha256"):
                    derived["file_reputation"] = "malicious"

            # fallback reputations default already "unknown"
        except Exception as e:
            logger.debug("Normalization error: %s", e)

        intel["derived"] = derived
        return intel

    def _compute_threat_score(self, sigma_matches: Any, yara_results: Any, intel: Dict[str, Any], incident: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute a 0-100 threat score from a few signals. This is a simple weighted model:
        adjust weights to match your environment.
        """
        score = 0.0
        max_score = 100.0

        # weights (tweakable)
        weights = {
            "sigma": 25,
            "yara": 25,
            "virustotal": 20,
            "abuseipdb": 15,
            "malwarebazaar": 10,
            "severity": 5,
        }

        # sigma matches: assume sigma_engine returns list of matches with 'severity' or 'score'
        try:
            if sigma_matches:
                # rough score: more matches/higher severity -> bigger contribution
                sigma_score = 0
                if isinstance(sigma_matches, list):
                    sigma_score = min(1.0, len(sigma_matches) / 5.0)  # saturates
                elif isinstance(sigma_matches, dict) and sigma_matches.get("score"):
                    sigma_score = min(1.0, float(sigma_matches.get("score")) / 10.0)
                score += sigma_score * weights["sigma"]
        except Exception:
            logger.debug("sigma scoring failed", exc_info=True)

        # yara results: count hits, severity if available
        try:
            yara_score = 0
            if yara_results:
                if isinstance(yara_results, list):
                    yara_score = min(1.0, len(yara_results) / 3.0)
                elif isinstance(yara_results, dict) and yara_results.get("hits"):
                    yara_score = min(1.0, len(yara_results.get("hits")) / 3.0)
            score += yara_score * weights["yara"]
        except Exception:
            logger.debug("yara scoring failed", exc_info=True)

        # virustotal positives
        try:
            derived = intel.get("derived", {})
            vt_count = int(derived.get("vt_malicious_count", 0) or 0)
            vt_frac = min(1.0, vt_count / 10.0)
            score += vt_frac * weights["virustotal"]
        except Exception:
            logger.debug("vt scoring failed", exc_info=True)

        # abuseipdb confidence
        try:
            acs = int(intel.get("derived", {}).get("abuse_confidence", 0) or 0)
            acs_frac = min(1.0, acs / 100.0)
            score += acs_frac * weights["abuseipdb"]
        except Exception:
            logger.debug("abuseipdb scoring failed", exc_info=True)

        # malwarebazaar presence (binary)
        try:
            mb = intel.get("malwarebazaar")
            if isinstance(mb, dict) and (mb.get("is_malicious") or mb.get("sha256") or mb.get("verdict") == "malicious"):
                score += weights["malwarebazaar"]
        except Exception:
            logger.debug("mb scoring failed", exc_info=True)

        # incident severity hint (small)
        try:
            sev = str(incident.get("severity", "")).lower()
            if sev in ("critical", "high"):
                score += weights["severity"]
            elif sev in ("medium",):
                score += weights["severity"] / 2.0
        except Exception:
            pass

        # clamp
        threat_score = int(max(0, min(max_score, round(score))))
        # bucket threat level
        if threat_score >= 80:
            level = "critical"
        elif threat_score >= 60:
            level = "high"
        elif threat_score >= 30:
            level = "medium"
        else:
            level = "low"

        return {"threat_score": threat_score, "threat_level": level}

    async def analyze_incident(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Main triage entrypoint. Returns a dict with decision, recommended_actions, intel, and threat_score."""
        logger.info("Starting triage analysis for incident %s", incident.get("id"))

        # 1) Sigma
        try:
            sigma_matches = sigma_engine.match_rules(incident)
        except Exception as e:
            logger.debug("Sigma engine error: %s", e)
            sigma_matches = []

        logger.info("Sigma matches: %s", sigma_matches)

        # 2) YARA
        yara_results = []
        file_bytes = incident.get("file_bytes")
        file_path = incident.get("file_path")
        try:
            if file_bytes:
                yara_results = yara_analyzer.scan_data(file_bytes)
            elif file_path:
                yara_results = yara_analyzer.scan_file(file_path)
        except Exception as e:
            logger.debug("YARA scanner error: %s", e)
            yara_results = []

        logger.info("YARA results: %s", yara_results)

        # 3) Threat intel (gather in parallel)
        source_ip = incident.get("source_ip")
        file_hash = incident.get("file_hash")
        try:
            intel = await self._gather_intel(source_ip, file_hash, file_path, file_bytes)
        except Exception as e:
            logger.warning("Threat intel collection failed: %s", e)
            intel = {}

        # redact verbose fields for logs
        redacted = {k: ("<redacted>" if k in ("virustotal", "abuseipdb") else v) for k, v in intel.items()}
        logger.info("Threat Intel collected: %s", redacted)

        # 4) Compute threat score
        scoring = self._compute_threat_score(sigma_matches, yara_results, intel, incident)

        # 5) Build prompt for the LLM (if present)
        prompt = build_triage_prompt(
            incident=incident,
            sigma_matches=sigma_matches,
            yara_results=yara_results,
            threat_intel=intel,
            threat_score=scoring.get("threat_score"),
            threat_level=scoring.get("threat_level"),
        )

        llm_json = None
        if self.llm:
            try:
                llm_response = self.llm.predict(prompt)
                try:
                    llm_json = json.loads(llm_response)
                except Exception:
                    # attempt to extract json object from noisy output
                    import re
                    m = re.search(r"(\{[\s\S]*\})", (llm_response or ""), flags=re.DOTALL)
                    if m:
                        try:
                            llm_json = json.loads(m.group(1))
                        except Exception:
                            llm_json = None
                    else:
                        llm_json = None
            except Exception as e:
                logger.warning("LLM prediction failed: %s", e)
                llm_json = None

        # fallback minimal decision if LLM missing/unparsable -> use tiny heuristic
        if not llm_json:
            # a very small heuristic: escalate if threat_score >= 60 or yara/sigma strong
            ts = scoring.get("threat_score", 0)
            decision = "escalate_human"
            if ts >= 80:
                decision = "confirmed_ransomware"
            elif ts >= 60:
                decision = "escalate_human"
            else:
                decision = "false_positive" if ts < 30 else "escalate_human"

            reasoning = f"Computed threat_score={ts}; LLM not available or returned invalid JSON."
            recommended_actions = []
            if decision == "confirmed_ransomware":
                recommended_actions = ["quarantine_host", "block_ip", "notify_analyst", "collect_forensics"]
            elif decision == "escalate_human":
                recommended_actions = ["notify_analyst", "collect_forensics"]
            else:
                recommended_actions = ["notify_analyst"]

            llm_json = {
                "decision": decision,
                "confidence": round(min(0.99, ts / 100.0), 2),
                "reasoning": reasoning,
                "recommended_actions": recommended_actions,
            }

        # Normalize final output
        try:
            llm_json["confidence"] = float(llm_json.get("confidence", 0.0))
        except Exception:
            llm_json["confidence"] = 0.0

        final_result = {
            "id": incident.get("id"),
            "decision": llm_json.get("decision", "unknown"),
            "confidence": llm_json.get("confidence", 0.0),
            "reasoning": llm_json.get("reasoning", ""),
            "recommended_actions": llm_json.get("recommended_actions", []),
            "sigma_matches": sigma_matches,
            "yara_matches": yara_results,
            "intel": intel,
            "threat_score": scoring.get("threat_score"),
            "threat_level": scoring.get("threat_level"),
        }

        logger.info("Triage final_result: %s", {"id": final_result["id"], "decision": final_result["decision"], "threat_score": final_result["threat_score"]})
        return final_result


# module export expected by routes
triage_agent = TriageAgent()
