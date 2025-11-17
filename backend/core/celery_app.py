from celery import Celery
import os

# Create Celery application
celery_app = Celery(
    "ransomware_response",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0"),
    include=[
        "ingestion_service.tasks",
        "triage_service.tasks", 
        "response_service.tasks",
        "alerting_service.tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "ingestion_service.tasks.*": {"queue": "ingestion"},
        "triage_service.tasks.*": {"queue": "triage"},
        "response_service.tasks.*": {"queue": "response"},
        "alerting_service.tasks.*": {"queue": "alerts"},
    },
    task_default_queue="default",
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Optional: Add task definitions if needed
@celery_app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")

if __name__ == "__main__":
    celery_app.start()