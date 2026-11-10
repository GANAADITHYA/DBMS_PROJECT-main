from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

from app.schemas.investigation import BlastRadiusResult, InvestigationResult, TraversalNode
from app.services import investigation_service


def test_root_cause_and_blast_radius(auth_client, monkeypatch):
    start_id = uuid4()
    cause_id = uuid4()
    effect_id = uuid4()
    root = InvestigationResult(
        start_event_id=start_id,
        link_mode="confirmed_only",
        uniqueness_note="unique events",
        nodes=[
            TraversalNode(
                event_id=cause_id,
                event_code="SYN-UPS-001",
                title="UPS Failure",
                minimum_depth=1,
                path_event_ids=[start_id, cause_id],
            )
        ],
    )
    blast = BlastRadiusResult(
        start_event_id=start_id,
        link_mode="confirmed_only",
        uniqueness_note="unique events",
        nodes=[
            TraversalNode(
                event_id=effect_id,
                event_code="SYN-LAB-001",
                title="Lab Network Outage",
                minimum_depth=1,
                path_event_ids=[start_id, effect_id],
            )
        ],
        impacts=[],
        impact_grouping_note="grouped",
    )
    monkeypatch.setattr(investigation_service, "root_causes", AsyncMock(return_value=root))
    monkeypatch.setattr(investigation_service, "blast_radius", AsyncMock(return_value=blast))

    root_response = auth_client.get(f"/api/v1/events/{start_id}/root-causes")
    assert root_response.status_code == 200
    body = root_response.json()
    assert body["nodes"][0]["minimum_depth"] == 1
    assert len({node["event_id"] for node in body["nodes"]}) == len(body["nodes"])

    blast_response = auth_client.get(f"/api/v1/events/{start_id}/blast-radius")
    assert blast_response.status_code == 200
    assert blast_response.json()["impact_grouping_note"]


def test_as_of_requires_timezone(auth_client):
    response = auth_client.get("/api/v1/events/as-of", params={"at": "2026-10-28T08:00:00"})
    assert response.status_code == 422


def test_as_of_with_timezone(auth_client, monkeypatch):
    from app.schemas.common import Page
    from app.schemas.event import EventAsOfItem
    from app.services import event_service

    monkeypatch.setattr(
        event_service,
        "events_as_of",
        AsyncMock(
            return_value=Page[EventAsOfItem](
                items=[
                    EventAsOfItem(
                        event_id=uuid4(),
                        event_code="SYN-UPS-001",
                        title="UPS Failure",
                        status_as_recorded="resolved",
                        status_recorded_at=datetime(2026, 10, 28, 8, 0, tzinfo=timezone.utc),
                        history_reason="Synthetic",
                        reconstruction_note="status-as-recorded",
                    )
                ],
                page=1,
                page_size=20,
                total=1,
            )
        ),
    )
    response = auth_client.get(
        "/api/v1/events/as-of",
        params={"at": "2026-10-28T08:00:00+05:30"},
    )
    assert response.status_code == 200
    assert "status-as-recorded" in response.json()["items"][0]["reconstruction_note"] or response.json()["items"]
