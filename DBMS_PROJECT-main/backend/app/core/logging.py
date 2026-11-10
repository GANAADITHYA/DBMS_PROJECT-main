import logging
import sys
from typing import Any

from app.core.config import Settings

SENSITIVE_KEYS = {
    "authorization",
    "password",
    "secret",
    "token",
    "access_token",
    "refresh_token",
    "database_url",
    "dsn",
    "apikey",
    "api_key",
    "service_role",
}


def configure_logging(settings: Settings) -> None:
    level = logging.DEBUG if settings.app_env in {"local", "development"} else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
        force=True,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("psycopg").setLevel(logging.WARNING)


def sanitize_log_value(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized = {}
        for key, item in value.items():
            if str(key).lower() in SENSITIVE_KEYS:
                sanitized[key] = "[redacted]"
            else:
                sanitized[key] = sanitize_log_value(item)
        return sanitized
    if isinstance(value, str) and any(token in value.lower() for token in ("password=", "pwd=")):
        return "[redacted]"
    return value


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
