# audit_service/consumer.py
import os
import logging
import threading
import asyncio
import time
from typing import Dict, Any, Callable

from shared_lib.events.rabbitmq import start_consumer_thread
from core.database import AsyncSessionLocal
from .models import AuditLog

logger = logging.getLogger(__name__)

QUEUE_NAME = os.getenv("AUDIT_QUEUE", "audit.events")
BINDING_KEYS = os.getenv("AUDIT_BINDINGS", "incident.*").split(",")

# --- async DB persistence ---
async def _persist_event_to_db(event: Dict[str, Any]):
    """
    Persist an audit event dict into the AuditLog table.
    Expected event shape:
    {
      "routing_key": "<routing.key>",
      "payload": { "action": "...", "target": "...", "actor": "...", "status": "...", "details": {...}, "resource_type": "..." }
    }
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
            # optionally refresh to ensure fields like created_at/integrity_hash set
            await session.refresh(new_log)
            logger.info("[Audit] Persisted audit event to DB: log_id=%s action=%s", new_log.log_id, action)
            return {"status": "success", "log_id": new_log.log_id}
    except Exception:
        logger.exception("[Audit] Exception while persisting audit event")
        return {"status": "error", "error": "persist_failed"}


# DB loop management
_db_loop: asyncio.AbstractEventLoop | None = None
_db_loop_thread: threading.Thread | None = None
_db_loop_ready = threading.Event()


def _start_db_loop():
    global _db_loop
    _db_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_db_loop)
    logger.info("[Audit] DB event loop starting in thread %s", threading.get_ident())
    _db_loop_ready.set()
    _db_loop.run_forever()


def _ensure_db_loop_started():
    global _db_loop_thread
    if _db_loop_thread and _db_loop_thread.is_alive():
        return
    _db_loop_ready.clear()
    _db_loop_thread = threading.Thread(target=_start_db_loop, daemon=True)
    _db_loop_thread.start()
    # avoid busy-wait: wait with timeout
    if not _db_loop_ready.wait(timeout=5):
        logger.warning("[Audit] DB event loop did not signal ready within 5s")


def _handle_event(routing_key: str, payload: Dict[str, Any]):
    """
    Called by the RabbitMQ consumer thread for each incoming message.
    Schedule _persist_event_to_db on the dedicated db loop.
    """
    logger.info("[Audit] Received %s -> %s", routing_key, payload)
    try:
        _ensure_db_loop_started()
        if _db_loop is None:
            # fallback: attempt synchronous write (best-effort)
            logger.warning("[Audit] DB loop is not available, attempting sync fallback")
            # schedule to run in a short-lived loop
            try:
                asyncio.run(_persist_event_to_db({"routing_key": routing_key, "payload": payload}))
            except Exception:
                logger.exception("[Audit] Fallback sync persist failed")
            return

        future = asyncio.run_coroutine_threadsafe(
            _persist_event_to_db({"routing_key": routing_key, "payload": payload}), _db_loop
        )

        # attach callback to log errors, do not block the consumer
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


def start(rabbitmq_host: str = "rabbitmq"):
    """
    Start the audit consumer (non-blocking). Returns the thread object from start_consumer_thread.
    """
    logger.info("[Audit] Starting audit consumer")
    _ensure_db_loop_started()
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
