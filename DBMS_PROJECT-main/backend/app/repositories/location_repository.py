from __future__ import annotations

from uuid import UUID

from psycopg import AsyncConnection

from app.errors.exceptions import ConflictError, NotFoundError
from app.errors.handlers import map_psycopg_error
from app.schemas.location import RoomCreate, RoomUpdate

LOCATION_SELECT = """
SELECT
    l.location_id,
    l.location_code,
    l.name,
    l.location_type,
    l.parent_location_id,
    p.name AS parent_name,
    l.map_number,
    l.floor_number,
    l.department_id,
    d.name AS department_name,
    l.description,
    l.is_active,
    l.created_at,
    l.updated_at
FROM public.campus_location l
LEFT JOIN public.campus_location p ON p.location_id = l.parent_location_id
LEFT JOIN public.department d ON d.department_id = l.department_id
"""


async def list_locations(
    conn: AsyncConnection,
    location_type: str | None = None,
    parent_location_id: UUID | None = None,
    search: str | None = None,
) -> list[dict]:
    query = LOCATION_SELECT + " WHERE l.is_active = TRUE"
    params: list = []

    if location_type:
        query += " AND l.location_type = %s"
        params.append(location_type)
    if parent_location_id:
        query += " AND l.parent_location_id = %s"
        params.append(parent_location_id)
    if search:
        query += " AND (l.name ILIKE %s OR l.location_code ILIKE %s)"
        pattern = f"%{search}%"
        params.extend([pattern, pattern])

    query += " ORDER BY l.map_number NULLS LAST, l.name ASC"

    async with conn.cursor() as cur:
        await cur.execute(query, params)
        return await cur.fetchall()


async def list_buildings(conn: AsyncConnection) -> list[dict]:
    query = """
    SELECT
        b.location_id,
        b.location_code,
        b.name,
        b.location_type,
        b.map_number,
        b.description,
        b.is_active,
        COUNT(r.location_id) AS room_count,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.floor_number), NULL) AS floors
    FROM public.campus_location b
    LEFT JOIN public.campus_location r ON r.parent_location_id = b.location_id AND r.is_active = TRUE
    WHERE (b.location_type IN ('building', 'sports', 'hostel', 'facility', 'landmark')
       OR b.parent_location_id IS NULL)
       AND b.is_active = TRUE
    GROUP BY b.location_id, b.location_code, b.name, b.location_type, b.map_number, b.description, b.is_active
    ORDER BY b.map_number NULLS LAST, b.name ASC;
    """
    async with conn.cursor() as cur:
        await cur.execute(query)
        rows = await cur.fetchall()
        return [
            {
                **row,
                "floors": [f for f in (row.get("floors") or []) if f],
                "room_count": int(row.get("room_count") or 0),
            }
            for row in rows
        ]


async def list_building_rooms(conn: AsyncConnection, building_id: UUID) -> list[dict]:
    query = (
        LOCATION_SELECT
        + """
    WHERE (l.parent_location_id = %s OR l.parent_location_id IN (
        SELECT location_id FROM public.campus_location WHERE parent_location_id = %s
    ))
    AND l.location_type NOT IN ('campus', 'building')
    AND l.is_active = TRUE
    ORDER BY l.floor_number NULLS FIRST, l.name ASC;
    """
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (building_id, building_id))
        return await cur.fetchall()


async def get_location(conn: AsyncConnection, location_id: UUID) -> dict:
    query = LOCATION_SELECT + " WHERE l.location_id = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (location_id,))
        row = await cur.fetchone()
        if not row:
            raise NotFoundError("Location not found.")
        return row


async def create_room(conn: AsyncConnection, payload: RoomCreate) -> dict:
    # Verify parent building exists
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT location_id FROM public.campus_location WHERE location_id = %s AND is_active = TRUE",
            (payload.parent_location_id,),
        )
        if not await cur.fetchone():
            raise NotFoundError("Target building does not exist.")

        # Check code uniqueness
        await cur.execute(
            "SELECT location_id FROM public.campus_location WHERE location_code = %s",
            (payload.location_code,),
        )
        if await cur.fetchone():
            raise ConflictError(f"Location code '{payload.location_code}' is already registered.")

        insert_sql = """
        INSERT INTO public.campus_location (
            location_code,
            name,
            location_type,
            parent_location_id,
            floor_number,
            department_id,
            description,
            is_active
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
        RETURNING location_id;
        """
        try:
            await cur.execute(
                insert_sql,
                (
                    payload.location_code,
                    payload.name,
                    payload.location_type,
                    payload.parent_location_id,
                    payload.floor_number,
                    payload.department_id,
                    payload.description,
                ),
            )
            created = await cur.fetchone()
            await conn.commit()
        except Exception as exc:
            await conn.rollback()
            raise map_psycopg_error(exc) from exc

    return await get_location(conn, created["location_id"])


async def update_location(conn: AsyncConnection, location_id: UUID, payload: RoomUpdate) -> dict:
    existing = await get_location(conn, location_id)

    updates: list[str] = []
    params: list = []

    if payload.name is not None:
        updates.append("name = %s")
        params.append(payload.name)
    if payload.location_code is not None and payload.location_code != existing["location_code"]:
        # check unique
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT location_id FROM public.campus_location WHERE location_code = %s AND location_id != %s",
                (payload.location_code, location_id),
            )
            if await cur.fetchone():
                raise ConflictError(f"Location code '{payload.location_code}' is already registered.")
        updates.append("location_code = %s")
        params.append(payload.location_code)
    if payload.location_type is not None:
        updates.append("location_type = %s")
        params.append(payload.location_type)
    if payload.floor_number is not None:
        updates.append("floor_number = %s")
        params.append(payload.floor_number)
    if payload.department_id is not None:
        updates.append("department_id = %s")
        params.append(payload.department_id)
    if payload.description is not None:
        updates.append("description = %s")
        params.append(payload.description)

    if not updates:
        return existing

    updates.append("updated_at = NOW()")
    params.append(location_id)

    sql = f"UPDATE public.campus_location SET {', '.join(updates)} WHERE location_id = %s;"
    async with conn.cursor() as cur:
        try:
            await cur.execute(sql, params)
            await conn.commit()
        except Exception as exc:
            await conn.rollback()
            raise map_psycopg_error(exc) from exc

    return await get_location(conn, location_id)


async def delete_location(conn: AsyncConnection, location_id: UUID) -> None:
    # Check if location is referenced by campus_event
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT COUNT(*) AS event_count FROM public.campus_event WHERE location_id = %s;",
            (location_id,),
        )
        row = await cur.fetchone()
        event_count = row["event_count"] if row else 0

        if event_count > 0:
            # Soft delete to preserve provenance
            await cur.execute(
                "UPDATE public.campus_location SET is_active = FALSE, updated_at = NOW() WHERE location_id = %s;",
                (location_id,),
            )
        else:
            # Hard delete if clean
            await cur.execute(
                "DELETE FROM public.campus_location WHERE location_id = %s;",
                (location_id,),
            )
        await conn.commit()


async def get_stats(conn: AsyncConnection) -> dict:
    async with conn.cursor() as cur:
        await cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE is_active = TRUE) AS total_locations,
                COUNT(*) FILTER (WHERE is_active = TRUE AND (location_type IN ('building', 'sports', 'hostel') OR (parent_location_id IS NULL AND location_type != 'campus'))) AS total_buildings,
                COUNT(*) FILTER (WHERE is_active = TRUE AND location_type IN ('classroom', 'room')) AS total_classrooms,
                COUNT(*) FILTER (WHERE is_active = TRUE AND location_type = 'lab') AS total_laboratories,
                COUNT(DISTINCT floor_number) FILTER (WHERE is_active = TRUE AND floor_number IS NOT NULL AND floor_number != '') AS total_floors,
                COUNT(*) FILTER (WHERE is_active = TRUE AND location_type IN ('facility', 'landmark')) AS total_facilities,
                COUNT(*) FILTER (WHERE is_active = TRUE AND location_type IN ('room', 'classroom', 'lab', 'office', 'auditorium', 'conference_room')) AS total_rooms
            FROM public.campus_location;
        """)
        row = await cur.fetchone()
        return {
            "total_locations": int(row["total_locations"] or 0),
            "total_buildings": int(row["total_buildings"] or 0),
            "total_classrooms": int(row["total_classrooms"] or 0),
            "total_laboratories": int(row["total_laboratories"] or 0),
            "total_floors": int(row["total_floors"] or 0),
            "total_facilities": int(row["total_facilities"] or 0),
            "total_rooms": int(row["total_rooms"] or 0),
        }
