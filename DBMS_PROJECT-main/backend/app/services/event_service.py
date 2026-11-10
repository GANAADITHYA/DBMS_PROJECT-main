from __future__ import annotations

from uuid import UUID

from app.core.security import CurrentUser
from app.db import procedures
from app.db.transactions import connection, transaction
from app.errors.exceptions import ConflictError, NotFoundError
from app.repositories import event_repository
from app.schemas.common import Page
from app.schemas.event import (
    EventAsOfItem,
    EventCreate,
    EventDetail,
    EventListQuery,
    EventStatusHistoryItem,
    EventSummary,
    EventUpdate,
)

RECONSTRUCTION_NOTE = (
    "This result reconstructs status as recorded at the selected time. "
    "It is not full field-level history."
)


_EVENT_SUMMARY_FIELDS = set(EventSummary.model_fields.keys())


def _detail(row: dict) -> EventDetail:
    return EventDetail.model_validate(row)


def _summary(row: dict) -> EventSummary:
    summary_data = {k: v for k, v in row.items() if k in _EVENT_SUMMARY_FIELDS}
    return EventSummary.model_validate(summary_data)


async def register_event(user: CurrentUser, payload: EventCreate) -> EventDetail:
    async with transaction(actor_id=user.user_id) as conn:
        event_id = await procedures.register_event(
            conn,
            event_code=payload.event_code,
            title=payload.title,
            description=payload.description,
            category_code=payload.category_code,
            event_type_id=payload.event_type_id,
            severity_code=payload.severity_code,
            location_id=payload.location_id,
            asset_id=payload.asset_id,
            service_id=payload.service_id,
            scheduled_activity_id=payload.scheduled_activity_id,
            started_at=payload.started_at,
            data_class_code=payload.data_class_code,
        )
        row = await event_repository.get_event(conn, event_id)
    return _detail(row)


async def list_events(query: EventListQuery) -> Page[EventSummary]:
    async with connection() as conn:
        rows, total = await event_repository.list_events(conn, query)
    return Page[EventSummary](
        items=[_summary(row) for row in rows],
        page=query.page,
        page_size=query.page_size,
        total=total,
    )


async def get_event(event_id: UUID) -> EventDetail:
    async with connection() as conn:
        row = await event_repository.get_event(conn, event_id)
    return _detail(row)


async def update_event(user: CurrentUser, event_id: UUID, payload: EventUpdate) -> EventDetail:
    async with transaction(actor_id=user.user_id) as conn:
        current = await event_repository.get_event(conn, event_id)
        if current.get("is_terminal"):
            raise ConflictError("This event is in a terminal status and cannot be edited.")
        row = await event_repository.update_event(conn, event_id, payload, current)
    return _detail(row)


async def change_status(user: CurrentUser, event_id: UUID, status_code: str, reason: str) -> EventDetail:
    async with transaction(actor_id=user.user_id, change_reason=reason) as conn:
        await event_repository.get_event(conn, event_id)
        row = await event_repository.update_event_status(conn, event_id, status_code)
    return _detail(row)


async def close_event(user: CurrentUser, event_id: UUID, reason: str) -> EventDetail:
    async with transaction(actor_id=user.user_id, change_reason=reason) as conn:
        if not await event_repository.event_exists(conn, event_id):
            raise NotFoundError("The requested event was not found.")
        await procedures.close_event(conn, event_id, reason)
        row = await event_repository.get_event(conn, event_id)
    return _detail(row)


async def void_event(user: CurrentUser, event_id: UUID, reason: str) -> EventDetail:
    async with transaction(actor_id=user.user_id, change_reason=reason) as conn:
        current = await event_repository.get_event(conn, event_id)
        if current["status_code"] == "void":
            raise ConflictError("This event is already void.")
        row = await event_repository.update_event_status(conn, event_id, "void")
    return _detail(row)


async def status_history(event_id: UUID) -> list[EventStatusHistoryItem]:
    async with connection() as conn:
        if not await event_repository.event_exists(conn, event_id):
            raise NotFoundError("The requested event was not found.")
        rows = await event_repository.list_status_history(conn, event_id)
    return [EventStatusHistoryItem.model_validate(row) for row in rows]


async def events_as_of(query) -> Page[EventAsOfItem]:
    async with connection() as conn:
        rows, total = await event_repository.list_events_as_of(
            conn,
            query.at,
            query.status_code,
            query.category_code,
            query.page,
            query.page_size,
        )
    items = [
        EventAsOfItem(
            event_id=row["event_id"],
            event_code=row["event_code"],
            title=row["title"],
            status_as_recorded=row["status_as_recorded"],
            status_recorded_at=row["status_recorded_at"],
            history_reason=row["history_reason"],
            reconstruction_note=RECONSTRUCTION_NOTE,
        )
        for row in rows
    ]
    return Page[EventAsOfItem](
        items=items,
        page=query.page,
        page_size=query.page_size,
        total=total,
    )
