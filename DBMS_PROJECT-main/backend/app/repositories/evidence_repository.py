from __future__ import annotations

from uuid import UUID

from psycopg import AsyncConnection

from app.errors.exceptions import NotFoundError
from app.errors.handlers import map_psycopg_error
from app.schemas.evidence import EvidenceCreate


def _raise(exc: Exception) -> None:
    from psycopg import Error as PsycopgError

    if isinstance(exc, PsycopgError):
        raise map_psycopg_error(exc) from exc
    raise exc


async def get_evidence(conn: AsyncConnection, evidence_id: UUID) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT evidence_id, relationship_id, evidence_type_code, description,
                       source_reference, source_url, recorded_by, recorded_at, data_class_code
                FROM public.relationship_evidence
                WHERE evidence_id = %s
                """,
                (evidence_id,),
            )
            row = await cur.fetchone()
    except Exception as exc:
        _raise(exc)
    if not row:
        raise NotFoundError("The requested evidence record was not found.")
    return row


async def list_relationship_evidence(conn: AsyncConnection, relationship_id: UUID) -> list[dict]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT evidence_id, relationship_id, evidence_type_code, description,
                       source_reference, source_url, recorded_by, recorded_at, data_class_code
                FROM public.relationship_evidence
                WHERE relationship_id = %s
                ORDER BY recorded_at ASC
                """,
                (relationship_id,),
            )
            return await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []


async def add_evidence(conn: AsyncConnection, relationship_id: UUID, payload: EvidenceCreate) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO public.relationship_evidence (
                    relationship_id,
                    evidence_type_code,
                    description,
                    source_reference,
                    source_url,
                    data_class_code
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING evidence_id
                """,
                (
                    relationship_id,
                    payload.evidence_type_code,
                    payload.description,
                    payload.source_reference,
                    payload.source_url,
                    payload.data_class_code,
                ),
            )
            row = await cur.fetchone()
    except Exception as exc:
        _raise(exc)
    return await get_evidence(conn, row["evidence_id"])
