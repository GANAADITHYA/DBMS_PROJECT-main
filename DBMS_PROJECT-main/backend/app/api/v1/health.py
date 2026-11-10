from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.api.deps import request_id
from app.core.config import get_settings
from app.db.connection import check_database_readiness, ping_database
from app.schemas.common import DatabaseHealthResponse, HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request, req_id: Annotated[str, Depends(request_id)]) -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
        auth_configured=settings.auth_is_configured,
        database_configured=settings.database_is_configured,
        request_id=req_id,
    )


@router.get("/health/database", response_model=DatabaseHealthResponse)
async def database_health() -> JSONResponse:
    result = await ping_database()
    status_code = 200 if result["status"] == "ready" else 503
    return JSONResponse(status_code=status_code, content=result)

@router.get("/health/ready")
async def readiness() -> JSONResponse:
    result = await check_database_readiness()
    status_code = 200 if result["status"] == "ready" else 503
    return JSONResponse(status_code=status_code, content=result)
