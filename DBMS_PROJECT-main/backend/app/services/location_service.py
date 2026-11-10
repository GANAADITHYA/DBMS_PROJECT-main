from __future__ import annotations

from uuid import UUID

from app.db.transactions import connection
from app.repositories import location_repository
from app.schemas.location import (
    BuildingSummary,
    LocationRead,
    LocationStats,
    RoomCreate,
    RoomUpdate,
)


async def list_locations(
    location_type: str | None = None,
    parent_location_id: UUID | None = None,
    search: str | None = None,
) -> list[LocationRead]:
    async with connection() as conn:
        rows = await location_repository.list_locations(
            conn, location_type=location_type, parent_location_id=parent_location_id, search=search
        )
        return [LocationRead.model_validate(row) for row in rows]


async def list_buildings() -> list[BuildingSummary]:
    async with connection() as conn:
        rows = await location_repository.list_buildings(conn)
        return [BuildingSummary.model_validate(row) for row in rows]


async def list_building_rooms(building_id: UUID) -> list[LocationRead]:
    async with connection() as conn:
        rows = await location_repository.list_building_rooms(conn, building_id)
        return [LocationRead.model_validate(row) for row in rows]


async def get_location(location_id: UUID) -> LocationRead:
    async with connection() as conn:
        row = await location_repository.get_location(conn, location_id)
        return LocationRead.model_validate(row)


async def create_room(payload: RoomCreate) -> LocationRead:
    async with connection() as conn:
        row = await location_repository.create_room(conn, payload)
        return LocationRead.model_validate(row)


async def update_location(location_id: UUID, payload: RoomUpdate) -> LocationRead:
    async with connection() as conn:
        row = await location_repository.update_location(conn, location_id, payload)
        return LocationRead.model_validate(row)


async def delete_location(location_id: UUID) -> None:
    async with connection() as conn:
        await location_repository.delete_location(conn, location_id)


async def get_stats() -> LocationStats:
    async with connection() as conn:
        stats = await location_repository.get_stats(conn)
        return LocationStats.model_validate(stats)
