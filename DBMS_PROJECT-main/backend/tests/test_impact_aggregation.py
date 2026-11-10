from decimal import Decimal
from unittest.mock import AsyncMock
from uuid import uuid4

from app.schemas.impact import ImpactAggregateItem
from app.schemas.investigation import BlastRadiusResult
from app.services import investigation_service


def test_blast_radius_keeps_estimated_and_verified_separate(auth_client, monkeypatch):
    event_id = uuid4()
    result = BlastRadiusResult(
        start_event_id=event_id,
        link_mode="confirmed_only",
        uniqueness_note="unique",
        nodes=[],
        impacts=[
            ImpactAggregateItem(
                affected_object_key="activity:1",
                impact_type_code="students_affected",
                impact_type_name="Students Affected",
                unit_code="person",
                unit_name="Person",
                verification_status="verified",
                headline_quantity=Decimal("45"),
                impact_record_count=1,
                impact_ids=[uuid4()],
                possible_duplicate_impact_ids=[],
                aggregation_note="Single structured impact record",
            ),
            ImpactAggregateItem(
                affected_object_key="service:1",
                impact_type_code="downtime",
                impact_type_name="Downtime",
                unit_code="hour",
                unit_name="Hour",
                verification_status="estimated",
                headline_quantity=Decimal("2.500"),
                impact_record_count=1,
                impact_ids=[uuid4()],
                possible_duplicate_impact_ids=[],
                aggregation_note="Single structured impact record",
            ),
        ],
        impact_grouping_note="units remain separate",
    )
    monkeypatch.setattr(investigation_service, "blast_radius", AsyncMock(return_value=result))
    response = auth_client.get(f"/api/v1/events/{event_id}/blast-radius")
    assert response.status_code == 200
    statuses = {(item["impact_type_code"], item["unit_code"], item["verification_status"]) for item in response.json()["impacts"]}
    assert ("students_affected", "person", "verified") in statuses
    assert ("downtime", "hour", "estimated") in statuses
