import logging
import sys
import traceback
from app.config.settings import settings

def setup_logger(name: str = "stratos") -> logging.Logger:
    """Configures structured console logging formats for production use."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        # Set log level based on environment
        log_level = logging.DEBUG if settings.debug else logging.INFO
        logger.setLevel(log_level)
        
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        
        # Enhanced formatter with more context for production debugging
        formatter = logging.Formatter(
            "[%(asctime)s] %(levelname)s [%(name)s] [%(module)s:%(funcName)s:%(lineno)d] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Prevent propagation to avoid duplicate logs
        logger.propagate = False
    return logger

def log_exception(logger: logging.Logger, message: str, exc: Exception) -> None:
    """Log exception with full traceback for production debugging."""
    logger.error(
        f"{message}\n"
        f"Error type: {type(exc).__name__}\n"
        f"Error message: {str(exc)}\n"
        f"Traceback:\n{traceback.format_exc()}"
    )

logger = setup_logger()
