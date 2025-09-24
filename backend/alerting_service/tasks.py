from celery import shared_task
from .utils import send_email_alert

@shared_task
def send_alert(target: str, message: str, severity: str):
    """
    Async task to send an alert.
    For now, sends an email alert - extend as needed.
    """
    # Call your alerting utility here
    send_email_alert(target, message, severity)
