/*
================================================================================
CAMPUS MEMORY — COMPLETE POSTGRESQL DATABASE BOOTSTRAP
Project: Temporal Campus Event-Provenance Database
Course: Database Systems — 24CS520
Target: Supabase PostgreSQL
Version: 1.0 pre-execution revised draft
Date: 2026-11-01

IMPORTANT
---------
1. This is a ONE-TIME bootstrap script for a NEW / EMPTY Supabase project.
2. It creates the complete proposed 24-table schema, constraints, indexes,
   database functions, triggers, procedures, views, synthetic demonstration data,
   academic SQL examples and validation tests in ONE SQL file.
3. It is intentionally non-destructive: it contains no DROP TABLE, DROP SCHEMA,
   TRUNCATE or deletion of existing user data. It will fail if objects already
   exist rather than silently changing an existing database.
4. Do NOT run this file against a populated or already-initialized project.
5. This SQL Editor bootstrap is not automatically recorded as a Supabase CLI
   migration. If you later adopt Supabase CLI migrations, capture/reconcile this
   schema as a reviewed migration before using `supabase db push`.
6. The SQL has been authored from CAMPUS_MEMORY_Planning_Document_v0.2,
   CAMPUS_MEMORY_Architecture_Design_v1.0 and
   CAMPUS_MEMORY_Database_Schema_v1.0. No live Supabase database was available
   to execute it. Run the included validation blocks and review the pending
   decisions before using it with application data.
7. The project documents mark PostgreSQL/Supabase faculty approval, status
   vocabulary/transitions, authentication, Data API exposure and runtime grants
   as pending. The starter values below are documented implementation
   assumptions, not faculty approvals.

ARCHITECTURE
------------
React frontend -> Python/FastAPI backend -> Supabase PostgreSQL.
The browser must never connect directly to PostgreSQL. Credentials and service
keys remain backend-only. The `app.actor_id` and `app.change_reason` transaction-
local settings are trusted ONLY when set by the authenticated FastAPI backend
through a restricted database connection. A custom PostgreSQL setting is not a
cryptographic identity proof and must not be exposed to untrusted clients.

EXECUTION ORDER
---------------
A. schemas and reference tables
B. identity and campus resource tables
C. event and provenance tables
D. constraints and indexes
E. helper functions and trigger logic
F. procedures and views
G. synthetic seed records
H. demonstration queries and validation tests

PENDING DECISIONS / LIMITATIONS
-------------------------------
- Confirm the exact status vocabulary and allowed transitions (D-17).
- Confirm Supabase Auth vs application-managed authentication (D-05).
- Finalize Supabase Data API exposure, RLS and database grants (D-06).
- Test direct/session pooler choice and runtime role (D-07).
- Confirm actor context and procedure output conventions (D-22).
- Confirm the impact de-duplication rule (D-16). This script uses the proposed
  conservative rule: group comparable structured impacts by affected object,
  impact type, unit and verification status; headline quantity is MAX; duplicate
  records are flagged. Unreferenced impacts remain separate.
- Full field-level audit is NOT implemented. v1 stores event status history,
  relationship status/confidence history and last-modified metadata.
- Evidence files/binaries are not stored in PostgreSQL; only evidence metadata
  and references are stored.
- The academic requirement counts are from the team-supplied summary and remain
  “Unverified — confirm against the official guideline.”
================================================================================
*/

BEGIN;

/*
   SECURITY DEFAULTS: the application uses FastAPI/direct PostgreSQL access,
   not the Supabase Data API. Do not automatically expose newly created public
   objects to Data API roles. Backend grants are configured separately after
   the runtime identity/authorization design is approved.
*/
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
    REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

/* ============================================================================
   A. SCHEMAS AND REFERENCE TABLES
   ============================================================================ */

CREATE SCHEMA app_private;

CREATE TABLE public.department (
    department_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    department_code varchar(30) NOT NULL UNIQUE,
    name varchar(120) NOT NULL,
    description text,
    contact_email text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.app_role (
    role_code varchar(40) PRIMARY KEY,
    display_name varchar(80) NOT NULL,
    description text NOT NULL,
    is_system_role boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_category (
    category_code varchar(40) PRIMARY KEY,
    display_name varchar(80) NOT NULL,
    description text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    sort_order smallint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_status (
    status_code varchar(30) PRIMARY KEY,
    display_name varchar(60) NOT NULL,
    description text NOT NULL,
    sort_order smallint NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.relationship_status (
    relationship_status_code varchar(30) PRIMARY KEY,
    display_name varchar(80) NOT NULL,
    description text NOT NULL,
    is_traversable boolean NOT NULL,
    sort_order smallint NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.evidence_type (
    evidence_type_code varchar(40) PRIMARY KEY,
    display_name varchar(80) NOT NULL,
    description text NOT NULL,
    requires_reference boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.measurement_unit (
    unit_code varchar(20) PRIMARY KEY,
    display_name varchar(80) NOT NULL,
    symbol varchar(20) NOT NULL,
    dimension_code varchar(30) NOT NULL,
    decimal_places smallint NOT NULL DEFAULT 0 CHECK (decimal_places BETWEEN 0 AND 6),
    is_active boolean NOT NULL DEFAULT true,
    description text
);

CREATE TABLE public.data_class (
    data_class_code varchar(20) PRIMARY KEY,
    display_name varchar(60) NOT NULL,
    description text NOT NULL,
    requires_permission boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.severity_level (
    severity_code varchar(30) PRIMARY KEY,
    display_name varchar(60) NOT NULL,
    severity_rank smallint NOT NULL UNIQUE,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_type (
    event_type_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code varchar(40) NOT NULL REFERENCES public.event_category(category_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    type_code varchar(50) NOT NULL,
    display_name varchar(100) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    sort_order smallint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_event_type_category_code UNIQUE (category_code, type_code),
    CONSTRAINT uq_event_type_id_category UNIQUE (event_type_id, category_code)
);

CREATE TABLE public.event_status_transition (
    from_status_code varchar(30) NOT NULL REFERENCES public.event_status(status_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    to_status_code varchar(30) NOT NULL REFERENCES public.event_status(status_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    requires_reason boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (from_status_code, to_status_code),
    CONSTRAINT ck_status_transition_not_self CHECK (from_status_code <> to_status_code)
);

CREATE TABLE public.impact_type (
    impact_type_code varchar(40) PRIMARY KEY,
    display_name varchar(100) NOT NULL,
    description text NOT NULL,
    default_unit_code varchar(20) REFERENCES public.measurement_unit(unit_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    aggregation_note text
);

/* ============================================================================
   B. IDENTITY AND CAMPUS RESOURCE TABLES
   ============================================================================ */

CREATE TABLE public.app_user (
    user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_subject text NOT NULL UNIQUE,
    auth_provider text NOT NULL,
    email text NOT NULL UNIQUE,
    display_name varchar(120) NOT NULL,
    department_id uuid REFERENCES public.department(department_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_role_assignment (
    assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    role_code varchar(40) NOT NULL REFERENCES public.app_role(role_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    assigned_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    assignment_reason text,
    CONSTRAINT ck_role_assignment_revocation CHECK (revoked_at IS NULL OR revoked_at >= assigned_at)
);

CREATE UNIQUE INDEX uq_user_role_active
    ON public.user_role_assignment(user_id, role_code)
    WHERE revoked_at IS NULL;

CREATE TABLE public.campus_location (
    location_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_code varchar(40) NOT NULL UNIQUE,
    name varchar(140) NOT NULL,
    location_type varchar(40) NOT NULL,
    parent_location_id uuid REFERENCES public.campus_location(location_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_location_not_own_parent CHECK (parent_location_id IS DISTINCT FROM location_id)
);

CREATE TABLE public.campus_asset (
    asset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_code varchar(50) NOT NULL UNIQUE,
    name varchar(140) NOT NULL,
    asset_type varchar(60) NOT NULL,
    location_id uuid REFERENCES public.campus_location(location_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    manufacturer varchar(100),
    model varchar(100),
    asset_status varchar(40) NOT NULL DEFAULT 'active',
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campus_service (
    service_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code varchar(50) NOT NULL UNIQUE,
    name varchar(140) NOT NULL,
    service_type varchar(60) NOT NULL,
    owner_department_id uuid REFERENCES public.department(department_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    description text,
    service_status varchar(40) NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scheduled_activity (
    scheduled_activity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_code varchar(50) NOT NULL UNIQUE,
    title varchar(180) NOT NULL,
    course_code varchar(40),
    department_id uuid REFERENCES public.department(department_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    location_id uuid REFERENCES public.campus_location(location_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    activity_status varchar(40) NOT NULL DEFAULT 'scheduled',
    created_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_activity_time_order CHECK (ends_at > starts_at)
);

/* ============================================================================
   C. EVENT AND PROVENANCE TABLES
   ============================================================================ */

CREATE TABLE public.campus_event (
    event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code varchar(50) NOT NULL UNIQUE,
    title varchar(200) NOT NULL,
    description text NOT NULL,
    category_code varchar(40) NOT NULL REFERENCES public.event_category(category_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    event_type_id uuid NOT NULL,
    severity_code varchar(30) NOT NULL REFERENCES public.severity_level(severity_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    status_code varchar(30) NOT NULL DEFAULT 'reported' REFERENCES public.event_status(status_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    location_id uuid REFERENCES public.campus_location(location_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    asset_id uuid REFERENCES public.campus_asset(asset_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    service_id uuid REFERENCES public.campus_service(service_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    scheduled_activity_id uuid REFERENCES public.scheduled_activity(scheduled_activity_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    started_at timestamptz NOT NULL,
    ended_at timestamptz,
    data_class_code varchar(20) NOT NULL REFERENCES public.data_class(data_class_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    source_note text,
    created_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_modified_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_event_type_category FOREIGN KEY (event_type_id, category_code)
        REFERENCES public.event_type(event_type_id, category_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_event_end_after_start CHECK (ended_at IS NULL OR ended_at >= started_at),
    CONSTRAINT ck_event_has_context CHECK (
        location_id IS NOT NULL OR asset_id IS NOT NULL OR
        service_id IS NOT NULL OR scheduled_activity_id IS NOT NULL
    )
);

CREATE TABLE public.event_relationship (
    relationship_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cause_event_id uuid NOT NULL REFERENCES public.campus_event(event_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    effect_event_id uuid NOT NULL REFERENCES public.campus_event(event_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    relationship_status_code varchar(30) NOT NULL DEFAULT 'suspected' REFERENCES public.relationship_status(relationship_status_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    confidence_score numeric(5,4) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    explanation text NOT NULL,
    temporal_override_reason text,
    data_class_code varchar(20) NOT NULL REFERENCES public.data_class(data_class_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    created_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_modified_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_relationship_not_self CHECK (cause_event_id <> effect_event_id),
    CONSTRAINT uq_relationship_direction UNIQUE (cause_event_id, effect_event_id)
);

CREATE TABLE public.relationship_evidence (
    evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id uuid NOT NULL REFERENCES public.event_relationship(relationship_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    evidence_type_code varchar(40) NOT NULL REFERENCES public.evidence_type(evidence_type_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    description text NOT NULL,
    source_reference text,
    source_url text,
    recorded_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    data_class_code varchar(20) NOT NULL REFERENCES public.data_class(data_class_code) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE public.event_impact (
    impact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campus_event(event_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    impact_type_code varchar(40) NOT NULL REFERENCES public.impact_type(impact_type_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    affected_location_id uuid REFERENCES public.campus_location(location_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    affected_asset_id uuid REFERENCES public.campus_asset(asset_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    affected_service_id uuid REFERENCES public.campus_service(service_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    affected_activity_id uuid REFERENCES public.scheduled_activity(scheduled_activity_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    affected_department_id uuid REFERENCES public.department(department_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    affected_object_description text,
    quantity numeric(14,3) NOT NULL CHECK (quantity >= 0),
    unit_code varchar(20) NOT NULL REFERENCES public.measurement_unit(unit_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    verification_status varchar(20) NOT NULL CHECK (verification_status IN ('verified', 'estimated')),
    estimate_basis text,
    recorded_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    data_class_code varchar(20) NOT NULL REFERENCES public.data_class(data_class_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT ck_impact_estimate_basis CHECK (
        verification_status <> 'estimated' OR NULLIF(btrim(estimate_basis), '') IS NOT NULL
    ),
    CONSTRAINT ck_impact_one_affected_object CHECK (
        num_nonnulls(affected_location_id, affected_asset_id, affected_service_id,
                     affected_activity_id, affected_department_id) <= 1
        AND (
            num_nonnulls(affected_location_id, affected_asset_id, affected_service_id,
                         affected_activity_id, affected_department_id) = 1
            OR NULLIF(btrim(affected_object_description), '') IS NOT NULL
        )
    )
);

CREATE TABLE public.event_status_history (
    history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.campus_event(event_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    old_status_code varchar(30) REFERENCES public.event_status(status_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    new_status_code varchar(30) NOT NULL REFERENCES public.event_status(status_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    changed_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    reason text NOT NULL,
    is_initial boolean NOT NULL DEFAULT false,
    CONSTRAINT ck_status_history_initial_shape CHECK (
        (is_initial = true AND old_status_code IS NULL)
        OR (is_initial = false AND old_status_code IS NOT NULL)
    )
);

CREATE TABLE public.relationship_history (
    history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id uuid NOT NULL REFERENCES public.event_relationship(relationship_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    change_kind varchar(30) NOT NULL CHECK (change_kind IN ('status', 'confidence', 'both')),
    old_status_code varchar(30) REFERENCES public.relationship_status(relationship_status_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    new_status_code varchar(30) REFERENCES public.relationship_status(relationship_status_code) ON UPDATE RESTRICT ON DELETE RESTRICT,
    old_confidence numeric(5,4) CHECK (old_confidence BETWEEN 0 AND 1),
    new_confidence numeric(5,4) CHECK (new_confidence BETWEEN 0 AND 1),
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    changed_by uuid NOT NULL REFERENCES public.app_user(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    reason text NOT NULL,
    CONSTRAINT ck_relationship_history_has_change CHECK (
        (old_status_code IS NOT NULL AND new_status_code IS NOT NULL)
        OR (old_confidence IS NOT NULL AND new_confidence IS NOT NULL)
    )
);

/* ============================================================================
   D. INDEXES
   ============================================================================ */

CREATE INDEX idx_campus_event_status_started ON public.campus_event(status_code, started_at DESC);
CREATE INDEX idx_campus_event_category_started ON public.campus_event(category_code, started_at DESC);
CREATE INDEX idx_campus_event_severity_started ON public.campus_event(severity_code, started_at DESC);
CREATE INDEX idx_campus_event_location_started ON public.campus_event(location_id, started_at DESC);
CREATE INDEX idx_campus_event_asset_started ON public.campus_event(asset_id, started_at DESC);
CREATE INDEX idx_campus_event_service_started ON public.campus_event(service_id, started_at DESC);
CREATE INDEX idx_relationship_effect_status ON public.event_relationship(effect_event_id, relationship_status_code);
CREATE INDEX idx_relationship_cause_status ON public.event_relationship(cause_event_id, relationship_status_code);
CREATE INDEX idx_evidence_relationship ON public.relationship_evidence(relationship_id, recorded_at);
CREATE INDEX idx_impact_event_type_unit ON public.event_impact(event_id, impact_type_code, unit_code);
CREATE INDEX idx_impact_activity ON public.event_impact(affected_activity_id) WHERE affected_activity_id IS NOT NULL;
CREATE INDEX idx_status_history_event_time ON public.event_status_history(event_id, changed_at DESC);
CREATE INDEX idx_relationship_history_relationship_time ON public.relationship_history(relationship_id, changed_at DESC);
CREATE INDEX idx_scheduled_activity_start ON public.scheduled_activity(starts_at);

/* ============================================================================
   E. HELPER FUNCTIONS AND TRIGGER LOGIC
   ============================================================================ */

CREATE OR REPLACE FUNCTION app_private.current_actor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog
AS $$
DECLARE
    v_actor_text text := current_setting('app.actor_id', true);
    v_actor uuid;
BEGIN
    IF v_actor_text IS NULL OR btrim(v_actor_text) = '' THEN
        RAISE EXCEPTION 'Trusted transaction-local app.actor_id context is required'
            USING ERRCODE = '42501';
    END IF;
    BEGIN
        v_actor := v_actor_text::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'app.actor_id must contain a valid UUID'
            USING ERRCODE = '42501';
    END;
    IF NOT EXISTS (
        SELECT 1 FROM public.app_user u
        WHERE u.user_id = v_actor AND u.is_active = true
    ) THEN
        RAISE EXCEPTION 'app.actor_id does not identify an active application user'
            USING ERRCODE = '42501';
    END IF;
    RETURN v_actor;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.current_change_reason()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
    SELECT NULLIF(btrim(current_setting('app.change_reason', true)), '')
$$;

CREATE OR REPLACE FUNCTION app_private.set_campus_event_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_actor uuid := app_private.current_actor_id();
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by := v_actor;
        NEW.last_modified_by := v_actor;
        NEW.created_at := COALESCE(NEW.created_at, now());
        NEW.updated_at := COALESCE(NEW.updated_at, now());
    ELSE
        NEW.created_by := OLD.created_by;
        NEW.created_at := OLD.created_at;
        NEW.last_modified_by := v_actor;
        NEW.updated_at := clock_timestamp();
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.set_relationship_metadata_and_check_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_actor uuid := app_private.current_actor_id();
    v_cause_started timestamptz;
    v_effect_started timestamptz;
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by := v_actor;
        NEW.last_modified_by := v_actor;
        NEW.created_at := COALESCE(NEW.created_at, now());
        NEW.updated_at := COALESCE(NEW.updated_at, now());
        IF NEW.relationship_status_code = 'confirmed' THEN
            RAISE EXCEPTION 'A relationship cannot be inserted directly as confirmed; add evidence and confirm it in a later update'
                USING ERRCODE = '23514';
        END IF;
    ELSE
        NEW.created_by := OLD.created_by;
        NEW.created_at := OLD.created_at;
        NEW.last_modified_by := v_actor;
        NEW.updated_at := clock_timestamp();
        IF OLD.relationship_status_code = 'confirmed'
           AND NEW.relationship_status_code <> 'confirmed'
           AND app_private.current_change_reason() IS NULL THEN
            RAISE EXCEPTION 'A reason is required when downgrading a confirmed relationship'
                USING ERRCODE = '23514';
        END IF;
        IF NEW.relationship_status_code = 'confirmed'
           AND NOT EXISTS (
               SELECT 1 FROM public.relationship_evidence re
               WHERE re.relationship_id = OLD.relationship_id
           ) THEN
            RAISE EXCEPTION 'A relationship cannot be confirmed without at least one evidence row'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    SELECT e.started_at INTO v_cause_started
    FROM public.campus_event e WHERE e.event_id = NEW.cause_event_id;
    SELECT e.started_at INTO v_effect_started
    FROM public.campus_event e WHERE e.event_id = NEW.effect_event_id;

    IF v_cause_started IS NOT NULL AND v_effect_started IS NOT NULL
       AND v_cause_started > v_effect_started THEN
        IF NULLIF(btrim(NEW.temporal_override_reason), '') IS NULL THEN
            RAISE EXCEPTION 'The proposed cause starts after the proposed effect; provide temporal_override_reason to record an explained override'
                USING ERRCODE = '23514';
        END IF;
        RAISE WARNING 'Temporal-order override recorded for relationship %: cause starts after effect. Review the explanation.',
            COALESCE(NEW.relationship_id::text, '<new relationship>');
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.enforce_event_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_requires_reason boolean;
    v_reason text := app_private.current_change_reason();
BEGIN
    SELECT t.requires_reason INTO v_requires_reason
    FROM public.event_status_transition t
    WHERE t.from_status_code = OLD.status_code
      AND t.to_status_code = NEW.status_code
      AND t.is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Status transition % -> % is not active/allowed', OLD.status_code, NEW.status_code
            USING ERRCODE = '23514';
    END IF;
    IF v_requires_reason AND v_reason IS NULL THEN
        RAISE EXCEPTION 'A reason is required for status transition % -> %', OLD.status_code, NEW.status_code
            USING ERRCODE = '23514';
    END IF;
    PERFORM app_private.current_actor_id();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.write_initial_event_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    INSERT INTO public.event_status_history
        (event_id, old_status_code, new_status_code, changed_at, changed_by, reason, is_initial)
    VALUES
        (NEW.event_id, NULL, NEW.status_code, clock_timestamp(),
         app_private.current_actor_id(), 'Initial status', true);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.write_event_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_reason text := app_private.current_change_reason();
BEGIN
    IF OLD.status_code IS DISTINCT FROM NEW.status_code THEN
        IF v_reason IS NULL THEN
            RAISE EXCEPTION 'A non-empty app.change_reason is required for an event status change'
                USING ERRCODE = '23514';
        END IF;
        INSERT INTO public.event_status_history
            (event_id, old_status_code, new_status_code, changed_at, changed_by, reason, is_initial)
        VALUES
            (NEW.event_id, OLD.status_code, NEW.status_code, clock_timestamp(),
             app_private.current_actor_id(), v_reason, false);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.prepare_relationship_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_requires_reference boolean;
    v_rel uuid;
BEGIN
    /* Lock parent rows in stable UUID order when evidence is reassigned. */
    IF TG_OP = 'UPDATE' AND NEW.relationship_id IS DISTINCT FROM OLD.relationship_id THEN
        FOR v_rel IN
            SELECT DISTINCT x.rel_id
            FROM unnest(ARRAY[OLD.relationship_id, NEW.relationship_id]) AS x(rel_id)
            ORDER BY x.rel_id
        LOOP
            PERFORM 1 FROM public.event_relationship r
            WHERE r.relationship_id = v_rel
            FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Old or new evidence parent relationship does not exist'
                    USING ERRCODE = '23503';
            END IF;
        END LOOP;
    ELSE
        PERFORM 1 FROM public.event_relationship r
        WHERE r.relationship_id = NEW.relationship_id
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Evidence parent relationship does not exist'
                USING ERRCODE = '23503';
        END IF;
    END IF;

    PERFORM 1 FROM public.evidence_type et
    WHERE et.evidence_type_code = NEW.evidence_type_code AND et.is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evidence type is missing or inactive'
            USING ERRCODE = '23514';
    END IF;

    SELECT et.requires_reference INTO v_requires_reference
    FROM public.evidence_type et
    WHERE et.evidence_type_code = NEW.evidence_type_code;
    IF v_requires_reference
       AND COALESCE(NULLIF(btrim(NEW.source_reference), ''), NULLIF(btrim(NEW.source_url), '')) IS NULL THEN
        RAISE EXCEPTION 'This evidence type requires a source reference or URL'
            USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.recorded_by := app_private.current_actor_id();
        NEW.recorded_at := COALESCE(NEW.recorded_at, now());
    ELSE
        /* Preserve original-record metadata when the evidence row is edited. */
        NEW.recorded_by := OLD.recorded_by;
        NEW.recorded_at := OLD.recorded_at;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.protect_last_confirmed_evidence_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_status varchar(30);
    v_remaining bigint;
BEGIN
    SELECT r.relationship_status_code INTO v_status
    FROM public.event_relationship r
    WHERE r.relationship_id = OLD.relationship_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evidence parent relationship no longer exists'
            USING ERRCODE = '23503';
    END IF;
    SELECT count(*) INTO v_remaining
    FROM public.relationship_evidence re
    WHERE re.relationship_id = OLD.relationship_id
      AND re.evidence_id <> OLD.evidence_id;
    IF v_status = 'confirmed' AND v_remaining = 0 THEN
        RAISE EXCEPTION 'Cannot delete the last evidence row from a confirmed relationship; downgrade the relationship first'
            USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.protect_last_confirmed_evidence_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_rel uuid;
    v_old_status varchar(30);
    v_remaining bigint;
BEGIN
    IF NEW.relationship_id IS NOT DISTINCT FROM OLD.relationship_id THEN
        RETURN NEW;
    END IF;

    /* Lock old and new parent rows in a stable UUID order to reduce deadlocks. */
    FOR v_rel IN
        SELECT DISTINCT x.rel_id
        FROM unnest(ARRAY[OLD.relationship_id, NEW.relationship_id]) AS x(rel_id)
        ORDER BY x.rel_id
    LOOP
        PERFORM 1 FROM public.event_relationship r
        WHERE r.relationship_id = v_rel
        FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Old or new evidence parent relationship does not exist'
                USING ERRCODE = '23503';
        END IF;
    END LOOP;

    SELECT r.relationship_status_code INTO v_old_status
    FROM public.event_relationship r WHERE r.relationship_id = OLD.relationship_id;
    SELECT count(*) INTO v_remaining
    FROM public.relationship_evidence re
    WHERE re.relationship_id = OLD.relationship_id
      AND re.evidence_id <> OLD.evidence_id;
    IF v_old_status = 'confirmed' AND v_remaining = 0 THEN
        RAISE EXCEPTION 'Cannot move the last evidence row away from a confirmed relationship; downgrade it first'
            USING ERRCODE = '23514';
    END IF;
    NEW.recorded_by := OLD.recorded_by;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.write_relationship_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_status_changed boolean := OLD.relationship_status_code IS DISTINCT FROM NEW.relationship_status_code;
    v_confidence_changed boolean := OLD.confidence_score IS DISTINCT FROM NEW.confidence_score;
    v_reason text := app_private.current_change_reason();
    v_kind varchar(30);
BEGIN
    IF NOT (v_status_changed OR v_confidence_changed) THEN
        RETURN NEW;
    END IF;
    IF v_reason IS NULL THEN
        RAISE EXCEPTION 'A reason is required for relationship status/confidence changes'
            USING ERRCODE = '23514';
    END IF;
    v_kind := CASE
        WHEN v_status_changed AND v_confidence_changed THEN 'both'
        WHEN v_status_changed THEN 'status'
        ELSE 'confidence'
    END;
    INSERT INTO public.relationship_history
        (relationship_id, change_kind, old_status_code, new_status_code,
         old_confidence, new_confidence, changed_at, changed_by, reason)
    VALUES
        (NEW.relationship_id, v_kind, OLD.relationship_status_code, NEW.relationship_status_code,
         OLD.confidence_score, NEW.confidence_score, clock_timestamp(),
         app_private.current_actor_id(), v_reason);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.set_evidence_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    NEW.recorded_by := app_private.current_actor_id();
    NEW.recorded_at := COALESCE(NEW.recorded_at, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.set_impact_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    NEW.recorded_by := app_private.current_actor_id();
    NEW.recorded_at := COALESCE(NEW.recorded_at, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.set_activity_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by := app_private.current_actor_id();
        NEW.created_at := COALESCE(NEW.created_at, now());
    ELSE
        NEW.created_by := OLD.created_by;
        NEW.created_at := OLD.created_at;
    END IF;
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

/* Attach event metadata and status-history triggers. */
CREATE TRIGGER trg_event_metadata_before_write
BEFORE INSERT OR UPDATE ON public.campus_event
FOR EACH ROW EXECUTE FUNCTION app_private.set_campus_event_metadata();

CREATE TRIGGER trg_event_status_transition_guard
BEFORE UPDATE OF status_code ON public.campus_event
FOR EACH ROW WHEN (OLD.status_code IS DISTINCT FROM NEW.status_code)
EXECUTE FUNCTION app_private.enforce_event_status_transition();

CREATE TRIGGER trg_event_status_history_after_insert
AFTER INSERT ON public.campus_event
FOR EACH ROW EXECUTE FUNCTION app_private.write_initial_event_status();

CREATE TRIGGER trg_event_status_history_after_status_update
AFTER UPDATE OF status_code ON public.campus_event
FOR EACH ROW WHEN (OLD.status_code IS DISTINCT FROM NEW.status_code)
EXECUTE FUNCTION app_private.write_event_status_change();

/* Attach relationship metadata, evidence guard, and relationship-history triggers. */
CREATE TRIGGER trg_relationship_metadata_and_evidence_guard
BEFORE INSERT OR UPDATE ON public.event_relationship
FOR EACH ROW EXECUTE FUNCTION app_private.set_relationship_metadata_and_check_time();

CREATE TRIGGER trg_relationship_history_after_change
AFTER UPDATE OF relationship_status_code, confidence_score ON public.event_relationship
FOR EACH ROW WHEN (
    OLD.relationship_status_code IS DISTINCT FROM NEW.relationship_status_code
    OR OLD.confidence_score IS DISTINCT FROM NEW.confidence_score
)
EXECUTE FUNCTION app_private.write_relationship_history();

CREATE TRIGGER trg_evidence_prepare_before_write
BEFORE INSERT OR UPDATE ON public.relationship_evidence
FOR EACH ROW EXECUTE FUNCTION app_private.prepare_relationship_evidence();

CREATE TRIGGER trg_evidence_protect_last_before_delete
BEFORE DELETE ON public.relationship_evidence
FOR EACH ROW EXECUTE FUNCTION app_private.protect_last_confirmed_evidence_delete();

CREATE TRIGGER trg_evidence_protect_last_before_reassignment
BEFORE UPDATE OF relationship_id ON public.relationship_evidence
FOR EACH ROW EXECUTE FUNCTION app_private.protect_last_confirmed_evidence_reassignment();

CREATE TRIGGER trg_impact_actor_before_insert
BEFORE INSERT ON public.event_impact
FOR EACH ROW EXECUTE FUNCTION app_private.set_impact_actor();

CREATE TRIGGER trg_activity_actor_before_write
BEFORE INSERT OR UPDATE ON public.scheduled_activity
FOR EACH ROW EXECUTE FUNCTION app_private.set_activity_actor();

/* Prevent ordinary callers from invoking internal helpers directly.
   Trigger functions remain attached to their triggers. */
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC;

/* ============================================================================
   F. RECURSIVE INVESTIGATION FUNCTIONS, PROCEDURES AND VIEWS
   ============================================================================ */

CREATE OR REPLACE FUNCTION public.trace_root_causes(
    p_event_id uuid,
    p_include_suspected boolean DEFAULT false
)
RETURNS TABLE (
    event_id uuid,
    event_code varchar(50),
    title varchar(200),
    minimum_depth integer,
    path_event_ids uuid[]
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
    WITH RECURSIVE walk(node_id, depth, visited_path) AS (
        SELECT p_event_id, 0, ARRAY[p_event_id]::uuid[]
        UNION ALL
        SELECT r.cause_event_id,
               w.depth + 1,
               w.visited_path || r.cause_event_id
        FROM walk w
        JOIN public.event_relationship r ON r.effect_event_id = w.node_id
        WHERE (
            r.relationship_status_code = 'confirmed'
            OR (p_include_suspected AND r.relationship_status_code = 'suspected')
        )
        AND NOT (r.cause_event_id = ANY(w.visited_path))
    ), ranked AS (
        SELECT w.node_id, w.depth, w.visited_path,
               row_number() OVER (PARTITION BY w.node_id ORDER BY w.depth, w.visited_path::text) AS rn
        FROM walk w
        WHERE w.depth > 0
    )
    SELECT e.event_id, e.event_code, e.title, r.depth, r.visited_path
    FROM ranked r
    JOIN public.campus_event e ON e.event_id = r.node_id
    WHERE r.rn = 1
    ORDER BY r.depth, e.started_at, e.event_code;
$$;

CREATE OR REPLACE FUNCTION public.trace_blast_radius(
    p_event_id uuid,
    p_include_suspected boolean DEFAULT false
)
RETURNS TABLE (
    event_id uuid,
    event_code varchar(50),
    title varchar(200),
    minimum_depth integer,
    path_event_ids uuid[]
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
    WITH RECURSIVE walk(node_id, depth, visited_path) AS (
        SELECT p_event_id, 0, ARRAY[p_event_id]::uuid[]
        UNION ALL
        SELECT r.effect_event_id,
               w.depth + 1,
               w.visited_path || r.effect_event_id
        FROM walk w
        JOIN public.event_relationship r ON r.cause_event_id = w.node_id
        WHERE (
            r.relationship_status_code = 'confirmed'
            OR (p_include_suspected AND r.relationship_status_code = 'suspected')
        )
        AND NOT (r.effect_event_id = ANY(w.visited_path))
    ), ranked AS (
        SELECT w.node_id, w.depth, w.visited_path,
               row_number() OVER (PARTITION BY w.node_id ORDER BY w.depth, w.visited_path::text) AS rn
        FROM walk w
        WHERE w.depth > 0
    )
    SELECT e.event_id, e.event_code, e.title, r.depth, r.visited_path
    FROM ranked r
    JOIN public.campus_event e ON e.event_id = r.node_id
    WHERE r.rn = 1
    ORDER BY r.depth, e.started_at, e.event_code;
$$;

/*
Impact aggregation for a root event's forward blast radius.
Structured objects are grouped by object + impact type + unit + verification
status. MAX(quantity) is the headline, and the remaining IDs are flagged as
possible duplicates. Different units and estimated/verified values never mix.
Impacts without a structured affected-object FK are returned individually and
marked unreferenced_not_deduplicated.
*/
CREATE OR REPLACE FUNCTION public.blast_radius_impact_summary(
    p_event_id uuid,
    p_include_suspected boolean DEFAULT false
)
RETURNS TABLE (
    affected_object_key text,
    impact_type_code varchar(40),
    impact_type_name varchar(100),
    unit_code varchar(20),
    unit_name varchar(80),
    verification_status varchar(20),
    headline_quantity numeric,
    impact_record_count bigint,
    impact_ids uuid[],
    possible_duplicate_impact_ids uuid[],
    aggregation_note text
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
    WITH reached AS (
        SELECT p_event_id AS event_id
        UNION
        SELECT br.event_id
        FROM public.trace_blast_radius(p_event_id, p_include_suspected) br
    ), raw_impacts AS (
        SELECT i.*,
               CASE
                   WHEN i.affected_location_id IS NOT NULL THEN 'location:' || i.affected_location_id::text
                   WHEN i.affected_asset_id IS NOT NULL THEN 'asset:' || i.affected_asset_id::text
                   WHEN i.affected_service_id IS NOT NULL THEN 'service:' || i.affected_service_id::text
                   WHEN i.affected_activity_id IS NOT NULL THEN 'activity:' || i.affected_activity_id::text
                   WHEN i.affected_department_id IS NOT NULL THEN 'department:' || i.affected_department_id::text
                   ELSE NULL
               END AS object_key
        FROM public.event_impact i
        JOIN reached r ON r.event_id = i.event_id
    ), structured AS (
        SELECT ri.object_key, ri.impact_type_code, it.display_name AS impact_type_name,
               ri.unit_code, u.display_name AS unit_name, ri.verification_status,
               max(ri.quantity) AS headline_quantity,
               count(*) AS impact_record_count,
               array_agg(ri.impact_id ORDER BY ri.quantity DESC, ri.recorded_at, ri.impact_id) AS impact_ids,
               (array_agg(ri.impact_id ORDER BY ri.quantity DESC, ri.recorded_at, ri.impact_id))[2:] AS possible_duplicate_impact_ids,
               CASE WHEN count(*) > 1 THEN 'Possible duplicates grouped; headline uses MAX(quantity)'
                    ELSE 'Single structured impact record' END AS aggregation_note
        FROM raw_impacts ri
        JOIN public.impact_type it ON it.impact_type_code = ri.impact_type_code
        JOIN public.measurement_unit u ON u.unit_code = ri.unit_code
        WHERE ri.object_key IS NOT NULL
        GROUP BY ri.object_key, ri.impact_type_code, it.display_name,
                 ri.unit_code, u.display_name, ri.verification_status
    ), unreferenced AS (
        SELECT 'unreferenced:' || ri.impact_id::text AS object_key,
               ri.impact_type_code, it.display_name AS impact_type_name,
               ri.unit_code, u.display_name AS unit_name, ri.verification_status,
               ri.quantity, 1::bigint AS impact_record_count,
               ARRAY[ri.impact_id]::uuid[] AS impact_ids, ARRAY[]::uuid[] AS duplicate_ids,
               'Unreferenced impact is not de-duplicated'::text AS note
        FROM raw_impacts ri
        JOIN public.impact_type it ON it.impact_type_code = ri.impact_type_code
        JOIN public.measurement_unit u ON u.unit_code = ri.unit_code
        WHERE ri.object_key IS NULL
    )
    SELECT s.object_key, s.impact_type_code, s.impact_type_name,
           s.unit_code, s.unit_name, s.verification_status,
           s.headline_quantity, s.impact_record_count, s.impact_ids,
           COALESCE(s.possible_duplicate_impact_ids, ARRAY[]::uuid[]), s.aggregation_note
    FROM structured s
    UNION ALL
    SELECT u.object_key, u.impact_type_code, u.impact_type_name,
           u.unit_code, u.unit_name, u.verification_status,
           u.quantity, u.impact_record_count, u.impact_ids, u.duplicate_ids, u.note
    FROM unreferenced u;
$$;

CREATE OR REPLACE PROCEDURE public.register_event(
    IN p_event_code varchar(50),
    IN p_title varchar(200),
    IN p_description text,
    IN p_category_code varchar(40),
    IN p_event_type_id uuid,
    IN p_severity_code varchar(30),
    IN p_location_id uuid,
    IN p_asset_id uuid,
    IN p_service_id uuid,
    IN p_scheduled_activity_id uuid,
    IN p_started_at timestamptz,
    IN p_data_class_code varchar(20),
    OUT p_created_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
    PERFORM app_private.current_actor_id();
    IF NULLIF(btrim(p_event_code), '') IS NULL
       OR NULLIF(btrim(p_title), '') IS NULL
       OR NULLIF(btrim(p_description), '') IS NULL THEN
        RAISE EXCEPTION 'Event code, title and description are required'
            USING ERRCODE = '23514';
    END IF;
    IF p_started_at IS NULL THEN
        RAISE EXCEPTION 'started_at is required' USING ERRCODE = '23514';
    END IF;
    IF p_location_id IS NULL AND p_asset_id IS NULL AND p_service_id IS NULL AND p_scheduled_activity_id IS NULL THEN
        RAISE EXCEPTION 'At least one location, asset, service or scheduled activity is required'
            USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.campus_event (
        event_code, title, description, category_code, event_type_id,
        severity_code, status_code, location_id, asset_id, service_id,
        scheduled_activity_id, started_at, data_class_code, source_note
    ) VALUES (
        p_event_code, p_title, p_description, p_category_code, p_event_type_id,
        p_severity_code, 'reported', p_location_id, p_asset_id, p_service_id,
        p_scheduled_activity_id, p_started_at, p_data_class_code,
        'Registered through public.register_event procedure'
    ) RETURNING event_id INTO p_created_event_id;
    /* TG-1 writes the initial status-history row. */
END;
$$;

CREATE OR REPLACE PROCEDURE public.close_event(
    IN p_event_id uuid,
    IN p_closing_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    v_current_status varchar(30);
    v_requires_reason boolean;
    v_previous_reason text := current_setting('app.change_reason', true);
BEGIN
    PERFORM app_private.current_actor_id();
    IF NULLIF(btrim(p_closing_reason), '') IS NULL THEN
        RAISE EXCEPTION 'A non-empty closing reason is required'
            USING ERRCODE = '23514';
    END IF;

    SELECT e.status_code INTO v_current_status
    FROM public.campus_event e
    WHERE e.event_id = p_event_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campus Event % does not exist', p_event_id
            USING ERRCODE = 'P0002';
    END IF;
    IF v_current_status IN ('closed', 'void') THEN
        RAISE EXCEPTION 'Event % is already in terminal status %', p_event_id, v_current_status
            USING ERRCODE = '23514';
    END IF;

    SELECT t.requires_reason INTO v_requires_reason
    FROM public.event_status_transition t
    WHERE t.from_status_code = v_current_status
      AND t.to_status_code = 'closed'
      AND t.is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transition % -> closed is not active/allowed', v_current_status
            USING ERRCODE = '23514';
    END IF;
    IF v_requires_reason AND NULLIF(btrim(p_closing_reason), '') IS NULL THEN
        RAISE EXCEPTION 'The selected transition requires a reason'
            USING ERRCODE = '23514';
    END IF;

    PERFORM set_config('app.change_reason', btrim(p_closing_reason), true);
    UPDATE public.campus_event
       SET status_code = 'closed',
           ended_at = COALESCE(ended_at, clock_timestamp())
     WHERE event_id = p_event_id;
    /* TG-1 is the only event-status-history writer. */
    PERFORM set_config('app.change_reason', COALESCE(v_previous_reason, ''), true);
END;
$$;

/* Procedures run with the controlled deployment owner. Grant EXECUTE only to
   the selected restricted FastAPI runtime role after D-05/D-06/D-07 are settled. */
REVOKE ALL ON PROCEDURE public.register_event(varchar, varchar, text, varchar, uuid, varchar, uuid, uuid, uuid, uuid, timestamptz, varchar) FROM PUBLIC;
REVOKE ALL ON PROCEDURE public.close_event(uuid, text) FROM PUBLIC;

CREATE OR REPLACE VIEW public.v_open_campus_events_summary AS
SELECT
    e.event_id,
    e.event_code,
    e.title,
    c.display_name AS category_name,
    t.display_name AS event_type_name,
    s.display_name AS severity_name,
    s.severity_rank,
    st.display_name AS status_name,
    l.name AS location_name,
    a.name AS asset_name,
    cs.name AS service_name,
    e.started_at,
    e.created_at
FROM public.campus_event e
JOIN public.event_category c ON c.category_code = e.category_code
JOIN public.event_type t ON t.event_type_id = e.event_type_id
JOIN public.severity_level s ON s.severity_code = e.severity_code
JOIN public.event_status st ON st.status_code = e.status_code
LEFT JOIN public.campus_location l ON l.location_id = e.location_id
LEFT JOIN public.campus_asset a ON a.asset_id = e.asset_id
LEFT JOIN public.campus_service cs ON cs.service_id = e.service_id
WHERE st.is_terminal = false;

CREATE OR REPLACE VIEW public.v_campus_event_impact_summary AS
SELECT
    i.event_id,
    it.impact_type_code,
    it.display_name AS impact_type_name,
    i.unit_code,
    u.display_name AS unit_name,
    u.dimension_code,
    i.verification_status,
    count(*) AS impact_record_count,
    sum(i.quantity) AS raw_recorded_quantity
FROM public.event_impact i
JOIN public.impact_type it ON it.impact_type_code = i.impact_type_code
JOIN public.measurement_unit u ON u.unit_code = i.unit_code
GROUP BY
    i.event_id, it.impact_type_code, it.display_name,
    i.unit_code, u.display_name, u.dimension_code,
    i.verification_status;

/* ============================================================================
   G. SYNTHETIC SEED DATA
   All records below are fictional and are labelled data_class='synthetic'.
   The sample graph includes a chain, branching, a diamond, a suspected link,
   and a rejected-unrelated link. A cycle test is run separately and rolled back.
   ============================================================================ */

INSERT INTO public.department
(department_id, department_code, name, description, contact_email)
VALUES
('00000000-0000-4000-8000-000000000011', 'IT', 'Information Technology', 'Synthetic IT department for demonstration.', 'it@example.invalid'),
('00000000-0000-4000-8000-000000000012', 'CSE', 'Computer Science', 'Synthetic academic department for demonstration.', 'cse@example.invalid');

INSERT INTO public.app_user
(user_id, auth_subject, auth_provider, email, display_name, department_id)
VALUES
('00000000-0000-4000-8000-000000000001', 'campus-memory-synthetic-admin', 'synthetic_demo', 'demo.admin@campus-memory.invalid', 'Synthetic Demo Administrator', '00000000-0000-4000-8000-000000000011');

/* The synthetic actor is used only for these fixture records and SQL tests. */
SELECT set_config('app.actor_id', '00000000-0000-4000-8000-000000000001', true);
SELECT set_config('app.change_reason', 'Synthetic demonstration seed data', true);

INSERT INTO public.app_role(role_code, display_name, description)
VALUES
('administrator', 'Administrator', 'Manages system configuration and users.'),
('event_reporter', 'Event Reporter', 'Registers campus events and impacts.'),
('event_investigator', 'Event Investigator', 'Investigates relationships and evidence.'),
('decision_maker', 'Decision Maker', 'Reviews event and impact information.');

INSERT INTO public.user_role_assignment
(assignment_id, user_id, role_code, assigned_by, assigned_at, assignment_reason)
VALUES
('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'administrator', '00000000-0000-4000-8000-000000000001', now(), 'Synthetic demo role assignment');

INSERT INTO public.event_category(category_code, display_name, description, sort_order)
VALUES
('technical', 'Technical', 'Technology and computing events.', 1),
('infrastructure', 'Infrastructure', 'Campus physical and utility infrastructure events.', 2),
('academic', 'Academic', 'Teaching, learning and scheduled academic activity events.', 3),
('operational', 'Operational', 'Campus operations and service events.', 4);

INSERT INTO public.event_status(status_code, display_name, description, sort_order, is_terminal)
VALUES
('reported', 'Reported', 'Event has been recorded and awaits investigation.', 1, false),
('investigating', 'Investigating', 'Event is being investigated.', 2, false),
('resolved', 'Resolved', 'Immediate issue is resolved but record awaits closure.', 3, false),
('closed', 'Closed', 'Event investigation and handling are complete.', 4, true),
('void', 'Void', 'Record was voided or entered in error.', 5, true);

/* Proposed starter workflow only; review and replace after team confirmation of D-17. */
INSERT INTO public.event_status_transition
(from_status_code, to_status_code, requires_reason, description)
VALUES
('reported', 'investigating', true, 'Proposed: begin investigation.'),
('reported', 'void', true, 'Proposed: void an invalid event record.'),
('investigating', 'resolved', true, 'Proposed: mark investigation outcome resolved.'),
('investigating', 'void', true, 'Proposed: void an invalid event record.'),
('resolved', 'closed', true, 'Proposed: close a resolved event.'),
('resolved', 'investigating', true, 'Proposed: reopen for further investigation.');

INSERT INTO public.relationship_status
(relationship_status_code, display_name, description, is_traversable, sort_order)
VALUES
('confirmed', 'Confirmed', 'Evidence-backed relationship accepted by an investigator.', true, 1),
('suspected', 'Suspected', 'Candidate relationship not yet confirmed.', true, 2),
('rejected_unrelated', 'Rejected / Unrelated', 'Relationship reviewed and rejected as unrelated.', false, 3);

INSERT INTO public.evidence_type
(evidence_type_code, display_name, description, requires_reference)
VALUES
('system_log', 'System Log', 'Synthetic system or equipment log extract.', true),
('maintenance_ticket', 'Maintenance Ticket', 'Synthetic maintenance ticket or work order.', true),
('witness_note', 'Witness Note', 'Synthetic witness statement or investigator note.', false),
('monitoring_alert', 'Monitoring Alert', 'Synthetic monitoring system alert.', true),
('other_reference', 'Other Reference', 'Other referenced evidence source.', false);

INSERT INTO public.measurement_unit
(unit_code, display_name, symbol, dimension_code, decimal_places, description)
VALUES
('person', 'Person', 'person', 'count_people', 0, 'Count of affected people.'),
('session', 'Session', 'session', 'count_sessions', 0, 'Count of scheduled sessions.'),
('hour', 'Hour', 'h', 'time', 2, 'Duration in hours.'),
('minute', 'Minute', 'min', 'time', 0, 'Duration in minutes.'),
('item', 'Item', 'item', 'count_items', 0, 'Count of physical items.'),
('INR', 'Indian Rupee', 'INR', 'currency_inr', 2, 'Amount denominated in Indian rupees.');

INSERT INTO public.data_class
(data_class_code, display_name, description, requires_permission)
VALUES
('verified', 'Verified', 'Information verified against an authoritative record.', false),
('public', 'Public', 'Information intended for public use.', false),
('synthetic', 'Synthetic', 'Fictional demonstration or test data.', false);

INSERT INTO public.severity_level
(severity_code, display_name, severity_rank, description)
VALUES
('informational', 'Informational', 1, 'No material service disruption.'),
('low', 'Low', 2, 'Minor localised disruption.'),
('medium', 'Medium', 3, 'Noticeable disruption with limited scope.'),
('high', 'High', 4, 'Significant service or operational disruption.'),
('critical', 'Critical', 5, 'Major disruption requiring urgent attention.');

INSERT INTO public.event_type
(event_type_id, category_code, type_code, display_name, description, sort_order)
VALUES
('00000000-0000-4000-8000-000000000101', 'infrastructure', 'power_failure', 'Power Failure', 'Loss or interruption of electrical power.', 1),
('00000000-0000-4000-8000-000000000102', 'infrastructure', 'equipment_failure', 'Equipment Failure', 'Failure of campus equipment or infrastructure.', 2),
('00000000-0000-4000-8000-000000000103', 'technical', 'network_outage', 'Network Outage', 'Loss or degradation of network connectivity.', 1),
('00000000-0000-4000-8000-000000000104', 'technical', 'monitoring_alert', 'Monitoring Alert', 'An alert generated by a monitoring system.', 2),
('00000000-0000-4000-8000-000000000105', 'academic', 'activity_cancellation', 'Activity Cancellation', 'Cancellation or disruption of a scheduled academic activity.', 1),
('00000000-0000-4000-8000-000000000106', 'operational', 'maintenance_notice', 'Maintenance Notice', 'Routine operational maintenance notice.', 1),
('00000000-0000-4000-8000-000000000107', 'operational', 'equipment_fault', 'Equipment Fault', 'Fault involving operational campus equipment.', 2);

INSERT INTO public.impact_type
(impact_type_code, display_name, description, default_unit_code, aggregation_note)
VALUES
('students_affected', 'Students Affected', 'Number of students affected by an event.', 'person', 'Group by affected object and verification status.'),
('sessions_disrupted', 'Sessions Disrupted', 'Number of scheduled sessions disrupted.', 'session', 'Do not combine with person counts.'),
('downtime', 'Downtime', 'Duration of service or asset downtime.', 'hour', 'Group by a compatible time unit.'),
('equipment_damaged', 'Equipment Damaged', 'Count of affected equipment items.', 'item', 'Group by the equipment asset and verification status.'),
('repair_cost', 'Repair Cost', 'Estimated or verified monetary repair cost.', 'INR', 'Do not add to non-currency units.');

INSERT INTO public.campus_location
(location_id, location_code, name, location_type, parent_location_id, description)
VALUES
('00000000-0000-4000-8000-000000000201', 'MAIN-CAMPUS', 'Main Campus', 'campus', NULL, 'Synthetic main campus.'),
('00000000-0000-4000-8000-000000000202', 'ENG-BLOCK', 'Engineering Block', 'building', '00000000-0000-4000-8000-000000000201', 'Synthetic engineering building.'),
('00000000-0000-4000-8000-000000000203', 'ENG-F2', 'Engineering Block Floor 2', 'floor', '00000000-0000-4000-8000-000000000202', 'Synthetic second floor.'),
('00000000-0000-4000-8000-000000000204', 'LAB-203', 'Computer Laboratory 203', 'lab', '00000000-0000-4000-8000-000000000203', 'Synthetic computer laboratory.'),
('00000000-0000-4000-8000-000000000205', 'CLASS-105', 'Classroom 105', 'room', '00000000-0000-4000-8000-000000000202', 'Synthetic classroom.');

INSERT INTO public.campus_asset
(asset_id, asset_code, name, asset_type, location_id, manufacturer, model, asset_status, description)
VALUES
('00000000-0000-4000-8000-000000000301', 'SYN-ASSET-UPS-001', 'Laboratory UPS', 'UPS', '00000000-0000-4000-8000-000000000204', 'Synthetic Manufacturer', 'UPS-Demo-1', 'active', 'Synthetic UPS used in the example chain.'),
('00000000-0000-4000-8000-000000000302', 'SYN-ASSET-SW-001', 'Laboratory Network Switch', 'network_switch', '00000000-0000-4000-8000-000000000204', 'Synthetic Manufacturer', 'SW-Demo-1', 'active', 'Synthetic network switch used in the example chain.'),
('00000000-0000-4000-8000-000000000303', 'SYN-ASSET-PROJ-001', 'Classroom Projector', 'projector', '00000000-0000-4000-8000-000000000205', 'Synthetic Manufacturer', 'PJ-Demo-1', 'active', 'Synthetic projector for an unrelated event example.');

INSERT INTO public.campus_service
(service_id, service_code, name, service_type, owner_department_id, description, service_status)
VALUES
('00000000-0000-4000-8000-000000000401', 'SYN-SVC-POWER', 'Campus Power Supply', 'power', '00000000-0000-4000-8000-000000000011', 'Synthetic campus power service.', 'active'),
('00000000-0000-4000-8000-000000000402', 'SYN-SVC-NETWORK', 'Campus Network', 'network', '00000000-0000-4000-8000-000000000011', 'Synthetic campus network service.', 'active'),
('00000000-0000-4000-8000-000000000403', 'SYN-SVC-WIFI', 'Campus Wi-Fi', 'wireless_network', '00000000-0000-4000-8000-000000000011', 'Synthetic campus Wi-Fi service.', 'active');

INSERT INTO public.scheduled_activity
(scheduled_activity_id, activity_code, title, course_code, department_id, location_id, starts_at, ends_at, activity_status, created_by)
VALUES
('00000000-0000-4000-8000-000000000501', 'SYN-ACT-LAB-001', 'DBMS Laboratory Session', '24CS520', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000204', '2026-10-28 09:00:00+05:30', '2026-10-28 10:00:00+05:30', 'scheduled', '00000000-0000-4000-8000-000000000001');

/* Main event chain plus extra events for query variety and graph testing. */
INSERT INTO public.campus_event
(event_id, event_code, title, description, category_code, event_type_id, severity_code, status_code,
 location_id, asset_id, service_id, scheduled_activity_id, started_at, ended_at, data_class_code, source_note)
VALUES
('00000000-0000-4000-8000-000000000601', 'SYN-UPS-001', 'UPS Failure', 'Synthetic UPS failure interrupts stable power to the laboratory network equipment.', 'infrastructure', '00000000-0000-4000-8000-000000000101', 'high', 'resolved', '00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000401', NULL, '2026-10-28 08:00:00+05:30', '2026-10-28 08:35:00+05:30', 'synthetic', 'Synthetic teaching example; not a real campus incident.'),
('00000000-0000-4000-8000-000000000602', 'SYN-NET-001', 'Network Switch Failure', 'Synthetic network switch failure after the UPS power event.', 'infrastructure', '00000000-0000-4000-8000-000000000102', 'high', 'resolved', '00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000402', NULL, '2026-10-28 08:10:00+05:30', '2026-10-28 08:45:00+05:30', 'synthetic', 'Synthetic teaching example; not a real campus incident.'),
('00000000-0000-4000-8000-000000000603', 'SYN-LAB-001', 'Lab Network Outage', 'Synthetic loss of network access in Computer Laboratory 203.', 'technical', '00000000-0000-4000-8000-000000000103', 'critical', 'resolved', '00000000-0000-4000-8000-000000000204', NULL, '00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000501', '2026-10-28 08:20:00+05:30', '2026-10-28 09:05:00+05:30', 'synthetic', 'Synthetic teaching example; not a real campus incident.'),
('00000000-0000-4000-8000-000000000604', 'SYN-ACA-001', 'Lab Session Cancellation', 'Synthetic cancellation of the scheduled DBMS laboratory session.', 'academic', '00000000-0000-4000-8000-000000000105', 'high', 'closed', '00000000-0000-4000-8000-000000000204', NULL, NULL, '00000000-0000-4000-8000-000000000501', '2026-10-28 09:00:00+05:30', '2026-10-28 09:00:00+05:30', 'synthetic', 'Synthetic teaching example; not a real campus incident.'),
('00000000-0000-4000-8000-000000000605', 'SYN-WIFI-001', 'Wi-Fi Degradation', 'Synthetic Wi-Fi degradation as a second downstream branch from the switch failure.', 'technical', '00000000-0000-4000-8000-000000000103', 'medium', 'investigating', '00000000-0000-4000-8000-000000000204', NULL, '00000000-0000-4000-8000-000000000403', NULL, '2026-10-28 08:25:00+05:30', NULL, 'synthetic', 'Synthetic branching/diamond graph example.'),
('00000000-0000-4000-8000-000000000606', 'SYN-MON-001', 'Power Monitoring Alert', 'Synthetic monitoring alert preceding the UPS failure; its causal link remains suspected.', 'technical', '00000000-0000-4000-8000-000000000104', 'medium', 'reported', '00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000401', NULL, '2026-10-28 07:55:00+05:30', NULL, 'synthetic', 'Synthetic suspected-cause example.'),
('00000000-0000-4000-8000-000000000607', 'SYN-PROJ-001', 'Classroom Projector Fault', 'Synthetic projector lamp fault in Classroom 105.', 'operational', '00000000-0000-4000-8000-000000000107', 'low', 'resolved', '00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000303', NULL, NULL, '2026-10-27 11:00:00+05:30', '2026-10-27 11:30:00+05:30', 'synthetic', 'Synthetic unrelated event for query demonstrations.'),
('00000000-0000-4000-8000-000000000608', 'SYN-HVAC-001', 'Routine HVAC Maintenance Notice', 'Synthetic routine maintenance notice reviewed and found unrelated to the lab network outage.', 'operational', '00000000-0000-4000-8000-000000000106', 'informational', 'closed', '00000000-0000-4000-8000-000000000202', NULL, NULL, NULL, '2026-10-27 07:00:00+05:30', '2026-10-27 08:00:00+05:30', 'synthetic', 'Synthetic rejected-relationship example.');

/* Relationship rows are first inserted as suspected/unconfirmed. */
INSERT INTO public.event_relationship
(relationship_id, cause_event_id, effect_event_id, relationship_status_code, confidence_score, explanation,
 temporal_override_reason, data_class_code)
VALUES
('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000602', 'suspected', 0.9500, 'Synthetic chain: switch failure followed the UPS failure and the evidence record below supports a causal link.', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000603', 'suspected', 0.9400, 'Synthetic chain: the failed switch is recorded as a cause of the laboratory network outage.', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000604', 'suspected', 0.9900, 'Synthetic chain: the laboratory network outage disrupted the scheduled lab session.', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000605', 'suspected', 0.9000, 'Synthetic branch: the switch failure also affected the Wi-Fi service.', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000705', '00000000-0000-4000-8000-000000000605', '00000000-0000-4000-8000-000000000604', 'suspected', 0.8200, 'Synthetic diamond: Wi-Fi degradation is another recorded path to the same session cancellation.', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000706', '00000000-0000-4000-8000-000000000606', '00000000-0000-4000-8000-000000000601', 'suspected', 0.5500, 'Synthetic possible upstream cause; not yet confirmed.', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000707', '00000000-0000-4000-8000-000000000608', '00000000-0000-4000-8000-000000000603', 'rejected_unrelated', 0.0500, 'Reviewed synthetic example; routine HVAC maintenance was determined to be unrelated.', NULL, 'synthetic');

/* Add evidence to the five confirmed links and to the rejected link for provenance. */
INSERT INTO public.relationship_evidence
(evidence_id, relationship_id, evidence_type_code, description, source_reference, source_url, data_class_code)
VALUES
('00000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000701', 'maintenance_ticket', 'Synthetic maintenance work order records UPS output interruption before switch failure.', 'SYN-WO-UPS-001', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000702', 'system_log', 'Synthetic switch diagnostics show failure corresponding to the lab network outage.', 'SYN-LOG-SW-001', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000703', 'witness_note', 'Synthetic lab coordinator note records session cancellation due to unavailable network.', NULL, NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-000000000704', 'monitoring_alert', 'Synthetic wireless monitoring alert records degradation after the switch failure.', 'SYN-WIFI-ALERT-001', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000805', '00000000-0000-4000-8000-000000000705', 'witness_note', 'Synthetic operations note lists Wi-Fi degradation as an additional contributor to the session cancellation.', NULL, NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000806', '00000000-0000-4000-8000-000000000707', 'maintenance_ticket', 'Synthetic HVAC record supports the review that this maintenance notice was unrelated.', 'SYN-WO-HVAC-001', NULL, 'synthetic');

/* Confirm only after evidence exists. Each update creates relationship_history. */
SELECT set_config('app.change_reason', 'Synthetic evidence reviewed for demo confirmation.', true);
UPDATE public.event_relationship
SET relationship_status_code = 'confirmed'
WHERE relationship_id IN (
    '00000000-0000-4000-8000-000000000701',
    '00000000-0000-4000-8000-000000000702',
    '00000000-0000-4000-8000-000000000703',
    '00000000-0000-4000-8000-000000000704',
    '00000000-0000-4000-8000-000000000705'
);

INSERT INTO public.event_impact
(impact_id, event_id, impact_type_code, affected_asset_id, affected_service_id,
 affected_activity_id, affected_object_description, quantity, unit_code,
 verification_status, estimate_basis, data_class_code)
VALUES
('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000601', 'equipment_damaged', '00000000-0000-4000-8000-000000000301', NULL, NULL, NULL, 1, 'item', 'verified', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000603', 'downtime', NULL, '00000000-0000-4000-8000-000000000402', NULL, NULL, 2.500, 'hour', 'estimated', 'Synthetic monitoring interval used for demonstration.', 'synthetic'),
('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000603', 'students_affected', NULL, NULL, '00000000-0000-4000-8000-000000000501', NULL, 40, 'person', 'verified', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000604', 'students_affected', NULL, NULL, '00000000-0000-4000-8000-000000000501', NULL, 45, 'person', 'verified', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000905', '00000000-0000-4000-8000-000000000604', 'sessions_disrupted', NULL, NULL, '00000000-0000-4000-8000-000000000501', NULL, 1, 'session', 'verified', NULL, 'synthetic'),
('00000000-0000-4000-8000-000000000906', '00000000-0000-4000-8000-000000000607', 'equipment_damaged', '00000000-0000-4000-8000-000000000303', NULL, NULL, NULL, 1, 'item', 'estimated', 'Synthetic estimate for one projector lamp replacement.', 'synthetic');

/* ============================================================================
   H. STORED-PROCEDURE VALIDATION FIXTURE
   Registers a synthetic event, advances it through the proposed workflow and
   closes it through SP-2. This proves the procedure objects are callable when
   the script is executed. The record is intentionally retained as test data.
   ============================================================================ */

DO $$
DECLARE
    v_test_event_id uuid;
    v_history_rows integer;
BEGIN
    CALL public.register_event(
        'SYN-PROC-001',
        'Stored Procedure Demonstration Event',
        'Synthetic event created by register_event for database validation.',
        'technical',
        '00000000-0000-4000-8000-000000000104',
        'low',
        '00000000-0000-4000-8000-000000000204',
        NULL,
        NULL,
        NULL,
        '2026-10-29 10:00:00+05:30',
        'synthetic',
        v_test_event_id
    );

    PERFORM set_config('app.change_reason', 'Procedure validation: begin investigation.', true);
    UPDATE public.campus_event SET status_code = 'investigating' WHERE event_id = v_test_event_id;

    PERFORM set_config('app.change_reason', 'Procedure validation: resolve synthetic event.', true);
    UPDATE public.campus_event SET status_code = 'resolved' WHERE event_id = v_test_event_id;

    CALL public.close_event(v_test_event_id, 'Procedure validation: close synthetic event.');

    SELECT count(*) INTO v_history_rows
    FROM public.event_status_history h
    WHERE h.event_id = v_test_event_id;

    IF v_history_rows <> 4 THEN
        RAISE EXCEPTION 'SP validation failed: expected 4 status-history rows, got %', v_history_rows;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.campus_event e
        WHERE e.event_id = v_test_event_id AND e.status_code = 'closed'
    ) THEN
        RAISE EXCEPTION 'SP validation failed: register_event/close_event did not leave the event closed';
    END IF;
END;
$$;

/* ============================================================================
   I. AUTOMATED VALIDATION TESTS
   These assertions are non-destructive. A cycle-graph test is isolated in a
   subtransaction and rolled back after checking recursion termination.
   ============================================================================ */

DO $$
DECLARE
    v_table_count integer;
    v_min_columns integer;
    v_root_count integer;
    v_blast_count integer;
    v_suspected_count integer;
    v_impact_max numeric;
BEGIN
    SELECT count(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name IN (
        'app_user','app_role','user_role_assignment','department','campus_location',
        'campus_asset','campus_service','scheduled_activity','event_category','event_type',
        'severity_level','event_status','event_status_transition','relationship_status',
        'evidence_type','impact_type','measurement_unit','data_class','campus_event',
        'event_relationship','relationship_evidence','event_impact','event_status_history',
        'relationship_history'
      );
    IF v_table_count <> 24 THEN
        RAISE EXCEPTION 'Expected 24 CAMPUS MEMORY tables; found %', v_table_count;
    END IF;

    SELECT min(column_count) INTO v_min_columns
    FROM (
        SELECT table_name, count(*) AS column_count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN (
            'app_user','app_role','user_role_assignment','department','campus_location',
            'campus_asset','campus_service','scheduled_activity','event_category','event_type',
            'severity_level','event_status','event_status_transition','relationship_status',
            'evidence_type','impact_type','measurement_unit','data_class','campus_event',
            'event_relationship','relationship_evidence','event_impact','event_status_history',
            'relationship_history'
          )
        GROUP BY table_name
    ) q;
    IF v_min_columns < 5 THEN
        RAISE EXCEPTION 'At least one table has fewer than five columns (minimum=%)', v_min_columns;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.event_relationship r
        WHERE r.relationship_status_code = 'confirmed'
          AND NOT EXISTS (SELECT 1 FROM public.relationship_evidence re WHERE re.relationship_id = r.relationship_id)
    ) THEN
        RAISE EXCEPTION 'Evidence integrity test failed: confirmed relationship without evidence';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.v_open_campus_events_summary)
       OR NOT EXISTS (SELECT 1 FROM public.v_campus_event_impact_summary) THEN
        RAISE EXCEPTION 'Required view validation failed';
    END IF;

    SELECT count(*) INTO v_root_count
    FROM public.trace_root_causes('00000000-0000-4000-8000-000000000604', false)
    WHERE event_code = 'SYN-UPS-001';
    IF v_root_count <> 1 THEN
        RAISE EXCEPTION 'Root-cause chain test failed: expected UPS as a root cause of session cancellation';
    END IF;

    SELECT count(*) INTO v_blast_count
    FROM public.trace_blast_radius('00000000-0000-4000-8000-000000000601', false)
    WHERE event_code = 'SYN-ACA-001';
    IF v_blast_count <> 1 THEN
        RAISE EXCEPTION 'Blast-radius/diamond test failed: cancellation must appear once';
    END IF;

    SELECT count(*) INTO v_suspected_count
    FROM public.trace_root_causes('00000000-0000-4000-8000-000000000601', true)
    WHERE event_code = 'SYN-MON-001';
    IF v_suspected_count <> 1 THEN
        RAISE EXCEPTION 'Confirmed-plus-suspected traversal test failed';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.trace_root_causes('00000000-0000-4000-8000-000000000603', true)
        WHERE event_code = 'SYN-HVAC-001'
    ) THEN
        RAISE EXCEPTION 'Rejected relationship exclusion test failed';
    END IF;

    SELECT headline_quantity INTO v_impact_max
    FROM public.blast_radius_impact_summary('00000000-0000-4000-8000-000000000601', false)
    WHERE affected_object_key = 'activity:00000000-0000-4000-8000-000000000501'
      AND impact_type_code = 'students_affected'
      AND unit_code = 'person'
      AND verification_status = 'verified';
    IF v_impact_max IS DISTINCT FROM 45::numeric THEN
        RAISE EXCEPTION 'Impact de-duplication test failed: expected MAX headline quantity 45, got %', v_impact_max;
    END IF;
END;
$$;

/* TG-2A/TG-2B negative tests: the attempted violations must be rejected. */
DO $$
DECLARE
    v_test_relationship_id uuid := gen_random_uuid();
BEGIN
    /* Attempt to confirm a new relationship without any evidence. */
    INSERT INTO public.event_relationship
    (relationship_id, cause_event_id, effect_event_id, relationship_status_code,
     confidence_score, explanation, temporal_override_reason, data_class_code)
    VALUES
    (v_test_relationship_id,
     '00000000-0000-4000-8000-000000000607',
     '00000000-0000-4000-8000-000000000608',
     'suspected', 0.5000, 'Temporary negative test for TG-2A.',
     'Test pair has event timestamps in reverse causal order.', 'synthetic');

    BEGIN
        UPDATE public.event_relationship
        SET relationship_status_code = 'confirmed'
        WHERE relationship_id = v_test_relationship_id;
        RAISE EXCEPTION USING ERRCODE = 'ZX002', MESSAGE = 'TG-2A did not reject unsupported confirmation';
    EXCEPTION
        WHEN check_violation THEN NULL;
        WHEN SQLSTATE 'ZX002' THEN RAISE;
    END;
    DELETE FROM public.event_relationship WHERE relationship_id = v_test_relationship_id;

    /* Attempt to delete the only evidence row from a confirmed relationship. */
    BEGIN
        DELETE FROM public.relationship_evidence
        WHERE evidence_id = '00000000-0000-4000-8000-000000000801';
        RAISE EXCEPTION USING ERRCODE = 'ZX003', MESSAGE = 'TG-2B did not reject deletion of the last confirmed evidence row';
    EXCEPTION
        WHEN check_violation THEN NULL;
        WHEN SQLSTATE 'ZX003' THEN RAISE;
    END;

    /* Attempt to move the only evidence row away from a confirmed relationship. */
    BEGIN
        UPDATE public.relationship_evidence
        SET relationship_id = '00000000-0000-4000-8000-000000000702'
        WHERE evidence_id = '00000000-0000-4000-8000-000000000801';
        RAISE EXCEPTION USING ERRCODE = 'ZX004', MESSAGE = 'TG-2B did not reject reassignment of the last confirmed evidence row';
    EXCEPTION
        WHEN check_violation THEN NULL;
        WHEN SQLSTATE 'ZX004' THEN RAISE;
    END;
END;
$$;

/* Cycle-prevention test: all temporary rows are rolled back within this DO block. */
DO $$
DECLARE
    v_a uuid := gen_random_uuid();
    v_b uuid := gen_random_uuid();
    v_c uuid := gen_random_uuid();
    v_count integer;
BEGIN
    BEGIN
        INSERT INTO public.campus_event
        (event_id, event_code, title, description, category_code, event_type_id,
         severity_code, status_code, location_id, started_at, data_class_code)
        VALUES
        (v_a, 'TEST-CYCLE-A', 'Cycle A', 'Temporary cycle-test event A.', 'technical', '00000000-0000-4000-8000-000000000104', 'low', 'reported', '00000000-0000-4000-8000-000000000204', now(), 'synthetic'),
        (v_b, 'TEST-CYCLE-B', 'Cycle B', 'Temporary cycle-test event B.', 'technical', '00000000-0000-4000-8000-000000000104', 'low', 'reported', '00000000-0000-4000-8000-000000000204', now(), 'synthetic'),
        (v_c, 'TEST-CYCLE-C', 'Cycle C', 'Temporary cycle-test event C.', 'technical', '00000000-0000-4000-8000-000000000104', 'low', 'reported', '00000000-0000-4000-8000-000000000204', now(), 'synthetic');

        INSERT INTO public.event_relationship
        (cause_event_id, effect_event_id, relationship_status_code, confidence_score, explanation, data_class_code)
        VALUES
        (v_a, v_b, 'suspected', 0.5, 'Temporary cycle test A to B.', 'synthetic'),
        (v_b, v_c, 'suspected', 0.5, 'Temporary cycle test B to C.', 'synthetic'),
        (v_c, v_a, 'suspected', 0.5, 'Temporary cycle test C to A.', 'synthetic');

        SELECT count(*) INTO v_count FROM public.trace_blast_radius(v_a, true);
        IF v_count <> 2 THEN
            RAISE EXCEPTION 'Cycle-prevention test failed: expected two distinct reachable events, got %', v_count;
        END IF;
        /* Raise a private exception so this successful test subtransaction rolls back. */
        RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'rollback successful cycle-test fixture';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN
        NULL;
    END;
END;
$$;

/* Check that the fixture really includes the expected academic SQL structures. */
DO $$
BEGIN
    IF (SELECT count(*) FROM public.event_status_history) < 1 THEN
        RAISE EXCEPTION 'TG-1 validation failed: no event status history rows were written';
    END IF;
    IF (SELECT count(*) FROM public.relationship_history) < 1 THEN
        RAISE EXCEPTION 'TG-3 validation failed: no relationship history rows were written';
    END IF;
    IF (SELECT count(*) FROM public.relationship_evidence) < 6 THEN
        RAISE EXCEPTION 'Evidence seed validation failed';
    END IF;
END;
$$;

/* ============================================================================
   J. SUPABASE SECURITY HARDENING — FAIL CLOSED UNTIL FASTAPI IS CONFIGURED
   ============================================================================
   This project routes application access through FastAPI and direct PostgreSQL.
   The Data API roles receive no access from this bootstrap. RLS is enabled with
   no client policies; configure a dedicated backend role and appropriate
   privileges/policies before connecting the application. SQL Editor/admin
   execution remains available to the database owner.
*/
REVOKE ALL ON ALL TABLES IN SCHEMA public
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL PROCEDURES IN SCHEMA public
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE USAGE ON SCHEMA public
    FROM anon, authenticated, service_role;
REVOKE ALL ON SCHEMA app_private
    FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.department ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_class ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.severity_level ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_status_transition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_relationship ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_history ENABLE ROW LEVEL SECURITY;

/* Views should use the querying role's privileges and underlying RLS policies. */
ALTER VIEW public.v_open_campus_events_summary SET (security_invoker = true);
ALTER VIEW public.v_campus_event_impact_summary SET (security_invoker = true);

COMMIT;

/* ============================================================================
   K. ACADEMIC SQL QUERY CATALOGUE
   Run these SELECT statements after the setup transaction commits.
   Query counts below follow the supplied project summary; faculty compliance
   remains unverified until checked against the official course guideline.
   ============================================================================ */

/* SQ-01 — List open campus events. */
SELECT * FROM public.v_open_campus_events_summary ORDER BY started_at DESC;

/* SQ-02 — List high and critical events. */
SELECT e.event_code, e.title, s.display_name AS severity, s.severity_rank
FROM public.campus_event e
JOIN public.severity_level s ON s.severity_code = e.severity_code
WHERE s.severity_rank >= 4
ORDER BY s.severity_rank DESC, e.started_at DESC;

/* SQ-03 — List events recorded at Laboratory 203. */
SELECT e.event_code, e.title, l.name AS location_name, e.started_at
FROM public.campus_event e
JOIN public.campus_location l ON l.location_id = e.location_id
WHERE l.location_code = 'LAB-203'
ORDER BY e.started_at;

/* SQ-04 — Show directed cause/effect pairs involving the UPS event. */
SELECT cause.event_code AS cause_code, cause.title AS cause_title,
       effect.event_code AS effect_code, effect.title AS effect_title,
       r.relationship_status_code, r.confidence_score
FROM public.event_relationship r
JOIN public.campus_event cause ON cause.event_id = r.cause_event_id
JOIN public.campus_event effect ON effect.event_id = r.effect_event_id
WHERE cause.event_code = 'SYN-UPS-001' OR effect.event_code = 'SYN-UPS-001'
ORDER BY cause.event_code, effect.event_code;

/* SQ-05 — Display evidence supporting the UPS -> switch relationship. */
SELECT e.evidence_id, et.display_name AS evidence_type, e.description,
       e.source_reference, e.recorded_at
FROM public.relationship_evidence e
JOIN public.evidence_type et ON et.evidence_type_code = e.evidence_type_code
JOIN public.event_relationship r ON r.relationship_id = e.relationship_id
JOIN public.campus_event cause ON cause.event_id = r.cause_event_id
JOIN public.campus_event effect ON effect.event_id = r.effect_event_id
WHERE cause.event_code = 'SYN-UPS-001' AND effect.event_code = 'SYN-NET-001';

/* NQ-01 — Find events on assets whose event count is above the average asset event count. */
SELECT e.event_code, e.title, a.asset_code
FROM public.campus_event e
JOIN public.campus_asset a ON a.asset_id = e.asset_id
WHERE a.asset_id IN (
    SELECT per_asset.asset_id
    FROM (
        SELECT asset_id, count(*) AS event_count
        FROM public.campus_event
        WHERE asset_id IS NOT NULL
        GROUP BY asset_id
    ) per_asset
    WHERE per_asset.event_count > (
        SELECT avg(asset_counts.event_count)
        FROM (
            SELECT count(*) AS event_count
            FROM public.campus_event
            WHERE asset_id IS NOT NULL
            GROUP BY asset_id
        ) asset_counts
    )
);

/* NQ-02 — Find events whose severity is above the overall average severity rank. */
SELECT e.event_code, e.title, s.display_name, s.severity_rank
FROM public.campus_event e
JOIN public.severity_level s ON s.severity_code = e.severity_code
WHERE s.severity_rank > (SELECT avg(severity_rank) FROM public.severity_level);

/* NQ-03 — Find locations that have at least one critical event. */
SELECT l.location_code, l.name
FROM public.campus_location l
WHERE l.location_id IN (
    SELECT e.location_id
    FROM public.campus_event e
    JOIN public.severity_level s ON s.severity_code = e.severity_code
    WHERE s.severity_code = 'critical' AND e.location_id IS NOT NULL
);

/* NQ-04 — Find events whose category appears in the selected October 2026 period. */
SELECT e.event_code, e.title, e.category_code
FROM public.campus_event e
WHERE e.category_code IN (
    SELECT DISTINCT e2.category_code
    FROM public.campus_event e2
    WHERE e2.started_at BETWEEN '2026-10-01 00:00:00+05:30'::timestamptz
                             AND '2026-10-31 23:59:59+05:30'::timestamptz
);

/* NQ-05 — Find impacts whose quantity is above the average for the same type and unit. */
SELECT i.impact_id, e.event_code, i.impact_type_code, i.unit_code, i.quantity
FROM public.event_impact i
JOIN public.campus_event e ON e.event_id = i.event_id
WHERE i.quantity > (
    SELECT avg(i2.quantity)
    FROM public.event_impact i2
    WHERE i2.impact_type_code = i.impact_type_code
      AND i2.unit_code = i.unit_code
);

/* SET-01 — Events associated with an asset OR a service (UNION removes duplicates). */
SELECT event_id FROM public.campus_event WHERE asset_id IS NOT NULL
UNION
SELECT event_id FROM public.campus_event WHERE service_id IS NOT NULL;

/* SET-02 — Events that are high severity AND have at least one recorded impact. */
SELECT e.event_id
FROM public.campus_event e
JOIN public.severity_level s ON s.severity_code = e.severity_code
WHERE s.severity_rank >= 4
INTERSECT
SELECT i.event_id FROM public.event_impact i;

/* GB-01 — Count events by category. */
SELECT c.category_code, c.display_name, count(e.event_id) AS event_count
FROM public.event_category c
LEFT JOIN public.campus_event e ON e.category_code = c.category_code
GROUP BY c.category_code, c.display_name
ORDER BY c.category_code;

/* GB-02 — Count impact records by type and measurement unit. */
SELECT i.impact_type_code, i.unit_code, count(*) AS impact_count
FROM public.event_impact i
GROUP BY i.impact_type_code, i.unit_code
ORDER BY i.impact_type_code, i.unit_code;

/* HV-01 — Assets with at least one recorded event (change threshold as needed). */
SELECT a.asset_code, a.name, count(e.event_id) AS event_count
FROM public.campus_asset a
JOIN public.campus_event e ON e.asset_id = a.asset_id
GROUP BY a.asset_id, a.asset_code, a.name
HAVING count(e.event_id) >= 1
ORDER BY event_count DESC;

/* HV-02 — Activity objects with more than 30 verified affected people (raw records). */
SELECT i.affected_activity_id, sum(i.quantity) AS raw_people_count
FROM public.event_impact i
WHERE i.impact_type_code = 'students_affected'
  AND i.unit_code = 'person'
  AND i.verification_status = 'verified'
GROUP BY i.affected_activity_id
HAVING sum(i.quantity) > 30;

/* PM-01 — Case-insensitive title keyword search using ILIKE. */
SELECT event_code, title
FROM public.campus_event
WHERE title ILIKE '%network%';

/* PM-02 — Events whose start time falls within a specified range using BETWEEN. */
SELECT event_code, title, started_at
FROM public.campus_event
WHERE started_at BETWEEN '2026-10-28 08:00:00+05:30'::timestamptz
                      AND '2026-10-28 09:30:00+05:30'::timestamptz
ORDER BY started_at;

/* PM-03 — Event code pattern matching using LIKE. */
SELECT event_code, title
FROM public.campus_event
WHERE event_code LIKE 'SYN-%'
ORDER BY event_code;

/* CQ-01 — Events whose severity exceeds the average severity at their own location. */
SELECT e.event_code, e.title, e.location_id, s.severity_rank
FROM public.campus_event e
JOIN public.severity_level s ON s.severity_code = e.severity_code
WHERE e.location_id IS NOT NULL
  AND s.severity_rank > (
      SELECT avg(s2.severity_rank)
      FROM public.campus_event e2
      JOIN public.severity_level s2 ON s2.severity_code = e2.severity_code
      WHERE e2.location_id = e.location_id
  );

/* EX-01 — Events that have at least one confirmed relationship. */
SELECT e.event_id, e.event_code, e.title
FROM public.campus_event e
WHERE EXISTS (
    SELECT 1 FROM public.event_relationship r
    WHERE (r.cause_event_id = e.event_id OR r.effect_event_id = e.event_id)
      AND r.relationship_status_code = 'confirmed'
);

/* NEX-01 — Events with no recorded impacts. */
SELECT e.event_id, e.event_code, e.title
FROM public.campus_event e
WHERE NOT EXISTS (
    SELECT 1 FROM public.event_impact i WHERE i.event_id = e.event_id
);

/* AG-01 — COUNT aggregate: number of events by status. */
SELECT status_code, count(*) AS event_count
FROM public.campus_event
GROUP BY status_code;

/* AG-02 — SUM aggregate: raw quantities by compatible impact type/unit/status. */
SELECT impact_type_code, unit_code, verification_status, sum(quantity) AS raw_quantity
FROM public.event_impact
GROUP BY impact_type_code, unit_code, verification_status;

/* AG-03 — AVG aggregate: average downtime in hours. */
SELECT avg(quantity) AS average_downtime_hours
FROM public.event_impact
WHERE impact_type_code = 'downtime' AND unit_code = 'hour';

/* AG-04 — MIN/MAX aggregates: earliest and latest recorded event times. */
SELECT min(started_at) AS earliest_event, max(started_at) AS latest_event
FROM public.campus_event;

/* ============================================================================
   L. CORE TEMPORAL / GRAPH / IMPACT DEMONSTRATION QUERIES
   ============================================================================ */

/* Backward root-cause trace: confirmed relationships only. */
SELECT *
FROM public.trace_root_causes(
    (SELECT event_id FROM public.campus_event WHERE event_code = 'SYN-ACA-001'),
    false
);

/* Forward blast-radius trace: confirmed relationships only. */
SELECT *
FROM public.trace_blast_radius(
    (SELECT event_id FROM public.campus_event WHERE event_code = 'SYN-UPS-001'),
    false
);

/* Forward blast-radius trace including suspected relationships. */
SELECT *
FROM public.trace_blast_radius(
    (SELECT event_id FROM public.campus_event WHERE event_code = 'SYN-UPS-001'),
    true
);

/* Deduplicated impact summary for the UPS event's confirmed blast radius. */
SELECT *
FROM public.blast_radius_impact_summary(
    (SELECT event_id FROM public.campus_event WHERE event_code = 'SYN-UPS-001'),
    false
)
ORDER BY impact_type_code, unit_code, verification_status, affected_object_key;

/* Recorded raw impact summary view (not the deduplicated blast-radius total). */
SELECT *
FROM public.v_campus_event_impact_summary
ORDER BY event_id, impact_type_code, unit_code, verification_status;

/* ============================================================================
   M. REQUIREMENT TRACEABILITY / COMPLETION CHECKLIST
   ============================================================================

DATABASE OBJECTS
- [x] 24 proposed tables created by this script.
- [x] Primary keys defined for all tables.
- [x] Foreign keys defined for applicable relationships.
- [x] Meaningful attributes (five or more) included in every table.
- [x] Directed event relationships and relationship evidence.
- [x] Event impacts with a single structured affected object or free-text target.
- [x] Append-only event status history.
- [x] Relationship status/confidence history trigger (recommended TG-3).
- [x] Indexes for primary investigation/filter paths.

DATABASE LOGIC
- [x] TG-1 initial event status and actual status-change history.
- [x] TG-2A confirmed relationship requires evidence.
- [x] TG-2B last evidence deletion/reassignment protection.
- [x] Event last-modified metadata trigger.
- [x] Status transition guard driven by event_status_transition.
- [x] SP-1 register_event procedure.
- [x] SP-2 close_event procedure.
- [x] v_open_campus_events_summary view.
- [x] v_campus_event_impact_summary view.
- [x] Recursive root-cause and blast-radius functions with path cycle protection.
- [x] Blast-radius impact grouping with max headline and duplicate flags.

ACADEMIC SQL EXAMPLES (counts from supplied team summary; still unverified)
- [x] 5 simple queries: SQ-01 through SQ-05.
- [x] 5 nested queries: NQ-01 through NQ-05.
- [x] 2 set operations: SET-01 UNION; SET-02 INTERSECT.
- [x] 2 GROUP BY queries: GB-01 through GB-02.
- [x] 2 HAVING queries: HV-01 through HV-02.
- [x] 3 LIKE/BETWEEN/pattern queries: PM-01 through PM-03.
- [x] 1 correlated query: CQ-01.
- [x] 2 views.
- [x] 1 EXISTS query: EX-01.
- [x] 1 NOT EXISTS query: NEX-01.
- [x] 4 aggregate examples: COUNT, SUM, AVG, MIN/MAX.
- [x] Multiple physical trigger definitions implement at least TG-1 and TG-2 logical requirements.
- [x] 2 stored procedures.

TESTS INCLUDED
- [x] 24-table and minimum-column-count assertions.
- [x] Confirmed relationship evidence assertion.
- [x] TG-2A direct-confirmation-without-evidence negative test.
- [x] TG-2B last-evidence delete/reassignment negative tests.
- [x] Both required views checked.
- [x] Root-cause chain assertion.
- [x] Blast-radius diamond/deduplication assertion.
- [x] Confirmed-plus-suspected traversal assertion.
- [x] Rejected relationship exclusion assertion.
- [x] Impact MAX-headline assertion.
- [x] Procedure and status-history assertions.
- [x] Cycle-prevention test with temporary data rolled back.

NOT AUTOMATICALLY VERIFIED HERE
- SQL syntax has not been executed against a live Supabase PostgreSQL instance.
- Two-session concurrency tests for simultaneous confirmation vs evidence deletion
  and concurrent evidence reassignment require separate database sessions.
- The two procedures are revoked from PUBLIC; after selecting a restricted
  FastAPI runtime role, grant EXECUTE on those procedures to that role only.
- Final role grants, RLS, Data API settings, Auth mapping and pooler choice require
  project-specific security decisions and tests.
- Official faculty guideline compliance and PostgreSQL/Supabase acceptance remain
  unverified until the official guideline/faculty response is checked.

END OF FILE
*/
