from __future__ import annotations

from datetime import datetime
from uuid import UUID

from psycopg import AsyncConnection

from app.errors.exceptions import AppError
from app.errors.handlers import map_psycopg_error


async def register_event(
    conn: AsyncConnection,
    *,
    event_code: str,
    title: str,
    description: str,
    category_code: str,
    event_type_id: UUID,
    severity_code: str,
    location_id: UUID | None,
    asset_id: UUID | None,
    service_id: UUID | None,
    scheduled_activity_id: UUID | None,
    started_at: datetime,
    data_class_code: str,
) -> UUID:
    """Call public.register_event and return the created event_id."""
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                CALL public.register_event(
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                """,
                (
                    event_code,
                    title,
                    description,
                    category_code,
                    event_type_id,
                    severity_code,
                    location_id,
                    asset_id,
                    service_id,
                    scheduled_activity_id,
                    started_at,
                    data_class_code,
                    None,
                ),
            )
            out_row = await _fetch_optional(cur)
            if out_row:
                created = _first_value(out_row)
                if created:
                    return UUID(str(created))
            await cur.execute(
                "SELECT event_id FROM public.campus_event WHERE event_code = %s",
                (event_code,),
            )
            row = await cur.fetchone()
    except Exception as exc:
        raise _map_or_raise(exc) from exc

    if not row:
        raise AppError("event_create_failed", "Event registration did not return an identifier.", 500)
    return row["event_id"]


async def close_event(conn: AsyncConnection, event_id: UUID, closing_reason: str) -> None:
    try:
        await conn.execute(
            "CALL public.close_event(%s, %s)",
            (event_id, closing_reason),
        )
    except Exception as exc:
        raise _map_or_raise(exc) from exc


async def trace_root_causes(
    conn: AsyncConnection,
    event_id: UUID,
    include_suspected: bool,
) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT event_id, event_code, title, minimum_depth, path_event_ids
                FROM public.trace_root_causes(%s, %s)
                """,
                (event_id, include_suspected),
            )
            return await cur.fetchall()
    except Exception as exc:
        raise _map_or_raise(exc) from exc


async def trace_blast_radius(
    conn: AsyncConnection,
    event_id: UUID,
    include_suspected: bool,
) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT event_id, event_code, title, minimum_depth, path_event_ids
                FROM public.trace_blast_radius(%s, %s)
                """,
                (event_id, include_suspected),
            )
            return await cur.fetchall()
    except Exception as exc:
        raise _map_or_raise(exc) from exc


async def blast_radius_impact_summary(
    conn: AsyncConnection,
    event_id: UUID,
    include_suspected: bool,
) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    affected_object_key,
                    impact_type_code,
                    impact_type_name,
                    unit_code,
                    unit_name,
                    verification_status,
                    headline_quantity,
                    impact_record_count,
                    impact_ids,
                    possible_duplicate_impact_ids,
                    aggregation_note
                FROM public.blast_radius_impact_summary(%s, %s)
                """,
                (event_id, include_suspected),
            )
            return await cur.fetchall()
    except Exception as exc:
        raise _map_or_raise(exc) from exc


async def _fetch_optional(cur) -> dict | tuple | None:
    try:
        return await cur.fetchone()
    except Exception:
        return None


def _first_value(row: dict | tuple):
    if isinstance(row, dict):
        return next(iter(row.values()), None)
    return row[0] if row else None


def _map_or_raise(exc: Exception) -> Exception:
    from psycopg import Error as PsycopgError

    if isinstance(exc, AppError):
        return exc
    if isinstance(exc, PsycopgError):
        return map_psycopg_error(exc)
    return exc
