from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_permission
from app.core.permissions import RELATIONSHIP_READ, RELATIONSHIP_WRITE
from app.core.security import CurrentUser
from app.schemas.relationship import (
    RelationshipConfirmRequest,
    RelationshipCreate,
    RelationshipDowngradeRequest,
    RelationshipHistoryItem,
    RelationshipRead,
)
from app.services import relationship_service

router = APIRouter(tags=["relationships"])


@router.post("/relationships", response_model=RelationshipRead, status_code=201)
async def create_relationship(
    payload: RelationshipCreate,
    user: Annotated[CurrentUser, Depends(require_permission(RELATIONSHIP_WRITE))],
) -> RelationshipRead:
    return await relationship_service.create_relationship(user, payload)


@router.get("/events/{event_id}/relationships", response_model=list[RelationshipRead])
async def list_event_relationships(
    event_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(RELATIONSHIP_READ))],
    direction: Literal["incoming", "outgoing"] | None = Query(default=None),
    status_code: str | None = None,
) -> list[RelationshipRead]:
    return await relationship_service.list_event_relationships(event_id, direction, status_code)


@router.get("/relationships/{relationship_id}/history", response_model=list[RelationshipHistoryItem])
async def relationship_history(
    relationship_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(RELATIONSHIP_READ))],
) -> list[RelationshipHistoryItem]:
    return await relationship_service.relationship_history(relationship_id)


@router.post("/relationships/{relationship_id}/confirm", response_model=RelationshipRead)
async def confirm_relationship(
    relationship_id: UUID,
    payload: RelationshipConfirmRequest,
    user: Annotated[CurrentUser, Depends(require_permission(RELATIONSHIP_WRITE))],
) -> RelationshipRead:
    return await relationship_service.confirm_relationship(user, relationship_id, payload.reason)


@router.post("/relationships/{relationship_id}/downgrade", response_model=RelationshipRead)
async def downgrade_relationship(
    relationship_id: UUID,
    payload: RelationshipDowngradeRequest,
    user: Annotated[CurrentUser, Depends(require_permission(RELATIONSHIP_WRITE))],
) -> RelationshipRead:
    return await relationship_service.downgrade_relationship(
        user, relationship_id, payload.status_code, payload.reason
    )
