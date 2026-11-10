from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

from app.schemas.evidence import EvidenceRead
from app.schemas.relationship import RelationshipRead
from app.services import evidence_service, relationship_service


def _relationship(**overrides) -> RelationshipRead:
    now = datetime(2026, 10, 28, 9, 0, tzinfo=timezone.utc)
    payload = {
        "relationship_id": uuid4(),
        "cause_event_id": uuid4(),
        "cause_event_code": "SYN-UPS-001",
        "cause_title": "UPS Failure",
        "effect_event_id": uuid4(),
        "effect_event_code": "SYN-NET-001",
        "effect_title": "Network Switch Failure",
        "relationship_status_code": "suspected",
        "confidence_score": Decimal("0.9000"),
        "explanation": "Synthetic unit-test relationship.",
        "temporal_override_reason": None,
        "data_class_code": "synthetic",
        "created_by": uuid4(),
        "created_at": now,
        "last_modified_by": uuid4(),
        "updated_at": now,
        "evidence_count": 0,
    }
    payload.update(overrides)
    return RelationshipRead.model_validate(payload)


def test_relationship_creation_and_evidence(auth_client, monkeypatch):
    created = _relationship()
    confirmed = _relationship(
        relationship_id=created.relationship_id,
        relationship_status_code="confirmed",
        evidence_count=1,
    )
    evidence = EvidenceRead(
        evidence_id=uuid4(),
        relationship_id=created.relationship_id,
        evidence_type_code="witness_note",
        description="Synthetic investigator note.",
        source_reference=None,
        source_url=None,
        recorded_by=uuid4(),
        recorded_at=datetime(2026, 10, 28, 9, 5, tzinfo=timezone.utc),
        data_class_code="synthetic",
    )
    monkeypatch.setattr(relationship_service, "create_relationship", AsyncMock(return_value=created))
    monkeypatch.setattr(evidence_service, "add_evidence", AsyncMock(return_value=evidence))
    monkeypatch.setattr(relationship_service, "confirm_relationship", AsyncMock(return_value=confirmed))

    create_response = auth_client.post(
        "/api/v1/relationships",
        json={
            "cause_event_id": str(created.cause_event_id),
            "effect_event_id": str(created.effect_event_id),
            "confidence_score": "0.9000",
            "explanation": "Synthetic unit-test relationship.",
            "data_class_code": "synthetic",
        },
    )
    assert create_response.status_code == 201
    assert create_response.json()["relationship_status_code"] == "suspected"

    evidence_response = auth_client.post(
        f"/api/v1/relationships/{created.relationship_id}/evidence",
        json={
            "evidence_type_code": "witness_note",
            "description": "Synthetic investigator note.",
            "data_class_code": "synthetic",
        },
    )
    assert evidence_response.status_code == 201

    confirm_response = auth_client.post(
        f"/api/v1/relationships/{created.relationship_id}/confirm",
        json={"reason": "Evidence reviewed."},
    )
    assert confirm_response.status_code == 200
    assert confirm_response.json()["relationship_status_code"] == "confirmed"


def test_self_relationship_rejected_by_schema(auth_client, monkeypatch):
    from app.errors.exceptions import ConflictError

    async def fail(*args, **kwargs):
        raise ConflictError("A relationship cannot link an event to itself.")

    monkeypatch.setattr(relationship_service, "create_relationship", fail)
    event_id = str(uuid4())
    response = auth_client.post(
        "/api/v1/relationships",
        json={
            "cause_event_id": event_id,
            "effect_event_id": event_id,
            "confidence_score": "0.5",
            "explanation": "Invalid self link.",
            "data_class_code": "synthetic",
        },
    )
    assert response.status_code == 409
