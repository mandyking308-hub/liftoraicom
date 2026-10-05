-- Revoke application execution from the Strategic Organisations timestamp
-- trigger helper. The trigger and function body are deliberately unchanged.
-- Exact pre-change function/ACL metadata is retained for guarded rollback.

BEGIN;

CREATE SCHEMA IF NOT EXISTS stage1b_sor_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA stage1b_sor_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE stage1b_sor_private.sor_touch_acl_snapshot (
  change_id text PRIMARY KEY,
  typed_signature text NOT NULL,
  owner_name text NOT NULL,
  raw_acl text NOT NULL,
  acl_entries jsonb NOT NULL,
  prior_security_definer boolean NOT NULL,
  prior_proconfig text[],
  prior_definition text NOT NULL,
  prior_definition_md5 text NOT NULL,
  prior_anon_execute boolean NOT NULL,
  prior_authenticated_execute boolean NOT NULL,
  prior_public_execute boolean NOT NULL,
  prior_service_role_execute boolean NOT NULL,
  after_raw_acl text,
  after_definition_md5 text,
  after_service_role_execute boolean,
  trigger_count integer NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE stage1b_sor_private.sor_touch_acl_snapshot
  FROM PUBLIC, anon, authenticated, service_role;

DO $sor_touch_acl_hardening$
DECLARE
  v_oid oid := to_regprocedure('public.sor_touch_updated_at()');
  v_trigger_count integer;
  v_saved_count integer;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'SOR trigger ACL hardening requires the postgres migration owner';
  END IF;
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'SOR trigger helper public.sor_touch_updated_at() is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace n
    WHERE n.nspname = 'stage1b_sor_private'
      AND n.nspowner = 'postgres'::regrole
  ) THEN
    RAISE EXCEPTION 'SOR ACL snapshot schema must be owned by postgres';
  END IF;
  IF EXISTS (
    SELECT 1 FROM stage1b_sor_private.sor_touch_acl_snapshot
    WHERE change_id = '20260928120000_stage1b_sor_touch_acl_hardening'
  ) THEN
    RAISE EXCEPTION 'SOR trigger ACL snapshot already exists; refusing to overwrite it';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = v_oid
      AND p.proowner = 'postgres'::regrole
      AND p.prorettype = 'trigger'::regtype
      AND NOT p.prosecdef
      AND COALESCE('search_path=public' = ANY(p.proconfig), false)
      AND p.proacl IS NOT NULL
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
      )
  ) THEN
    RAISE EXCEPTION 'SOR helper live owner, return type, security mode, search_path, or prior client ACL differs from reviewed state';
  END IF;

  SELECT count(*)::integer INTO v_trigger_count
  FROM pg_trigger t
  WHERE t.tgfoid = v_oid AND NOT t.tgisinternal;
  IF v_trigger_count < 1 THEN
    RAISE EXCEPTION 'SOR timestamp trigger is missing; refusing ACL change';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    CROSS JOIN LATERAL unnest(p.proacl) WITH ORDINALITY acl_item(item, ordinal)
    CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
    WHERE p.oid = v_oid
      AND (a.grantor <> p.proowner OR a.privilege_type <> 'EXECUTE' OR a.is_grantable)
  ) OR (
    -- Live raw ACL order is {=X/postgres,postgres=X/postgres,service_role=X/postgres}
    -- (PUBLIC first). Any order is accepted because acl_entries captures each
    -- ordinal and the guarded rollback rebuilds the ACL in that exact order.
    SELECT count(*) FROM pg_proc p
    CROSS JOIN LATERAL unnest(p.proacl) acl_item(item)
    CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
    WHERE p.oid = v_oid AND a.grantee = p.proowner AND a.privilege_type = 'EXECUTE'
  ) <> 1 THEN
    RAISE EXCEPTION 'SOR helper prior ACL cannot be exactly restored by the rollback artifact';
  END IF;
  IF EXISTS (
    SELECT a.grantee, a.grantor
    FROM pg_proc p
    CROSS JOIN LATERAL unnest(p.proacl) acl_item(item)
    CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
    WHERE p.oid = v_oid
    GROUP BY a.grantee, a.grantor
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'SOR helper has duplicate ACL entries that cannot be replayed exactly';
  END IF;

  INSERT INTO stage1b_sor_private.sor_touch_acl_snapshot (
    change_id, typed_signature, owner_name, raw_acl, acl_entries,
    prior_security_definer, prior_proconfig, prior_definition, prior_definition_md5,
    prior_anon_execute, prior_authenticated_execute, prior_public_execute,
    prior_service_role_execute, trigger_count
  )
  SELECT
    '20260928120000_stage1b_sor_touch_acl_hardening',
    'public.sor_touch_updated_at()',
    pg_get_userbyid(p.proowner),
    p.proacl::text,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'acl_ordinal', acl_item.ordinal,
        'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
        'grantor', pg_get_userbyid(a.grantor),
        'privilege', a.privilege_type,
        'grantable', a.is_grantable
      ) ORDER BY acl_item.ordinal, a.grantee, a.grantor, a.privilege_type)
      FROM unnest(p.proacl) WITH ORDINALITY acl_item(item, ordinal)
      CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
    ), '[]'::jsonb),
    p.prosecdef, p.proconfig, pg_get_functiondef(p.oid), md5(pg_get_functiondef(p.oid)),
    has_function_privilege('anon', p.oid, 'EXECUTE'),
    has_function_privilege('authenticated', p.oid, 'EXECUTE'),
    EXISTS (
      SELECT 1 FROM aclexplode(p.proacl) a
      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
    ),
    has_function_privilege('service_role', p.oid, 'EXECUTE'),
    v_trigger_count
  FROM pg_proc p WHERE p.oid = v_oid;

  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.sor_touch_updated_at() FROM PUBLIC, anon, authenticated';

  IF has_function_privilege('anon', v_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', v_oid, 'EXECUTE')
     OR EXISTS (
       SELECT 1 FROM pg_proc p
       CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
       WHERE p.oid = v_oid AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'SOR trigger helper still has direct PUBLIC or effective client EXECUTE after hardening';
  END IF;

  IF (SELECT count(*) FROM pg_trigger t WHERE t.tgfoid = v_oid AND NOT t.tgisinternal)
       <> v_trigger_count THEN
    RAISE EXCEPTION 'SOR timestamp trigger changed during ACL hardening';
  END IF;
  IF md5(pg_get_functiondef(v_oid)) IS DISTINCT FROM (
       SELECT prior_definition_md5 FROM stage1b_sor_private.sor_touch_acl_snapshot
       WHERE change_id = '20260928120000_stage1b_sor_touch_acl_hardening'
     )
     OR has_function_privilege('service_role', v_oid, 'EXECUTE') IS DISTINCT FROM (
       SELECT prior_service_role_execute FROM stage1b_sor_private.sor_touch_acl_snapshot
       WHERE change_id = '20260928120000_stage1b_sor_touch_acl_hardening'
     ) THEN
    RAISE EXCEPTION 'SOR helper body or service-role EXECUTE changed during ACL hardening';
  END IF;

  UPDATE stage1b_sor_private.sor_touch_acl_snapshot s
  SET after_raw_acl = p.proacl::text,
      after_definition_md5 = md5(pg_get_functiondef(p.oid)),
      after_service_role_execute = has_function_privilege('service_role', p.oid, 'EXECUTE')
  FROM pg_proc p
  WHERE s.change_id = '20260928120000_stage1b_sor_touch_acl_hardening'
    AND p.oid = v_oid;

  GET DIAGNOSTICS v_saved_count = ROW_COUNT;
  IF v_saved_count <> 1 THEN
    RAISE EXCEPTION 'SOR trigger ACL post-state snapshot was not written exactly once';
  END IF;
END
$sor_touch_acl_hardening$;

COMMIT;
