from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_permission
from app.core.permissions import DASHBOARD_READ
from app.core.security import CurrentUser
from app.schemas.report import DashboardSummary, RecurrenceQuery, RecurrenceReport
from app.services import report_service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(
    _: Annotated[CurrentUser, Depends(require_permission(DASHBOARD_READ))],
) -> DashboardSummary:
    return await report_service.dashboard_summary()


@router.get("/analytics/recurrence", response_model=RecurrenceReport)
async def recurrence(
    _: Annotated[CurrentUser, Depends(require_permission(DASHBOARD_READ))],
    started_after: datetime,
    started_before: datetime,
    category_code: str | None = Query(default=None),
) -> RecurrenceReport:
    query = RecurrenceQuery(
        started_after=started_after,
        started_before=started_before,
        category_code=category_code,
    )
    return await report_service.recurrence(query.started_after, query.started_before, query.category_code)
