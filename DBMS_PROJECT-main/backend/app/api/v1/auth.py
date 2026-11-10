from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import get_auth_provider
from app.core.security import AuthProvider
from app.schemas.auth import LoginRequest, LoginResponse, SignupRequest, SignupResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    provider: Annotated[AuthProvider, Depends(get_auth_provider)],
) -> SignupResponse:
    return await auth_service.signup(provider, payload)


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    provider: Annotated[AuthProvider, Depends(get_auth_provider)],
) -> LoginResponse:
    return await auth_service.login(provider, payload)
