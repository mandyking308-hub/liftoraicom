-- Stage 1B read-only public function inventory.
-- This query must be run before any Stage-1B RPC ACL migration and after it
-- for comparison. It performs no writes.
--
-- Repository caller evidence is not present in PostgreSQL catalogs. Join the
-- returned function_oid/signature to
-- docs/liftor-rebuild/stage1b-public-rpc-review.json after source scanning.

WITH RECURSIVE
role_closure(target_oid, source_oid) AS (
  SELECT r.oid, r.oid
  FROM pg_roles AS r
  WHERE r.rolname IN ('anon', 'authenticated', 'service_role')
  UNION
  SELECT rc.target_oid, m.roleid
  FROM role_closure AS rc
  JOIN pg_auth_members AS m
    ON m.member = rc.source_oid
),
public_functions AS (
  SELECT
    p.oid AS function_oid,
    n.nspname AS schema_name,
    p.proname AS function_name,
    format('%I.%I(%s)', n.nspname, p.proname,
      pg_get_function_identity_arguments(p.oid)) AS exact_signature,
    pg_get_userbyid(p.proowner) AS owner,
    l.lanname AS language,
    CASE WHEN p.prosecdef THEN 'SECURITY DEFINER'
         ELSE 'SECURITY INVOKER'
    END AS security,
    CASE p.provolatile
      WHEN 'i' THEN 'IMMUTABLE'
      WHEN 's' THEN 'STABLE'
      ELSE 'VOLATILE'
    END AS volatility,
    p.proacl::text AS routine_acl,
    p.proconfig::text[] AS configured_search_path,
    pg_get_functiondef(p.oid) AS definition,
    r.rolsuper AS owner_superuser,
    r.rolbypassrls AS owner_bypasses_rls
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  JOIN pg_roles AS r ON r.oid = p.proowner
  JOIN pg_language AS l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
),
acl_rows AS (
  SELECT
    f.function_oid,
    x.grantee,
    x.privilege_type,
    x.is_grantable
  FROM public_functions AS f
  CROSS JOIN LATERAL aclexplode(
    COALESCE(
      (SELECT p.proacl
       FROM pg_proc AS p
       WHERE p.oid = f.function_oid),
      acldefault('f', (SELECT p.proowner
                       FROM pg_proc AS p
                       WHERE p.oid = f.function_oid))
    )
  ) AS x
),
privilege_paths AS (
  SELECT
    f.function_oid,
    jsonb_build_object(
      'effective', has_function_privilege('public', f.function_oid, 'EXECUTE'),
      'direct', EXISTS (
        SELECT 1 FROM acl_rows a
        WHERE a.function_oid = f.function_oid
          AND a.grantee = 0
          AND a.privilege_type = 'EXECUTE'
      ),
      'via_public', EXISTS (
        SELECT 1 FROM acl_rows a
        WHERE a.function_oid = f.function_oid
          AND a.grantee = 0
          AND a.privilege_type = 'EXECUTE'
      ),
      'inherited', false
    ) AS public_path,
    jsonb_build_object(
      'effective', has_function_privilege('anon', f.function_oid, 'EXECUTE'),
      'direct', EXISTS (
        SELECT 1 FROM acl_rows a
        JOIN pg_roles r ON r.oid = a.grantee
        WHERE a.function_oid = f.function_oid
          AND r.rolname = 'anon'
          AND a.privilege_type = 'EXECUTE'
      ),
      'via_public', EXISTS (
        SELECT 1 FROM acl_rows a
        WHERE a.function_oid = f.function_oid
          AND a.grantee = 0
          AND a.privilege_type = 'EXECUTE'
      ),
      'inherited', EXISTS (
        SELECT 1
        FROM acl_rows a
        JOIN role_closure rc
          ON rc.target_oid = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
         AND rc.source_oid = a.grantee
        WHERE a.function_oid = f.function_oid
          AND a.grantee <> (SELECT oid FROM pg_roles WHERE rolname = 'anon')
          AND a.grantee <> 0
          AND a.privilege_type = 'EXECUTE'
      )
    ) AS anon_path,
    jsonb_build_object(
      'effective', has_function_privilege('authenticated', f.function_oid, 'EXECUTE'),
      'direct', EXISTS (
        SELECT 1 FROM acl_rows a
        JOIN pg_roles r ON r.oid = a.grantee
        WHERE a.function_oid = f.function_oid
          AND r.rolname = 'authenticated'
          AND a.privilege_type = 'EXECUTE'
      ),
      'via_public', EXISTS (
        SELECT 1 FROM acl_rows a
        WHERE a.function_oid = f.function_oid
          AND a.grantee = 0
          AND a.privilege_type = 'EXECUTE'
      ),
      'inherited', EXISTS (
        SELECT 1
        FROM acl_rows a
        JOIN role_closure rc
          ON rc.target_oid = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
         AND rc.source_oid = a.grantee
        WHERE a.function_oid = f.function_oid
          AND a.grantee <> (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
          AND a.grantee <> 0
          AND a.privilege_type = 'EXECUTE'
      )
    ) AS authenticated_path,
    jsonb_build_object(
      'effective', has_function_privilege('service_role', f.function_oid, 'EXECUTE'),
      'direct', EXISTS (
        SELECT 1 FROM acl_rows a
        JOIN pg_roles r ON r.oid = a.grantee
        WHERE a.function_oid = f.function_oid
          AND r.rolname = 'service_role'
          AND a.privilege_type = 'EXECUTE'
      ),
      'via_public', EXISTS (
        SELECT 1 FROM acl_rows a
        WHERE a.function_oid = f.function_oid
          AND a.grantee = 0
          AND a.privilege_type = 'EXECUTE'
      ),
      'inherited', EXISTS (
        SELECT 1
        FROM acl_rows a
        JOIN role_closure rc
          ON rc.target_oid = (SELECT oid FROM pg_roles WHERE rolname = 'service_role')
         AND rc.source_oid = a.grantee
        WHERE a.function_oid = f.function_oid
          AND a.grantee <> (SELECT oid FROM pg_roles WHERE rolname = 'service_role')
          AND a.grantee <> 0
          AND a.privilege_type = 'EXECUTE'
      )
    ) AS service_role_path
  FROM public_functions AS f
)
SELECT jsonb_build_object(
  'function_oid', f.function_oid,
  'schema', f.schema_name,
  'function_name', f.function_name,
  'exact_signature', f.exact_signature,
  'owner', f.owner,
  'language', f.language,
  'security', f.security,
  'volatility', f.volatility,
  'routine_acl', f.routine_acl,
  'configured_search_path', f.configured_search_path,
  'search_path_status',
    CASE
      WHEN f.security = 'SECURITY INVOKER' THEN 'NOT_APPLICABLE'
      WHEN f.configured_search_path IS NULL THEN 'MISSING'
      WHEN EXISTS (
        SELECT 1
        FROM unnest(f.configured_search_path) AS c(setting)
        WHERE setting LIKE 'search_path=%'
      ) THEN 'CONFIGURED'
      ELSE 'MISSING'
    END,
  'effective_execute_paths', jsonb_build_object(
    'public', p.public_path,
    'anon', p.anon_path,
    'authenticated', p.authenticated_path,
    'service_role', p.service_role_path
  ),
  'trigger_tables', COALESCE((
    SELECT jsonb_agg(DISTINCT format('%I.%I', tn.nspname, tg.relname)
                     ORDER BY format('%I.%I', tn.nspname, tg.relname))
    FROM pg_trigger t
    JOIN pg_class tg ON tg.oid = t.tgrelid
    JOIN pg_namespace tn ON tn.oid = tg.relnamespace
    WHERE t.tgfoid = f.function_oid
      AND NOT t.tgisinternal
  ), '[]'::jsonb),
  'appears_mutating_or_ddl',
    lower(f.definition) ~
      '(insert[[:space:]]+into|[[:space:]]update[[:space:]]+[a-z_]|delete[[:space:]]+from|truncate[[:space:]]|create[[:space:]]+(table|temp|temporary|trigger)|drop[[:space:]]+(table|trigger)|alter[[:space:]]+(table|role|default|function)|grant[[:space:]]|revoke[[:space:]]|execute[[:space:]]+)',
  'sensitive_reference_heuristic',
    lower(f.definition) ~
      '(api[_[:space:]]?key|secret|credential|password|private[_[:space:]]?key|cipher|auth\.users)',
  'can_bypass_rls', f.security = 'SECURITY DEFINER'
    AND (f.owner_superuser OR f.owner_bypasses_rls),
  'definition', f.definition
) AS inventory_record
FROM public_functions AS f
JOIN privilege_paths AS p USING (function_oid)
ORDER BY f.exact_signature;
