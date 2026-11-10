from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_permission
from app.core.permissions import REFERENCE_READ
from app.core.security import CurrentUser
from app.services.report_service import LOOKUP_QUERIES, lookup

router = APIRouter(prefix="/reference", tags=["reference"])


@router.get("/{name}")
async def get_reference(
    name: str,
    _: Annotated[CurrentUser, Depends(require_permission(REFERENCE_READ))],
) -> list[dict]:
    if name not in LOOKUP_QUERIES:
        raise HTTPException(status_code=404, detail="Unknown reference collection.")
    return await lookup(name)
