from __future__ import annotations

from collections.abc import Callable
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import AuthProvider, CurrentUser, VerifiedIdentity
from app.db.transactions import connection
from app.errors.exceptions import AuthenticationError, AuthorizationError, DatabaseUnavailableError
from app.repositories import user_repository

bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_provider(request: Request) -> AuthProvider:
    provider = getattr(request.app.state, "auth_provider", None)
    if provider is None:
        raise AuthenticationError("Authentication is not configured. Protected endpoints are unavailable.")
    return provider


async def get_verified_identity(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    provider: Annotated[AuthProvider, Depends(get_auth_provider)],
) -> VerifiedIdentity:
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise AuthenticationError()
    return await provider.verify_access_token(credentials.credentials)


async def get_current_user(
    identity: Annotated[VerifiedIdentity, Depends(get_verified_identity)],
) -> CurrentUser:
    try:
        async with connection() as conn:
            user_row = await user_repository.get_user_by_auth_subject(conn, identity.subject)
            if user_row is None:
                raise AuthorizationError(
                    "The authenticated subject is not mapped to an application user.",
                    code="user_not_mapped",
                )
            if not user_row["is_active"]:
                raise AuthorizationError("This application user is inactive.")
            roles = await user_repository.list_active_roles(conn, user_row["user_id"])
    except DatabaseUnavailableError:
        raise

    return CurrentUser(
        user_id=user_row["user_id"],
        auth_subject=user_row["auth_subject"],
        email=user_row["email"],
        display_name=user_row["display_name"],
        roles=frozenset(roles),
        is_active=user_row["is_active"],
    )


def require_permission(permission: str) -> Callable[[CurrentUser], CurrentUser]:
    """Return a FastAPI dependency that authenticates the user and verifies they
    are an active application user.  Role-based permission checks have been
    removed; every active, registered user may access all business endpoints.
    The ``permission`` parameter is accepted for API compatibility but is not
    evaluated.
    """

    async def dependency(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        return user

    return dependency


def request_id(request: Request) -> str:
    existing = request.headers.get("X-Request-ID")
    value = existing or str(uuid4())
    request.state.request_id = value
    return value
