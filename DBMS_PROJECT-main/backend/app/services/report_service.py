from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.db.transactions import connection
from app.repositories import evidence_repository, event_repository, report_repository, relationship_repository
from app.schemas.event import EventDetail
from app.schemas.evidence import EvidenceRead
from app.schemas.report import (
    DashboardSummary,
    EventInvestigationReport,
    EventSummaryGroup,
    EventSummaryReport,
    NamedCount,
    RecurrenceItem,
    RecurrenceReport,
)
from app.services import investigation_service

INVESTIGATION_LIMITATION = (
    "Status history is reconstructed from event_status_history. "
    "Title, description, severity and location are current values, not historical snapshots."
)


async def dashboard_summary() -> DashboardSummary:
    async with connection() as conn:
        by_category = await report_repository.open_event_counts_by_category(conn)
        by_severity = await report_repository.open_event_counts_by_severity(conn)
        recent = await report_repository.recent_open_events(conn)
    open_count = sum(int(row["event_count"]) for row in by_category)
    return DashboardSummary(
        open_event_count=open_count,
        open_by_category=[
            NamedCount(code=row["code"], display_name=row["display_name"], event_count=row["event_count"])
            for row in by_category
        ],
        open_by_severity=[
            NamedCount(code=row["code"], display_name=row["display_name"], event_count=row["event_count"])
            for row in by_severity
        ],
        recent_open_events=recent,
    )


async def recurrence(
    started_after: datetime,
    started_before: datetime,
    category_code: str | None,
) -> RecurrenceReport:
    async with connection() as conn:
        locations = await report_repository.recurrence_by_location(
            conn, started_after, started_before, category_code
        )
        assets = await report_repository.recurrence_by_asset(
            conn, started_after, started_before, category_code
        )
    return RecurrenceReport(
        started_after=started_after,
        started_before=started_before,
        locations=[
            RecurrenceItem(object_kind="location", **{k: row[k] for k in ("object_id", "object_code", "object_name", "event_count")})
            for row in locations
        ],
        assets=[
            RecurrenceItem(object_kind="asset", **{k: row[k] for k in ("object_id", "object_code", "object_name", "event_count")})
            for row in assets
        ],
        note="Counts are event occurrences, not summed impact quantities of mixed units.",
    )


async def event_summary_report(started_after: datetime, started_before: datetime) -> EventSummaryReport:
    async with connection() as conn:
        groups = await report_repository.event_summary_groups(conn, started_after, started_before)
    items = [EventSummaryGroup.model_validate(row) for row in groups]
    return EventSummaryReport(
        started_after=started_after,
        started_before=started_before,
        groups=items,
        total_events=sum(item.event_count for item in items),
    )


async def event_investigation_report(event_id: UUID) -> EventInvestigationReport:
    async with connection() as conn:
        event = EventDetail.model_validate(await event_repository.get_event(conn, event_id))
        relationships = await relationship_repository.list_event_relationships(conn, event_id)
        evidence_rows: list[dict] = []
        for rel in relationships:
            evidence_rows.extend(
                await evidence_repository.list_relationship_evidence(conn, rel["relationship_id"])
            )
        impact_totals = await report_repository.event_impact_view_rows(conn, event_id)
    root_causes = await investigation_service.root_causes(event_id, "confirmed_only")
    blast = await investigation_service.blast_radius(event_id, "confirmed_only")
    return EventInvestigationReport(
        event=event,
        reconstruction_limitation=INVESTIGATION_LIMITATION,
        root_causes=root_causes,
        blast_radius=blast,
        evidence=[EvidenceRead.model_validate(row) for row in evidence_rows],
        raw_impact_totals_by_type_unit=impact_totals,
    )


LOOKUP_QUERIES = {
    "event_categories": "SELECT category_code AS code, display_name, description, is_active FROM public.event_category ORDER BY sort_order, category_code",
    "event_types": "SELECT event_type_id, category_code, type_code, display_name, description, is_active FROM public.event_type ORDER BY category_code, sort_order",
    "event_statuses": "SELECT status_code AS code, display_name, description, is_terminal, is_active FROM public.event_status ORDER BY sort_order",
    "status_transitions": "SELECT from_status_code, to_status_code, requires_reason, is_active, description FROM public.event_status_transition ORDER BY from_status_code, to_status_code",
    "severity_levels": "SELECT severity_code AS code, display_name, severity_rank, description, is_active FROM public.severity_level ORDER BY severity_rank",
    "relationship_statuses": "SELECT relationship_status_code AS code, display_name, description, is_traversable, is_active FROM public.relationship_status ORDER BY sort_order",
    "evidence_types": "SELECT evidence_type_code AS code, display_name, description, requires_reference, is_active FROM public.evidence_type ORDER BY evidence_type_code",
    "impact_types": "SELECT impact_type_code AS code, display_name, description, default_unit_code, is_active FROM public.impact_type ORDER BY impact_type_code",
    "measurement_units": "SELECT unit_code AS code, display_name, symbol, dimension_code, decimal_places, is_active FROM public.measurement_unit ORDER BY unit_code",
    "data_classes": "SELECT data_class_code AS code, display_name, description, is_active FROM public.data_class ORDER BY data_class_code",
    "departments": "SELECT department_id, department_code, name, is_active FROM public.department ORDER BY name",
    "locations": "SELECT location_id, location_code, name, location_type, parent_location_id, map_number, floor_number, department_id, is_active FROM public.campus_location ORDER BY map_number NULLS LAST, name",
    "assets": "SELECT asset_id, asset_code, name, asset_type, location_id, asset_status FROM public.campus_asset ORDER BY name",
    "services": "SELECT service_id, service_code, name, service_type, service_status FROM public.campus_service ORDER BY name",
    "scheduled_activities": "SELECT scheduled_activity_id, activity_code, title, course_code, starts_at, ends_at, activity_status FROM public.scheduled_activity ORDER BY starts_at DESC",
}


async def lookup(name: str) -> list[dict]:
    sql = LOOKUP_QUERIES[name]
    async with connection() as conn:
        return await report_repository.list_lookup(conn, sql)
