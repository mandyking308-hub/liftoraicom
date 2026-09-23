-- Stage 1 drift protection.
-- Run with: psql -v ON_ERROR_STOP=1 -f scripts/check-stage1-privilege-drift.sql
-- The script fails on any application-role dangerous effective grant, unsafe
-- public-schema CREATE exposure, unapproved public owner, or postgres table
-- default that would recreate a dangerous grant.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_relation record;
  v_default record;
BEGIN
  SELECT n.nspname AS schema_name,
         c.relname AS object_name,
         pg_get_userbyid(c.relowner) AS owner,
         p.privilege,
         r.role_name
  INTO v_relation
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN (VALUES ('anon'::name), ('authenticated'::name)) AS r(role_name)
  CROSS JOIN (VALUES
    ('TRUNCATE'::text), ('TRIGGER'::text),
    ('REFERENCES'::text), ('MAINTAIN'::text)
  ) AS p(privilege)
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND has_table_privilege(r.role_name, c.oid, p.privilege)
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Stage 1 privilege drift: % has effective % on %.%',
      v_relation.role_name, v_relation.privilege,
      v_relation.schema_name, v_relation.object_name;
  END IF;

  IF has_schema_privilege('anon', 'public', 'CREATE')
     OR has_schema_privilege('authenticated', 'public', 'CREATE')
     OR EXISTS (
       SELECT 1
       FROM pg_namespace n, LATERAL aclexplode(n.nspacl) a
       WHERE n.nspname = 'public'
         AND a.grantee = 0
         AND a.privilege_type = 'CREATE'
     ) THEN
    RAISE EXCEPTION 'Stage 1 privilege drift: public schema CREATE is exposed';
  END IF;

  SELECT n.nspname AS schema_name,
         c.relname AS object_name,
         pg_get_userbyid(c.relowner) AS owner
  INTO v_relation
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND pg_get_userbyid(c.relowner) <> 'postgres'
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Stage 1 privilege drift: unapproved public owner % on %.%',
      v_relation.owner, v_relation.schema_name, v_relation.object_name;
  END IF;

  SELECT d.defaclrole::regrole::text AS owner_role,
         d.defaclnamespace::regnamespace::text AS schema_name,
         x.privilege_type::text AS privilege,
         CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee
  INTO v_default
  FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) x
  WHERE d.defaclnamespace = 'public'::regnamespace
    AND d.defaclobjtype = 'r'
    AND d.defaclrole::regrole::text = 'postgres'
    AND x.privilege_type IN ('TRUNCATE', 'TRIGGER', 'REFERENCES', 'MAINTAIN')
    AND (x.grantee = 0 OR pg_get_userbyid(x.grantee) IN ('anon', 'authenticated'))
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Stage 1 privilege drift: postgres future table default grants % to %',
      v_default.privilege, v_default.grantee;
  END IF;
END
$$;

SELECT 'PASS' AS status,
       'anon/authenticated have zero effective TRUNCATE, TRIGGER, REFERENCES, MAINTAIN on public relations; public CREATE is denied; public owners are postgres; postgres table defaults are safe' AS assertion;
