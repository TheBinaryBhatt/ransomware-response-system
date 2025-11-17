import json
import re
import logging
from .llm_loader import local_ai_model

logger = logging.getLogger(__name__)

class TriageAgent:
    """Autonomous SOC Triage Agent for incident analysis"""
    
    def __init__(self):
        self.model = local_ai_model
        self.available = self.model.model_loaded
        if self.available:
            logger.info("✅ Triage AI Agent initialized successfully with local model")
        else:
            logger.warning("❌ Agent using rule-based fallback - local model not loaded")
    
    def build_analysis_prompt(self, incident_data: dict) -> str:
        """Create structured prompt for incident analysis"""
        return f"""
INCIDENT DATA:
- Alert ID: {incident_data.get('alert_id', 'Unknown')}
- Source: {incident_data.get('source', 'Unknown')}
- Event Type: {incident_data.get('event_type', 'Unknown')}
- Source IP: {incident_data.get('source_ip', 'Unknown')}
- Affected Host: {incident_data.get('affected_host', 'Unknown')}
- File Hash: {incident_data.get('file_hash', 'Unknown')}
- Process: {incident_data.get('process_name', 'Unknown')}
- Severity: {incident_data.get('severity', 'Unknown')}
- Detection Time: {incident_data.get('detection_time', 'Unknown')}
- Description: {incident_data.get('description', 'Unknown')}

ANALYSIS CONTEXT:
You are a cybersecurity analyst. Analyze this incident and determine if it indicates ransomware activity.
"""
    
    async def analyze_incident(self, incident_data: dict) -> dict:
        """Analyze incident using local AI model"""
        try:
            prompt = self.build_analysis_prompt(incident_data)
            logger.info("Running AI triage analysis...")
            
            # Use local AI model for analysis
            ai_response = self.model.generate_response(prompt)
            
            # Parse the AI response
            parsed_response = self._parse_ai_response(ai_response, incident_data)
            logger.info(f"AI Analysis completed: {parsed_response.get('decision', 'unknown')}")
            return parsed_response
                
        except Exception as e:
            logger.error(f"Error in AI analysis: {str(e)}")
            return self._fallback_analysis(incident_data)
    
    def _parse_ai_response(self, ai_response: str, incident_data: dict) -> dict:
        """Parse AI response into structured format"""
        try:
            # Extract threat level from response
            threat_level = "Medium"
            confidence = 0.7
            reasoning = ai_response
            
            # Parse AI response for threat level
            if "Critical" in ai_response:
                threat_level = "Critical"
                confidence = 0.9
            elif "High" in ai_response:
                threat_level = "High" 
                confidence = 0.8
            elif "Low" in ai_response:
                threat_level = "Low"
                confidence = 0.5
            
            # Parse confidence from response if available
            confidence_match = re.search(r'Confidence:\s*(\d+)%', ai_response)
            if confidence_match:
                confidence = float(confidence_match.group(1)) / 100.0
            
            # Determine decision based on threat level
            if threat_level in ["Critical", "High"]:
                decision = "confirmed_ransomware"
                auto_response = True
            else:
                decision = "suspicious_activity" 
                auto_response = False
            
            # Extract actions from AI response
            actions_match = re.search(r'Actions:\s*([^\n]+)', ai_response)
            if actions_match:
                actions = [action.strip() for action in actions_match.group(1).split(',')]
            else:
                actions = self._extract_actions(ai_response)
            
            return {
                "decision": decision,
                "confidence": confidence,
                "priority": threat_level.lower(),
                "reasoning": reasoning,
                "recommended_actions": actions,
                "threat_indicators": [
                    incident_data.get('source_ip', ''),
                    incident_data.get('file_hash', ''),
                    incident_data.get('affected_host', '')
                ],
                "auto_response": auto_response,
                "ai_analysis": True
            }
        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
            return self._fallback_analysis(incident_data)
    
    def _extract_actions(self, ai_response: str) -> list:
        """Extract recommended actions from AI response"""
        actions = []
        ai_response_lower = ai_response.lower()
        
        if "isolate" in ai_response_lower:
            actions.append("isolate_host")
        if "block" in ai_response_lower:
            actions.append("block_ip") 
        if "scan" in ai_response_lower:
            actions.append("scan_system")
        if "backup" in ai_response_lower or "back up" in ai_response_lower:
            actions.append("backup_data")
        if "quarantine" in ai_response_lower:
            actions.append("quarantine_file")
        if "investigate" in ai_response_lower:
            actions.append("investigate_logs")
        
        if not actions:
            actions = ["monitor", "escalate_soc"]
        
        return actions
    
    def _fallback_analysis(self, incident_data: dict) -> dict:
        """Fallback analysis when AI fails"""
        logger.info("Using fallback analysis logic")
        
        # Rule-based fallback logic
        severity = incident_data.get('severity', '').lower()
        event_type = incident_data.get('event_type', '').lower()
        description = incident_data.get('description', '').lower()
        
        if any(word in event_type or word in description for word in ['ransomware', 'encryption', 'locked', 'wannacry']):
            decision = "confirmed_ransomware"
            confidence = 0.8
            priority = "critical"
        elif severity in ['critical', 'high'] or any(word in description for word in ['malware', 'trojan', 'backdoor']):
            decision = "suspicious_activity"
            confidence = 0.6
            priority = "high"
        else:
            decision = "escalate_human"
            confidence = 0.3
            priority = "medium"
        
        return {
            "decision": decision,
            "confidence": confidence,
            "priority": priority,
            "reasoning": "Fallback rule-based analysis (AI unavailable)",
            "recommended_actions": ["isolate_host", "block_ip", "escalate_soc"],
            "threat_indicators": [incident_data.get('source_ip', ''), incident_data.get('file_hash', '')],
            "auto_response": decision == "confirmed_ransomware",
            "ai_analysis": False
        }

# Global agent instance
triage_agent = TriageAgent()