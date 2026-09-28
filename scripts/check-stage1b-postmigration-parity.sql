-- Read-only verification of a Stage 1B migration already applied in an
-- authorized non-production environment. It compares current exact function
-- bodies/owners/ACLs with the live snapshot written by that same migration.
-- It does not repair drift and must never be treated as a production apply step.

WITH recorded AS (
  SELECT *
  FROM stage1b_private.rpc_state_snapshot
  WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening'
), live AS (
  SELECT
    r.typed_signature,
    r.owner_name AS recorded_owner,
    pg_get_userbyid(p.proowner) AS live_owner,
    r.after_raw_acl AS recorded_acl,
    p.proacl::text AS live_acl,
    r.after_definition_md5 AS recorded_definition_md5,
    md5(pg_get_functiondef(p.oid)) AS live_definition_md5,
    r.after_service_role_execute AS recorded_service_role_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS live_service_role_execute
  FROM recorded r
  LEFT JOIN pg_proc p ON p.oid = to_regprocedure(r.typed_signature)
)
SELECT
  count(*) AS snapshotted_application_functions,
  count(*) FILTER (WHERE live_owner IS NULL) AS missing_functions,
  count(*) FILTER (WHERE live_owner IS DISTINCT FROM recorded_owner) AS owner_mismatches,
  count(*) FILTER (WHERE live_acl IS DISTINCT FROM recorded_acl) AS acl_mismatches,
  count(*) FILTER (WHERE live_definition_md5 IS DISTINCT FROM recorded_definition_md5) AS definition_mismatches,
  count(*) FILTER (WHERE live_service_role_execute IS DISTINCT FROM recorded_service_role_execute) AS service_role_mismatches,
  CASE WHEN count(*) = 241
        AND count(*) FILTER (WHERE live_owner IS NULL OR live_owner IS DISTINCT FROM recorded_owner
          OR live_acl IS DISTINCT FROM recorded_acl
          OR live_definition_md5 IS DISTINCT FROM recorded_definition_md5
          OR live_service_role_execute IS DISTINCT FROM recorded_service_role_execute) = 0
       THEN 'PASS'
       ELSE 'FAIL'
  END AS result
FROM live;

-- Any returned row is a later live-definition or ACL drift from the candidate
-- migration's post-state. The rollback refuses to overwrite these differences.
WITH recorded AS (
  SELECT *
  FROM stage1b_private.rpc_state_snapshot
  WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening'
), live AS (
  SELECT
    r.typed_signature,
    r.owner_name AS recorded_owner,
    pg_get_userbyid(p.proowner) AS live_owner,
    r.after_raw_acl AS recorded_acl,
    p.proacl::text AS live_acl,
    r.after_definition_md5 AS recorded_definition_md5,
    md5(pg_get_functiondef(p.oid)) AS live_definition_md5
  FROM recorded r
  LEFT JOIN pg_proc p ON p.oid = to_regprocedure(r.typed_signature)
)
SELECT *
FROM live
WHERE live_owner IS NULL
   OR live_owner IS DISTINCT FROM recorded_owner
   OR live_acl IS DISTINCT FROM recorded_acl
   OR live_definition_md5 IS DISTINCT FROM recorded_definition_md5
ORDER BY typed_signature;
