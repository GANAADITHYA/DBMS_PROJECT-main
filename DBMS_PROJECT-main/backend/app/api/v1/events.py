from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.api.deps import require_permission
from app.core.permissions import (
    EVENT_CLOSE,
    EVENT_CREATE,
    EVENT_READ,
    EVENT_STATUS,
    EVENT_VOID,
    INVESTIGATE,
)
from app.core.security import CurrentUser
from app.schemas.common import Page
from app.schemas.event import (
    EventAsOfItem,
    EventCloseRequest,
    EventCreate,
    EventDetail,
    EventListQuery,
    EventStatusChange,
    EventStatusHistoryItem,
    EventSummary,
    EventUpdate,
    EventVoidRequest,
)
from app.schemas.investigation import AsOfQuery
from app.services import event_service

router = APIRouter(tags=["events"])


@router.post("/events", response_model=EventDetail, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    user: Annotated[CurrentUser, Depends(require_permission(EVENT_CREATE))],
) -> EventDetail:
    return await event_service.register_event(user, payload)


@router.get("/events", response_model=Page[EventSummary])
async def list_events(
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
    category_code: str | None = None,
    event_type_id: UUID | None = None,
    status_code: str | None = None,
    severity_code: str | None = None,
    location_id: UUID | None = None,
    asset_id: UUID | None = None,
    service_id: UUID | None = None,
    started_after: datetime | None = None,
    started_before: datetime | None = None,
    keyword: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[EventSummary]:
    query = EventListQuery(
        category_code=category_code,
        event_type_id=event_type_id,
        status_code=status_code,
        severity_code=severity_code,
        location_id=location_id,
        asset_id=asset_id,
        service_id=service_id,
        started_after=started_after,
        started_before=started_before,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )
    return await event_service.list_events(query)


@router.get("/events/as-of", response_model=Page[EventAsOfItem])
async def events_as_of(
    _: Annotated[CurrentUser, Depends(require_permission(INVESTIGATE))],
    at: datetime,
    status_code: str | None = None,
    category_code: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> Page[EventAsOfItem]:
    try:
        query = AsOfQuery(
            at=at,
            status_code=status_code,
            category_code=category_code,
            page=page,
            page_size=page_size,
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc
    return await event_service.events_as_of(query)


@router.get("/events/{event_id}", response_model=EventDetail)
async def get_event(
    event_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
) -> EventDetail:
    return await event_service.get_event(event_id)


@router.patch("/events/{event_id}", response_model=EventDetail)
async def update_event(
    event_id: UUID,
    payload: EventUpdate,
    user: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
) -> EventDetail:
    return await event_service.update_event(user, event_id, payload)


@router.patch("/events/{event_id}/status", response_model=EventDetail)
async def change_status(
    event_id: UUID,
    payload: EventStatusChange,
    user: Annotated[CurrentUser, Depends(require_permission(EVENT_STATUS))],
) -> EventDetail:
    return await event_service.change_status(user, event_id, payload.status_code, payload.reason)


@router.post("/events/{event_id}/close", response_model=EventDetail)
async def close_event(
    event_id: UUID,
    payload: EventCloseRequest,
    user: Annotated[CurrentUser, Depends(require_permission(EVENT_CLOSE))],
) -> EventDetail:
    return await event_service.close_event(user, event_id, payload.reason)


@router.post("/events/{event_id}/void", response_model=EventDetail)
async def void_event(
    event_id: UUID,
    payload: EventVoidRequest,
    user: Annotated[CurrentUser, Depends(require_permission(EVENT_VOID))],
) -> EventDetail:
    return await event_service.void_event(user, event_id, payload.reason)


@router.get("/events/{event_id}/status-history", response_model=list[EventStatusHistoryItem])
async def status_history(
    event_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
) -> list[EventStatusHistoryItem]:
    return await event_service.status_history(event_id)


@router.delete("/events/{event_id}", status_code=status.HTTP_405_METHOD_NOT_ALLOWED)
async def reject_hard_delete(
    event_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(EVENT_READ))],
) -> Response:
    return Response(
        content='{"error":{"code":"method_not_allowed","message":"Events are not hard-deleted. Use the void workflow."}}',
        media_type="application/json",
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
    )
