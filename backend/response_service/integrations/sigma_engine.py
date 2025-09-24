import yaml
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class SigmaEngine:
    def __init__(self, rules_dir: str = "./sigma_rules"):
        self.rules_dir = Path(rules_dir)
        self.rules = self._load_rules()
    
    def _load_rules(self) -> List[Dict[str, Any]]:
        """Load Sigma rules from directory"""
        if not self.rules_dir.exists():
            logger.warning(f"Sigma rules directory not found: {self.rules_dir}")
            return []
        
        rules = []
        for rule_file in self.rules_dir.glob("**/*.yml"):
            try:
                with open(rule_file, 'r') as f:
                    rule_data = yaml.safe_load(f)
                    rules.append(rule_data)
            except Exception as e:
                logger.error(f"Error loading Sigma rule {rule_file}: {e}")
        
        return rules
    
    def match_rules(self, event_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Match event data against loaded Sigma rules"""
        matched_rules = []
        for rule in self.rules:
            if self._matches_rule(event_data, rule):
                matched_rules.append(rule)
        return matched_rules
    
    def _matches_rule(self, event_data: Dict[str, Any], rule: Dict[str, Any]) -> bool:
        """Check if event data matches a Sigma rule"""
        # Simplified rule matching logic
        # In production, you'd use a proper Sigma rule engine
        try:
            detection = rule.get("detection", {})
            for search_identifier, search_definition in detection.items():
                if search_identifier not in ["condition", "timeframe"]:
                    for field, pattern in search_definition.items():
                        if field in event_data:
                            field_value = str(event_data[field]).lower()
                            if isinstance(pattern, str):
                                pattern = pattern.lower()
                                if pattern in field_value:
                                    return True
            return False
        except Exception as e:
            logger.error(f"Error matching Sigma rule: {e}")
            return False

# Global instance
sigma_engine = SigmaEngine()