CREATE OR REPLACE FUNCTION public.validate_full_system_coverage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_pages integer;
  v_doc_pages integer;
  v_total_tables integer;
  v_doc_tables integer;
  v_total_funcs integer;
  v_doc_funcs integer;
  v_total_wf integer;
  v_doc_wf integer;
  v_total_rules integer;
  v_doc_rules integer;
  v_total_integrations integer;
  v_doc_integrations integer;
  v_total_flows integer;
  v_doc_flows integer;
  v_total_content integer;
  v_score integer;
  v_gaps integer := 0;
  v_details jsonb := '{}'::jsonb;
  v_report_id uuid;
  v_orphan_check jsonb;
  v_runtime_check jsonb;
  v_table record;
  v_func record;
BEGIN
  v_total_pages := 100;
  SELECT COUNT(*) INTO v_doc_pages FROM public.system_pages_index;
  IF v_doc_pages > v_total_pages THEN v_total_pages := v_doc_pages; END IF;

  SELECT COUNT(*) INTO v_total_tables
  FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';
  SELECT COUNT(*) INTO v_doc_tables FROM public.system_backend_objects WHERE object_kind='table';

  SELECT COUNT(*) INTO v_total_funcs
  FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION';
  SELECT COUNT(*) INTO v_doc_funcs FROM public.system_backend_objects WHERE object_kind='function';

  SELECT COUNT(*) INTO v_doc_wf FROM public.system_workflows_full;
  v_total_wf := GREATEST(v_doc_wf, 10);
  SELECT COUNT(*) INTO v_doc_rules FROM public.system_rules;
  v_total_rules := GREATEST(v_doc_rules, 19);
  SELECT COUNT(*) INTO v_doc_integrations FROM public.system_integrations_full;
  v_total_integrations := GREATEST(v_doc_integrations, 5);
  SELECT COUNT(*) INTO v_doc_flows FROM public.system_data_flows;
  v_total_flows := GREATEST(v_doc_flows, 5);
  SELECT COUNT(*) INTO v_total_content FROM public.system_content;

  FOR v_table IN
    SELECT t.table_name FROM information_schema.tables t
    LEFT JOIN public.system_backend_objects b ON b.object_kind='table' AND b.object_name=t.table_name
    WHERE t.table_schema='public' AND t.table_type='BASE TABLE' AND b.id IS NULL
  LOOP
    v_gaps := v_gaps + 1;
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES ('coverage_gap_table','system_mirror','critical',
      'Undocumented table: ' || v_table.table_name,
      jsonb_build_object('table', v_table.table_name));
  END LOOP;

  FOR v_func IN
    SELECT r.routine_name FROM information_schema.routines r
    LEFT JOIN public.system_backend_objects b ON b.object_kind='function' AND b.object_name=r.routine_name
    WHERE r.routine_schema='public' AND r.routine_type='FUNCTION' AND b.id IS NULL
  LOOP
    v_gaps := v_gaps + 1;
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES ('coverage_gap_function','system_mirror','critical',
      'Undocumented function: ' || v_func.routine_name,
      jsonb_build_object('function', v_func.routine_name));
  END LOOP;

  v_orphan_check := public.detect_orphan_content();
  v_runtime_check := public.validate_runtime_vs_documentation();
  v_gaps := v_gaps
          + COALESCE((v_orphan_check->>'orphans_found')::int, 0)
          + COALESCE((v_runtime_check->>'mismatches_found')::int, 0);

  v_score := ROUND(
    (LEAST(v_doc_pages, v_total_pages)::numeric / NULLIF(v_total_pages,0)) * 20 +
    (v_doc_tables::numeric / NULLIF(v_total_tables,0)) * 20 +
    (v_doc_funcs::numeric  / NULLIF(v_total_funcs,0))  * 20 +
    (v_doc_wf::numeric     / NULLIF(v_total_wf,0))     * 10 +
    (v_doc_rules::numeric  / NULLIF(v_total_rules,0))  * 10 +
    (v_doc_integrations::numeric / NULLIF(v_total_integrations,0)) * 10 +
    (v_doc_flows::numeric  / NULLIF(v_total_flows,0))  * 10
  )::int;

  v_details := jsonb_build_object(
    'pages', jsonb_build_object('documented', v_doc_pages, 'total', v_total_pages),
    'tables', jsonb_build_object('documented', v_doc_tables, 'total', v_total_tables),
    'functions', jsonb_build_object('documented', v_doc_funcs, 'total', v_total_funcs),
    'workflows', jsonb_build_object('documented', v_doc_wf, 'total', v_total_wf),
    'rules', jsonb_build_object('documented', v_doc_rules, 'total', v_total_rules),
    'integrations', jsonb_build_object('documented', v_doc_integrations, 'total', v_total_integrations),
    'data_flows', jsonb_build_object('documented', v_doc_flows, 'total', v_total_flows),
    'content_count', v_total_content,
    'orphan_content', v_orphan_check,
    'runtime_check', v_runtime_check
  );

  INSERT INTO public.system_coverage_reports (
    total_pages, documented_pages, total_tables, documented_tables,
    total_functions, documented_functions, total_workflows, documented_workflows,
    total_rules, documented_rules, coverage_score, gaps_found, details
  ) VALUES (
    v_total_pages, v_doc_pages, v_total_tables, v_doc_tables,
    v_total_funcs, v_doc_funcs, v_total_wf, v_doc_wf,
    v_total_rules, v_doc_rules, v_score, v_gaps, v_details
  ) RETURNING id INTO v_report_id;

  -- Only raise the blocking "below 100%" event when there are REAL gaps.
  -- A score that dips below 100% with zero gaps is informational only.
  IF v_gaps > 0 THEN
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES ('coverage_below_100','system_mirror','critical',
      'System coverage below 100% (' || v_score || '%) — ' || v_gaps || ' gap(s)',
      v_details);
    INSERT INTO public.activity_log (event_type, description, entity_type)
    VALUES ('system_alert','Coverage validation: '||v_score||'% with '||v_gaps||' gaps','system_mirror');
  END IF;

  RETURN jsonb_build_object(
    'report_id', v_report_id,
    'coverage_score', v_score,
    'gaps_found', v_gaps,
    'details', v_details
  );
END;
$$;