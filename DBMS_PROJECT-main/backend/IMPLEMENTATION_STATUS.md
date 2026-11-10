# CAMPUS MEMORY Backend Implementation Status

Date: 2026-11-01

## Takeover notes

This repository is an existing FastAPI backend. A Git repository was initialized in `backend/` during this handover, but it has no commits and all project files are currently untracked. Existing files were preserved.

The planning, architecture, schema and bootstrap SQL documents describe a proposed PostgreSQL/Supabase design. They explicitly retain pending decisions around faculty approval, authentication policy, pooler mode, runtime grants, RLS/Data API exposure, actor context and impact de-duplication. The handover reports that the live database has already been created and tested, but that live state was not independently queried during this session.

## Implemented and inspected

- FastAPI application factory and lifespan management in `app/main.py`.
- CORS, request IDs, logging and centralized exception handling.
- Async Psycopg connection pool with UTC configuration, statement timeout and sanitized diagnostics.
- Separate database connectivity check at `GET /api/v1/health/database`.
- Database readiness check at `GET /api/v1/health/ready`, including core `campus_event` table read/insert/update permission checks.
- Fail-closed Supabase Auth provider abstraction and application-user/role resolution.
- Reusable role-permission dependencies.
- Event registry, filtering, pagination, status changes, closing, voiding and status history.
- Relationship, evidence, impact, investigation, dashboard, report and reference-data API modules.
- Parameterized repository SQL and PostgreSQL procedure/function calls.
- Structured application and database error mapping.
- Unit/API tests for authentication, health, event behavior, relationships, investigations, impact aggregation, SQL parameterization and database errors.
- Read-only runtime-role audit at `docs/DATABASE_RUNTIME_ROLE_AUDIT.sql`.
- Reviewed runtime-role setup proposal at `docs/DATABASE_RUNTIME_ROLE_SETUP.sql`; it has not been executed.
- Added Supabase-backed `POST /api/v1/auth/signup` and `POST /api/v1/auth/login` without changing the existing bearer-token verification or role-permission model.
- Public signup accepts only `event_reporter` and atomically creates the application user plus an audited event-reporter assignment; no administrator role-assignment API exists in the current backend.
- The runtime-role audit was corrected for PostgreSQL 17 membership options (`inherit_option`, `set_option`, `admin_option`), complete direct/indirect membership inventory including non-inheriting SET ROLE paths, separate current-role RLS bypass from `SET ROLE` capability, effective policy-role checks through `pg_has_role(..., 'USAGE')`, missing-object semantics, detailed policy metadata, view security-mode inspection, complete `app_private` inspection, and admin-session versus actual runtime-login checks.

## Validation performed

From `backend/` using Python 3.12.4 and the existing `.venv`:

- `pytest -q --tb=short`: 25 passed, 1 skipped, 1 warning.
- Static diagnostics for the readiness implementation: no errors.

The skipped test is the live database placeholder in `tests/integration/test_live_database.py`; it is skipped unless `CAMPUS_MEMORY_INTEGRATION=1` is explicitly set. It was not run because no local `.env` or verified runtime-role connection was available. The warning is Starlette's deprecation warning that its current `TestClient` integration uses the older httpx compatibility path; it does not fail the suite.

The runtime-role audit was not executed against Supabase because no local `DATABASE_URL` is present. No credentials, grants, RLS policies or database objects were changed.

The audit file was structurally reviewed for forbidden DDL/DML. Its only executable non-SELECT statements are the documented transaction-local `BEGIN`, `set_config`, and `ROLLBACK` probe. No local `psql` executable is installed, so PostgreSQL parser execution was not available; syntax has not been claimed as live-validated.

The final focused audit correction was followed by the same Python regression suite: 25 passed, 1 skipped, 1 warning. Python tests do not validate PostgreSQL audit SQL syntax or live Supabase behavior.

Authentication endpoint and mocked Supabase provider tests were added. Live signup/login remain dependent on Supabase configuration and database permissions. In particular, the current restricted runtime-role setup proposal does not grant `INSERT` on `public.app_user` or `public.user_role_assignment`; those permissions must be reviewed before live public signup can register and assign event_reporter.

Running pytest from the workspace root is not supported by the current `backend/pytest.ini` because its local `pythonpath = .` resolves relative to the root selected by pytest. Run tests from `backend/`.

A Starlette/httpx deprecation warning is present during tests; it does not currently fail the suite.

## Remaining work

### Phase 1 foundation

- Run the complete test suite from `backend/` and fix only failures attributable to the current backend.
- Add explicit readiness tests for an available connection with insufficient permissions and for a ready permission result using mocked database objects.
- Decide whether readiness should check additional table and procedure/function privileges after the dedicated runtime role is confirmed.
- Inspect the frontend package configuration when frontend files are present and align `CORS_ORIGINS` with its actual development URL.

### Event and domain completeness

- Compare every repository query and response model with the final live schema and stored-procedure signatures.
- Verify event detail composition against the documented requirement to include relationship, impact, evidence and status-history summaries.
- Review role scope and status-transition assumptions against the team's pending decisions.
- Verify report and dashboard aggregates against the documented impact and unit rules.

### Database and security gates

- Do not run the bootstrap SQL against the existing database.
- Do not execute `docs/DATABASE_RUNTIME_ROLE_SETUP.sql` until its audit results and policy names are reviewed by a database maintainer.
- Confirm the dedicated runtime role, connection mode and exact permissions through an approved database-maintainer workflow.
- Run live integration tests only with the intended runtime role and record their result separately from unit/API tests.

### Documentation and delivery

- Update `README.md` with the readiness endpoint and the correct test invocation from `backend/`.
- Keep real `.env` values private; `.env.example` remains placeholder-only.
- Review the newly initialized Git repository before creating the first commit.

## Next recommended task

Exact next action required from the user: have a database maintainer run `docs/DATABASE_RUNTIME_ROLE_AUDIT.sql` against the existing Supabase project, as the intended restricted role or an administrator, and return the result without secrets. Do not run the setup proposal yet. After the audit confirms the role, privileges, ownership and RLS state, rerun the integration test with the approved `campus_memory_app` connection.
