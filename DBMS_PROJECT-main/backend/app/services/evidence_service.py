from __future__ import annotations

from uuid import UUID

from app.core.security import CurrentUser
from app.db.transactions import transaction
from app.repositories import evidence_repository, relationship_repository
from app.schemas.evidence import EvidenceCreate, EvidenceRead


async def add_evidence(
    user: CurrentUser,
    relationship_id: UUID,
    payload: EvidenceCreate,
) -> EvidenceRead:
    async with transaction(actor_id=user.user_id) as conn:
        await relationship_repository.get_relationship(conn, relationship_id)
        row = await evidence_repository.add_evidence(conn, relationship_id, payload)
    return EvidenceRead.model_validate(row)
