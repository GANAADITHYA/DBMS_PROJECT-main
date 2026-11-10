from __future__ import annotations

from psycopg import AsyncConnection

from app.errors.exceptions import AppError
from app.errors.handlers import map_psycopg_error


def _raise(exc: Exception) -> None:
    from psycopg import Error as PsycopgError

    if isinstance(exc, PsycopgError):
        raise map_psycopg_error(exc) from exc
    raise exc


async def get_user_by_auth_subject(conn: AsyncConnection, auth_subject: str) -> dict | None:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT user_id, auth_subject, auth_provider, email, display_name,
                       department_id, is_active, created_at, updated_at
                FROM public.app_user
                WHERE auth_subject = %s
                """,
                (auth_subject,),
            )
            return await cur.fetchone()
    except Exception as exc:
        _raise(exc)
        return None


async def list_active_roles(conn: AsyncConnection, user_id) -> list[str]:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT role_code
                FROM public.user_role_assignment
                WHERE user_id = %s
                  AND revoked_at IS NULL
                """,
                (user_id,),
            )
            rows = await cur.fetchall()
    except Exception as exc:
        _raise(exc)
        return []
    return [row["role_code"] for row in rows]


async def create_application_user(
    conn: AsyncConnection,
    *,
    auth_subject: str,
    email: str,
    display_name: str,
) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO public.app_user (
                    auth_subject, auth_provider, email, display_name, is_active
                ) VALUES (%s, 'supabase', %s, %s, true)
                RETURNING user_id, email, display_name, is_active
                """,
                (auth_subject, email, display_name),
            )
            return await cur.fetchone()
    except Exception as exc:
        _raise(exc)
        raise


async def create_event_reporter_application_user(
    conn: AsyncConnection,
    *,
    auth_subject: str,
    email: str,
    display_name: str,
) -> dict:
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO public.app_user (
                    auth_subject, auth_provider, email, display_name, is_active
                ) VALUES (%s, 'supabase', %s, %s, true)
                RETURNING user_id, email, display_name, is_active
                """,
                (auth_subject, email, display_name),
            )
            user_row = await cur.fetchone()
            await cur.execute(
                """
                INSERT INTO public.user_role_assignment (
                    user_id, role_code, assigned_by, assignment_reason
                )
                SELECT %s, role_code, administrator_id,
                       'Public self-registration as event_reporter'
                FROM (
                    SELECT ar.role_code, admin.user_id AS administrator_id
                    FROM public.app_role ar
                    JOIN public.app_user admin ON admin.is_active = true
                    JOIN public.user_role_assignment admin_assignment
                      ON admin_assignment.user_id = admin.user_id
                     AND admin_assignment.role_code = 'administrator'
                     AND admin_assignment.revoked_at IS NULL
                    WHERE ar.role_code = 'event_reporter'
                      AND ar.is_active = true
                    ORDER BY admin.created_at, admin.user_id
                    LIMIT 1
                ) provisioner
                RETURNING assignment_id
                """,
                (user_row["user_id"],),
            )
            assignment_row = await cur.fetchone()
            if assignment_row is None:
                raise AppError(
                    "role_provisioning_unavailable",
                    "No active administrator is available to audit this signup.",
                    503,
                )
            user_row["role_code"] = "event_reporter"
            return user_row
    except Exception as exc:
        _raise(exc)
        raise
