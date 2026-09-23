-- Stage 1 supplementary read-only RPC audit.
-- Public-schema functions are RPC candidates in the exposed public schema.
-- This script inventories execution exposure; it intentionally performs no
-- REVOKE and no other write.

WITH routines AS (
  SELECT p.oid,
         n.nspname AS schema_name,
         p.proname AS function_name,
         pg_get_function_identity_arguments(p.oid) AS identity_arguments,
         pg_get_function_result(p.oid) AS result_type,
         pg_get_userbyid(p.proowner) AS owner,
         p.prosecdef AS security_definer,
         r.rolsuper AS owner_superuser,
         r.rolbypassrls AS owner_bypasses_rls,
         l.lanname AS language,
         p.provolatile AS volatility,
         p.proacl::text AS routine_acl,
         p.prosrc AS function_body,
         has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
         has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_roles r ON r.oid = p.proowner
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
),
classified AS (
  SELECT *,
         true AS exposed_as_rpc_candidate,
         lower(coalesce(function_body, '')) ~
           '(insert[[:space:]]+into|[[:space:]]update[[:space:]]+[a-z_]|delete[[:space:]]+from|truncate[[:space:]]|create[[:space:]]+(table|temp|temporary|trigger)|drop[[:space:]]+(table|trigger)|alter[[:space:]]+(table|role|default|function)|grant[[:space:]]|revoke[[:space:]]|execute[[:space:]]+)' AS appears_mutating_or_ddl,
         security_definer AND (owner_superuser OR owner_bypasses_rls) AS can_bypass_rls
  FROM routines
)
SELECT count(*) AS public_functions,
       count(*) FILTER (WHERE anon_execute) AS anon_effective_execute,
       count(*) FILTER (WHERE authenticated_execute) AS authenticated_effective_execute,
       count(*) FILTER (WHERE public_execute) AS public_effective_execute,
       count(*) FILTER (WHERE security_definer) AS security_definer_functions,
       count(*) FILTER (WHERE appears_mutating_or_ddl AND anon_execute) AS anon_mutating_or_ddl_execute,
       count(*) FILTER (WHERE appears_mutating_or_ddl AND authenticated_execute) AS authenticated_mutating_or_ddl_execute,
       count(*) FILTER (WHERE can_bypass_rls AND anon_execute) AS anon_bypass_rls_execute,
       count(*) FILTER (WHERE can_bypass_rls AND authenticated_execute) AS authenticated_bypass_rls_execute
FROM classified;

SELECT schema_name,
       function_name || '(' || identity_arguments || ')' AS function_signature,
       result_type,
       owner,
       security_definer,
       language,
       volatility,
       routine_acl,
       anon_execute,
       authenticated_execute,
       public_execute,
       exposed_as_rpc_candidate,
       appears_mutating_or_ddl,
       can_bypass_rls
FROM classified
ORDER BY security_definer DESC, appears_mutating_or_ddl DESC, function_name, identity_arguments;
