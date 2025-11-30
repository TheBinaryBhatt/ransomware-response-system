# backend/audit_service/consumer.py
import os
import logging
import threading
import asyncio
from typing import Dict, Any, Callable, Optional

from shared_lib.events.rabbitmq import start_consumer_thread
from core.database import AsyncSessionLocal
from .models import AuditLog

logger = logging.getLogger(__name__)

QUEUE_NAME = os.getenv("AUDIT_QUEUE", "audit.events")
BINDING_KEYS = os.getenv("AUDIT_BINDINGS", "incident.*").split(",")

# MAIN_LOOP will be set by startup; used to schedule DB coroutines safely from consumer thread
MAIN_LOOP: Optional[asyncio.AbstractEventLoop] = None


async def _persist_event_to_db(event: Dict[str, Any]):
    """
    Persist an audit event dict into the AuditLog table.
    """
    try:
        payload = event.get("payload", {}) if isinstance(event, dict) else {}
        routing_key = event.get("routing_key", None) if isinstance(event, dict) else None

        action = payload.get("action") or routing_key or "event"
        target = payload.get("target")
        actor = payload.get("actor") or "system"
        status = payload.get("status") or "info"
        details = payload.get("details") or {}
        resource_type = payload.get("resource_type") or "system"

        async with AsyncSessionLocal() as session:
            new_log = AuditLog(
                actor=actor,
                action=action,
                target=target,
                resource_type=resource_type,
                status=status,
                details=details,
            )
            session.add(new_log)
            await session.commit()
            await session.refresh(new_log)
            logger.info("[Audit] Persisted audit event to DB: log_id=%s action=%s", new_log.log_id, action)
            return {"status": "success", "log_id": new_log.log_id}
    except Exception:
        logger.exception("[Audit] Exception while persisting audit event")
        return {"status": "error", "error": "persist_failed"}


def _handle_event(routing_key: str, payload: Dict[str, Any]):
    """
    Called by the RabbitMQ consumer thread for each incoming message.
    Schedule _persist_event_to_db on the main loop using run_coroutine_threadsafe to avoid cross-loop futures.
    """
    logger.info("[Audit] Received %s -> %s", routing_key, payload)

    try:
        if MAIN_LOOP is None:
            # fallback to running on a short-lived loop (best-effort) — but prefer MAIN_LOOP from startup
            logger.warning("[Audit] MAIN_LOOP not set; attempting asyncio.run fallback")
            try:
                asyncio.run(_persist_event_to_db({"routing_key": routing_key, "payload": payload}))
            except Exception:
                logger.exception("[Audit] Fallback sync persist failed")
            return

        future = asyncio.run_coroutine_threadsafe(
            _persist_event_to_db({"routing_key": routing_key, "payload": payload}), MAIN_LOOP
        )

        def _cb(fut):
            try:
                res = fut.result()
                if res and res.get("status") != "success":
                    logger.warning("[Audit] Persist returned non-success: %s", res)
            except Exception:
                logger.exception("[Audit] Persist callback error")

        future.add_done_callback(_cb)

    except Exception:
        logger.exception("[Audit] Failed scheduling persist task")


def start(rabbitmq_host: str = "rabbitmq", main_loop: Optional[asyncio.AbstractEventLoop] = None):
    """
    Start the audit consumer (non-blocking). Returns thread object from start_consumer_thread.
    """
    global MAIN_LOOP
    logger.info("[Audit] Starting audit consumer")

    if main_loop:
        MAIN_LOOP = main_loop

    try:
        return start_consumer_thread(
            QUEUE_NAME,
            BINDING_KEYS,
            _handle_event,
            rabbitmq_host=rabbitmq_host,
        )
    except Exception:
        logger.exception("[Audit] Failed to start consumer thread")
        raise
