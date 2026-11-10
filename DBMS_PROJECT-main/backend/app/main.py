from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager
from uuid import uuid4

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.core.security import build_auth_provider, reset_auth_request_id, set_auth_request_id
from app.db.connection import close_pool, create_pool
from app.errors.handlers import register_exception_handlers

logger = get_logger("campus_memory")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings)
    app.state.settings = settings
    app.state.auth_provider = build_auth_provider(settings)
    await create_pool(settings)
    logger.info("CAMPUS MEMORY API started env=%s", settings.app_env)
    try:
        yield
    finally:
        await close_pool()
        provider = getattr(app.state, "auth_provider", None)
        if provider is not None:
            await provider.aclose()
        logger.info("CAMPUS MEMORY API stopped.")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CAMPUS MEMORY API",
        description=(
            "Temporal Campus Event-Provenance Database HTTP API. "
            "The browser talks only to FastAPI. FastAPI talks to PostgreSQL."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id
        context_token = set_auth_request_id(request_id)
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            logger.info(
                "request method=%s path=%s status=%s request_id=%s",
                request.method,
                request.url.path,
                response.status_code,
                request_id,
            )
            return response
        finally:
            reset_auth_request_id(context_token)

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
