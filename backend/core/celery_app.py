from celery import Celery
from .config import settings

celery_app = Celery(
    'ransomware_response',
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        'ingestion-service.tasks',
        'triage-service.tasks',
        'response-service.tasks',
        'audit-service.tasks'
    ]
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)