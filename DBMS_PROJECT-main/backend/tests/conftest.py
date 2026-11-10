from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.security import CurrentUser
from app.main import app

ADMIN_ID = UUID("00000000-0000-4000-8000-000000000001")
REPORTER_ID = UUID("00000000-0000-4000-8000-000000000002")
INVESTIGATOR_ID = UUID("00000000-0000-4000-8000-000000000003")


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture(autouse=True)
def mock_db_pool_for_unit_tests(monkeypatch):
    import os
    if os.getenv("CAMPUS_MEMORY_INTEGRATION") != "1":
        from unittest.mock import AsyncMock
        import app.main
        monkeypatch.setattr(app.main, "create_pool", AsyncMock(return_value=None))
        monkeypatch.setattr(app.main, "close_pool", AsyncMock(return_value=None))


def make_user(*, user_id: UUID | None = None, roles: set[str] | None = None) -> CurrentUser:
    return CurrentUser(
        user_id=user_id or ADMIN_ID,
        auth_subject="test-subject",
        email="tester@campus-memory.invalid",
        display_name="Test User",
        roles=frozenset(roles or {"administrator"}),
        is_active=True,
    )


@pytest.fixture
def admin_user() -> CurrentUser:
    return make_user(roles={"administrator"})


@pytest.fixture
def reporter_user() -> CurrentUser:
    return make_user(user_id=REPORTER_ID, roles={"event_reporter"})


@pytest.fixture
def investigator_user() -> CurrentUser:
    return make_user(user_id=INVESTIGATOR_ID, roles={"event_investigator"})


@pytest.fixture
def decision_maker_user() -> CurrentUser:
    return make_user(user_id=uuid4(), roles={"decision_maker"})


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(admin_user: CurrentUser) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: admin_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def sample_event_payload() -> dict:
    return {
        "event_code": "TEST-EVT-001",
        "title": "Test power interruption",
        "description": "Synthetic test event for API unit tests.",
        "category_code": "infrastructure",
        "event_type_id": "00000000-0000-4000-8000-000000000101",
        "severity_code": "medium",
        "location_id": "00000000-0000-4000-8000-000000000204",
        "started_at": datetime(2026, 10, 28, 8, 0, tzinfo=timezone.utc).isoformat(),
        "data_class_code": "synthetic",
    }
