from app.db.connection import get_database_state


def test_application_startup_and_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "CAMPUS MEMORY API"
    assert "auth_configured" in body
    assert "database_configured" in body
    assert response.headers.get("X-Request-ID")


def test_database_readiness_without_pool(client):
    state = get_database_state()
    state.pool = None
    state.last_error_code = "database_not_configured"
    state.last_error_message = "DATABASE_URL is not set."
    response = client.get("/api/v1/health/database")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "unavailable"
    assert "password" not in str(body).lower()
    assert "postgresql://" not in str(body).lower()

def test_application_readiness_without_pool(client):
    state = get_database_state()
    state.pool = None
    state.last_error_code = "database_not_configured"
    state.last_error_message = "DATABASE_URL is not set."
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "unavailable"
    assert body["connection"] == "not_configured"
    assert body["permissions"] == "unknown"
    assert "password" not in str(body).lower()
