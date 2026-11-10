from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.common import APIModel, ReasonBody


def _require_tz(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        raise ValueError("Timestamps must include a timezone offset.")
    return value


class EventCreate(APIModel):
    event_code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category_code: str = Field(min_length=1, max_length=40)
    event_type_id: UUID
    severity_code: str = Field(min_length=1, max_length=30)
    location_id: UUID | None = None
    asset_id: UUID | None = None
    service_id: UUID | None = None
    scheduled_activity_id: UUID | None = None
    started_at: datetime
    data_class_code: str = Field(min_length=1, max_length=20)

    @field_validator("event_code", "title", "description", "category_code", "severity_code", "data_class_code")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty.")
        return cleaned

    @field_validator("started_at")
    @classmethod
    def timezone_aware(cls, value: datetime) -> datetime:
        result = _require_tz(value)
        assert result is not None
        return result

    @model_validator(mode="after")
    def require_context(self) -> "EventCreate":
        if not any(
            [self.location_id, self.asset_id, self.service_id, self.scheduled_activity_id]
        ):
            raise ValueError("At least one location, asset, service or scheduled activity is required.")
        return self


class EventUpdate(APIModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1)
    category_code: str | None = Field(default=None, min_length=1, max_length=40)
    event_type_id: UUID | None = None
    severity_code: str | None = Field(default=None, min_length=1, max_length=30)
    location_id: UUID | None = None
    asset_id: UUID | None = None
    service_id: UUID | None = None
    scheduled_activity_id: UUID | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    source_note: str | None = None

    @field_validator("started_at", "ended_at")
    @classmethod
    def timezone_aware(cls, value: datetime | None) -> datetime | None:
        return _require_tz(value)


class EventStatusChange(ReasonBody):
    status_code: str = Field(min_length=1, max_length=30)

    @field_validator("status_code")
    @classmethod
    def reject_procedure_statuses(cls, value: str) -> str:
        cleaned = value.strip()
        if cleaned in {"closed", "void"}:
            raise ValueError("Use the close or void endpoints for terminal status changes.")
        return cleaned


class EventCloseRequest(ReasonBody):
    pass


class EventVoidRequest(ReasonBody):
    pass


class EventListQuery(APIModel):
    category_code: str | None = None
    event_type_id: UUID | None = None
    status_code: str | None = None
    severity_code: str | None = None
    location_id: UUID | None = None
    asset_id: UUID | None = None
    service_id: UUID | None = None
    started_after: datetime | None = None
    started_before: datetime | None = None
    keyword: str | None = Field(default=None, max_length=200)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @field_validator("started_after", "started_before")
    @classmethod
    def timezone_aware(cls, value: datetime | None) -> datetime | None:
        return _require_tz(value)


class EventSummary(APIModel):
    event_id: UUID
    event_code: str
    title: str
    category_code: str
    category_name: str | None = None
    event_type_id: UUID
    event_type_name: str | None = None
    severity_code: str
    severity_name: str | None = None
    status_code: str
    status_name: str | None = None
    is_terminal: bool | None = None
    location_id: UUID | None = None
    location_name: str | None = None
    asset_id: UUID | None = None
    asset_name: str | None = None
    service_id: UUID | None = None
    service_name: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    created_by: UUID
    created_at: datetime


class EventDetail(EventSummary):
    description: str
    scheduled_activity_id: UUID | None = None
    scheduled_activity_title: str | None = None
    data_class_code: str
    source_note: str | None = None
    last_modified_by: UUID
    updated_at: datetime


class EventStatusHistoryItem(APIModel):
    history_id: UUID
    event_id: UUID
    old_status_code: str | None
    new_status_code: str
    changed_at: datetime
    changed_by: UUID
    reason: str
    is_initial: bool


class EventAsOfItem(APIModel):
    event_id: UUID
    event_code: str
    title: str
    status_as_recorded: str
    status_recorded_at: datetime
    history_reason: str
    reconstruction_note: str
