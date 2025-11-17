import logging
import logging.handlers
from .models import AuditLog
from core.database import AsyncSessionLocal
import asyncio

class DatabaseHandler(logging.Handler):
    """Custom logging handler that stores logs in the database"""
    
    def emit(self, record):
        asyncio.run(self._write(record))

    async def _write(self, record):
        try:
            async with AsyncSessionLocal() as session:
                log_entry = AuditLog(
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
                session.add(log_entry)
                await session.commit()
        except Exception:
            self.handleError(record)

# Configure logging
def setup_logging():
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Add database handler
    db_handler = DatabaseHandler()
    db_handler.setLevel(logging.INFO)
    
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    db_handler.setFormatter(formatter)
    
    logger.addHandler(db_handler)