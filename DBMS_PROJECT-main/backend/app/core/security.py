from __future__ import annotations

from abc import ABC, abstractmethod
from contextvars import ContextVar
from dataclasses import dataclass
from uuid import UUID

import httpx

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.errors.exceptions import AppError, AuthenticationError
from app.schemas.auth import LoginRequest, SignupRequest

logger = get_logger("campus_memory.auth")
_request_id: ContextVar[str | None] = ContextVar("auth_request_id", default=None)


def set_auth_request_id(request_id: str | None):
    return _request_id.set(request_id)


def reset_auth_request_id(token) -> None:
    _request_id.reset(token)


def get_auth_request_id() -> str | None:
    return _request_id.get()


@dataclass(frozen=True)
class VerifiedIdentity:
    subject: str
    email: str | None
    provider: str


@dataclass(frozen=True)
class SupabaseAuthResult:
    user_id: str
    email: str | None
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int | None = None
    email_confirmation_required: bool = False


class AuthProvider(ABC):
    """Server-side authentication provider. Implementations must fail closed."""

    @abstractmethod
    async def verify_access_token(self, token: str) -> VerifiedIdentity:
        raise NotImplementedError

    @abstractmethod
    async def signup(self, payload: SignupRequest) -> SupabaseAuthResult:
        raise NotImplementedError

    @abstractmethod
    async def login(self, payload: LoginRequest) -> SupabaseAuthResult:
        raise NotImplementedError

    @abstractmethod
    async def aclose(self) -> None:
        return None


class FailClosedAuthProvider(AuthProvider):
    def __init__(self, reason: str) -> None:
        self.reason = reason

    async def verify_access_token(self, token: str) -> VerifiedIdentity:
        raise AuthenticationError(self.reason, code="auth_not_configured")

    async def signup(self, payload: SignupRequest) -> SupabaseAuthResult:
        raise AuthenticationError(self.reason, code="auth_not_configured")

    async def login(self, payload: LoginRequest) -> SupabaseAuthResult:
        raise AuthenticationError(self.reason, code="auth_not_configured")

    async def aclose(self) -> None:
        return None


class SupabaseAuthProvider(AuthProvider):
    """Validate a Supabase Auth bearer token by asking Auth for the user."""

    def __init__(self, settings: Settings) -> None:
        assert settings.supabase_url
        assert settings.supabase_publishable_key
        self._base_url = settings.supabase_url.rstrip("/")
        self._publishable_key = settings.supabase_publishable_key
        self._timeout = settings.auth_timeout_seconds
        self._client = httpx.AsyncClient(timeout=self._timeout)

    async def verify_access_token(self, token: str) -> VerifiedIdentity:
        url = f"{self._base_url}/auth/v1/user"
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": self._publishable_key,
        }
        try:
            response = await self._client.get(url, headers=headers)
        except httpx.HTTPError:
            logger.warning("Supabase Auth verification request failed.")
            raise AuthenticationError("Authentication could not be verified.") from None

        if response.status_code in {401, 403}:
            raise AuthenticationError("Sign in is required or the session is invalid.")
        if response.status_code >= 500:
            logger.warning("Supabase Auth returned status %s", response.status_code)
            raise AuthenticationError("Authentication could not be verified.")
        if response.status_code != 200:
            raise AuthenticationError("Sign in is required or the session is invalid.")

        payload = response.json()
        subject = payload.get("id")
        if not subject:
            raise AuthenticationError("The access token did not contain a subject.")
        return VerifiedIdentity(
            subject=str(subject),
            email=payload.get("email"),
            provider="supabase",
        )

    async def signup(self, payload: SignupRequest) -> SupabaseAuthResult:
        response = await self._request(
            "POST",
            "/auth/v1/signup",
            json={"email": str(payload.email), "password": payload.password},
        )
        user = response.get("user") or response
        user_id = user.get("id")
        if not user_id:
            raise AuthenticationError("Supabase signup did not return a user identifier.", code="signup_failed")
        return SupabaseAuthResult(
            user_id=str(user_id),
            email=user.get("email") or str(payload.email),
            access_token=response.get("access_token"),
            refresh_token=response.get("refresh_token"),
            token_type=response.get("token_type", "bearer"),
            expires_in=response.get("expires_in"),
            email_confirmation_required=not bool(response.get("access_token")),
        )

    async def login(self, payload: LoginRequest) -> SupabaseAuthResult:
        response = await self._request(
            "POST",
            "/auth/v1/token?grant_type=password",
            json={"email": str(payload.email), "password": payload.password},
        )
        user = response.get("user") or {}
        user_id = user.get("id")
        if not user_id or not response.get("access_token"):
            raise AuthenticationError("Authentication did not return a valid session.")
        return SupabaseAuthResult(
            user_id=str(user_id),
            email=user.get("email"),
            access_token=response["access_token"],
            refresh_token=response.get("refresh_token"),
            token_type=response.get("token_type", "bearer"),
            expires_in=response.get("expires_in"),
        )

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        headers = kwargs.pop("headers", {})
        headers["apikey"] = self._publishable_key
        try:
            response = await self._client.request(
                method,
                f"{self._base_url}{path}",
                headers=headers,
                **kwargs,
            )
        except httpx.HTTPError:
            logger.warning("Supabase Auth request failed method=%s path=%s", method, path)
            raise AuthenticationError("Authentication service could not be reached.", code="auth_unavailable") from None
        error_code = self._safe_error_code(response)
        if response.status_code >= 300:
            logger.warning(
                "Supabase Auth rejected request path=%s status=%s error_code=%s request_id=%s",
                path,
                response.status_code,
                error_code,
                get_auth_request_id(),
            )
        details = {} if error_code == "unknown" else {"upstream_code": error_code}
        is_signup = path.startswith("/auth/v1/signup")
        if response.status_code == 400:
            if is_signup and error_code in {
                "user_already_exists",
                "email_exists",
            }:
                raise AppError(
                    "signup_email_exists",
                    "An account with this email already exists.",
                    409,
                )
            if is_signup:
                raise AppError(
                    "signup_invalid_request",
                    "Supabase rejected the signup request.",
                    400,
                    details=details,
                )
            raise AuthenticationError("The email or password is invalid, or email confirmation is required.")
        if response.status_code == 401:
            raise AppError(
                "auth_unauthorized",
                "Supabase authentication rejected the request.",
                401,
                details=details,
            )
        if response.status_code == 403:
            raise AppError(
                "auth_forbidden",
                "Supabase rejected the authentication request due to an access or configuration restriction.",
                403,
                details=details,
            )
        if response.status_code == 429:
            retry_after = self._safe_retry_after(response.headers.get("Retry-After"))
            raise AppError(
                "auth_rate_limited",
                "Supabase signup is temporarily rate-limited. Please wait before trying again.",
                429,
                details=details,
                headers={"Retry-After": retry_after} if retry_after else None,
            )
        if response.status_code >= 500:
            raise AppError(
                "auth_unavailable",
                "Supabase authentication service is temporarily unavailable.",
                502,
                details=details,
            )
        if response.status_code >= 300:
            raise AppError(
                "auth_request_failed",
                "The authentication request could not be completed.",
                502,
                details=details,
            )
        return response.json()

    @staticmethod
    def _safe_error_code(response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return "unknown"
        if not isinstance(payload, dict):
            return "unknown"
        candidate = payload.get("error_code") or payload.get("code")
        if not isinstance(candidate, str) or not candidate:
            return "unknown"
        return candidate[:100]

    @staticmethod
    def _safe_retry_after(value: str | None) -> str | None:
        if value is None or not value.isdigit():
            return None
        seconds = min(int(value), 86400)
        return str(seconds)

    async def aclose(self) -> None:
        await self._client.aclose()


def build_auth_provider(settings: Settings | None = None) -> AuthProvider:
    settings = settings or get_settings()
    provider = (settings.auth_provider or "").strip().lower()
    if provider != "supabase":
        return FailClosedAuthProvider(
            "Authentication is not configured. Protected endpoints are unavailable."
        )
    if not settings.supabase_url or not settings.supabase_publishable_key:
        return FailClosedAuthProvider(
            "Supabase Auth is selected but SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing."
        )
    return SupabaseAuthProvider(settings)


@dataclass(frozen=True)
class CurrentUser:
    user_id: UUID
    auth_subject: str
    email: str
    display_name: str
    roles: frozenset[str]
    is_active: bool

    @property
    def is_administrator(self) -> bool:
        return "administrator" in self.roles
