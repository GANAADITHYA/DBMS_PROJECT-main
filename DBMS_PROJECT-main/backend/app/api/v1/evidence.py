from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import require_permission
from app.core.permissions import EVIDENCE_WRITE
from app.core.security import CurrentUser
from app.schemas.evidence import EvidenceCreate, EvidenceRead
from app.services import evidence_service

router = APIRouter(tags=["evidence"])


@router.post(
    "/relationships/{relationship_id}/evidence",
    response_model=EvidenceRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_evidence(
    relationship_id: UUID,
    payload: EvidenceCreate,
    user: Annotated[CurrentUser, Depends(require_permission(EVIDENCE_WRITE))],
) -> EvidenceRead:
    return await evidence_service.add_evidence(user, relationship_id, payload)
