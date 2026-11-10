import os

import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("CAMPUS_MEMORY_INTEGRATION") != "1",
    reason="Live Supabase integration tests run only when CAMPUS_MEMORY_INTEGRATION=1.",
)


def test_live_database_not_claimed_without_runtime_role():
    """Placeholder: enable with a configured runtime role, never the owner account."""
    assert os.getenv("DATABASE_URL"), "DATABASE_URL is required for integration tests."
