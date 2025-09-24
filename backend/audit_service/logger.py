import logging
import logging.handlers
from .models import AuditLog
from core.database import get_db
from sqlalchemy.orm import Session

class DatabaseHandler(logging.Handler):
    """Custom logging handler that stores logs in the database"""
    
    def emit(self, record):
        try:
            db = next(get_db())
            log_entry = AuditLog(
                action="system_log",
                target=record.name,
                status=record.levelname.lower(),
                details={
                    "message": record.getMessage(),
                    "module": record.module,
                    "lineno": record.lineno
                }
            )
            db.add(log_entry)
            db.commit()
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