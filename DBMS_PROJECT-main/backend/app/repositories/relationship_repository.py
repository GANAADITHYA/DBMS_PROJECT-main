from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from psycopg import AsyncConnection

from app.errors.exceptions import ConflictError, NotFoundError
from app.errors.handlers import map_psycopg_error
from app.schemas.relationship import RelationshipCreate

RELATIONSHIP_SELECT = """
SELECT
    r.relationship_id,
    r.cause_event_id,
    cause.event_code AS cause_event_code,
    cause.title AS cause_title,
    r.effect_event_id,
    effect.event_code AS effect_event_code,
    effect.title AS effect_title,
    r.relationship_status_code,
    r.confidence_score,
    r.explanation,
    r.temporal_override_reason,
    r.data_class_code,
    r.created_by,
    r.created_at,
    r.last_modified_by,
    r.updated_at,
    (
        SELECT count(*) FROM public.relationship_evidence ev
        WHERE ev.relationship_id = r.relationship_id
    ) AS evidence_count
FROM public.event_relationship r
JOIN public.campus_event cause ON cause.event_id = r.cause_event_id
JOIN public.campus_event effect ON effect.event_id = r.effect_event_id
"""


def _raise(exc: Exception) -> None:
    from psycopg import Error as PsycopgError

    if isinstance(exc, PsycopgError):
        raise map_psycopg_error(exc) from exc
    raise exc


async def get_relationship(conn: AsyncConnection, relationship_id: UUID) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(RELATIONSHIP_SELECT + " WHERE r.relationship_id = %s", (relationship_id,))
            row = await cur.fetchone()
    except Exception as exc:
        _raise(exc)
    if not row:
        raise NotFoundError("The requested relationship was not found.")
    return row


async def list_event_relationships(
    conn: AsyncConnection,
    event_id: UUID,
    direction: str | None = None,
    status_code: str | None = None,
) -> list[dict]:
    filters = ["(r.cause_event_id = %s OR r.effect_event_id = %s)"]
    params: list[object] = [event_id, event_id]
    if direction == "outgoing":
        filters = ["r.cause_event_id = %s"]
        params = [event_id]
    elif direction == "incoming":
        filters = ["r.effect_event_id = %s"]
        params = [event_id]
    if status_code:
        filters.append("r.relationship_status_code = %s")
        params.append(status_code)
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                RELATIONSHIP_SELECT + " WHERE " + " AND ".join(filters) + " ORDER BY r.created_at",
                params,
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def create_relationship(conn: AsyncConnection, payload: RelationshipCreate) -> dict:
    if payload.cause_event_id == payload.effect_event_id:
        raise ConflictError("A relationship cannot link an event to itself.")
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO public.event_relationship (
                    cause_event_id,
                    effect_event_id,
                    relationship_status_code,
                    confidence_score,
                    explanation,
                    temporal_override_reason,
                    data_class_code
                ) VALUES (%s, %s, 'suspected', %s, %s, %s, %s)
                RETURNING relationship_id
                """,
                (
                    payload.cause_event_id,
                    payload.effect_event_id,
                    payload.confidence_score,
                    payload.explanation,
                    payload.temporal_override_reason,
                    payload.data_class_code,
                ),
            )
            row = await cur.fetchone()
    except Exception as exc:
        _raise(exc)
    return await get_relationship(conn, row["relationship_id"])


async def update_relationship_status(
    conn: AsyncConnection,
    relationship_id: UUID,
    status_code: str,
    confidence_score: Decimal | None = None,
) -> dict:
    assignments = ["relationship_status_code = %s"]
    params: list[object] = [status_code]
    if confidence_score is not None:
        assignments.append("confidence_score = %s")
        params.append(confidence_score)
    params.append(relationship_id)
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                f"UPDATE public.event_relationship SET {', '.join(assignments)} WHERE relationship_id = %s",
                params,
            )
            if cur.rowcount == 0:
                raise NotFoundError("The requested relationship was not found.")
    except NotFoundError:
        raise
    except Exception as exc:
        _raise(exc)
    return await get_relationship(conn, relationship_id)


async def list_relationship_history(conn: AsyncConnection, relationship_id: UUID) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT history_id, relationship_id, change_kind, old_status_code, new_status_code,
                       old_confidence, new_confidence, changed_at, changed_by, reason
                FROM public.relationship_history
                WHERE relationship_id = %s
                ORDER BY changed_at ASC
                """,
                (relationship_id,),
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []
