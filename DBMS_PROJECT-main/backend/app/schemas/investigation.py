from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.common import APIModel, LinkMode
from app.schemas.impact import ImpactAggregateItem


class TraversalNode(APIModel):
    event_id: UUID
    event_code: str
    title: str
    minimum_depth: int
    path_event_ids: list[UUID]


class InvestigationResult(APIModel):
    start_event_id: UUID
    link_mode: LinkMode
    uniqueness_note: str
    nodes: list[TraversalNode]


class BlastRadiusResult(InvestigationResult):
    impacts: list[ImpactAggregateItem]
    impact_grouping_note: str


class AsOfQuery(APIModel):
    at: datetime
    status_code: str | None = None
    category_code: str | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @field_validator("at")
    @classmethod
    def timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("The as-of timestamp must include a timezone offset.")
        return value
