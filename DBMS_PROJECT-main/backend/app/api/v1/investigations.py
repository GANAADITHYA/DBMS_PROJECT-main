from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_permission
from app.core.permissions import INVESTIGATE
from app.core.security import CurrentUser
from app.schemas.common import LinkMode
from app.schemas.investigation import BlastRadiusResult, InvestigationResult
from app.services import investigation_service

router = APIRouter(tags=["investigations"])


@router.get("/events/{event_id}/root-causes", response_model=InvestigationResult)
async def root_causes(
    event_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(INVESTIGATE))],
    link_mode: LinkMode = Query(default="confirmed_only"),
) -> InvestigationResult:
    return await investigation_service.root_causes(event_id, link_mode)


@router.get("/events/{event_id}/blast-radius", response_model=BlastRadiusResult)
async def blast_radius(
    event_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(INVESTIGATE))],
    link_mode: LinkMode = Query(default="confirmed_only"),
) -> BlastRadiusResult:
    return await investigation_service.blast_radius(event_id, link_mode)
