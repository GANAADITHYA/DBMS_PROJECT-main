from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import UUID

from psycopg import AsyncConnection

from app.db.connection import require_pool


async def set_actor_context(
    conn: AsyncConnection,
    actor_id: UUID,
    change_reason: str | None = None,
) -> None:
    """Set transaction-local actor context on the current connection."""
    await conn.execute(
        "SELECT set_config(%s, %s, true)",
        ("app.actor_id", str(actor_id)),
    )
    if change_reason is not None:
        await conn.execute(
            "SELECT set_config(%s, %s, true)",
            ("app.change_reason", change_reason),
        )


@asynccontextmanager
async def connection() -> AsyncIterator[AsyncConnection]:
    pool = require_pool()
    async with pool.connection() as conn:
        yield conn


@asynccontextmanager
async def transaction(
    actor_id: UUID | None = None,
    change_reason: str | None = None,
) -> AsyncIterator[AsyncConnection]:
    """Open one transaction. Actor context is set only inside this transaction."""
    pool = require_pool()
    async with pool.connection() as conn:
        async with conn.transaction():
            if actor_id is not None:
                await set_actor_context(conn, actor_id, change_reason)
            yield conn
