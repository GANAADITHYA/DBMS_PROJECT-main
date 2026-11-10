from __future__ import annotations

from uuid import UUID

from app.core.security import CurrentUser
from app.db.transactions import connection, transaction
from app.errors.exceptions import ConflictError, NotFoundError
from app.repositories import event_repository, relationship_repository
from app.schemas.relationship import (
    RelationshipCreate,
    RelationshipHistoryItem,
    RelationshipRead,
)


def _read(row: dict) -> RelationshipRead:
    return RelationshipRead.model_validate(row)


async def create_relationship(user: CurrentUser, payload: RelationshipCreate) -> RelationshipRead:
    async with transaction(actor_id=user.user_id) as conn:
        if not await event_repository.event_exists(conn, payload.cause_event_id):
            raise NotFoundError("The cause event was not found.")
        if not await event_repository.event_exists(conn, payload.effect_event_id):
            raise NotFoundError("The effect event was not found.")
        row = await relationship_repository.create_relationship(conn, payload)
    return _read(row)


async def list_event_relationships(
    event_id: UUID,
    direction: str | None = None,
    status_code: str | None = None,
) -> list[RelationshipRead]:
    async with connection() as conn:
        if not await event_repository.event_exists(conn, event_id):
            raise NotFoundError("The requested event was not found.")
        rows = await relationship_repository.list_event_relationships(
            conn, event_id, direction, status_code
        )
    return [_read(row) for row in rows]


async def confirm_relationship(user: CurrentUser, relationship_id: UUID, reason: str) -> RelationshipRead:
    async with transaction(actor_id=user.user_id, change_reason=reason) as conn:
        current = await relationship_repository.get_relationship(conn, relationship_id)
        if current["relationship_status_code"] == "confirmed":
            return _read(current)
        if int(current.get("evidence_count") or 0) < 1:
            raise ConflictError("Attach evidence before confirming this relationship.")
        row = await relationship_repository.update_relationship_status(
            conn, relationship_id, "confirmed"
        )
    return _read(row)


async def downgrade_relationship(
    user: CurrentUser,
    relationship_id: UUID,
    status_code: str,
    reason: str,
) -> RelationshipRead:
    async with transaction(actor_id=user.user_id, change_reason=reason) as conn:
        await relationship_repository.get_relationship(conn, relationship_id)
        row = await relationship_repository.update_relationship_status(
            conn, relationship_id, status_code
        )
    return _read(row)


async def relationship_history(relationship_id: UUID) -> list[RelationshipHistoryItem]:
    async with connection() as conn:
        await relationship_repository.get_relationship(conn, relationship_id)
        rows = await relationship_repository.list_relationship_history(conn, relationship_id)
    return [RelationshipHistoryItem.model_validate(row) for row in rows]
