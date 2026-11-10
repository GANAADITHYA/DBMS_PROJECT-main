from fastapi import APIRouter

from app.api.v1 import (
    auth,
    dashboard,
    events,
    evidence,
    health,
    impacts,
    investigations,
    locations,
    reference,
    relationships,
    reports,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(health.router)
api_router.include_router(events.router)
api_router.include_router(locations.router)
api_router.include_router(relationships.router)
api_router.include_router(evidence.router)
api_router.include_router(impacts.router)
api_router.include_router(investigations.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
api_router.include_router(reference.router)
