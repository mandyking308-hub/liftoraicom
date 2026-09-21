-- Stage 1A, Step 1: read-only pre-change ACL / privilege freeze query.
-- Regenerates the exact fields recorded in:
--   docs/liftor-rebuild/stage1a-prechange-acl-inventory.jsonl  (one object per line)
--   docs/liftor-rebuild/stage1a-prechange-acl-inventory.json   (compact summary)
--
-- READ ONLY. This file must never be turned into a migration.
-- Usage:
--   psql -At -f scripts/stage1a-freeze-acl.sql
-- Output: line 1 = summary JSON object, remaining lines = one relation record each (JSONL).

\pset format unaligned
\pset tuples_only on

-- ---------------------------------------------------------------------------
-- 1. Summary object
-- ---------------------------------------------------------------------------
WITH rels AS (
  SELECT c.oid, c.relname, c.relkind, pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m')
),
owners AS (
  SELECT owner, count(*) AS n FROM rels GROUP BY owner
),
defacl AS (
  SELECT pg_get_userbyid(d.defaclrole) AS defacl_role,
         coalesce(n.nspname,'-')       AS defacl_schema,
         d.defaclobjtype               AS objtype,
         d.defaclacl::text[]           AS acl
  FROM pg_default_acl d
  LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
),
memberships AS (
  SELECT r.rolname AS member, m.rolname AS member_of
  FROM pg_auth_members am
  JOIN pg_roles r ON r.oid = am.member
  JOIN pg_roles m ON m.oid = am.roleid
)
SELECT jsonb_pretty(jsonb_build_object(
  'record_type','summary',
  'captured_at', now(),
  'database', current_database(),
  'current_user', current_user,
  'session_user', session_user,
  'server_version', current_setting('server_version'),
  'counts', jsonb_build_object(
    'base_tables',            (SELECT count(*) FROM rels WHERE relkind IN ('r','p')),
    'views',                  (SELECT count(*) FROM rels WHERE relkind = 'v'),
    'materialized_views',     (SELECT count(*) FROM rels WHERE relkind = 'm'),
    'total_relations',        (SELECT count(*) FROM rels)
  ),
  'owner_counts', (SELECT jsonb_object_agg(owner, n) FROM owners),
  'default_acls', (SELECT jsonb_agg(jsonb_build_object(
      'role', defacl_role, 'schema', defacl_schema, 'objtype', objtype, 'acl', acl)
      ORDER BY defacl_role, defacl_schema, objtype) FROM defacl),
  'role_memberships', (SELECT jsonb_agg(jsonb_build_object('member',member,'member_of',member_of)
      ORDER BY member, member_of) FROM memberships),
  'postgres_is_member_of_supabase_admin',
      pg_has_role('postgres','supabase_admin','MEMBER')
));

-- ---------------------------------------------------------------------------
-- 2. One record per public relation: direct ACL entries + effective privileges
-- ---------------------------------------------------------------------------
WITH rels AS (
  SELECT c.oid, n.nspname AS schema_name, c.relname, c.relkind,
         pg_get_userbyid(c.relowner) AS owner, c.relacl
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m')
),
acl AS (
  SELECT r.oid,
         jsonb_agg(jsonb_build_object(
           'grantee',     coalesce(nullif(a.grantee::regrole::text,'-'),'PUBLIC'),
           'grantor',     a.grantor::regrole::text,
           'privilege',   a.privilege_type,
           'grantable',   a.is_grantable,
           'source',      'direct_relacl'
         ) ORDER BY a.grantee::regrole::text, a.privilege_type) AS entries
  FROM rels r
  CROSS JOIN LATERAL aclexplode(coalesce(r.relacl, acldefault('r', (SELECT relowner FROM pg_class WHERE oid = r.oid)))) a
  WHERE coalesce(nullif(a.grantee::regrole::text,'-'),'PUBLIC') IN ('PUBLIC','anon','authenticated','service_role')
  GROUP BY r.oid
),
eff AS (
  SELECT r.oid, role_name,
         jsonb_object_agg(p.priv, has_table_privilege(role_name, r.oid, p.priv)) AS privs
  FROM rels r
  CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) AS role_name
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES']) AS p(priv)
  GROUP BY r.oid, role_name
),
eff_agg AS (
  SELECT oid, jsonb_object_agg(role_name, privs) AS effective FROM eff GROUP BY oid
)
SELECT jsonb_build_object(
  'record_type','relation',
  'schema', r.schema_name,
  'object_name', r.relname,
  'object_type', CASE r.relkind WHEN 'r' THEN 'base_table' WHEN 'p' THEN 'partitioned_table'
                                WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized_view' END,
  'owner', r.owner,
  'has_explicit_relacl', r.relacl IS NOT NULL,
  'raw_relacl', r.relacl::text,
  'acl_entries', coalesce(a.entries, '[]'::jsonb),
  'effective_privileges', coalesce(e.effective, '{}'::jsonb)
)::text
FROM rels r
LEFT JOIN acl a ON a.oid = r.oid
LEFT JOIN eff_agg e ON e.oid = r.oid
ORDER BY r.relkind, r.relname;
