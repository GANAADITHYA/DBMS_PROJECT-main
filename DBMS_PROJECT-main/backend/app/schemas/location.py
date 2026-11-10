from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    location_id: UUID
    location_code: str
    name: str
    location_type: str
    parent_location_id: UUID | None = None
    parent_name: str | None = None
    map_number: int | None = None
    floor_number: str | None = None
    department_id: UUID | None = None
    department_name: str | None = None
    description: str | None = None
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BuildingSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    location_id: UUID
    location_code: str
    name: str
    location_type: str
    map_number: int | None = None
    description: str | None = None
    is_active: bool = True
    room_count: int = 0
    floors: list[str] = Field(default_factory=list)


class RoomCreate(BaseModel):
    parent_location_id: UUID
    name: str = Field(..., min_length=1, max_length=150)
    location_code: str = Field(..., min_length=1, max_length=50)
    location_type: str = Field(default="room")
    floor_number: str = Field(..., min_length=1, max_length=50)
    department_id: UUID | None = None
    description: str | None = None


class RoomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    location_code: str | None = Field(default=None, min_length=1, max_length=50)
    location_type: str | None = None
    floor_number: str | None = Field(default=None, min_length=1, max_length=50)
    department_id: UUID | None = None
    description: str | None = None


class LocationStats(BaseModel):
    total_locations: int
    total_buildings: int
    total_classrooms: int
    total_laboratories: int
    total_floors: int
    total_facilities: int
    total_rooms: int
