# backend/response_service/integrations/yara_analyzer.py
import os
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

try:
    import yara
    YARA_AVAILABLE = True
except Exception:
    YARA_AVAILABLE = False
    logger.warning("yara-python not installed or failed to import. Full YARA support disabled.")


class YARAAnalyzer:
    def __init__(self, rules_path: str = None):
        self.rules_path = Path(rules_path or os.path.join(os.path.dirname(__file__), "yara_rules"))
        self.compiled_rules = None
        self.rule_files = []
        self._load_rules()

    def rules_loaded(self) -> bool:
        return self.compiled_rules is not None

    def _discover_rule_files(self) -> List[Path]:
        if not self.rules_path.exists():
            return []
        files = list(self.rules_path.glob("**/*.yar")) + list(self.rules_path.glob("**/*.yara"))
        return sorted(files)

    def _load_rules(self):
        if not YARA_AVAILABLE:
            logger.warning("YARA library not available; skipping rule load.")
            self.compiled_rules = None
            return

        self.rule_files = self._discover_rule_files()
        if not self.rule_files:
            logger.info("No YARA rule files found; creating sample rule.")
            self.rules_path.mkdir(parents=True, exist_ok=True)
            self._create_sample_rules()
            self.rule_files = self._discover_rule_files()

        if not self.rule_files:
            logger.warning("Still no YARA rules found after sample creation.")
            self.compiled_rules = None
            return

        try:
            # Compile multiple files into a single ruleset using a filepaths mapping
            filedict = {str(p): str(p) for p in self.rule_files}
            self.compiled_rules = yara.compile(filepaths=filedict)
            logger.info("Compiled YARA rules (%d files)", len(self.rule_files))
        except Exception as e:
            logger.exception("Failed to compile YARA rules: %s", e)
            self.compiled_rules = None

    def _create_sample_rules(self):
        sample = """
rule Sample_Ransomware {
    meta:
        description = "Sample ransomware-related indicators"
        severity = "High"
    strings:
        $s1 = "ransom" nocase
        $s2 = "encrypt" nocase
        $s3 = "decrypt" nocase
    condition:
        any of them
}
"""
        sample_file = self.rules_path / "sample_rules.yar"
        self.rules_path.mkdir(parents=True, exist_ok=True)
        sample_file.write_text(sample)
        logger.info("Wrote sample YARA rule to %s", sample_file)

    def scan_file(self, file_path: str) -> List[Dict]:
        """Scan a file path and return list of matches (dict)."""
        if not YARA_AVAILABLE or self.compiled_rules is None:
            logger.debug("YARA not available or rules not compiled.")
            return []

        if not os.path.exists(file_path):
            logger.debug("File not found for YARA: %s", file_path)
            return []

        try:
            matches = self.compiled_rules.match(file_path)
            return [self._format_match(m) for m in matches]
        except Exception as e:
            logger.exception("YARA scan_file failed: %s", e)
            return []

    def scan_data(self, data: bytes, identifier: str = "data") -> List[Dict]:
        """Scan in-memory bytes by writing to a temp file and scanning."""
        if not YARA_AVAILABLE or self.compiled_rules is None:
            logger.debug("YARA not available or rules not compiled.")
            return []

        try:
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(data)
                tmp_path = tmp.name
            results = self.scan_file(tmp_path)
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
            return results
        except Exception as e:
            logger.exception("YARA scan_data failed: %s", e)
            return []

    def _format_match(self, match) -> Dict:
        try:
            return {
                "rule": getattr(match, "rule", None) or match.rule,
                "meta": getattr(match, "meta", {}) or match.meta,
                "tags": getattr(match, "tags", []) or match.tags,
                "strings": [{"offset": s[0], "data": s[2].decode(errors="ignore") if isinstance(s[2], (bytes, bytearray)) else str(s[2])} for s in getattr(match, "strings", [])]
            }
        except Exception:
            # best effort
            return {"rule": str(match)}

# global instance
yara_analyzer = YARAAnalyzer()
