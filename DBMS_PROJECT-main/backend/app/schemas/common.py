from __future__ import annotations

from datetime import datetime
from typing import Generic, Literal, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

T = TypeVar("T")

LinkMode = Literal["confirmed_only", "include_suspected"]
VerificationStatus = Literal["verified", "estimated"]
RelationshipDowngradeStatus = Literal["suspected", "rejected_unrelated"]


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class PaginationParams(APIModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class Page(APIModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int


class ReasonBody(APIModel):
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("A non-empty reason is required.")
        return cleaned


class ActorSummary(APIModel):
    user_id: UUID
    display_name: str | None = None


class HealthResponse(APIModel):
    status: str
    service: str
    environment: str
    auth_configured: bool
    database_configured: bool
    request_id: str | None = None


class DatabaseHealthResponse(APIModel):
    status: str
    code: str
    message: str
    configured: bool
    db_user: str | None = None
    server_version: str | None = None


class LookupItem(APIModel):
    code: str
    display_name: str
    description: str | None = None
    is_active: bool | None = None


class TimestampRange(APIModel):
    started_after: datetime | None = None
    started_before: datetime | None = None

    @field_validator("started_after", "started_before")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("Timestamps must include a timezone offset.")
        return value
