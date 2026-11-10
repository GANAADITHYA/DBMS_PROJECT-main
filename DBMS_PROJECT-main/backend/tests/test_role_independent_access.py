from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from app.api.deps import get_current_user
from app.main import app
from app.schemas.common import Page
from app.schemas.event import EventDetail, EventSummary
from app.schemas.evidence import EvidenceRead
from app.schemas.impact import ImpactRead
from app.schemas.investigation import BlastRadiusResult, InvestigationResult
from app.schemas.relationship import RelationshipRead
from app.schemas.report import EventInvestigationReport, EventSummaryGroup, EventSummaryReport
from app.services import (
    event_service,
    evidence_service,
    impact_service,
    investigation_service,
    relationship_service,
    report_service,
)
from tests.conftest import make_user, sample_event_payload
from tests.test_events import _event_detail


def _sample_relationship() -> RelationshipRead:
    now = datetime(2026, 10, 28, 9, 0, tzinfo=timezone.utc)
    return RelationshipRead.model_validate({
        "relationship_id": uuid4(),
        "cause_event_id": uuid4(),
        "cause_event_code": "SYN-CAUSE-001",
        "cause_title": "Cause Event",
        "effect_event_id": uuid4(),
        "effect_event_code": "SYN-EFFECT-001",
        "effect_title": "Effect Event",
        "relationship_status_code": "suspected",
        "confidence_score": Decimal("0.8500"),
        "explanation": "Test relationship explanation.",
        "temporal_override_reason": None,
        "data_class_code": "synthetic",
        "created_by": uuid4(),
        "created_at": now,
        "last_modified_by": uuid4(),
        "updated_at": now,
        "evidence_count": 0,
    })


def _sample_impact() -> ImpactRead:
    now = datetime(2026, 10, 28, 9, 0, tzinfo=timezone.utc)
    return ImpactRead.model_validate({
        "impact_id": uuid4(),
        "event_id": uuid4(),
        "impact_type_code": "students_affected",
        "impact_type_name": "Students Affected",
        "affected_location_id": None,
        "affected_asset_id": None,
        "affected_service_id": None,
        "affected_activity_id": None,
        "affected_department_id": None,
        "affected_object_description": "Computer Lab 101 attendees",
        "quantity": Decimal("25"),
        "unit_code": "person",
        "unit_name": "Person",
        "verification_status": "estimated",
        "estimate_basis": "Initial headcount",
        "data_class_code": "synthetic",
        "recorded_by": uuid4(),
        "recorded_at": now,
    })


TEST_ROLES = [
    {"administrator"},
    {"event_reporter"},
    {"event_investigator"},
    {"decision_maker"},
    set(),  # Active application user without any assigned role
]


@pytest.mark.parametrize("roles", TEST_ROLES, ids=["admin", "reporter", "investigator", "decision_maker", "no_role"])
def test_relationships_endpoints_role_independent(client, monkeypatch, roles):
    """Verify that any active user can create, confirm, downgrade relationships and add evidence."""
    rel = _sample_relationship()
    evidence = EvidenceRead(
        evidence_id=uuid4(),
        relationship_id=rel.relationship_id,
        evidence_type_code="witness_note",
        description="Eyewitness statement",
        source_reference=None,
        source_url=None,
        recorded_by=uuid4(),
        recorded_at=datetime.now(timezone.utc),
        data_class_code="synthetic",
    )
    monkeypatch.setattr(relationship_service, "create_relationship", AsyncMock(return_value=rel))
    monkeypatch.setattr(relationship_service, "confirm_relationship", AsyncMock(return_value=rel))
    monkeypatch.setattr(relationship_service, "downgrade_relationship", AsyncMock(return_value=rel))
    monkeypatch.setattr(evidence_service, "add_evidence", AsyncMock(return_value=evidence))

    app.dependency_overrides[get_current_user] = lambda: make_user(roles=roles)
    try:
        # Create relationship
        r = client.post("/api/v1/relationships", json={
            "cause_event_id": str(rel.cause_event_id),
            "effect_event_id": str(rel.effect_event_id),
            "confidence_score": "0.8500",
            "explanation": "Test relationship explanation.",
            "data_class_code": "synthetic",
        })
        assert r.status_code == 201

        # Confirm relationship
        r = client.post(f"/api/v1/relationships/{rel.relationship_id}/confirm", json={"reason": "Confirmed by review."})
        assert r.status_code == 200

        # Downgrade relationship
        r = client.post(f"/api/v1/relationships/{rel.relationship_id}/downgrade", json={
            "status_code": "suspected",
            "reason": "Downgraded due to new findings.",
        })
        assert r.status_code == 200

        # Add evidence
        r = client.post(f"/api/v1/relationships/{rel.relationship_id}/evidence", json={
            "evidence_type_code": "witness_note",
            "description": "Eyewitness statement",
            "data_class_code": "synthetic",
        })
        assert r.status_code == 201
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("roles", TEST_ROLES, ids=["admin", "reporter", "investigator", "decision_maker", "no_role"])
def test_impacts_endpoints_role_independent(client, monkeypatch, roles):
    """Verify that any active user can create, list, and update impacts."""
    impact = _sample_impact()
    event_id = uuid4()
    monkeypatch.setattr(impact_service, "add_impact", AsyncMock(return_value=impact))
    monkeypatch.setattr(impact_service, "list_impacts", AsyncMock(return_value=[impact]))
    monkeypatch.setattr(impact_service, "update_impact", AsyncMock(return_value=impact))

    app.dependency_overrides[get_current_user] = lambda: make_user(roles=roles)
    try:
        # Add impact
        r = client.post(f"/api/v1/events/{event_id}/impacts", json={
            "impact_type_code": "students_affected",
            "affected_object_description": "Computer Lab 101 attendees",
            "quantity": "25",
            "unit_code": "person",
            "verification_status": "estimated",
            "estimate_basis": "Initial headcount",
            "data_class_code": "synthetic",
        })
        assert r.status_code == 201

        # List impacts
        r = client.get(f"/api/v1/events/{event_id}/impacts")
        assert r.status_code == 200

        # Update impact
        r = client.patch(f"/api/v1/impacts/{impact.impact_id}", json={
            "quantity": "30",
        })
        assert r.status_code == 200
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("roles", TEST_ROLES, ids=["admin", "reporter", "investigator", "decision_maker", "no_role"])
def test_investigations_and_reports_role_independent(client, monkeypatch, roles):
    """Verify that any active user can access root-causes, blast-radius, and reports."""
    event_id = uuid4()
    investigation_result = InvestigationResult(
        start_event_id=event_id,
        link_mode="confirmed_only",
        uniqueness_note="unique",
        nodes=[],
    )
    blast_result = BlastRadiusResult(
        start_event_id=event_id,
        link_mode="confirmed_only",
        uniqueness_note="unique",
        nodes=[],
        impacts=[],
        impact_grouping_note="grouped",
    )
    summary_report = EventSummaryReport(
        started_after=datetime(2026, 1, 1, tzinfo=timezone.utc),
        started_before=datetime(2026, 12, 31, tzinfo=timezone.utc),
        groups=[
            EventSummaryGroup(
                category_code="infrastructure",
                category_name="Infrastructure",
                status_code="reported",
                status_name="Reported",
                event_count=1,
            )
        ],
        total_events=1,
    )
    inv_report = EventInvestigationReport(
        event=_event_detail(event_id=event_id),
        reconstruction_limitation="test limitation",
        root_causes=investigation_result,
        blast_radius=blast_result,
        evidence=[],
        raw_impact_totals_by_type_unit=[],
    )

    monkeypatch.setattr(investigation_service, "root_causes", AsyncMock(return_value=investigation_result))
    monkeypatch.setattr(investigation_service, "blast_radius", AsyncMock(return_value=blast_result))
    monkeypatch.setattr(report_service, "event_summary_report", AsyncMock(return_value=summary_report))
    monkeypatch.setattr(report_service, "event_investigation_report", AsyncMock(return_value=inv_report))
    monkeypatch.setattr("app.api.v1.reference.lookup", AsyncMock(return_value=[{"code": "infrastructure"}]))

    app.dependency_overrides[get_current_user] = lambda: make_user(roles=roles)
    try:
        # Root causes
        r = client.get(f"/api/v1/events/{event_id}/root-causes")
        assert r.status_code == 200

        # Blast radius
        r = client.get(f"/api/v1/events/{event_id}/blast-radius")
        assert r.status_code == 200

        # Event summary report
        r = client.get("/api/v1/reports/event-summary", params={
            "started_after": "2026-01-01T00:00:00+00:00",
            "started_before": "2026-12-31T23:59:59+00:00",
        })
        assert r.status_code == 200

        # Investigation report
        r = client.get(f"/api/v1/reports/event-investigation/{event_id}")
        assert r.status_code == 200

        # Reference data
        r = client.get("/api/v1/reference/event_categories")
        assert r.status_code == 200
        assert r.json() == [{"code": "infrastructure"}]
    finally:
        app.dependency_overrides.clear()
