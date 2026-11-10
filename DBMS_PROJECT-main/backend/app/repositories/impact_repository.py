from __future__ import annotations

from uuid import UUID

from psycopg import AsyncConnection

from app.errors.exceptions import NotFoundError
from app.errors.handlers import map_psycopg_error
from app.schemas.impact import ImpactCreate, ImpactUpdate


IMPACT_SELECT = """
SELECT
    i.impact_id,
    i.event_id,
    i.impact_type_code,
    it.display_name AS impact_type_name,
    i.affected_location_id,
    i.affected_asset_id,
    i.affected_service_id,
    i.affected_activity_id,
    i.affected_department_id,
    i.affected_object_description,
    i.quantity,
    i.unit_code,
    u.display_name AS unit_name,
    i.verification_status,
    i.estimate_basis,
    i.recorded_by,
    i.recorded_at,
    i.data_class_code
FROM public.event_impact i
JOIN public.impact_type it ON it.impact_type_code = i.impact_type_code
JOIN public.measurement_unit u ON u.unit_code = i.unit_code
"""


def _raise(exc: Exception) -> None:
    from psycopg import Error as PsycopgError

    if isinstance(exc, PsycopgError):
        raise map_psycopg_error(exc) from exc
    raise exc


async def get_impact(conn: AsyncConnection, impact_id: UUID) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(IMPACT_SELECT + " WHERE i.impact_id = %s", (impact_id,))
            row = await cur.fetchone()
    except Exception as exc:
        _raise(exc)
    if not row:
        raise NotFoundError("The requested impact record was not found.")
    return row


async def list_event_impacts(conn: AsyncConnection, event_id: UUID) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                IMPACT_SELECT + " WHERE i.event_id = %s ORDER BY i.recorded_at ASC",
                (event_id,),
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def add_impact(conn: AsyncConnection, event_id: UUID, payload: ImpactCreate) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO public.event_impact (
                    event_id,
                    impact_type_code,
                    affected_location_id,
                    affected_asset_id,
                    affected_service_id,
                    affected_activity_id,
                    affected_department_id,
                    affected_object_description,
                    quantity,
                    unit_code,
                    verification_status,
                    estimate_basis,
                    data_class_code
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING impact_id
                """,
                (
                    event_id,
                    payload.impact_type_code,
                    payload.affected_location_id,
                    payload.affected_asset_id,
                    payload.affected_service_id,
                    payload.affected_activity_id,
                    payload.affected_department_id,
                    payload.affected_object_description,
                    payload.quantity,
                    payload.unit_code,
                    payload.verification_status,
                    payload.estimate_basis,
                    payload.data_class_code,
                ),
            )
            row = await cur.fetchone()
    except Exception as exc:
        _raise(exc)
    return await get_impact(conn, row["impact_id"])


async def update_impact(conn: AsyncConnection, impact_id: UUID, payload: ImpactUpdate) -> dict:
    data = payload.model_dump(exclude_unset=True)
    if not data:
        return await get_impact(conn, impact_id)
    allowed = {
        "quantity",
        "unit_code",
        "verification_status",
        "estimate_basis",
        "affected_object_description",
    }
    assignments = []
    params: list[object] = []
    for key, value in data.items():
        if key in allowed:
            assignments.append(f"{key} = %s")
            params.append(value)
    params.append(impact_id)
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                f"UPDATE public.event_impact SET {', '.join(assignments)} WHERE impact_id = %s",
                params,
            )
            if cur.rowcount == 0:
                raise NotFoundError("The requested impact record was not found.")
    except NotFoundError:
        raise
    except Exception as exc:
        _raise(exc)
    return await get_impact(conn, impact_id)
