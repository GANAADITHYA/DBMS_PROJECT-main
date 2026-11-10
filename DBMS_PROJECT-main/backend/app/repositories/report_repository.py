from __future__ import annotations

from datetime import datetime

from psycopg import AsyncConnection

from app.errors.handlers import map_psycopg_error


def _raise(exc: Exception) -> None:
    from psycopg import Error as PsycopgError

    if isinstance(exc, PsycopgError):
        raise map_psycopg_error(exc) from exc
    raise exc


async def open_event_counts_by_category(conn: AsyncConnection) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT e.category_code AS code, c.display_name, count(*) AS event_count
                FROM public.v_open_campus_events_summary v
                JOIN public.campus_event e ON e.event_id = v.event_id
                JOIN public.event_category c ON c.category_code = e.category_code
                GROUP BY e.category_code, c.display_name
                ORDER BY c.display_name
                """
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def open_event_counts_by_severity(conn: AsyncConnection) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT e.severity_code AS code, s.display_name, count(*) AS event_count
                FROM public.v_open_campus_events_summary v
                JOIN public.campus_event e ON e.event_id = v.event_id
                JOIN public.severity_level s ON s.severity_code = e.severity_code
                GROUP BY e.severity_code, s.display_name, s.severity_rank
                ORDER BY s.severity_rank
                """
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def recent_open_events(conn: AsyncConnection, limit: int = 10) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT event_id, event_code, title, category_name, event_type_name,
                       severity_name, status_name, location_name, started_at, created_at
                FROM public.v_open_campus_events_summary
                ORDER BY started_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def recurrence_by_location(
    conn: AsyncConnection,
    started_after: datetime,
    started_before: datetime,
    category_code: str | None,
) -> list[dict]:
    filters = ["e.location_id IS NOT NULL", "e.started_at >= %s", "e.started_at <= %s"]
    params: list[object] = [started_after, started_before]
    if category_code:
        filters.append("e.category_code = %s")
        params.append(category_code)
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT l.location_id AS object_id, l.location_code AS object_code,
                       l.name AS object_name, count(*) AS event_count
                FROM public.campus_event e
                JOIN public.campus_location l ON l.location_id = e.location_id
                WHERE {' AND '.join(filters)}
                GROUP BY l.location_id, l.location_code, l.name
                ORDER BY event_count DESC, l.location_code
                """,
                params,
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def recurrence_by_asset(
    conn: AsyncConnection,
    started_after: datetime,
    started_before: datetime,
    category_code: str | None,
) -> list[dict]:
    filters = ["e.asset_id IS NOT NULL", "e.started_at >= %s", "e.started_at <= %s"]
    params: list[object] = [started_after, started_before]
    if category_code:
        filters.append("e.category_code = %s")
        params.append(category_code)
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT a.asset_id AS object_id, a.asset_code AS object_code,
                       a.name AS object_name, count(*) AS event_count
                FROM public.campus_event e
                JOIN public.campus_asset a ON a.asset_id = e.asset_id
                WHERE {' AND '.join(filters)}
                GROUP BY a.asset_id, a.asset_code, a.name
                ORDER BY event_count DESC, a.asset_code
                """,
                params,
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def event_summary_groups(
    conn: AsyncConnection,
    started_after: datetime,
    started_before: datetime,
) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    c.category_code,
                    c.display_name AS category_name,
                    st.status_code,
                    st.display_name AS status_name,
                    count(*) AS event_count
                FROM public.campus_event e
                JOIN public.event_category c ON c.category_code = e.category_code
                JOIN public.event_status st ON st.status_code = e.status_code
                WHERE e.started_at >= %s AND e.started_at <= %s
                GROUP BY c.category_code, c.display_name, st.status_code, st.display_name, st.sort_order
                ORDER BY c.category_code, st.sort_order
                """,
                (started_after, started_before),
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def event_impact_view_rows(conn: AsyncConnection, event_id) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT event_id, impact_type_code, impact_type_name, unit_code, unit_name,
                       dimension_code, verification_status, impact_record_count, raw_recorded_quantity
                FROM public.v_campus_event_impact_summary
                WHERE event_id = %s
                ORDER BY impact_type_code, unit_code, verification_status
                """,
                (event_id,),
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def list_lookup(conn: AsyncConnection, table_sql: str) -> list[dict]:
    """Run a fixed, caller-supplied lookup query. table_sql must be a constant."""
    try:
        async with conn.cursor() as cur:
            await cur.execute(table_sql)
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []
