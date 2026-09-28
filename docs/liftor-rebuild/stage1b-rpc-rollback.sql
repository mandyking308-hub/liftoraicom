-- Stage 1B exact-state rollback.
-- READ THE HEADER BEFORE RUNNING. This script is a recovery plan, not a routine
-- undo button. It requires the private snapshot created by the Stage 1B
-- migration and restores only if every current function still matches the
-- migration's recorded post-state. Any later edit or ACL drift aborts the
-- entire transaction before restoration.
--
-- The snapshot records each prior pg_get_functiondef, owner, raw proacl,
-- expanded grantee/grantor/grant-option entries in original ACL array order,
-- SECURITY DEFINER flag, function settings, effective anon/authenticated/
-- service_role EXECUTE, and direct PUBLIC EXECUTE state. The migration
-- refuses to run if any affected function has a NULL proacl or a non-owner
-- grantor, because supported GRANT/REVOKE DDL cannot guarantee exact raw ACL
-- restoration for those states. The final check compares raw ACL text as well
-- as expanded grants.
--
-- No tables, RLS policies, business data, or Stage 1A table privileges are
-- modified. The snapshot is retained after rollback for audit evidence.

\set ON_ERROR_STOP on
BEGIN;

DO $stage1b_rollback$
DECLARE
  r record;
  fn_oid oid;
  g record;
  e jsonb;
  acl_now jsonb;
  mismatches integer;
  snapshot_count integer;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Stage 1B rollback requires the postgres migration owner';
  END IF;
  IF to_regclass('stage1b_private.rpc_state_snapshot') IS NULL THEN
    RAISE EXCEPTION 'Stage 1B rollback snapshot is missing; do not reconstruct ACLs from the frozen report';
  END IF;

  SELECT count(*)::integer INTO snapshot_count
  FROM stage1b_private.rpc_state_snapshot
  WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening';
  IF snapshot_count <> 241 THEN
    RAISE EXCEPTION 'Expected 241 captured application functions, found %', snapshot_count;
  END IF;
  IF EXISTS (
    SELECT 1 FROM stage1b_private.rpc_state_snapshot
    WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening'
      AND raw_acl_was_null
  ) THEN
    RAISE EXCEPTION 'Stage 1B rollback snapshot contains a NULL prior ACL; exact raw restoration is not supported';
  END IF;

  -- Check every affected object before changing any of them.
  SELECT count(*)::integer INTO mismatches
  FROM stage1b_private.rpc_state_snapshot s
  LEFT JOIN pg_proc p ON p.oid = to_regprocedure(s.typed_signature)
  WHERE s.change_id = '20260923130000_stage1b_rpc_authorization_hardening'
    AND (
      p.oid IS NULL
      OR pg_get_userbyid(p.proowner) IS DISTINCT FROM s.owner_name
      OR p.proacl::text IS DISTINCT FROM s.after_raw_acl
      OR md5(pg_get_functiondef(p.oid)) IS DISTINCT FROM s.after_definition_md5
    );
  IF mismatches <> 0 THEN
    RAISE EXCEPTION 'Rollback refused: % functions no longer match the recorded Stage 1B post-state', mismatches;
  END IF;

  FOR r IN
    SELECT * FROM stage1b_private.rpc_state_snapshot
     WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening'
     ORDER BY typed_signature
  LOOP
    fn_oid := to_regprocedure(r.typed_signature);
    IF md5(pg_get_functiondef(fn_oid)) IS DISTINCT FROM r.prior_definition_md5 THEN
      EXECUTE r.prior_definition;
    END IF;

    IF pg_get_userbyid((SELECT proowner FROM pg_proc WHERE oid = fn_oid)) IS DISTINCT FROM r.owner_name THEN
      EXECUTE format('ALTER FUNCTION %s OWNER TO %I', fn_oid::regprocedure, r.owner_name);
    END IF;

    -- Remove current direct grants object by object, including grants added by
    -- Stage 1B. The snapshot's grantor check in the migration guarantees the
    -- saved grants can be restored under their original owner/grantor.
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_oid::regprocedure);
    FOR g IN
      SELECT DISTINCT CASE WHEN a.grantee = 0 THEN NULL ELSE pg_get_userbyid(a.grantee) END AS grantee_name,
                      a.grantee
       FROM pg_proc p
       CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = fn_oid AND a.privilege_type = 'EXECUTE'
         AND a.grantee NOT IN (0, p.proowner)
    LOOP
      IF g.grantee <> 0 THEN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM %I', fn_oid::regprocedure, g.grantee_name);
      END IF;
    END LOOP;

    FOR e IN
      SELECT value
      FROM jsonb_array_elements(r.acl_entries)
      ORDER BY (value->>'acl_ordinal')::integer
    LOOP
      IF e->>'privilege' <> 'EXECUTE' THEN
        RAISE EXCEPTION 'Unexpected saved function ACL privilege % on %', e->>'privilege', r.typed_signature;
      END IF;
      IF e->>'grantor' IS DISTINCT FROM r.owner_name THEN
        RAISE EXCEPTION 'Saved ACL grantor % differs from owner % on %', e->>'grantor', r.owner_name, r.typed_signature;
      END IF;
      IF e->>'grantee' = 'PUBLIC' THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC%s',
          fn_oid::regprocedure,
          CASE WHEN (e->>'grantable')::boolean THEN ' WITH GRANT OPTION' ELSE '' END);
      ELSE
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I%s',
          fn_oid::regprocedure,
          e->>'grantee',
          CASE WHEN (e->>'grantable')::boolean THEN ' WITH GRANT OPTION' ELSE '' END);
      END IF;
    END LOOP;
  END LOOP;

  -- Verify restored definitions, ownership, ACL entries, and effective backend
  -- access against the exact captured state before allowing COMMIT.
  FOR r IN
    SELECT * FROM stage1b_private.rpc_state_snapshot
     WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening'
     ORDER BY typed_signature
  LOOP
    fn_oid := to_regprocedure(r.typed_signature);
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'acl_ordinal', acl_item.ordinal,
             'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
             'grantor', pg_get_userbyid(a.grantor),
             'privilege', a.privilege_type,
             'grantable', a.is_grantable
           ) ORDER BY acl_item.ordinal, a.grantee, a.grantor, a.privilege_type), '[]'::jsonb)
      INTO acl_now
      FROM pg_proc p
      CROSS JOIN LATERAL unnest(COALESCE(p.proacl, acldefault('f', p.proowner)))
        WITH ORDINALITY AS acl_item(item, ordinal)
      CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
     WHERE p.oid = fn_oid;

    IF md5(pg_get_functiondef(fn_oid)) IS DISTINCT FROM r.prior_definition_md5
       OR pg_get_userbyid((SELECT proowner FROM pg_proc WHERE oid = fn_oid)) IS DISTINCT FROM r.owner_name
       OR (SELECT prosecdef FROM pg_proc WHERE oid = fn_oid) IS DISTINCT FROM r.prior_security_definer
       OR (SELECT proconfig FROM pg_proc WHERE oid = fn_oid) IS DISTINCT FROM r.prior_proconfig
       OR (SELECT proacl::text FROM pg_proc WHERE oid = fn_oid) IS DISTINCT FROM r.raw_acl
       OR acl_now IS DISTINCT FROM r.acl_entries
       OR has_function_privilege('anon', fn_oid, 'EXECUTE') IS DISTINCT FROM r.prior_anon_execute
       OR has_function_privilege('authenticated', fn_oid, 'EXECUTE') IS DISTINCT FROM r.prior_authenticated_execute
       OR EXISTS (
         SELECT 1 FROM pg_proc p
         CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
         WHERE p.oid = fn_oid AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
       ) IS DISTINCT FROM r.prior_public_execute
       OR has_function_privilege('service_role', fn_oid, 'EXECUTE') IS DISTINCT FROM r.prior_service_role_execute THEN
      RAISE EXCEPTION 'Rollback verification failed for %; transaction will roll back', r.typed_signature;
    END IF;
  END LOOP;
END
$stage1b_rollback$;

COMMIT;
