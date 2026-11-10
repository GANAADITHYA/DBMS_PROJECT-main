from __future__ import annotations

import httpx
import pytest
from unittest.mock import patch

from app.core.config import Settings
from app.core.security import SupabaseAuthProvider
from app.errors.exceptions import AppError, AuthenticationError
from app.schemas.auth import LoginRequest, SignupRequest


@pytest.fixture
def provider():
    settings = Settings(
        supabase_url="https://example.supabase.co",
        supabase_publishable_key="publishable-test-key",
        auth_provider="supabase",
    )
    auth_provider = SupabaseAuthProvider(settings)
    yield auth_provider


@pytest.mark.asyncio
async def test_signup_uses_supabase_signup_endpoint(provider):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/auth/v1/signup"
        assert request.headers["apikey"] == "publishable-test-key"
        return httpx.Response(
            200,
            json={"user": {"id": "supabase-user-id", "email": "tester@example.com"}},
        )

    await provider._client.aclose()
    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    result = await provider.signup(
        SignupRequest(email="tester@example.com", password="StrongPassword123!", display_name="Test User", role_code="event_reporter")
    )
    await provider.aclose()
    assert result.user_id == "supabase-user-id"
    assert result.email_confirmation_required is True


@pytest.mark.asyncio
async def test_login_maps_supabase_session(provider):
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/auth/v1/token"
        assert request.url.params["grant_type"] == "password"
        return httpx.Response(
            200,
            json={
                "access_token": "access-token",
                "refresh_token": "refresh-token",
                "token_type": "bearer",
                "expires_in": 3600,
                "user": {"id": "supabase-user-id", "email": "tester@example.com"},
            },
        )

    await provider._client.aclose()
    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    result = await provider.login(
        LoginRequest(email="tester@example.com", password="StrongPassword123!")
    )
    await provider.aclose()
    assert result.access_token == "access-token"
    assert result.refresh_token == "refresh-token"
    assert result.expires_in == 3600


@pytest.mark.asyncio
async def test_signup_with_session_does_not_require_confirmation(provider):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "access_token": "access-token",
                "refresh_token": "refresh-token",
                "expires_in": 3600,
                "user": {"id": "supabase-user-id", "email": "tester@example.com"},
            },
        )

    await provider._client.aclose()
    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    result = await provider.signup(
        SignupRequest(
            email="tester@example.com",
            password="StrongPassword123!",
            display_name="Test User",
            role_code="event_reporter",
        )
    )
    await provider.aclose()
    assert result.email_confirmation_required is False
    assert result.access_token == "access-token"


@pytest.mark.asyncio
async def test_login_invalid_credentials_is_authentication_error(provider):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error_code": "invalid_credentials"})

    await provider._client.aclose()
    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(AuthenticationError):
        await provider.login(
            LoginRequest(email="tester@example.com", password="wrong-password")
        )
    await provider.aclose()


@pytest.mark.asyncio
async def test_signup_duplicate_email_is_conflict(provider):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error_code": "user_already_exists"})

    await provider._client.aclose()
    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(AppError) as error:
        await provider.signup(
            SignupRequest(email="tester@example.com", password="StrongPassword123!", display_name="Test User", role_code="event_reporter")
        )
    await provider.aclose()
    assert error.value.code == "signup_email_exists"
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_non_success_logs_only_safe_diagnostics(provider, caplog):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json={"error_code": "weak_password", "message": "secret body"})

    await provider._client.aclose()
    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with patch("app.core.security.get_auth_request_id", return_value="request-123"):
        with pytest.raises(AppError) as error:
            await provider.signup(
                SignupRequest(
                    email="tester@example.com",
                    password="StrongPassword123!",
                    display_name="Test User",
                    role_code="event_reporter",
                )
            )
    await provider.aclose()
    messages = [record.getMessage() for record in caplog.records if record.name == "campus_memory.auth"]
    assert any("path=/auth/v1/signup" in message for message in messages)
    assert any("status=422" in message for message in messages)
    assert any("error_code=weak_password" in message for message in messages)
    assert any("request_id=request-123" in message for message in messages)
    assert all("secret body" not in message for message in messages)
    assert error.value.status_code == 502


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status_code", "error_code", "expected_status", "expected_code"),
    [
        (400, "invalid_signup", 400, "signup_invalid_request"),
        (401, "invalid_token", 401, "auth_unauthorized"),
        (429, "over_rate_limit", 429, "auth_rate_limited"),
        (503, "service_unavailable", 502, "auth_unavailable"),
    ],
)
async def test_signup_upstream_status_mapping(
    provider,
    status_code,
    error_code,
    expected_status,
    expected_code,
):
    def handler(request: httpx.Request) -> httpx.Response:
        headers = {"Retry-After": "42"} if status_code == 429 else {}
        return httpx.Response(status_code, headers=headers, json={"error_code": error_code})

    await provider._client.aclose()
    provider._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with pytest.raises(AppError) as error:
        await provider.signup(
            SignupRequest(
                email="tester@example.com",
                password="StrongPassword123!",
                display_name="Test User",
                role_code="event_reporter",
            )
        )
    await provider.aclose()
    assert error.value.status_code == expected_status
    assert error.value.code == expected_code
    assert error.value.details["upstream_code"] == error_code
    if status_code == 429:
        assert error.value.headers == {"Retry-After": "42"}
