from uuid import uuid4

from app.api.deps import get_current_user
from app.core.permissions import EVENT_CREATE, EVENT_VOID, has_permission
from app.main import app
from tests.conftest import make_user, sample_event_payload


def test_protected_endpoint_without_token(client):
    response = client.get("/api/v1/events")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthenticated"


def test_invalid_bearer_token_fails_closed(client):
    response = client.get("/api/v1/events", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_any_active_user_can_void(client):
    """After authorization simplification every active user may void an event."""
    from unittest.mock import AsyncMock
    from app.services import event_service
    from tests.test_events import _event_detail

    voided = _event_detail(status_code="void", status_name="Void", is_terminal=True)
    app.dependency_overrides[get_current_user] = lambda: make_user(roles={"event_reporter"})
    import pytest
    with pytest.MonkeyPatch().context() as mp:
        mp.setattr(event_service, "void_event", AsyncMock(return_value=voided))
        response = client.post(f"/api/v1/events/{uuid4()}/void", json={"reason": "Entered in error."})
    app.dependency_overrides.clear()
    assert response.status_code == 200


def test_active_user_with_no_role_can_access_protected_endpoints(client):
    """An active application user with no assigned role must be allowed through."""
    from unittest.mock import AsyncMock
    from app.schemas.common import Page
    from app.schemas.event import EventSummary
    from app.services import event_service

    app.dependency_overrides[get_current_user] = lambda: make_user(roles=set())
    import pytest
    with pytest.MonkeyPatch().context() as mp:
        mp.setattr(
            event_service,
            "list_events",
            AsyncMock(return_value=Page[EventSummary](items=[], page=1, page_size=20, total=0)),
        )
        response = client.get("/api/v1/events")
    app.dependency_overrides.clear()
    assert response.status_code == 200


def test_role_constants_are_defined():
    """Permission constants remain importable for future use."""
    admin = make_user(roles={"administrator"})
    reporter = make_user(roles={"event_reporter"})
    investigator = make_user(roles={"event_investigator"})
    decision_maker = make_user(roles={"decision_maker"})
    # The permission map itself is unchanged — roles still carry their
    # historical permission sets; they are just no longer evaluated at the API layer.
    assert has_permission(admin, EVENT_VOID)
    assert has_permission(admin, EVENT_CREATE)
    assert has_permission(reporter, EVENT_CREATE)
    assert not has_permission(reporter, EVENT_VOID)
    assert has_permission(investigator, EVENT_CREATE)
    assert not has_permission(decision_maker, EVENT_CREATE)
