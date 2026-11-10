import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from psycopg import Error as PsycopgError
from psycopg.errors import (
    CheckViolation,
    ExclusionViolation,
    ForeignKeyViolation,
    InsufficientPrivilege,
    IntegrityError,
    InvalidPassword,
    NotNullViolation,
    OperationalError,
    RaiseException,
    UniqueViolation,
)
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.errors.exceptions import AppError

logger = logging.getLogger("campus_memory.errors")

SAFE_CHECK_MESSAGES = (
    "A relationship cannot be inserted directly as confirmed",
    "A reason is required when downgrading a confirmed relationship",
    "A relationship cannot be confirmed without at least one evidence row",
    "The proposed cause starts after the proposed effect",
    "Status transition",
    "A reason is required for status transition",
    "A non-empty app.change_reason is required",
    "Cannot delete the last evidence row",
    "Cannot move the last evidence row",
    "A reason is required for relationship status/confidence changes",
    "Event code, title and description are required",
    "started_at is required",
    "At least one location, asset, service or scheduled activity is required",
    "A non-empty closing reason is required",
    "already in terminal status",
    "Transition ",
    "This evidence type requires a source reference or URL",
    "Evidence type is missing or inactive",
    "Trusted transaction-local app.actor_id context is required",
)


def error_payload(code: str, message: str, request_id: str | None, details: dict | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id,
        }
    }
    if details:
        body["error"]["details"] = details
    return body


def request_id_of(request: Request) -> str | None:
    return getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")


def map_psycopg_error(exc: PsycopgError) -> AppError:
    diagnostic = getattr(exc, "diag", None)
    sqlstate = getattr(diagnostic, "sqlstate", None) or getattr(exc, "sqlstate", None)
    raw_message = (getattr(diagnostic, "message_primary", None) or str(exc)).strip()
    safe_message = _safe_database_message(raw_message)

    if isinstance(exc, UniqueViolation) or sqlstate == "23505":
        return AppError("duplicate_record", safe_message or "This record already exists.", 409)
    if isinstance(exc, ForeignKeyViolation) or sqlstate == "23503":
        return AppError("invalid_reference", safe_message or "A referenced record does not exist.", 409)
    if isinstance(exc, (CheckViolation, NotNullViolation, ExclusionViolation)) or sqlstate in {"23514", "23502", "23P01"}:
        return AppError("constraint_violation", safe_message or "The change violates a database rule.", 409)
    if sqlstate == "P0002":
        return AppError("not_found", safe_message or "The requested record was not found.", 404)
    if isinstance(exc, InsufficientPrivilege) or sqlstate == "42501":
        if "actor_id" in raw_message.lower():
            return AppError("actor_context_required", "A verified actor is required for this write.", 403)
        return AppError(
            "database_permission_denied",
            "The application database role does not have permission for this operation.",
            503,
        )
    if isinstance(exc, (OperationalError, InvalidPassword)):
        return AppError("database_unavailable", "The database is not available.", 503)
    if isinstance(exc, (RaiseException, IntegrityError)):
        return AppError("constraint_violation", safe_message or "The database rejected this operation.", 409)
    logger.exception("Unmapped database error sqlstate=%s", sqlstate)
    return AppError("database_error", "The operation could not be completed.", 500)


def _safe_database_message(raw_message: str) -> str:
    lowered = raw_message.lower()
    for fragment in SAFE_CHECK_MESSAGES:
        if fragment.lower() in lowered:
            return raw_message
    if "does not exist" in lowered and "campus event" in lowered:
        return raw_message
    if "duplicate key" in lowered:
        if "uq_relationship_direction" in lowered:
            return "A directed relationship between these two events already exists."
        if "event_code" in lowered:
            return "An event with this event code already exists."
        return "A unique constraint prevented this change."
    return "The database rejected this operation."


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        logger.info(
            "application_error code=%s status=%s request_id=%s",
            exc.code,
            exc.status_code,
            request_id_of(request),
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(exc.code, exc.message, request_id_of(request), exc.details),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        issues = []
        for error in exc.errors():
            issue = dict(error)
            if issue.get("ctx"):
                issue["ctx"] = {key: str(value) for key, value in issue["ctx"].items()}
            issues.append(issue)
        return JSONResponse(
            status_code=422,
            content=error_payload(
                "validation_error",
                "One or more fields are invalid.",
                request_id_of(request),
                {"issues": jsonable_encoder(issues)},
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "http_error"
        if exc.status_code == 401:
            code = "unauthenticated"
        elif exc.status_code == 403:
            code = "forbidden"
        elif exc.status_code == 404:
            code = "not_found"
        message = exc.detail if isinstance(exc.detail, str) else "The request could not be completed."
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(code, message, request_id_of(request)),
        )

    @app.exception_handler(PsycopgError)
    async def database_handler(request: Request, exc: PsycopgError) -> JSONResponse:
        mapped = map_psycopg_error(exc)
        logger.warning(
            "database_error code=%s sqlstate=%s request_id=%s",
            mapped.code,
            getattr(getattr(exc, "diag", None), "sqlstate", None),
            request_id_of(request),
        )
        return JSONResponse(
            status_code=mapped.status_code,
            content=error_payload(mapped.code, mapped.message, request_id_of(request)),
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error request_id=%s", request_id_of(request))
        return JSONResponse(
            status_code=500,
            content=error_payload(
                "internal_error",
                "The operation could not be completed.",
                request_id_of(request),
            ),
        )
