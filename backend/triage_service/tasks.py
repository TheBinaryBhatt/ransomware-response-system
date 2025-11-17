from celery import shared_task
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from core.config import settings
from .models import TriageIncident
import json
import re
import logging
from triage_service.local_ai.agent import agent



# Use sync engine for Celery tasks
engine = create_engine(settings.TRIAGE_DB_URL, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

logger = logging.getLogger(__name__)

class SqlAlchemyTask:
    """Celery Task that ensures database connections are properly handled"""
    abstract = True

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        """Clean up database connections after task completion"""
        from . import SessionLocal
        SessionLocal.remove()

def build_prompt(incident):
    """Create structured prompt for the agent"""
    return f"""
You are an autonomous SOC triage analyst. Analyze this security incident and provide response in JSON format.

INCIDENT DATA:
- Message: {incident.raw_data.get('message', '')}
- Source: {incident.source}
- Timestamp: {incident.created_at}

ANALYSIS REQUIREMENTS:
1. Determine if this indicates ransomware activity
2. Assess confidence level (0.0 to 1.0)
3. Provide detailed reasoning
4. Recommend specific actions

RESPONSE FORMAT (JSON only):
{{
    "decision": "confirmed_ransomware|suspicious_activity|benign|escalate_human",
    "confidence": 0.95,
    "reasoning": "Detailed analysis here...",
    "recommended_actions": ["action1", "action2"]
}}

ANALYSIS:
"""

@shared_task(bind=True, base=SqlAlchemyTask)
def triage_incident(self, incident_id: str):
    """Perform AI triage on an incident using LangChain agent"""
    db = SessionLocal()
    try:
        # Get incident from database
        incident = db.query(TriageIncident).filter(TriageIncident.id == incident_id).first()
        if not incident:
            logger.error(f"Incident {incident_id} not found")
            return {"status": "error", "error": "Incident not found"}

        # Import agent inside task to avoid circular imports
        from .local_ai.agent import agent
        
        if not agent:
            logger.error("AI agent not initialized")
            return {"status": "error", "error": "AI agent not initialized"}

        # Build and run the prompt through LangChain agent
        prompt = build_prompt(incident)
        logger.info(f"Running AI triage for incident {incident_id}")
        
        result = agent.run(prompt)
        
        # Parse JSON response from agent
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
            
            # Update incident with AI analysis
            incident.decision = parsed.get("decision", "escalate_human")
            incident.confidence = float(parsed.get("confidence", 0.5))
            incident.reasoning = parsed.get("reasoning", "No reasoning provided")
            
            # Store actions as JSON or convert to string as needed
            recommended_actions = parsed.get("recommended_actions", [])
            incident.actions = json.dumps(recommended_actions) if recommended_actions else "[]"
            
            db.commit()
            logger.info(f"AI triage completed for incident {incident_id}: {incident.decision}")

            # Trigger response actions if confirmed ransomware
            if incident.decision == "confirmed_ransomware":
                try:
                    from response_service.tasks import execute_response_actions
                    execute_response_actions.delay(str(incident.id))
                    logger.info(f"Triggered response actions for incident {incident.id}")
                except ImportError as e:
                    logger.warning(f"Response service not available: {e}")
                except Exception as e:
                    logger.error(f"Failed to trigger response actions: {e}")

            return {
                "status": "success", 
                "incident_id": str(incident.id),
                "decision": incident.decision,
                "confidence": incident.confidence
            }
        else:
            # Fallback if JSON parsing fails
            logger.warning(f"Failed to parse AI response as JSON: {result}")
            incident.decision = "escalate_human"
            incident.reasoning = f"AI response parsing failed: {result[:200]}..."  # Truncate long responses
            db.commit()
            return {"status": "error", "error": "Failed to parse AI response as JSON"}

    except Exception as e:
        logger.error(f"Error in AI triage for incident {incident_id}: {str(e)}")
        db.rollback()
        
        # You can add retry logic here if needed
        # self.retry(exc=e, countdown=60, max_retries=3)
        
        return {"status": "error", "error": str(e)}
    
    finally:
        db.close()