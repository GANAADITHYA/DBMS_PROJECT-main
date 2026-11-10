from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import APIModel, ReasonBody, RelationshipDowngradeStatus


class RelationshipCreate(APIModel):
    cause_event_id: UUID
    effect_event_id: UUID
    confidence_score: Decimal = Field(ge=0, le=1)
    explanation: str = Field(min_length=1)
    temporal_override_reason: str | None = None
    data_class_code: str = Field(min_length=1, max_length=20)

    @field_validator("explanation", "data_class_code")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty.")
        return cleaned

    @field_validator("temporal_override_reason")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class RelationshipConfirmRequest(APIModel):
    reason: str = Field(min_length=1, max_length=2000)

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("A non-empty confirmation reason is required.")
        return cleaned


class RelationshipDowngradeRequest(ReasonBody):
    status_code: RelationshipDowngradeStatus


class RelationshipRead(APIModel):
    relationship_id: UUID
    cause_event_id: UUID
    cause_event_code: str | None = None
    cause_title: str | None = None
    effect_event_id: UUID
    effect_event_code: str | None = None
    effect_title: str | None = None
    relationship_status_code: str
    confidence_score: Decimal
    explanation: str
    temporal_override_reason: str | None = None
    data_class_code: str
    created_by: UUID
    created_at: datetime
    last_modified_by: UUID
    updated_at: datetime
    evidence_count: int | None = None


class RelationshipHistoryItem(APIModel):
    history_id: UUID
    relationship_id: UUID
    change_kind: str
    old_status_code: str | None
    new_status_code: str | None
    old_confidence: Decimal | None
    new_confidence: Decimal | None
    changed_at: datetime
    changed_by: UUID
    reason: str
