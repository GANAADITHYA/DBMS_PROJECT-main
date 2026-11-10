from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_permission
from app.core.permissions import EVENT_CREATE, EVENT_READ
from app.core.security import CurrentUser
from app.schemas.location import (
    BuildingSummary,
    LocationRead,
    LocationStats,
    RoomCreate,
    RoomUpdate,
)
from app.services import location_service

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("", response_model=list[LocationRead])
async def list_locations(
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
    location_type: str | None = None,
    parent_location_id: UUID | None = None,
    search: str | None = None,
) -> list[LocationRead]:
    return await location_service.list_locations(
        location_type=location_type,
        parent_location_id=parent_location_id,
        search=search,
    )


@router.get("/stats", response_model=LocationStats)
async def get_location_stats(
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
) -> LocationStats:
    return await location_service.get_stats()


@router.get("/buildings", response_model=list[BuildingSummary])
async def list_buildings(
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
) -> list[BuildingSummary]:
    return await location_service.list_buildings()


@router.get("/buildings/{building_id}/rooms", response_model=list[LocationRead])
async def list_building_rooms(
    building_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
) -> list[LocationRead]:
    return await location_service.list_building_rooms(building_id)


@router.get("/{location_id}", response_model=LocationRead)
async def get_location(
    location_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
) -> LocationRead:
    return await location_service.get_location(location_id)


@router.post("/rooms", response_model=LocationRead, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate,
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_CREATE))],
) -> LocationRead:
    return await location_service.create_room(payload)


@router.patch("/{location_id}", response_model=LocationRead)
async def update_location(
    location_id: UUID,
    payload: RoomUpdate,
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_CREATE))],
) -> LocationRead:
    return await location_service.update_location(location_id, payload)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_CREATE))],
) -> None:
    await location_service.delete_location(location_id)
