from __future__ import annotations

from uuid import UUID

from app.core.security import CurrentUser
from app.db.transactions import connection, transaction
from app.errors.exceptions import NotFoundError
from app.repositories import event_repository, impact_repository
from app.schemas.impact import ImpactCreate, ImpactRead, ImpactUpdate


def _read(row: dict) -> ImpactRead:
    return ImpactRead.model_validate(row)


async def add_impact(user: CurrentUser, event_id: UUID, payload: ImpactCreate) -> ImpactRead:
    async with transaction(actor_id=user.user_id) as conn:
        if not await event_repository.event_exists(conn, event_id):
            raise NotFoundError("The requested event was not found.")
        row = await impact_repository.add_impact(conn, event_id, payload)
    return _read(row)


async def list_impacts(event_id: UUID) -> list[ImpactRead]:
    async with connection() as conn:
        if not await event_repository.event_exists(conn, event_id):
            raise NotFoundError("The requested event was not found.")
        rows = await impact_repository.list_event_impacts(conn, event_id)
    return [_read(row) for row in rows]


async def update_impact(user: CurrentUser, impact_id: UUID, payload: ImpactUpdate) -> ImpactRead:
    async with transaction(actor_id=user.user_id) as conn:
        row = await impact_repository.update_impact(conn, impact_id, payload)
    return _read(row)
