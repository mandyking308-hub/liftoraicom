-- Guarded exact ACL rollback for
-- 20260928120000_stage1b_sor_touch_acl_hardening.
-- Restores the captured prior ACL on the trigger function only. It leaves the
-- Strategic Organisations trigger and function definition unchanged.

\set ON_ERROR_STOP on
BEGIN;

DO $sor_touch_acl_rollback$
DECLARE
  v_oid oid := to_regprocedure('public.sor_touch_updated_at()');
  r record;
  e jsonb;
  g record;
  acl_now jsonb;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'SOR trigger ACL rollback requires the postgres migration owner';
  END IF;
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'SOR trigger helper public.sor_touch_updated_at() is missing';
  END IF;

  SELECT * INTO r
  FROM stage1b_sor_private.sor_touch_acl_snapshot
  WHERE change_id = '20260928120000_stage1b_sor_touch_acl_hardening'
    AND typed_signature = 'public.sor_touch_updated_at()';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exact SOR ACL snapshot is missing';
  END IF;
  IF r.raw_acl IS NULL THEN
    RAISE EXCEPTION 'Exact SOR ACL snapshot is missing';
  END IF;
  IF (SELECT count(*) FROM stage1b_sor_private.sor_touch_acl_snapshot
      WHERE change_id = '20260928120000_stage1b_sor_touch_acl_hardening') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one SOR ACL snapshot row';
  END IF;
  IF pg_get_userbyid((SELECT proowner FROM pg_proc WHERE oid = v_oid)) IS DISTINCT FROM r.owner_name
     OR (SELECT proacl::text FROM pg_proc WHERE oid = v_oid) IS DISTINCT FROM r.after_raw_acl
     OR md5(pg_get_functiondef(v_oid)) IS DISTINCT FROM r.after_definition_md5 THEN
    RAISE EXCEPTION 'Rollback refused: SOR function owner, ACL, or body differs from recorded post-state';
  END IF;

  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', v_oid::regprocedure);
  FOR g IN
    SELECT DISTINCT a.grantee, CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee_name
    FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    -- Owner entry is revoked too so the replay below rebuilds the exact captured order.
    WHERE p.oid = v_oid AND a.privilege_type = 'EXECUTE'
  LOOP
    IF g.grantee = 0 THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', v_oid::regprocedure);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM %I', v_oid::regprocedure, g.grantee_name);
    END IF;
  END LOOP;

  FOR e IN SELECT value FROM jsonb_array_elements(r.acl_entries)
            ORDER BY (value->>'acl_ordinal')::integer
  LOOP
    IF e->>'privilege' <> 'EXECUTE' OR e->>'grantor' IS DISTINCT FROM r.owner_name
       OR (e->>'grantable')::boolean THEN
      RAISE EXCEPTION 'Unsupported saved SOR ACL entry; exact rollback is blocked';
    END IF;
    IF e->>'grantee' = 'PUBLIC' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', v_oid::regprocedure);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I', v_oid::regprocedure, e->>'grantee');
    END IF;
  END LOOP;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'acl_ordinal', acl_item.ordinal,
           'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
           'grantor', pg_get_userbyid(a.grantor),
           'privilege', a.privilege_type,
           'grantable', a.is_grantable
         ) ORDER BY acl_item.ordinal, a.grantee, a.grantor, a.privilege_type), '[]'::jsonb)
    INTO acl_now
  FROM pg_proc p
  CROSS JOIN LATERAL unnest(p.proacl) WITH ORDINALITY acl_item(item, ordinal)
  CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
  WHERE p.oid = v_oid;

  IF (SELECT proacl::text FROM pg_proc WHERE oid = v_oid) IS DISTINCT FROM r.raw_acl
     OR acl_now IS DISTINCT FROM r.acl_entries
     OR md5(pg_get_functiondef(v_oid)) IS DISTINCT FROM r.prior_definition_md5
     OR (SELECT prosecdef FROM pg_proc WHERE oid = v_oid) IS DISTINCT FROM r.prior_security_definer
     OR (SELECT proconfig FROM pg_proc WHERE oid = v_oid) IS DISTINCT FROM r.prior_proconfig
     OR has_function_privilege('anon', v_oid, 'EXECUTE') IS DISTINCT FROM r.prior_anon_execute
     OR has_function_privilege('authenticated', v_oid, 'EXECUTE') IS DISTINCT FROM r.prior_authenticated_execute
     OR has_function_privilege('service_role', v_oid, 'EXECUTE') IS DISTINCT FROM r.prior_service_role_execute
     OR EXISTS (
       SELECT 1 FROM pg_proc p
       CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = v_oid AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
     ) IS DISTINCT FROM r.prior_public_execute THEN
    RAISE EXCEPTION 'SOR ACL rollback verification failed; transaction will roll back';
  END IF;
END
$sor_touch_acl_rollback$;

COMMIT;
