# CAMPUS MEMORY Backend

FastAPI service for the CAMPUS MEMORY temporal campus event-provenance database.

The browser talks only to this API. This API talks to Supabase PostgreSQL with parameterized SQL. There is no ORM.

## Requirements

- Python 3.11 or 3.12
- A reachable Supabase PostgreSQL connection string (direct or session-mode pooler)
- Optional: Supabase Auth project URL and publishable key

## Setup

From the `backend/` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
```

On macOS or Linux:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`. Do not commit it. Never put the Supabase service-role key in this file.

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Encrypted PostgreSQL URI for the FastAPI runtime role |
| `SUPABASE_URL` | Project URL used to verify Auth access tokens |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key sent only to Auth user verification |
| `AUTH_PROVIDER` | Use `supabase`. Any other value keeps protected routes fail-closed |
| `CORS_ORIGINS` | Local React origin, default `http://localhost:5173` |
| `APP_ENV` | `local`, `development`, `test`, or `production` |

The application starts even if the database URL or Auth settings are missing. Protected routes then return `401`/`403`, and `/api/v1/health/database` returns a sanitized `503`.

## Start the API

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --app-dir .
```

The API listens on `http://127.0.0.1:8000`.

## Documentation

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
- OpenAPI JSON: http://127.0.0.1:8000/openapi.json

## Tests

```powershell
.\.venv\Scripts\Activate.ps1
pytest
```

Run the command from the `backend/` directory. `/health/database` checks database connectivity; `/health/ready` also checks the configured role's core `campus_event` table permissions.

Unit tests mock authentication and database services. They do not require a live database.

Live database tests stay skipped unless you explicitly set:

```powershell
$env:CAMPUS_MEMORY_INTEGRATION="1"
pytest tests/integration
```

Do not claim live integration works until it has been run with the intended runtime database role.

## Authentication

Protected endpoints expect:

```http
Authorization: Bearer <supabase-access-token>
```

The backend verifies the token with Supabase Auth, then loads `app_user` by `auth_subject` and the user's active `user_role_assignment` rows. Browser-supplied `user_id`, `created_by`, `recorded_by` and role fields are ignored.

Write operations set transaction-local PostgreSQL settings:

- `app.actor_id`
- `app.change_reason` when a reason is required

Those values are set with parameterized `set_config` calls on the same connection and transaction as the SQL write.

### Signup and login

`POST /api/v1/auth/signup` accepts `email`, `password` and `display_name`.
It creates the Supabase Auth identity and the matching `public.app_user`, but
never accepts or assigns a role. New users receive no protected API access
until an administrator assigns an active application role.

`POST /api/v1/auth/login` accepts `email` and `password`, authenticates with
Supabase Auth, verifies the returned access token, maps it to `app_user`, and
requires an active application user with at least one non-revoked role. It
returns the access token, refresh token, expiry, application user ID and role
codes only after those checks pass.

There is currently no administrator role-assignment API in this backend. Role
assignment must therefore be performed through the approved database-maintainer
workflow until an authorized administrator workflow is designed.

If Supabase signup succeeds but application-user registration fails, the API
returns `application_registration_failed` and does not retry blindly. The
identity remains in Supabase Auth; a database maintainer should verify the
identity, insert the matching `app_user` with `auth_provider = 'supabase'`,
and then assign an approved role. Do not create a second Supabase identity or
store the password in PostgreSQL.

## Database connection troubleshooting

1. Confirm `DATABASE_URL` is present in `.env` and uses `sslmode=require` or stronger.
2. Open http://127.0.0.1:8000/api/v1/health, http://127.0.0.1:8000/api/v1/health/database and http://127.0.0.1:8000/api/v1/health/ready.
3. If the host cannot reach the direct URI (often IPv6-only), switch to the Supabase **session-mode** pooler URI.
4. Do not use the shared **transaction-mode** pooler for this persistent FastAPI service.
5. Permission-denied results mean the runtime role has not been granted yet. The API will not alter grants or RLS policies. Ask a database maintainer to grant the restricted FastAPI role after the team settles D-05/D-06/D-07.
6. The database currently fail-closes Data API roles. FastAPI must use a dedicated PostgreSQL role, not `anon` or `authenticated`.

## Runtime-role security audit

Before changing database grants or RLS, a database maintainer should run
`docs/DATABASE_RUNTIME_ROLE_AUDIT.sql` against the existing Supabase project.
This file is read-only except for one documented transaction-local
`set_config` probe wrapped in `BEGIN`/`ROLLBACK`; do not execute the setup
proposal automatically.

Run the catalog sections in the Supabase SQL Editor or another administrative
connection. They inspect `campus_memory_app`, inherited memberships, object
privileges, routine signatures, ownership and RLS policies. Membership results
include PostgreSQL 17 `inherit_option`, `set_option` and `admin_option`; RLS
results distinguish the target role's own current `SUPERUSER`/`BYPASSRLS`
attributes from its ability to `SET ROLE` to a privileged role. Missing roles,
schemas, tables, views and routines are reported explicitly.

Section 1 and Sections 3 through 11 are catalog/effective-privilege checks that
can be run by an administrative SQL Editor connection. Section 2 and Section
10 must also be run through a real PostgreSQL login as `campus_memory_app` to
prove the actual connection and custom-setting behavior; an administrator
session cannot prove those properties for the runtime role.

Do not include passwords, connection strings, tokens or secret keys in returned
results. The audit does not prove that the role is authorized as a CAMPUS
MEMORY actor: the `app.actor_id` probe only proves that PostgreSQL accepts a
transaction-local custom setting. It does not validate the UUID, confirm an
active `app_user`, or establish application authorization. The backend's
`app_private.current_actor_id()` logic and verified authentication still
establish actor validity and application authorization.

## Project rules preserved by this API

- New relationships are inserted as `suspected`.
- Confirmation requires evidence; the database trigger is the final authority.
- Events are not hard-deleted; use `POST /api/v1/events/{event_id}/void`.
- Close an event with `POST /api/v1/events/{event_id}/close`, which calls `public.close_event`.
- Root-cause and blast-radius endpoints call the existing PostgreSQL functions.
- Historical reconstruction is status-as-recorded, not full field-level history.
