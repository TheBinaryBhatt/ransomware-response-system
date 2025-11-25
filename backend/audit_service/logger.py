import logging
import asyncio
from typing import Dict, Any

from core.database import AsyncSessionLocal
from .models import AuditLog

# Import the DB loop from the consumer so logging writes use the same loop
from .consumer import _db_loop, _ensure_db_loop_started

class DatabaseHandler(logging.Handler):
    """
    Logging handler that writes logs into audit_logs table using the shared
    audit service DB event loop (same loop used by consumer).
    """

    def emit(self, record: logging.LogRecord):
        try:
            _ensure_db_loop_started()

            # If DB loop is not ready, fallback to simple stdout logging
            if _db_loop is None:
                print("[AuditLogger] DB loop not available, fallback log:", record.getMessage())
                return

            # Schedule async DB write on the audit DB loop
            future = asyncio.run_coroutine_threadsafe(
                self._write_async(record),
                _db_loop
            )

            # Attach an error callback, but never block the logger
            def _cb(f):
                try:
                    f.result()
                except Exception:
                    self.handleError(record)

            future.add_done_callback(_cb)

        except Exception:
            self.handleError(record)

    async def _write_async(self, record: logging.LogRecord):
        """
        Writes the log entry into the AuditLog table asynchronously.
        """
        try:
            async with AsyncSessionLocal() as session:
                entry = AuditLog(
                    actor="system",
                    action="system_log",
                    target=record.name,
                    resource_type="log",
                    status=record.levelname.lower(),
                    details={
                        "message": record.getMessage(),
                        "module": record.module,
                        "lineno": record.lineno,
                    },
                )
                session.add(entry)
                await session.commit()
        except Exception as e:
            raise e


def setup_logging():
    """
    Configures root logger to write INFO+ logs to the DB.
    """
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    db_handler = DatabaseHandler()
    db_handler.setLevel(logging.INFO)

    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    db_handler.setFormatter(formatter)

    logger.addHandler(db_handler)
