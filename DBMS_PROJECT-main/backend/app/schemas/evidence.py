from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import APIModel


class EvidenceCreate(APIModel):
    evidence_type_code: str = Field(min_length=1, max_length=40)
    description: str = Field(min_length=1)
    source_reference: str | None = None
    source_url: str | None = None
    data_class_code: str = Field(min_length=1, max_length=20)

    @field_validator("evidence_type_code", "description", "data_class_code")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty.")
        return cleaned

    @field_validator("source_reference", "source_url")
    @classmethod
    def strip_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class EvidenceRead(APIModel):
    evidence_id: UUID
    relationship_id: UUID
    evidence_type_code: str
    description: str
    source_reference: str | None
    source_url: str | None
    recorded_by: UUID
    recorded_at: datetime
    data_class_code: str
