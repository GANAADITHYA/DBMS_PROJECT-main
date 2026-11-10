/*
 CAMPUS MEMORY - reviewed runtime-role permission proposal

 STATUS: PROPOSAL ONLY. DO NOT EXECUTE AUTOMATICALLY.

 This script is intentionally separate from the bootstrap SQL. It must be
 reviewed against the output of DATABASE_RUNTIME_ROLE_AUDIT.sql and applied by
 a database maintainer only after campus_memory_app has been confirmed as the
 dedicated FastAPI role.

 It does not create tables, change ownership, disable RLS, grant privileges to
 anon/authenticated/service_role, or grant superuser/CREATEDB/CREATEROLE.

 Design basis:
 - FastAPI uses direct PostgreSQL access, not the Supabase Data API.
 - Repositories issue SELECT, INSERT and UPDATE only; no application DELETE is
   implemented.
 - Procedures/functions use the exact signatures defined in the database SQL.
 - Public views are security_invoker views, so underlying table privileges and
   RLS policies still apply.
 - app_private is used by SECURITY DEFINER trigger/procedure code and is not
   exposed directly to the runtime role.
*/

BEGIN;

/* The target must already exist. This assertion prevents applying the proposal
   to a misspelled or unexpected role. */
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'campus_memory_app'
    ) THEN
        RAISE EXCEPTION 'campus_memory_app does not exist; create/review the dedicated role first';
    END IF;
END;
$$;

/*
 REVOKE 1: remove existing public-schema table privileges from this dedicated
 role before adding the explicit allow-list below. This does not affect any
 other role. It is included to prevent privilege accumulation over time.
*/
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM campus_memory_app;

/*
 REVOKE 2: remove existing public-schema routine privileges from this role.
 Only the five routines listed below are needed by the current backend.
*/
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM campus_memory_app;
REVOKE ALL ON ALL PROCEDURES IN SCHEMA public FROM campus_memory_app;

/*
 REVOKE 3: internal helper functions must remain inaccessible directly. Their
 trigger/procedure SECURITY DEFINER callers are the only intended access path.
*/
REVOKE ALL ON SCHEMA app_private FROM campus_memory_app;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM campus_memory_app;

/* Required namespace access for public application objects. */
GRANT USAGE ON SCHEMA public TO campus_memory_app;

/*
 SELECT allow-list: these are the actual tables referenced by the current
 repositories, report queries, user lookup and invoker investigation routines.
*/
GRANT SELECT ON TABLE
    public.department,
    public.app_user,
    public.user_role_assignment,
    public.event_category,
    public.event_type,
    public.event_status_transition,
    public.severity_level,
    public.event_status,
    public.relationship_status,
    public.campus_location,
    public.campus_asset,
    public.campus_service,
    public.scheduled_activity,
    public.campus_event,
    public.event_relationship,
    public.relationship_evidence,
    public.evidence_type,
    public.event_impact,
    public.impact_type,
    public.measurement_unit,
    public.data_class,
    public.event_status_history,
    public.relationship_history
TO campus_memory_app;

/* The two current report views are security_invoker views. */
GRANT SELECT ON TABLE
    public.v_open_campus_events_summary,
    public.v_campus_event_impact_summary
TO campus_memory_app;

/*
 INSERT allow-list: direct repository writes. Trigger functions supply actor
 fields from the trusted transaction-local context.
*/
GRANT INSERT ON TABLE
    public.event_relationship,
    public.relationship_evidence,
    public.event_impact
TO campus_memory_app;

/*
 UPDATE allow-list: event edits/status changes, relationship confirmation or
 downgrade, and impact corrections. No DELETE privilege is granted.
*/
GRANT UPDATE ON TABLE
    public.campus_event,
    public.event_relationship,
    public.event_impact
TO campus_memory_app;

/* Explicitly document the denied destructive privileges. */
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
    public.department,
    public.app_user,
    public.user_role_assignment,
    public.event_category,
    public.event_type,
    public.event_status_transition,
    public.severity_level,
    public.event_status,
    public.relationship_status,
    public.campus_location,
    public.campus_asset,
    public.campus_service,
    public.scheduled_activity,
    public.campus_event,
    public.event_relationship,
    public.relationship_evidence,
    public.evidence_type,
    public.event_impact,
    public.impact_type,
    public.measurement_unit,
    public.data_class,
    public.event_status_history,
    public.relationship_history
FROM campus_memory_app;

/*
 Investigation routines: exact signatures from the database SQL. These are
 invoker functions, so the SELECT grants and policies above remain necessary.
*/
GRANT EXECUTE ON FUNCTION
    public.trace_root_causes(uuid, boolean),
    public.trace_blast_radius(uuid, boolean),
    public.blast_radius_impact_summary(uuid, boolean)
TO campus_memory_app;

/*
 Stored procedures: exact identity arguments from the database SQL. The OUT
 parameter of register_event is not included in PostgreSQL's identity argument
 list used by GRANT ON PROCEDURE.
*/
GRANT EXECUTE ON PROCEDURE
    public.register_event(varchar, varchar, text, varchar, uuid, varchar,
                          uuid, uuid, uuid, uuid, timestamptz, varchar),
    public.close_event(uuid, text)
TO campus_memory_app;

/*
 RLS policies: the backend role is trusted application infrastructure, while
 end-user authorization remains in FastAPI. Policies are intentionally limited
 to this role and do not open access to Supabase Data API roles.

 The policy bodies are broad within the dedicated backend role because the
 backend must perform cross-user reads and workflow writes; SQL grants above
 still limit which operations are possible. Review the audit output first and
 reconcile policy names if equivalent policies already exist.
*/

CREATE POLICY campus_memory_app_select ON public.app_user
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.department
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.user_role_assignment
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.event_category
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.event_type
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.event_status_transition
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.severity_level
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.event_status
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.relationship_status
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.campus_location
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.campus_asset
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.campus_service
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.scheduled_activity
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.campus_event
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.event_relationship
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.relationship_evidence
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.evidence_type
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.event_impact
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.impact_type
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.measurement_unit
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.data_class
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.event_status_history
    FOR SELECT TO campus_memory_app USING (true);
CREATE POLICY campus_memory_app_select ON public.relationship_history
    FOR SELECT TO campus_memory_app USING (true);

CREATE POLICY campus_memory_app_insert ON public.event_relationship
    FOR INSERT TO campus_memory_app WITH CHECK (true);
CREATE POLICY campus_memory_app_insert ON public.relationship_evidence
    FOR INSERT TO campus_memory_app WITH CHECK (true);
CREATE POLICY campus_memory_app_insert ON public.event_impact
    FOR INSERT TO campus_memory_app WITH CHECK (true);

CREATE POLICY campus_memory_app_update ON public.campus_event
    FOR UPDATE TO campus_memory_app USING (true) WITH CHECK (true);
CREATE POLICY campus_memory_app_update ON public.event_relationship
    FOR UPDATE TO campus_memory_app USING (true) WITH CHECK (true);
CREATE POLICY campus_memory_app_update ON public.event_impact
    FOR UPDATE TO campus_memory_app USING (true) WITH CHECK (true);

/* No policy is created for DELETE. The role has no DELETE grant. */

COMMIT;

/* Post-application verification: rerun the read-only audit script. */
