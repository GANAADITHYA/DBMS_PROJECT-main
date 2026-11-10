from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from app.api.deps import get_auth_provider
from app.core.security import AuthProvider, SupabaseAuthResult
from app.errors.exceptions import AppError, AuthenticationError, AuthorizationError
from app.main import app
from app.schemas.auth import AuthUserSummary, LoginResponse, SignupResponse
from app.services import auth_service


class FakeAuthProvider(AuthProvider):
    async def verify_access_token(self, token: str):
        raise NotImplementedError

    async def signup(self, payload):
        raise NotImplementedError

    async def login(self, payload):
        raise NotImplementedError

    async def aclose(self):
        return None


@pytest.fixture
def auth_provider():
    provider = FakeAuthProvider()
    app.dependency_overrides[get_auth_provider] = lambda: provider
    yield provider
    app.dependency_overrides.clear()


def user_summary(roles: list[str]) -> AuthUserSummary:
    return AuthUserSummary(
        user_id=UUID("00000000-0000-4000-8000-000000000010"),
        email="tester@example.com",
        display_name="Test User",
        roles=roles,
    )


def test_signup_success_creates_unassigned_application_user(auth_provider, client, monkeypatch):
    result = SignupResponse(
        status="confirmation_required",
        message="Account created. Confirm your email before logging in.",
        user_id=user_summary([]).user_id,
        email_confirmation_required=True,
        application_user=user_summary(["event_reporter"]),
    )
    signup = AsyncMock(return_value=result)
    monkeypatch.setattr(auth_service, "signup", signup)

    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "tester@example.com", "password": "StrongPassword123!", "display_name": "Test User", "role_code": "event_reporter"},
    )

    assert response.status_code == 201
    assert response.json()["email_confirmation_required"] is True
    assert response.json()["application_user"]["roles"] == ["event_reporter"]
    signup.assert_awaited_once()


def test_signup_rejects_role_assignment(auth_provider, client, monkeypatch):
    signup = AsyncMock()
    monkeypatch.setattr(auth_service, "signup", signup)
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "tester@example.com",
            "password": "StrongPassword123!",
            "display_name": "Test User",
            "role_code": "administrator",
        },
    )
    assert response.status_code == 422
    signup.assert_not_awaited()


def test_signup_duplicate_application_user(auth_provider, client, monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "signup",
        AsyncMock(side_effect=AppError("application_user_exists", "Already registered.", 409)),
    )
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "tester@example.com", "password": "StrongPassword123!", "display_name": "Test User", "role_code": "event_reporter"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "application_user_exists"


def test_signup_confirmation_required(auth_provider, client, monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "signup",
        AsyncMock(return_value=SignupResponse(
            status="confirmation_required",
            message="Confirm your email.",
            user_id=user_summary([]).user_id,
            email_confirmation_required=True,
            application_user=user_summary([]),
        )),
    )
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "tester@example.com", "password": "StrongPassword123!", "display_name": "Test User", "role_code": "event_reporter"},
    )
    assert response.status_code == 201
    assert response.json()["status"] == "confirmation_required"


def test_signup_recovery_error_is_safe(auth_provider, client, monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "signup",
        AsyncMock(side_effect=AppError(
            "application_registration_failed",
            "Supabase signup succeeded, but the CAMPUS MEMORY account could not be registered.",
            503,
        )),
    )
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "tester@example.com", "password": "StrongPassword123!", "display_name": "Test User", "role_code": "event_reporter"},
    )
    assert response.status_code == 503
    assert "password" not in str(response.json()).lower()


def test_rate_limit_retry_after_is_returned(auth_provider, client, monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "signup",
        AsyncMock(side_effect=AppError(
            "auth_rate_limited",
            "Signup is temporarily rate-limited.",
            429,
            headers={"Retry-After": "42"},
        )),
    )
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "tester@example.com",
            "password": "StrongPassword123!",
            "display_name": "Test User",
            "role_code": "event_reporter",
        },
    )
    assert response.status_code == 429
    assert response.headers["Retry-After"] == "42"


def test_login_success_with_reporter_role(auth_provider, client, monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "login",
        AsyncMock(return_value=LoginResponse(
            access_token="test-access-token",
            refresh_token="test-refresh-token",
            token_type="bearer",
            expires_in=3600,
            application_user=user_summary(["event_reporter"]),
        )),
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "tester@example.com", "password": "StrongPassword123!"},
    )
    assert response.status_code == 200
    assert response.json()["application_user"]["roles"] == ["event_reporter"]


def test_login_succeeds_when_user_has_no_assigned_role(auth_provider, client, monkeypatch):
    """Login must succeed for an active user with no current role assignment."""
    monkeypatch.setattr(
        auth_service,
        "login",
        AsyncMock(return_value=LoginResponse(
            access_token="test-access-token",
            refresh_token="test-refresh-token",
            token_type="bearer",
            expires_in=3600,
            application_user=user_summary([]),
        )),
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "tester@example.com", "password": "StrongPassword123!"},
    )
    assert response.status_code == 200
    assert response.json()["application_user"]["roles"] == []


@pytest.mark.parametrize(
    ("error", "status_code"),
    [
        (AuthenticationError("Invalid credentials."), 401),
        (AuthorizationError("Not mapped.", code="user_not_mapped"), 403),
        (AuthorizationError("Inactive.", code="user_inactive"), 403),
    ],
)
def test_login_rejects_unauthorized_application_states(auth_provider, client, monkeypatch, error, status_code):
    monkeypatch.setattr(auth_service, "login", AsyncMock(side_effect=error))
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "tester@example.com", "password": "StrongPassword123!"},
    )
    assert response.status_code == status_code


def test_existing_permission_protected_route_still_requires_auth(client):
    response = client.get("/api/v1/events")
    assert response.status_code == 401
