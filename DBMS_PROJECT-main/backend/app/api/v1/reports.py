from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.deps import require_permission
from app.core.permissions import REPORT_READ
from app.core.security import CurrentUser
from app.schemas.report import DateRangeQuery, EventInvestigationReport, EventSummaryReport
from app.services import report_service

router = APIRouter(tags=["reports"])


@router.get("/reports/event-summary", response_model=EventSummaryReport)
async def event_summary_report(
    _: Annotated[CurrentUser, Depends(require_permission(REPORT_READ))],
    started_after: datetime,
    started_before: datetime,
) -> EventSummaryReport:
    query = DateRangeQuery(started_after=started_after, started_before=started_before)
    return await report_service.event_summary_report(query.started_after, query.started_before)


@router.get("/reports/event-investigation/{event_id}", response_model=EventInvestigationReport)
async def event_investigation_report(
    event_id: UUID,
    _: Annotated[CurrentUser, Depends(require_permission(REPORT_READ))],
) -> EventInvestigationReport:
    return await report_service.event_investigation_report(event_id)
