from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import require_permission
from app.core.permissions import IMPACT_READ, IMPACT_WRITE
from app.core.security import CurrentUser
from app.schemas.impact import ImpactCreate, ImpactRead, ImpactUpdate
from app.services import impact_service

router = APIRouter(tags=["impacts"])


@router.post(
    "/events/{event_id}/impacts",
    response_model=ImpactRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_impact(
    event_id: UUID,
    payload: ImpactCreate,
    user: Annotated[CurrentUser, Depends(require_permission(IMPACT_WRITE))],
) -> ImpactRead:
    return await impact_service.add_impact(user, event_id, payload)


@router.get("/events/{event_id}/impacts", response_model=list[ImpactRead])
async def list_impacts(
    event_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(IMPACT_READ))],
) -> list[ImpactRead]:
    return await impact_service.list_impacts(event_id)


@router.patch("/impacts/{impact_id}", response_model=ImpactRead)
async def update_impact(
    impact_id: UUID,
    payload: ImpactUpdate,
    user: Annotated[CurrentUser, Depends(require_permission(IMPACT_WRITE))],
) -> ImpactRead:
    return await impact_service.update_impact(user, impact_id, payload)
