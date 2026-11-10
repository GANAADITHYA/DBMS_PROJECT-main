from psycopg.errors import CheckViolation, UniqueViolation

from app.db.transactions import set_actor_context
from app.errors.handlers import map_psycopg_error


def test_unique_relationship_maps_to_conflict():
    exc = UniqueViolation('duplicate key value violates unique constraint "uq_relationship_direction"')
    mapped = map_psycopg_error(exc)
    assert mapped.status_code == 409
    assert "directed relationship" in mapped.message.lower() or mapped.code == "duplicate_record"


def test_check_violation_maps_to_conflict():
    exc = CheckViolation("A relationship cannot be confirmed without at least one evidence row")
    mapped = map_psycopg_error(exc)
    assert mapped.status_code == 409
    assert "evidence" in mapped.message.lower()


def test_stack_traces_are_not_in_payload(client):
    response = client.get("/api/v1/events")
    body = response.json()
    assert "Traceback" not in str(body)
    assert "psycopg" not in str(body).lower()


def test_set_actor_context_sql_is_parameterized():
    import inspect

    source = inspect.getsource(set_actor_context)
    assert "SELECT set_config(%s, %s, true)" in source
    assert "app.actor_id" in source
    assert "f\"app.actor_id" not in source
