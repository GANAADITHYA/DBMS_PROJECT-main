from __future__ import annotations

from datetime import datetime
from uuid import UUID

from psycopg import AsyncConnection

from app.errors.exceptions import NotFoundError
from app.errors.handlers import map_psycopg_error
from app.schemas.event import EventListQuery, EventUpdate

EVENT_SELECT = """
SELECT
    e.event_id,
    e.event_code,
    e.title,
    e.description,
    e.category_code,
    c.display_name AS category_name,
    e.event_type_id,
    t.display_name AS event_type_name,
    e.severity_code,
    s.display_name AS severity_name,
    e.status_code,
    st.display_name AS status_name,
    st.is_terminal,
    e.location_id,
    l.name AS location_name,
    e.asset_id,
    a.name AS asset_name,
    e.service_id,
    cs.name AS service_name,
    e.scheduled_activity_id,
    sa.title AS scheduled_activity_title,
    e.started_at,
    e.ended_at,
    e.data_class_code,
    e.source_note,
    e.created_by,
    e.created_at,
    e.last_modified_by,
    e.updated_at
FROM public.campus_event e
JOIN public.event_category c ON c.category_code = e.category_code
JOIN public.event_type t ON t.event_type_id = e.event_type_id
JOIN public.severity_level s ON s.severity_code = e.severity_code
JOIN public.event_status st ON st.status_code = e.status_code
LEFT JOIN public.campus_location l ON l.location_id = e.location_id
LEFT JOIN public.campus_asset a ON a.asset_id = e.asset_id
LEFT JOIN public.campus_service cs ON cs.service_id = e.service_id
LEFT JOIN public.scheduled_activity sa ON sa.scheduled_activity_id = e.scheduled_activity_id
"""

EVENT_SUMMARY_SELECT = """
SELECT
    e.event_id,
    e.event_code,
    e.title,
    e.category_code,
    c.display_name AS category_name,
    e.event_type_id,
    t.display_name AS event_type_name,
    e.severity_code,
    s.display_name AS severity_name,
    e.status_code,
    st.display_name AS status_name,
    st.is_terminal,
    e.location_id,
    l.name AS location_name,
    e.asset_id,
    a.name AS asset_name,
    e.service_id,
    cs.name AS service_name,
    e.started_at,
    e.ended_at,
    e.created_by,
    e.created_at
FROM public.campus_event e
JOIN public.event_category c ON c.category_code = e.category_code
JOIN public.event_type t ON t.event_type_id = e.event_type_id
JOIN public.severity_level s ON s.severity_code = e.severity_code
JOIN public.event_status st ON st.status_code = e.status_code
LEFT JOIN public.campus_location l ON l.location_id = e.location_id
LEFT JOIN public.campus_asset a ON a.asset_id = e.asset_id
LEFT JOIN public.campus_service cs ON cs.service_id = e.service_id
"""


def _raise(exc: Exception) -> None:
    from psycopg import Error as PsycopgError

    if isinstance(exc, PsycopgError):
        raise map_psycopg_error(exc) from exc
    raise exc


async def get_event(conn: AsyncConnection, event_id: UUID) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(EVENT_SELECT + " WHERE e.event_id = %s", (event_id,))
            row = await cur.fetchone()
    except Exception as exc:
        _raise(exc)
    if not row:
        raise NotFoundError("The requested event was not found.")
    return row


async def event_exists(conn: AsyncConnection, event_id: UUID) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT 1 FROM public.campus_event WHERE event_id = %s",
            (event_id,),
        )
        return await cur.fetchone() is not None


async def list_events(conn: AsyncConnection, query: EventListQuery) -> tuple[list[dict], int]:
    filters = ["TRUE"]
    params: list[object] = []

    if query.category_code:
        filters.append("e.category_code = %s")
        params.append(query.category_code)
    if query.event_type_id:
        filters.append("e.event_type_id = %s")
        params.append(query.event_type_id)
    if query.status_code:
        filters.append("e.status_code = %s")
        params.append(query.status_code)
    if query.severity_code:
        filters.append("e.severity_code = %s")
        params.append(query.severity_code)
    if query.location_id:
        filters.append("e.location_id = %s")
        params.append(query.location_id)
    if query.asset_id:
        filters.append("e.asset_id = %s")
        params.append(query.asset_id)
    if query.service_id:
        filters.append("e.service_id = %s")
        params.append(query.service_id)
    if query.started_after:
        filters.append("e.started_at >= %s")
        params.append(query.started_after)
    if query.started_before:
        filters.append("e.started_at <= %s")
        params.append(query.started_before)
    if query.keyword:
        pattern = f"%{_escape_like(query.keyword.strip())}%"
        filters.append(
            "(e.title ILIKE %s ESCAPE '\\' OR e.description ILIKE %s ESCAPE '\\' OR e.event_code ILIKE %s ESCAPE '\\')"
        )
        params.extend([pattern, pattern, pattern])

    where_sql = " AND ".join(filters)
    offset = (query.page - 1) * query.page_size
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                f"SELECT count(*) AS total FROM public.campus_event e WHERE {where_sql}",
                params,
            )
            total_row = await cur.fetchone()
            total = int(total_row["total"]) if total_row else 0
            await cur.execute(
                EVENT_SUMMARY_SELECT + f" WHERE {where_sql} ORDER BY e.started_at DESC, e.event_code LIMIT %s OFFSET %s",
                [*params, query.page_size, offset],
            )
            rows = await cur.fetchall()
    except Exception as exc:
        _raise(exc)
    return rows, total


async def update_event(conn: AsyncConnection, event_id: UUID, patch: EventUpdate, current: dict) -> dict:
    assignments: list[str] = []
    params: list[object] = []
    data = patch.model_dump(exclude_unset=True)

    allowed = {
        "title",
        "description",
        "category_code",
        "event_type_id",
        "severity_code",
        "location_id",
        "asset_id",
        "service_id",
        "scheduled_activity_id",
        "started_at",
        "ended_at",
        "source_note",
    }
    for key, value in data.items():
        if key not in allowed:
            continue
        assignments.append(f"{key} = %s")
        params.append(value)

    if not assignments:
        return await get_event(conn, event_id)

    merged = {**current, **data}
    if not any(
        [
            merged.get("location_id"),
            merged.get("asset_id"),
            merged.get("service_id"),
            merged.get("scheduled_activity_id"),
        ]
    ):
        from app.errors.exceptions import ConflictError

        raise ConflictError("At least one location, asset, service or scheduled activity is required.")

    params.append(event_id)
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                f"UPDATE public.campus_event SET {', '.join(assignments)} WHERE event_id = %s",
                params,
            )
    except Exception as exc:
        _raise(exc)
    return await get_event(conn, event_id)


async def update_event_status(conn: AsyncConnection, event_id: UUID, status_code: str) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE public.campus_event SET status_code = %s WHERE event_id = %s",
                (status_code, event_id),
            )
            if cur.rowcount == 0:
                raise NotFoundError("The requested event was not found.")
    except NotFoundError:
        raise
    except Exception as exc:
        _raise(exc)
    return await get_event(conn, event_id)


async def list_status_history(conn: AsyncConnection, event_id: UUID) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT history_id, event_id, old_status_code, new_status_code,
                       changed_at, changed_by, reason, is_initial
                FROM public.event_status_history
                WHERE event_id = %s
                ORDER BY changed_at ASC, is_initial DESC
                """,
                (event_id,),
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def list_events_as_of(
    conn: AsyncConnection,
    at: datetime,
    status_code: str | None,
    category_code: str | None,
    page: int,
    page_size: int,
) -> tuple[list[dict], int]:
    filters = ["e.created_at <= %s"]
    params: list[object] = [at]
    if status_code:
        filters.append("h.new_status_code = %s")
        params.append(status_code)
    if category_code:
        filters.append("e.category_code = %s")
        params.append(category_code)
    where_sql = " AND ".join(filters)
    offset = (page - 1) * page_size
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT count(*) AS total
                FROM public.campus_event e
                JOIN LATERAL (
                    SELECT h.new_status_code, h.changed_at, h.reason
                    FROM public.event_status_history h
                    WHERE h.event_id = e.event_id
                      AND h.changed_at <= %s
                    ORDER BY h.changed_at DESC
                    LIMIT 1
                ) h ON TRUE
                WHERE {where_sql}
                """,
                [at, *params],
            )
            total_row = await cur.fetchone()
            total = int(total_row["total"]) if total_row else 0
            await cur.execute(
                f"""
                SELECT
                    e.event_id,
                    e.event_code,
                    e.title,
                    h.new_status_code AS status_as_recorded,
                    h.changed_at AS status_recorded_at,
                    h.reason AS history_reason
                FROM public.campus_event e
                JOIN LATERAL (
                    SELECT h.new_status_code, h.changed_at, h.reason
                    FROM public.event_status_history h
                    WHERE h.event_id = e.event_id
                      AND h.changed_at <= %s
                    ORDER BY h.changed_at DESC
                    LIMIT 1
                ) h ON TRUE
                WHERE {where_sql}
                ORDER BY e.event_code
                LIMIT %s OFFSET %s
                """,
                [at, *params, page_size, offset],
            )
            rows = await cur.fetchall()
    except Exception as exc:
        _raise(exc)
    return rows, total


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
