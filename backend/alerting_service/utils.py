import logging

logger = logging.getLogger(__name__)

def send_email_alert(target: str, message: str, severity: str):
    # Placeholder email sending logic, replace with real email service integration
    logger.info(f"Sending {severity} alert to {target}: {message}")
    print(f"ALERT [{severity}] for {target}: {message}")
