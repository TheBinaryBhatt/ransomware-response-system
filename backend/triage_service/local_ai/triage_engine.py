import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class TriageEngine:
    def __init__(self):
        self.threshold_confidence = 0.7
    
    def triage_incident(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform AI triage on an incident using rule-based and ML approaches
        """
        try:
            # Extract relevant data from alert
            message = alert_data.get("message", "").lower()
            rule_id = alert_data.get("rule_id", "")
            
            # Rule-based detection
            ransomware_indicators = [
                "ransomware", "encrypt", "bitcoin", "wannacry",
                "ryuk", "conti", "revil", "lockbit"
            ]
            
            # Check for ransomware indicators
            found_indicators = [indicator for indicator in ransomware_indicators 
                              if indicator in message]
            
            if found_indicators:
                confidence = min(0.95, 0.5 + len(found_indicators) * 0.1)
                return {
                    "decision": "confirmed_ransomware",
                    "confidence": confidence,
                    "reasoning": f"Found ransomware indicators: {', '.join(found_indicators)}",
                    "recommended_actions": ["isolate_host", "block_ips", "notify_soc"]
                }
            
            # If no clear indicators, escalate for human review
            return {
                "decision": "escalate_human",
                "confidence": 0.3,
                "reasoning": "No clear ransomware indicators found",
                "recommended_actions": ["escalate_to_analyst"]
            }
            
        except Exception as e:
            logger.error(f"Error in triage engine: {e}")
            return {
                "decision": "escalate_human",
                "confidence": 0.1,
                "reasoning": f"Error during analysis: {str(e)}",
                "recommended_actions": ["escalate_to_analyst"]
            }

# Global instance
triage_engine = TriageEngine()