from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.core.config import Settings, get_settings
from app.errors.exceptions import DatabaseUnavailableError

logger = logging.getLogger("campus_memory.db")


@dataclass
class DatabaseState:
    pool: AsyncConnectionPool | None = None
    last_error_code: str | None = None
    last_error_message: str | None = None


_state = DatabaseState()


def get_database_state() -> DatabaseState:
    return _state


async def configure_connection(conn: AsyncConnection) -> None:
    conn.row_factory = dict_row
    settings = get_settings()

    async with conn.transaction():
        await conn.execute("SET TIME ZONE 'UTC'")
        await conn.execute(
            "SELECT set_config('statement_timeout', %s, false)",
            (str(settings.db_statement_timeout_ms),),
        )


async def create_pool(settings: Settings | None = None) -> AsyncConnectionPool | None:
    settings = settings or get_settings()
    url = settings.normalized_database_url()
    if not url:
        _state.pool = None
        _state.last_error_code = "database_not_configured"
        _state.last_error_message = "DATABASE_URL is not set."
        logger.warning("DATABASE_URL is not set; the API will start without a database pool.")
        return None

    pool = AsyncConnectionPool(
        conninfo=url,
        min_size=settings.db_pool_min_size,
        max_size=max(settings.db_pool_min_size, settings.db_pool_max_size),
        timeout=settings.db_connect_timeout_seconds,
        open=False,
        kwargs={
            "autocommit": False,
            "row_factory": dict_row,
        },
        configure=configure_connection,
    )
    try:
        await pool.open()
        await pool.wait(timeout=settings.db_connect_timeout_seconds)
    except Exception as exc:
        logger.warning("Database pool could not be opened: %s", type(exc).__name__)
        _state.pool = None
        _state.last_error_code = "database_unavailable"
        _state.last_error_message = _sanitize_connect_error(exc)
        try:
            await pool.close()
        except Exception:
            pass
        return None

    _state.pool = pool
    _state.last_error_code = None
    _state.last_error_message = None
    logger.info(
        "Database pool opened min_size=%s max_size=%s",
        settings.db_pool_min_size,
        settings.db_pool_max_size,
    )
    return pool


async def close_pool() -> None:
    if _state.pool is not None:
        await _state.pool.close()
        _state.pool = None
        logger.info("Database pool closed.")


def require_pool() -> AsyncConnectionPool:
    if _state.pool is None:
        message = _state.last_error_message or "The database is not available."
        raise DatabaseUnavailableError(message)
    return _state.pool


def _sanitize_connect_error(exc: Exception) -> str:
    name = type(exc).__name__
    text = str(exc).lower()
    if "password" in text or "authentication" in text:
        return "Database authentication failed for the configured role."
    if "permission" in text or "denied" in text:
        return "The configured database role does not have permission to connect or query."
    if "timeout" in text or "timed out" in text:
        return "The database connection timed out."
    if "could not translate host" in text or "name or service not known" in text:
        return "The database host could not be resolved."
    if "connection refused" in text or "could not connect" in text:
        return "The database host refused the connection. Try the reachable direct or session-mode URI."
    if "ssl" in text:
        return "The encrypted database connection could not be established."
    return f"Database connection failed ({name})."


async def ping_database() -> dict[str, Any]:
    settings = get_settings()
    if not settings.database_is_configured:
        return {
            "status": "unavailable",
            "code": "database_not_configured",
            "message": "DATABASE_URL is not set.",
            "configured": False,
        }
    if _state.pool is None:
        return {
            "status": "unavailable",
            "code": _state.last_error_code or "database_unavailable",
            "message": _state.last_error_message or "The database pool is not open.",
            "configured": True,
        }
    try:
        async with _state.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT current_user AS db_user, current_setting('server_version') AS server_version")
                row = await cur.fetchone()
        return {
            "status": "ready",
            "code": "ok",
            "message": "Database connection succeeded.",
            "configured": True,
            "db_user": row["db_user"] if row else None,
            "server_version": row["server_version"] if row else None,
        }
    except Exception as exc:
        logger.warning("Database readiness check failed: %s", type(exc).__name__)
        return {
            "status": "unavailable",
            "code": "database_unavailable",
            "message": _sanitize_connect_error(exc),
            "configured": True,
        }

async def check_database_readiness() -> dict[str, Any]:
    """Check connectivity and the minimum application-table permissions."""
    settings = get_settings()
    if not settings.database_is_configured:
        return {
            "status": "unavailable",
            "code": "database_not_configured",
            "message": "DATABASE_URL is not set.",
            "configured": False,
            "connection": "not_configured",
            "permissions": "unknown",
        }
    if _state.pool is None:
        error_code = _state.last_error_code or "database_unavailable"
        not_configured = error_code == "database_not_configured"

        return {
            "status": "unavailable",
            "code": error_code,
            "message": _state.last_error_message or "The database pool is not open.",
            "configured": not not_configured,
            "connection": "not_configured" if not_configured else "unavailable",
            "permissions": "unknown",
        }

    try:
        async with _state.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT
                        current_user AS db_user,
                        has_table_privilege(current_user, 'public.campus_event', 'SELECT')
                            AS can_read_events,
                        has_table_privilege(current_user, 'public.campus_event', 'INSERT')
                            AS can_insert_events,
                        has_table_privilege(current_user, 'public.campus_event', 'UPDATE')
                            AS can_update_events
                    """
                )
                row = await cur.fetchone()
    except Exception as exc:
        logger.warning("Database readiness check failed: %s", type(exc).__name__)
        message = _sanitize_connect_error(exc)
        if "permission" in message.lower() or "role" in message.lower():
            return {
                "status": "unavailable",
                "code": "database_permission_denied",
                "message": "The configured database role cannot inspect required application permissions.",
                "configured": True,
                "connection": "ready",
                "permissions": "unavailable",
            }
        return {
            "status": "unavailable",
            "code": "database_schema_not_ready",
            "message": "The database connection succeeded, but required application tables are unavailable.",
            "configured": True,
            "connection": "ready",
            "permissions": "unavailable",
        }

    permissions_ready = all(
        [
            row["can_read_events"],
            row["can_insert_events"],
            row["can_update_events"],
        ]
    )
    if not permissions_ready:
        return {
            "status": "unavailable",
            "code": "database_permission_denied",
            "message": "The configured database role lacks required CAMPUS MEMORY table permissions.",
            "configured": True,
            "connection": "ready",
            "permissions": "insufficient",
            "db_user": row["db_user"],
        }
    return {
        "status": "ready",
        "code": "ok",
        "message": "Database connection and core application permissions are ready.",
        "configured": True,
        "connection": "ready",
        "permissions": "ready",
        "db_user": row["db_user"],
    }
