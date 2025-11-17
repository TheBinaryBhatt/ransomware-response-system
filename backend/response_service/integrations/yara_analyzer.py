import os
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class YARAAnalyzer:
    def __init__(self, rules_path: str = None):
        self.rules_path = rules_path or os.path.join(os.path.dirname(__file__), 'yara_rules')
        self.rules = None
        self._load_rules()
    
    def _load_rules(self):
        """Load YARA rules from the rules directory"""
        try:
            import yara
        except ImportError:
            logger.error("YARA Python bindings not installed. Install with: pip install yara-python")
            return
        
        # Check if the rules directory exists
        if not os.path.exists(self.rules_path):
            logger.warning(f"YARA rules directory not found: {self.rules_path}")
            logger.info(f"Creating YARA rules directory: {self.rules_path}")
            os.makedirs(self.rules_path, exist_ok=True)
            self._create_sample_rules()
            return
        
        # Collect all .yar and .yara files
        rule_files = list(Path(self.rules_path).glob("**/*.yar")) + list(Path(self.rules_path).glob("**/*.yara"))
        
        if not rule_files:
            logger.warning("No YARA rule files found, creating sample rules")
            self._create_sample_rules()
            rule_files = list(Path(self.rules_path).glob("**/*.yar"))
        
        try:
            # Compile rules
            self.rules = yara.compile(filepaths={str(f): str(f) for f in rule_files})
            logger.info(f"Loaded {len(rule_files)} YARA rule files")
        except Exception as e:
            logger.error(f"Failed to load YARA rules: {e}")
            self.rules = None
    
    def _create_sample_rules(self):
        """Create sample YARA rules for testing"""
        sample_rules = """
rule Ransomware_Indicator {
    meta:
        description = "Detects common ransomware indicators"
        severity = "High"
    strings:
        $s1 = "ransom" nocase
        $s2 = "encrypt" nocase
        $s3 = "decrypt" nocase
        $s4 = "bitcoin" nocase
        $s5 = "payment" nocase
        $s6 = "locker" nocase
    condition:
        3 of them
}

rule Suspicious_Powershell {
    meta:
        description = "Detects suspicious PowerShell commands"
        severity = "Medium"
    strings:
        $s1 = "Invoke-Expression" nocase
        $s2 = "DownloadString" nocase
        $s3 = "WebClient" nocase
        $s4 = "Base64" nocase
    condition:
        2 of them
}

rule Network_Reconnaissance {
    meta:
        description = "Detects network reconnaissance activity"
        severity = "Medium"
    strings:
        $s1 = "nmap" nocase
        $s2 = "portscan" nocase
        $s3 = "masscan" nocase
    condition:
        1 of them
}
"""
        
        rules_file = os.path.join(self.rules_path, "sample_rules.yar")
        with open(rules_file, 'w') as f:
            f.write(sample_rules)
        logger.info(f"Created sample YARA rules at: {rules_file}")
    
    def scan_file(self, file_path: str) -> List[Dict]:
        """Scan a file with YARA rules"""
        if self.rules is None:
            logger.error("YARA rules not loaded")
            return []
        
        if not os.path.exists(file_path):
            logger.error(f"File not found for YARA scanning: {file_path}")
            return []
        
        try:
            matches = self.rules.match(file_path)
            results = []
            for match in matches:
                results.append({
                    'rule': match.rule,
                    'tags': match.tags,
                    'meta': match.meta,
                    'strings': [str(s) for s in match.strings]
                })
            return results
        except Exception as e:
            logger.error(f"YARA scan failed for {file_path}: {e}")
            return []
    
    def scan_data(self, data: bytes, identifier: str = "unknown") -> List[Dict]:
        """Scan in-memory data with YARA rules"""
        if self.rules is None:
            logger.error("YARA rules not loaded")
            return []
        
        try:
            # Create temporary file for scanning
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file.write(data)
                temp_path = temp_file.name
            
            results = self.scan_file(temp_path)
            
            # Clean up temporary file
            os.unlink(temp_path)
            
            return results
        except Exception as e:
            logger.error(f"YARA data scan failed for {identifier}: {e}")
            return []
    
    def analyze_malware(self, file_path: str, file_hash: str = None) -> Dict:
        """Comprehensive malware analysis using YARA"""
        yara_matches = self.scan_file(file_path)
        
        threat_score = 0
        detected_families = []
        
        for match in yara_matches:
            rule_name = match['rule']
            meta = match.get('meta', {})
            severity = meta.get('severity', 'Low')
            
            # Calculate threat score based on rule severity
            if severity == 'High':
                threat_score += 30
            elif severity == 'Medium':
                threat_score += 15
            else:
                threat_score += 5
            
            detected_families.append({
                'rule': rule_name,
                'description': meta.get('description', 'Unknown'),
                'severity': severity
            })
        
        # Determine overall threat level
        if threat_score >= 50:
            threat_level = "High"
        elif threat_score >= 25:
            threat_level = "Medium"
        else:
            threat_level = "Low"
        
        return {
            'file_path': file_path,
            'file_hash': file_hash,
            'threat_score': min(100, threat_score),
            'threat_level': threat_level,
            'yara_matches': yara_matches,
            'detected_families': detected_families,
            'rules_loaded': self.rules is not None
        }

# Global instance
yara_analyzer = YARAAnalyzer()