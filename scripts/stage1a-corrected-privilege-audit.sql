-- Stage 1A corrected read-only audit.
-- Includes MAINTAIN in addition to TRUNCATE, TRIGGER, and REFERENCES.
-- Run with a read-only database connection. It performs no writes.

WITH rels AS (
  SELECT n.nspname AS schema_name,
         c.oid,
         c.relname AS object_name,
         CASE c.relkind
           WHEN 'r' THEN 'base_table'
           WHEN 'p' THEN 'partitioned_table'
           WHEN 'v' THEN 'view'
           WHEN 'm' THEN 'materialized_view'
           WHEN 'f' THEN 'foreign_table'
           ELSE c.relkind::text
         END AS object_type,
         pg_get_userbyid(c.relowner) AS owner,
         c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
),
privileges(privilege) AS (
  VALUES
    ('SELECT'::text), ('INSERT'::text), ('UPDATE'::text), ('DELETE'::text),
    ('TRUNCATE'::text), ('TRIGGER'::text), ('REFERENCES'::text), ('MAINTAIN'::text)
),
roles(role_name) AS (
  VALUES ('anon'::name), ('authenticated'::name), ('service_role'::name)
)
SELECT role_name::text AS role_name,
       privilege,
       count(*) FILTER (
         WHERE has_table_privilege(role_name, rels.oid, privilege)
       ) AS effective_relation_count
FROM rels
CROSS JOIN roles
CROSS JOIN privileges
GROUP BY role_name, privilege
ORDER BY role_name, privilege;

SELECT n.nspname AS schema_name,
       n.nspacl::text AS acl_text,
       has_schema_privilege('anon', 'public', 'USAGE') AS anon_usage,
       has_schema_privilege('anon', 'public', 'CREATE') AS anon_create,
       has_schema_privilege('authenticated', 'public', 'USAGE') AS authenticated_usage,
       has_schema_privilege('authenticated', 'public', 'CREATE') AS authenticated_create
FROM pg_namespace n
WHERE n.nspname = 'public';

SELECT d.defaclrole::regrole::text AS owner_role,
       d.defaclnamespace::regnamespace::text AS schema_name,
       d.defaclobjtype AS object_type,
       d.defaclacl::text AS default_acl
FROM pg_default_acl d
WHERE d.defaclnamespace = 'public'::regnamespace
  AND d.defaclobjtype IN ('r', 'f', 'S')
ORDER BY owner_role, object_type;

SELECT pg_get_userbyid(c.relowner) AS owner,
       count(*) AS relation_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
GROUP BY c.relowner
ORDER BY owner;
