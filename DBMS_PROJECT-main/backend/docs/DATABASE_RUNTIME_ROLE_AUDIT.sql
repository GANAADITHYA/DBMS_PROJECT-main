/*
 CAMPUS MEMORY - read-only runtime-role security audit

 Purpose:
   Inspect the existing PostgreSQL database before any runtime-role grant or RLS
   change is approved. This file contains SELECT statements plus one transaction
   local set_config probe. It does not create, alter, grant, revoke, or execute
   application writes.

 Usage:
   Run this file in Supabase SQL Editor as a database maintainer, or connect as
   campus_memory_app where noted. Do not paste credentials into this file.

 Target role: campus_memory_app
 Source of truth for object names:
   docs/CAMPUS_MEMORY_COMPLETE_DATABASE_PRE_EXECUTION_REVISED.sql
*/

/* 1. Role existence, login, bypass flags and database connection privilege.
    Administrative SQL Editor/catalog check; it does not prove a login can
    actually connect as the target role. */
WITH target AS (
    SELECT r.*
    FROM pg_roles r
    WHERE r.rolname = 'campus_memory_app'
)
SELECT
    EXISTS (SELECT 1 FROM target) AS role_exists,
    t.rolname,
    t.rolcanlogin AS can_login,
    t.rolinherit AS inherits_roles,
    t.rolbypassrls AS bypasses_rls,
    t.rolsuper AS is_superuser,
    t.rolcreatedb AS can_create_database,
    t.rolcreaterole AS can_create_role,
    CASE
        WHEN t.rolname IS NULL THEN NULL
        ELSE has_database_privilege(t.rolname, current_database(), 'CONNECT')
    END AS can_connect_current_database
FROM (SELECT NULL::name AS rolname, NULL::boolean AS rolcanlogin,
             NULL::boolean AS rolinherit, NULL::boolean AS rolbypassrls,
             NULL::boolean AS rolsuper, NULL::boolean AS rolcreatedb,
             NULL::boolean AS rolcreaterole) empty
FULL OUTER JOIN target t ON true;

/* 2. Run separately as campus_memory_app to prove the actual connection.
    This result is meaningful only from a real login connection as that
    role. The SQL Editor/admin session proves only its own connection. */
SELECT current_database() AS connected_database,
       current_user AS connected_role,
       session_user AS session_role;

/* 3. Direct and indirect membership, including PostgreSQL 17 membership
    options. This inventory follows every membership edge, including paths that
    do not inherit privileges, so it does not omit roles reachable through SET
    ROLE chains. pg_has_role() reports effective MEMBER, USAGE and SET access
    separately; those results are not interchangeable. */
WITH RECURSIVE role_tree AS (
    SELECT target.oid AS current_oid,
        target.rolname AS current_role,
        0 AS membership_depth,
        ARRAY[target.oid]::oid[] AS visited
    FROM pg_roles target
    WHERE target.rolname = 'campus_memory_app'

    UNION ALL

    SELECT parent.oid,
        parent.rolname,
        tree.membership_depth + 1,
        tree.visited || parent.oid
    FROM role_tree tree
    JOIN pg_auth_members membership ON membership.member = tree.current_oid
    JOIN pg_roles parent ON parent.oid = membership.roleid
    WHERE NOT parent.oid = ANY(tree.visited)
)
SELECT member.rolname AS member_role,
    granted.rolname AS granted_role,
    membership.membership_depth,
    auth_members.inherit_option,
    auth_members.set_option,
    auth_members.admin_option,
    granted.rolsuper AS granted_role_is_superuser,
    granted.rolbypassrls AS granted_role_bypasses_rls,
    granted.rolcreaterole AS granted_role_can_create_roles,
    pg_has_role('campus_memory_app', granted.rolname, 'MEMBER') AS has_member,
    pg_has_role('campus_memory_app', granted.rolname, 'USAGE') AS has_usage,
    pg_has_role('campus_memory_app', granted.rolname, 'SET') AS can_set_role
FROM pg_auth_members auth_members
JOIN pg_roles member ON member.oid = auth_members.member
JOIN pg_roles granted ON granted.oid = auth_members.roleid
JOIN LATERAL (
    SELECT MIN(tree.membership_depth) + 1 AS membership_depth
    FROM role_tree tree
    WHERE tree.current_oid = auth_members.member
) membership ON true
WHERE membership.membership_depth IS NOT NULL
ORDER BY membership.membership_depth, granted.rolname;

/* 4. Schema privileges. Administrative catalog check; missing schemas are
    reported explicitly and privilege functions are called only for existing
    schemas and an existing target role. app_private should remain inaccessible
    directly. */
WITH role_state AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'campus_memory_app'
    ) AS role_exists
)
SELECT schemas.schema_name,
       (schema_info.oid IS NOT NULL) AS schema_exists,
       CASE WHEN role_exists AND schema_info.oid IS NOT NULL
            THEN has_schema_privilege('campus_memory_app', schema_info.oid, 'USAGE')
            ELSE NULL END AS has_usage,
       CASE WHEN role_exists AND schema_info.oid IS NOT NULL
            THEN has_schema_privilege('campus_memory_app', schema_info.oid, 'CREATE')
            ELSE NULL END AS has_create
FROM role_state
CROSS JOIN (VALUES ('public'::name), ('app_private'::name)) schemas(schema_name)
LEFT JOIN pg_namespace schema_info ON schema_info.nspname = schemas.schema_name
ORDER BY schema_name;

/* 5. Effective table privileges used by repositories and triggers.
    The LATERAL check runs only when the named table exists and the target
    role exists, so missing objects are reported instead of failing audit. */
WITH role_state AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'campus_memory_app'
    ) AS role_exists
), tables(table_name) AS (
    VALUES
        ('department'), ('app_role'), ('user_role_assignment'), ('app_user'),
        ('campus_location'), ('campus_asset'), ('campus_service'),
        ('scheduled_activity'), ('event_category'), ('event_type'),
        ('severity_level'), ('event_status'), ('event_status_transition'),
        ('relationship_status'), ('evidence_type'), ('impact_type'),
        ('measurement_unit'), ('data_class'), ('campus_event'),
        ('event_relationship'), ('relationship_evidence'), ('event_impact'),
        ('event_status_history'), ('relationship_history')
)
SELECT t.table_name,
    COALESCE(object_info.object_exists, false) AS object_exists,
         privileges.can_select,
         privileges.can_insert,
         privileges.can_update,
         privileges.can_delete
FROM tables t
CROSS JOIN role_state r
LEFT JOIN LATERAL (
    SELECT c.oid,
           true AS object_exists
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = t.table_name
      AND c.relkind IN ('r', 'p')
) object_info ON true
LEFT JOIN LATERAL (
    SELECT has_table_privilege('campus_memory_app', object_info.oid, 'SELECT') AS can_select,
           has_table_privilege('campus_memory_app', object_info.oid, 'INSERT') AS can_insert,
           has_table_privilege('campus_memory_app', object_info.oid, 'UPDATE') AS can_update,
           has_table_privilege('campus_memory_app', object_info.oid, 'DELETE') AS can_delete
    WHERE r.role_exists AND object_info.object_exists
) privileges ON true
ORDER BY t.table_name;

/* 6. Effective SELECT privilege and actual security mode for the two views.
    Missing views are reported as missing objects and do not call privilege
    APIs. The security_invoker value is read from reloptions, not assumed. */
WITH role_state AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'campus_memory_app'
    ) AS role_exists
)
SELECT v.view_name,
    COALESCE(object_info.object_exists, false) AS object_exists,
    object_info.reloptions,
    object_info.security_invoker,
         privileges.can_select
FROM (VALUES
    ('v_open_campus_events_summary'),
    ('v_campus_event_impact_summary')
) v(view_name)
CROSS JOIN role_state r
LEFT JOIN LATERAL (
    SELECT c.oid,
           true AS object_exists,
           c.reloptions,
           COALESCE('security_invoker=true' = ANY(c.reloptions), false)
               AS security_invoker
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = v.view_name
      AND c.relkind = 'v'
) object_info ON true
LEFT JOIN LATERAL (
    SELECT has_table_privilege('campus_memory_app', object_info.oid, 'SELECT') AS can_select
    WHERE r.role_exists AND object_info.object_exists
) privileges ON true
ORDER BY v.view_name;

/* 7. Actual public investigation-function signatures and EXECUTE privilege.
       Expected names are retained as rows so missing routines are explicit. */
WITH role_state AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'campus_memory_app'
    ) AS role_exists
), expected(routine_name) AS (
    VALUES
        ('trace_root_causes'),
        ('trace_blast_radius'),
        ('blast_radius_impact_summary')
)
SELECT public_schema.nspname AS schema_name,
       expected.routine_name,
       p.prokind,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_get_function_result(p.oid) AS return_type,
       (p.oid IS NOT NULL) AS routine_exists,
       CASE WHEN r.role_exists AND p.oid IS NOT NULL THEN
           has_function_privilege('campus_memory_app', p.oid, 'EXECUTE')
           ELSE NULL END AS can_execute
FROM expected
CROSS JOIN role_state r
LEFT JOIN pg_namespace public_schema ON public_schema.nspname = 'public'
LEFT JOIN pg_proc p ON p.pronamespace = public_schema.oid
                   AND p.proname = expected.routine_name
                   AND p.prokind = 'f'
ORDER BY expected.routine_name, identity_arguments;

/* 8. Actual public procedure signatures and EXECUTE privilege. Missing
       procedures are explicit and do not call privilege functions. */
WITH role_state AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'campus_memory_app'
    ) AS role_exists
), expected(routine_name) AS (
    VALUES ('register_event'), ('close_event')
)
SELECT public_schema.nspname AS schema_name,
       expected.routine_name,
       p.prokind,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_get_function_result(p.oid) AS return_type,
       (p.oid IS NOT NULL) AS routine_exists,
       CASE WHEN r.role_exists AND p.oid IS NOT NULL THEN
           has_function_privilege('campus_memory_app', p.oid, 'EXECUTE')
           ELSE NULL END AS can_execute
FROM expected
CROSS JOIN role_state r
LEFT JOIN pg_namespace public_schema ON public_schema.nspname = 'public'
LEFT JOIN pg_proc p ON p.pronamespace = public_schema.oid
                   AND p.proname = expected.routine_name
                   AND p.prokind = 'p'
ORDER BY expected.routine_name, identity_arguments;

/* 9. RLS status and policies. This distinguishes RLS being enabled from RLS
    actually applying to the target role. The target's own SUPERUSER and
    BYPASSRLS attributes control current applicability; SET ROLE capability is
    reported separately and does not itself bypass RLS. Policy applicability
    uses PostgreSQL's effective USAGE relationship, not membership existence. */
WITH role_effective AS (
        SELECT target.oid IS NOT NULL AS target_exists,
                target.rolsuper AS target_is_superuser,
                target.rolbypassrls AS target_bypasses_rls,
                target.rolinherit AS target_inherits_memberships,
                CASE WHEN target.oid IS NOT NULL THEN EXISTS (
                    SELECT 1
                    FROM pg_roles privileged_role
                        WHERE privileged_role.oid <> target.oid
                            AND privileged_role.rolsuper
                        AND pg_has_role(
                            'campus_memory_app', privileged_role.rolname, 'SET'
                        )
                ) ELSE NULL END AS can_set_role_to_superuser,
                CASE WHEN target.oid IS NOT NULL THEN EXISTS (
                    SELECT 1
                    FROM pg_roles privileged_role
                        WHERE privileged_role.oid <> target.oid
                            AND privileged_role.rolbypassrls
                        AND pg_has_role(
                            'campus_memory_app', privileged_role.rolname, 'SET'
                        )
                ) ELSE NULL END AS can_set_role_to_bypass_rls
        FROM (SELECT 1 AS marker) seed
        LEFT JOIN pg_roles target ON target.rolname = 'campus_memory_app'
)
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       owner_role.rolname AS owner_role,
    CASE WHEN effective.target_exists
        THEN owner_role.rolname = 'campus_memory_app'
        ELSE NULL
    END AS target_is_owner,
    CASE WHEN effective.target_exists
        THEN pg_has_role('campus_memory_app', owner_role.oid, 'SET')
        ELSE NULL
    END AS can_set_role_to_table_owner,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
    effective.target_exists,
        effective.target_is_superuser,
        effective.target_bypasses_rls,
        effective.target_inherits_memberships,
        effective.can_set_role_to_superuser,
        effective.can_set_role_to_bypass_rls,
    CASE
            WHEN NOT effective.target_exists THEN NULL
        WHEN NOT c.relrowsecurity THEN false
                WHEN effective.target_is_superuser
                    OR effective.target_bypasses_rls THEN false
        WHEN owner_role.rolname = 'campus_memory_app'
          AND NOT c.relforcerowsecurity THEN false
        ELSE true
    END AS rls_applies_to_target,
    CASE
        WHEN NOT effective.target_exists THEN NULL
        WHEN NOT c.relrowsecurity THEN false
        WHEN NOT (
            owner_role.rolname = 'campus_memory_app'
            OR pg_has_role('campus_memory_app', owner_role.oid, 'SET')
        ) THEN false
        WHEN NOT c.relforcerowsecurity THEN true
        WHEN owner_role.rolsuper OR owner_role.rolbypassrls THEN true
        ELSE false
    END AS can_bypass_rls_via_table_owner,
        COALESCE(policy_info.policies, '<no policies>') AS policies,
        CASE WHEN effective.target_exists
             THEN COALESCE(policy_info.policy_applies_to_target, false)
             ELSE NULL
        END AS any_policy_applies_to_target
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles owner_role ON owner_role.oid = c.relowner
 CROSS JOIN role_effective effective
 LEFT JOIN LATERAL (
     SELECT string_agg(
         format(
             '%s roles=%s command=%s mode=%s using=%s check=%s applies_to_target=%s',
             pol.polname,
             COALESCE(array_to_string(
                 ARRAY(
                     SELECT COALESCE(policy_role.rolname, 'PUBLIC')
                     FROM unnest(pol.polroles) AS role_ids(role_oid)
                     LEFT JOIN pg_roles policy_role ON policy_role.oid = role_ids.role_oid
                     ORDER BY role_ids.role_oid
                 ), ', '),
                 'PUBLIC'
             ),
             pol.polcmd,
             CASE WHEN pol.polpermissive THEN 'permissive' ELSE 'restrictive' END,
             COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '<none>'),
             COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '<none>'),
             CASE
                 WHEN effective.target_exists THEN
                     0::oid = ANY(pol.polroles)
                     OR EXISTS (
                         SELECT 1
                         FROM unnest(pol.polroles) AS role_ids(role_oid)
                                                 JOIN pg_roles policy_role
                                                     ON policy_role.oid = role_ids.role_oid
                                                 WHERE role_ids.role_oid <> 0
                           AND pg_has_role(
                                                             'campus_memory_app', policy_role.rolname, 'USAGE'
                           )
                     )
                 ELSE false
             END
         ),
         E'\n' ORDER BY pol.polname
     ) AS policies,
     bool_or(
         CASE
             WHEN effective.target_exists THEN
                 0::oid = ANY(pol.polroles)
                 OR EXISTS (
                     SELECT 1
                     FROM unnest(pol.polroles) AS role_ids(role_oid)
                                         JOIN pg_roles policy_role
                                             ON policy_role.oid = role_ids.role_oid
                                         WHERE role_ids.role_oid <> 0
                       AND pg_has_role(
                                                     'campus_memory_app', policy_role.rolname, 'USAGE'
                       )
                 )
             ELSE false
         END
     ) AS policy_applies_to_target
     FROM pg_policy pol
     WHERE pol.polrelid = c.oid
 ) policy_info ON true
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

/* 10. Transaction-local actor-context probe. Run this section as the target
    role, not the admin SQL Editor session. It proves only that the login can
    set a custom PostgreSQL setting; it does not authenticate the actor,
    validate the UUID, confirm an active app_user, or establish application
    authorization. The backend's database function performs those checks. */
BEGIN;
SELECT set_config(
    'app.actor_id',
    '00000000-0000-4000-8000-000000000001',
    true
) AS actor_context_value;
SELECT current_setting('app.actor_id', true) AS actor_context_after_set;
ROLLBACK;

/* 11. Inspect every function in app_private. This catalog section can run as
       the admin SQL Editor role. The schema USAGE result and each function's
       effective EXECUTE privilege are reported separately. Trigger/procedure
       SECURITY DEFINER execution does not require direct runtime-role access. */
WITH role_state AS (
    SELECT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'campus_memory_app'
    ) AS role_exists
)
SELECT 'schema' AS object_kind,
       n.nspname AS schema_name,
       NULL::text AS routine_name,
       NULL::text AS identity_arguments,
       CASE WHEN r.role_exists THEN has_schema_privilege(
           'campus_memory_app', n.oid, 'USAGE'
       ) ELSE NULL END AS can_use_schema,
       NULL::boolean AS can_execute
FROM pg_namespace n
CROSS JOIN role_state r
WHERE n.nspname = 'app_private'

UNION ALL

SELECT 'function' AS object_kind,
       n.nspname AS schema_name,
       p.proname AS routine_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       CASE WHEN r.role_exists THEN has_schema_privilege(
           'campus_memory_app', n.oid, 'USAGE'
       ) ELSE NULL END AS can_use_schema,
       CASE WHEN r.role_exists THEN has_function_privilege(
           'campus_memory_app', p.oid, 'EXECUTE'
       ) ELSE NULL END AS can_execute
FROM pg_namespace n
JOIN pg_proc p ON p.pronamespace = n.oid
CROSS JOIN role_state r
WHERE n.nspname = 'app_private'
ORDER BY object_kind, routine_name, identity_arguments;
