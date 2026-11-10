from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import field_validator

from app.schemas.common import APIModel
from app.schemas.event import EventDetail
from app.schemas.evidence import EvidenceRead
from app.schemas.investigation import BlastRadiusResult, InvestigationResult


class NamedCount(APIModel):
    code: str
    display_name: str
    event_count: int


class DashboardSummary(APIModel):
    open_event_count: int
    open_by_category: list[NamedCount]
    open_by_severity: list[NamedCount]
    recent_open_events: list[dict]


class RecurrenceQuery(APIModel):
    started_after: datetime
    started_before: datetime
    category_code: str | None = None

    @field_validator("started_after", "started_before")
    @classmethod
    def timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("Timestamps must include a timezone offset.")
        return value


class RecurrenceItem(APIModel):
    object_kind: str
    object_id: UUID
    object_code: str
    object_name: str
    event_count: int


class RecurrenceReport(APIModel):
    started_after: datetime
    started_before: datetime
    locations: list[RecurrenceItem]
    assets: list[RecurrenceItem]
    note: str


class EventSummaryGroup(APIModel):
    category_code: str
    category_name: str
    status_code: str
    status_name: str
    event_count: int


class EventSummaryReport(APIModel):
    started_after: datetime
    started_before: datetime
    groups: list[EventSummaryGroup]
    total_events: int


class EventInvestigationReport(APIModel):
    event: EventDetail
    reconstruction_limitation: str
    root_causes: InvestigationResult
    blast_radius: BlastRadiusResult
    evidence: list[EvidenceRead]
    raw_impact_totals_by_type_unit: list[dict]


class DateRangeQuery(APIModel):
    started_after: datetime
    started_before: datetime

    @field_validator("started_after", "started_before")
    @classmethod
    def timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("Timestamps must include a timezone offset.")
        return value
