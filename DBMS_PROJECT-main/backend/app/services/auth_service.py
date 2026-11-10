from __future__ import annotations

from fastapi import status

from app.core.security import AuthProvider, SupabaseAuthResult
from app.db.transactions import transaction
from app.errors.exceptions import AppError, AuthorizationError
from app.repositories import user_repository
from app.schemas.auth import (
    AuthUserSummary,
    LoginRequest,
    LoginResponse,
    SignupRequest,
    SignupResponse,
)


async def signup(provider: AuthProvider, payload: SignupRequest) -> SignupResponse:
    auth_result = await provider.signup(payload)
    try:
        async with transaction() as conn:
            user_row = await user_repository.create_event_reporter_application_user(
                conn,
                auth_subject=auth_result.user_id,
                email=auth_result.email or str(payload.email),
                display_name=payload.display_name,
            )
    except AppError as exc:
        if exc.code == "duplicate_record":
            raise AppError(
                "application_user_exists",
                "This authentication account is already registered in CAMPUS MEMORY.",
                status.HTTP_409_CONFLICT,
            ) from exc
        raise AppError(
            "application_registration_failed",
            "Supabase signup succeeded, but the CAMPUS MEMORY account could not be registered. Ask an administrator to complete application-user registration; do not retry signup blindly.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        ) from exc
    except Exception as exc:
        raise AppError(
            "application_registration_failed",
            "Supabase signup succeeded, but the CAMPUS MEMORY account could not be registered. Ask an administrator to complete application-user registration; do not retry signup blindly.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        ) from exc

    return SignupResponse(
        status="confirmation_required" if auth_result.email_confirmation_required else "created",
        message=(
            "Account created. Confirm your email before logging in."
            if auth_result.email_confirmation_required
            else "Account created with event_reporter access."
        ),
        user_id=user_row["user_id"],
        email_confirmation_required=auth_result.email_confirmation_required,
        access_token=auth_result.access_token,
        refresh_token=auth_result.refresh_token,
        token_type=auth_result.token_type if auth_result.access_token else None,
        expires_in=auth_result.expires_in,
        application_user=AuthUserSummary(
            user_id=user_row["user_id"],
            email=user_row["email"],
            display_name=user_row["display_name"],
            roles=["event_reporter"],
        ),
    )


async def login(provider: AuthProvider, payload: LoginRequest) -> LoginResponse:
    auth_result = await provider.login(payload)
    if not auth_result.access_token:
        raise AuthorizationError("A valid Supabase session is required.", code="session_unavailable")

    identity = await provider.verify_access_token(auth_result.access_token)
    from app.db.transactions import connection

    async with connection() as conn:
        user_row = await user_repository.get_user_by_auth_subject(conn, identity.subject)
        if user_row is None:
            raise AuthorizationError(
                "The authenticated subject is not mapped to an application user.",
                code="user_not_mapped",
            )
        if not user_row["is_active"]:
            raise AuthorizationError("This application user is inactive.", code="user_inactive")
        roles = await user_repository.list_active_roles(conn, user_row["user_id"])

    # Roles are loaded for the response payload but are no longer required for
    # login.  An active, registered application user may log in with no role
    # currently assigned.

    return LoginResponse(
        access_token=auth_result.access_token,
        refresh_token=auth_result.refresh_token,
        token_type=auth_result.token_type,
        expires_in=auth_result.expires_in,
        application_user=AuthUserSummary(
            user_id=user_row["user_id"],
            email=user_row["email"],
            display_name=user_row["display_name"],
            roles=roles,
        ),
    )
