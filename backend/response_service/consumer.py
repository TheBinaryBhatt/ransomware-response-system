import logging
from core.rabbitmq_utils import start_consumer_thread
from core.config import settings
from .tasks import trigger_full_response

logger = logging.getLogger(__name__)

def _handle_event(routing_key: str, payload: dict):
    incident_id = payload.get("incident_id")
    analysis = payload.get("analysis", {})
    logger.info(f"Response consumer received {routing_key} for {incident_id}")
    if not settings.auto_response_enabled:
        logger.info("Auto response disabled; skipping automated workflow trigger")
        return
    if analysis.get("decision") == "confirmed_ransomware" and analysis.get("auto_response", False):
        try:
            trigger_full_response(incident_id, agent_id="triage_ai")
        except Exception as e:
            logger.error(f"Failed to trigger response for {incident_id}: {e}")

def start():
    start_consumer_thread(
        queue_name="response_service",
        binding_keys=["incident.triaged"],
        handler=_handle_event
    )

