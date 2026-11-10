from uuid import UUID


class AppError(Exception):
    """Safe, client-facing application error."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        *,
        details: dict | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.headers = headers or {}


class AuthenticationError(AppError):
    def __init__(self, message: str = "Sign in is required or the session is invalid.", code: str = "unauthenticated") -> None:
        super().__init__(code, message, 401)


class AuthorizationError(AppError):
    def __init__(self, message: str = "You do not have permission for this action.", code: str = "forbidden") -> None:
        super().__init__(code, message, 403)


class NotFoundError(AppError):
    def __init__(self, message: str = "The requested record was not found.") -> None:
        super().__init__("not_found", message, 404)


class ConflictError(AppError):
    def __init__(self, message: str, code: str = "conflict") -> None:
        super().__init__(code, message, 409)


class DatabaseUnavailableError(AppError):
    def __init__(self, message: str = "The database is not available.") -> None:
        super().__init__("database_unavailable", message, 503)


class ActorContextError(AppError):
    def __init__(self, actor_id: UUID | None = None) -> None:
        super().__init__(
            "actor_context_required",
            "A verified actor is required before writing to the database.",
            403,
        )
        self.details = {"actor_id": str(actor_id) if actor_id else None}
