from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.schemas.common import APIModel, VerificationStatus


class ImpactCreate(APIModel):
    impact_type_code: str = Field(min_length=1, max_length=40)
    affected_location_id: UUID | None = None
    affected_asset_id: UUID | None = None
    affected_service_id: UUID | None = None
    affected_activity_id: UUID | None = None
    affected_department_id: UUID | None = None
    affected_object_description: str | None = None
    quantity: Decimal = Field(ge=0)
    unit_code: str = Field(min_length=1, max_length=20)
    verification_status: VerificationStatus
    estimate_basis: str | None = None
    data_class_code: str = Field(min_length=1, max_length=20)

    @field_validator("impact_type_code", "unit_code", "data_class_code")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty.")
        return cleaned

    @model_validator(mode="after")
    def check_impact_shape(self) -> "ImpactCreate":
        structured = [
            self.affected_location_id,
            self.affected_asset_id,
            self.affected_service_id,
            self.affected_activity_id,
            self.affected_department_id,
        ]
        structured_count = sum(1 for item in structured if item is not None)
        if structured_count > 1:
            raise ValueError("At most one structured affected-object reference may be provided.")
        description = (self.affected_object_description or "").strip()
        if structured_count == 0 and not description:
            raise ValueError("Provide one affected object or a non-empty object description.")
        if self.verification_status == "estimated" and not (self.estimate_basis or "").strip():
            raise ValueError("estimate_basis is required when verification_status is estimated.")
        return self


class ImpactUpdate(APIModel):
    quantity: Decimal | None = Field(default=None, ge=0)
    unit_code: str | None = Field(default=None, min_length=1, max_length=20)
    verification_status: VerificationStatus | None = None
    estimate_basis: str | None = None
    affected_object_description: str | None = None


class ImpactRead(APIModel):
    impact_id: UUID
    event_id: UUID
    impact_type_code: str
    impact_type_name: str | None = None
    affected_location_id: UUID | None
    affected_asset_id: UUID | None
    affected_service_id: UUID | None
    affected_activity_id: UUID | None
    affected_department_id: UUID | None
    affected_object_description: str | None
    quantity: Decimal
    unit_code: str
    unit_name: str | None = None
    verification_status: str
    estimate_basis: str | None
    recorded_by: UUID
    recorded_at: datetime
    data_class_code: str


class ImpactAggregateItem(APIModel):
    affected_object_key: str
    impact_type_code: str
    impact_type_name: str
    unit_code: str
    unit_name: str
    verification_status: str
    headline_quantity: Decimal
    impact_record_count: int
    impact_ids: list[UUID]
    possible_duplicate_impact_ids: list[UUID]
    aggregation_note: str
