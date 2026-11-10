from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.common import APIModel


class SignupRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=120)
    role_code: Literal["event_reporter"]


class LoginRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthUserSummary(APIModel):
    user_id: UUID
    email: str
    display_name: str
    roles: list[str]


class SignupResponse(APIModel):
    status: str
    message: str
    user_id: UUID
    email_confirmation_required: bool
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    expires_in: int | None = None
    application_user: AuthUserSummary


class LoginResponse(APIModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str
    expires_in: int | None = None
    application_user: AuthUserSummary
