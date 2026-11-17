DO $$
DECLARE r record; tbls text[] := ARRAY['reporting_conflicts','role_permissions','inventory_records','campaign_factory_batches','fulfilment_shipments','availability_windows','platform_roles','portal_access_events','identity_merge_actions','import_applied_records','command_centre_customer_journey_steps','booking_events','import_batches','identity_links','duplicate_identity_candidates','reporting_truth_rules','identity_profiles','kpi_definitions','worker_kill_switch','import_mappings','portal_profiles','import_rollback_events'];
BEGIN
  FOR r IN SELECT tablename, policyname, cmd FROM pg_policies
           WHERE schemaname='public' AND tablename = ANY(tbls)
             AND (coalesce(qual,'')='true' OR coalesce(with_check,'')='true')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO authenticated %s %s',
      left('Founder/admin only: ' || r.policyname, 63), r.tablename, r.cmd,
      CASE WHEN r.cmd IN ('SELECT','UPDATE','DELETE','ALL') THEN 'USING (public._is_founder_or_admin())' ELSE '' END,
      CASE WHEN r.cmd IN ('INSERT','UPDATE','ALL') THEN 'WITH CHECK (public._is_founder_or_admin())' ELSE '' END);
  END LOOP;
END $$;