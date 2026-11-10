from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

from app.api.deps import get_current_user
from app.main import app
from app.schemas.common import Page
from app.schemas.event import EventDetail, EventStatusHistoryItem, EventSummary
from app.services import event_service
from tests.conftest import make_user, sample_event_payload


def _event_detail(**overrides) -> EventDetail:
    now = datetime(2026, 10, 28, 8, 0, tzinfo=timezone.utc)
    payload = {
        "event_id": uuid4(),
        "event_code": "TEST-EVT-001",
        "title": "Test power interruption",
        "description": "Synthetic test event for API unit tests.",
        "category_code": "infrastructure",
        "category_name": "Infrastructure",
        "event_type_id": UUID("00000000-0000-4000-8000-000000000101"),
        "event_type_name": "Power Failure",
        "severity_code": "medium",
        "severity_name": "Medium",
        "status_code": "reported",
        "status_name": "Reported",
        "is_terminal": False,
        "location_id": UUID("00000000-0000-4000-8000-000000000204"),
        "location_name": "Computer Laboratory 203",
        "asset_id": None,
        "asset_name": None,
        "service_id": None,
        "service_name": None,
        "scheduled_activity_id": None,
        "scheduled_activity_title": None,
        "started_at": now,
        "ended_at": None,
        "data_class_code": "synthetic",
        "source_note": "Registered through public.register_event procedure",
        "created_by": UUID("00000000-0000-4000-8000-000000000001"),
        "created_at": now,
        "last_modified_by": UUID("00000000-0000-4000-8000-000000000001"),
        "updated_at": now,
    }
    payload.update(overrides)
    return EventDetail.model_validate(payload)


def test_event_registration_and_retrieval(auth_client, monkeypatch):
    created = _event_detail()
    monkeypatch.setattr(event_service, "register_event", AsyncMock(return_value=created))
    monkeypatch.setattr(event_service, "get_event", AsyncMock(return_value=created))
    monkeypatch.setattr(
        event_service,
        "list_events",
        AsyncMock(
            return_value=Page[EventSummary](
                items=[
                    EventSummary.model_validate(
                        {
                            key: value
                            for key, value in created.model_dump().items()
                            if key in EventSummary.model_fields
                        }
                    )
                ],
                page=1,
                page_size=20,
                total=1,
            )
        ),
    )

    create_response = auth_client.post("/api/v1/events", json=sample_event_payload())
    assert create_response.status_code == 201
    assert create_response.json()["event_code"] == "TEST-EVT-001"

    list_response = auth_client.get("/api/v1/events")
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1

    detail_response = auth_client.get(f"/api/v1/events/{created.event_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["event_id"] == str(created.event_id)


def test_event_update(auth_client, monkeypatch):
    updated = _event_detail(title="Updated title")
    monkeypatch.setattr(event_service, "update_event", AsyncMock(return_value=updated))
    response = auth_client.patch(f"/api/v1/events/{updated.event_id}", json={"title": "Updated title"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated title"


def test_event_status_change_and_close(auth_client, monkeypatch):
    investigating = _event_detail(status_code="investigating", status_name="Investigating")
    closed = _event_detail(status_code="closed", status_name="Closed", is_terminal=True)
    monkeypatch.setattr(event_service, "change_status", AsyncMock(return_value=investigating))
    monkeypatch.setattr(event_service, "close_event", AsyncMock(return_value=closed))
    monkeypatch.setattr(
        event_service,
        "status_history",
        AsyncMock(
            return_value=[
                EventStatusHistoryItem(
                    history_id=uuid4(),
                    event_id=investigating.event_id,
                    old_status_code=None,
                    new_status_code="reported",
                    changed_at=datetime(2026, 10, 28, 8, 0, tzinfo=timezone.utc),
                    changed_by=UUID("00000000-0000-4000-8000-000000000001"),
                    reason="Initial status",
                    is_initial=True,
                )
            ]
        ),
    )

    status_response = auth_client.patch(
        f"/api/v1/events/{investigating.event_id}/status",
        json={"status_code": "investigating", "reason": "Begin investigation."},
    )
    assert status_response.status_code == 200
    assert status_response.json()["status_code"] == "investigating"

    close_response = auth_client.post(
        f"/api/v1/events/{closed.event_id}/close",
        json={"reason": "Investigation complete."},
    )
    assert close_response.status_code == 200
    assert close_response.json()["status_code"] == "closed"

    history_response = auth_client.get(f"/api/v1/events/{investigating.event_id}/status-history")
    assert history_response.status_code == 200
    assert history_response.json()[0]["is_initial"] is True


def test_void_rejects_empty_reason(auth_client):
    response = auth_client.post(f"/api/v1/events/{uuid4()}/void", json={"reason": "   "})
    assert response.status_code == 422


def test_hard_delete_is_rejected(auth_client):
    response = auth_client.delete(f"/api/v1/events/{uuid4()}")
    assert response.status_code == 405


# ── Role-independent access tests ─────────────────────────────────────────────

def _patch_event_service_all(monkeypatch, created):
    """Helper: mock every event service call used by the role-access tests."""
    monkeypatch.setattr(event_service, "register_event", AsyncMock(return_value=created))
    monkeypatch.setattr(event_service, "list_events", AsyncMock(
        return_value=Page[EventSummary](items=[], page=1, page_size=20, total=0)
    ))
    monkeypatch.setattr(event_service, "change_status", AsyncMock(return_value=created))
    monkeypatch.setattr(event_service, "close_event", AsyncMock(return_value=created))
    monkeypatch.setattr(event_service, "void_event", AsyncMock(return_value=created))


import pytest

@pytest.mark.parametrize("role", ["event_reporter", "event_investigator", "decision_maker", "administrator"])
def test_all_roles_can_access_previously_restricted_endpoints(client, monkeypatch, role):
    """Every role must now reach create, status, close, and void without 403."""
    created = _event_detail()
    _patch_event_service_all(monkeypatch, created)
    app.dependency_overrides[get_current_user] = lambda: make_user(roles={role})
    try:
        r = client.post("/api/v1/events", json=sample_event_payload())
        assert r.status_code == 201, f"create failed for {role}: {r.status_code}"

        r = client.patch(
            f"/api/v1/events/{created.event_id}/status",
            json={"status_code": "investigating", "reason": "test"},
        )
        assert r.status_code == 200, f"status change failed for {role}: {r.status_code}"

        r = client.post(f"/api/v1/events/{created.event_id}/close", json={"reason": "done"})
        assert r.status_code == 200, f"close failed for {role}: {r.status_code}"

        r = client.post(f"/api/v1/events/{created.event_id}/void", json={"reason": "mistake"})
        assert r.status_code == 200, f"void failed for {role}: {r.status_code}"
    finally:
        app.dependency_overrides.clear()


def test_user_with_no_role_can_access_events(client, monkeypatch):
    """An active application user with no assigned role must reach all event endpoints."""
    created = _event_detail()
    _patch_event_service_all(monkeypatch, created)
    app.dependency_overrides[get_current_user] = lambda: make_user(roles=set())
    try:
        r = client.post("/api/v1/events", json=sample_event_payload())
        assert r.status_code == 201

        r = client.get("/api/v1/events")
        assert r.status_code == 200

        r = client.post(f"/api/v1/events/{created.event_id}/void", json={"reason": "mistake"})
        assert r.status_code == 200
    finally:
        app.dependency_overrides.clear()


# ── Extra columns resilience, pagination, filter, and CORS tests ──────────────

from app.repositories import event_repository


def _sample_raw_db_row_with_extra_columns(**overrides) -> dict:
    """Simulates a database row containing both EventSummary fields and extra columns."""
    now = datetime(2026, 10, 28, 8, 0, tzinfo=timezone.utc)
    row = {
        # EventSummary fields (22 fields)
        "event_id": uuid4(),
        "event_code": "TEST-EVT-EXTRA-01",
        "title": "Substation maintenance window",
        "category_code": "infrastructure",
        "category_name": "Infrastructure",
        "event_type_id": UUID("00000000-0000-4000-8000-000000000101"),
        "event_type_name": "Power Failure",
        "severity_code": "medium",
        "severity_name": "Medium",
        "status_code": "reported",
        "status_name": "Reported",
        "is_terminal": False,
        "location_id": UUID("00000000-0000-4000-8000-000000000204"),
        "location_name": "Computer Laboratory 203",
        "asset_id": None,
        "asset_name": None,
        "service_id": None,
        "service_name": None,
        "started_at": now,
        "ended_at": None,
        "created_by": UUID("00000000-0000-4000-8000-000000000001"),
        "created_at": now,
        # 7 extra fields that previously caused Pydantic ValidationError
        "description": "Routine quarterly electrical maintenance in East Wing.",
        "scheduled_activity_id": uuid4(),
        "scheduled_activity_title": "Quarterly Grid Inspection",
        "data_class_code": "operational",
        "source_note": "Imported from facilities schedule.",
        "last_modified_by": UUID("00000000-0000-4000-8000-000000000001"),
        "updated_at": now,
        # Arbitrary additional database column
        "extra_unmapped_column": "should_be_ignored_safely",
    }
    row.update(overrides)
    return row


def test_list_events_with_additional_columns_in_database_rows(auth_client, monkeypatch):
    """GET /api/v1/events handles database rows with extra columns without ValidationError."""
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def mock_connection():
        yield AsyncMock()

    monkeypatch.setattr("app.services.event_service.connection", mock_connection)

    raw_row = _sample_raw_db_row_with_extra_columns()

    # Mock at repository level so event_service._summary runs real transformation logic
    async def fake_list_events(conn, query):
        return [raw_row], 1

    monkeypatch.setattr(event_repository, "list_events", fake_list_events)

    response = auth_client.get("/api/v1/events?page=1&page_size=15")
    assert response.status_code == 200

    data = response.json()
    assert data["page"] == 1
    assert data["page_size"] == 15
    assert data["total"] == 1
    assert len(data["items"]) == 1

    item = data["items"][0]
    assert item["event_code"] == "TEST-EVT-EXTRA-01"
    assert item["title"] == "Substation maintenance window"
    assert item["category_code"] == "infrastructure"
    assert item["status_code"] == "reported"

    # Extra columns must NOT be present in EventSummary response
    for forbidden_field in [
        "description",
        "scheduled_activity_id",
        "scheduled_activity_title",
        "data_class_code",
        "source_note",
        "last_modified_by",
        "updated_at",
        "extra_unmapped_column",
    ]:
        assert forbidden_field not in item, f"Extra field {forbidden_field} leaked into EventSummary"


def test_list_events_pagination_and_query_filters(auth_client, monkeypatch):
    """Pagination and filters (category, status, severity, keyword) work as documented."""
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def mock_connection():
        yield AsyncMock()

    monkeypatch.setattr("app.services.event_service.connection", mock_connection)

    captured_queries = []

    async def fake_list_events(conn, query):
        captured_queries.append(query)
        rows = [_sample_raw_db_row_with_extra_columns(event_code=f"EVT-{i}") for i in range(15)]
        return rows, 42

    monkeypatch.setattr(event_repository, "list_events", fake_list_events)

    response = auth_client.get(
        "/api/v1/events?page=2&page_size=15&category_code=infrastructure&status_code=reported&severity_code=medium&keyword=substation"
    )
    assert response.status_code == 200

    data = response.json()
    assert data["page"] == 2
    assert data["page_size"] == 15
    assert data["total"] == 42
    assert len(data["items"]) == 15

    assert len(captured_queries) == 1
    query = captured_queries[0]
    assert query.page == 2
    assert query.page_size == 15
    assert query.category_code == "infrastructure"
    assert query.status_code == "reported"
    assert query.severity_code == "medium"
    assert query.keyword == "substation"


def test_cors_headers_on_success_and_error_responses(auth_client, client, monkeypatch):
    """Origin http://localhost:5173 receives appropriate CORS headers on 200, preflight, and errors."""
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def mock_connection():
        yield AsyncMock()

    monkeypatch.setattr("app.services.event_service.connection", mock_connection)

    origin = "http://localhost:5173"

    # 1. Successful authenticated request
    async def fake_list_events(conn, query):
        return [], 0

    monkeypatch.setattr(event_repository, "list_events", fake_list_events)
    res_200 = auth_client.get("/api/v1/events?page=1&page_size=15", headers={"Origin": origin})
    assert res_200.status_code == 200
    assert res_200.headers.get("access-control-allow-origin") == origin
    assert res_200.headers.get("access-control-allow-credentials") == "true"

    # 2. CORS preflight (OPTIONS)
    res_options = client.options(
        "/api/v1/events",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    assert res_options.status_code == 200
    assert res_options.headers.get("access-control-allow-origin") == origin
    assert "GET" in res_options.headers.get("access-control-allow-methods", "")

    # 3. 401 Unauthenticated error response
    overrides_backup = dict(app.dependency_overrides)
    try:
        app.dependency_overrides.clear()
        res_401 = client.get("/api/v1/events", headers={"Origin": origin})
        assert res_401.status_code == 401
        assert res_401.headers.get("access-control-allow-origin") == origin
    finally:
        app.dependency_overrides.update(overrides_backup)

    # 4. 422 Validation error response (e.g. invalid page_size > 100)
    res_422 = auth_client.get("/api/v1/events?page_size=9999", headers={"Origin": origin})
    assert res_422.status_code == 422
    assert res_422.headers.get("access-control-allow-origin") == origin

