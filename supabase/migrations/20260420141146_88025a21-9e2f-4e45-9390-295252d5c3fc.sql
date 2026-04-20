
-- ============================================================
-- 1. VERSION DIFFS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_version_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_a integer NOT NULL,
  version_b integer NOT NULL,
  diff_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  added_count integer NOT NULL DEFAULT 0,
  removed_count integer NOT NULL DEFAULT 0,
  modified_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_version_diffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can view diffs" ON public.system_version_diffs;
CREATE POLICY "Founders can view diffs" ON public.system_version_diffs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role));

DROP POLICY IF EXISTS "Founders can insert diffs" ON public.system_version_diffs;
CREATE POLICY "Founders can insert diffs" ON public.system_version_diffs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

CREATE INDEX IF NOT EXISTS idx_system_version_diffs_versions
  ON public.system_version_diffs (version_a, version_b);

-- ============================================================
-- 2. COMPARE SYSTEM VERSIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.compare_system_versions(
  _version_a integer,
  _version_b integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a record;
  v_b record;
  v_diff jsonb;
  v_added integer;
  v_removed integer;
  v_modified integer;
  v_id uuid;
BEGIN
  SELECT * INTO v_a FROM public.system_versions WHERE version_number = _version_a;
  SELECT * INTO v_b FROM public.system_versions WHERE version_number = _version_b;
  IF v_a.id IS NULL OR v_b.id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  v_diff := jsonb_build_object(
    'pages',         jsonb_build_object('a', v_a.pages_count,        'b', v_b.pages_count,        'delta', v_b.pages_count        - v_a.pages_count),
    'content',       jsonb_build_object('a', v_a.content_count,      'b', v_b.content_count,      'delta', v_b.content_count      - v_a.content_count),
    'backend',       jsonb_build_object('a', v_a.backend_count,      'b', v_b.backend_count,      'delta', v_b.backend_count      - v_a.backend_count),
    'workflows',     jsonb_build_object('a', v_a.workflow_count,     'b', v_b.workflow_count,     'delta', v_b.workflow_count     - v_a.workflow_count),
    'rules',         jsonb_build_object('a', v_a.rule_count,         'b', v_b.rule_count,         'delta', v_b.rule_count         - v_a.rule_count),
    'integrations',  jsonb_build_object('a', v_a.integration_count,  'b', v_b.integration_count,  'delta', v_b.integration_count  - v_a.integration_count),
    'data_flows',    jsonb_build_object('a', v_a.data_flow_count,    'b', v_b.data_flow_count,    'delta', v_b.data_flow_count    - v_a.data_flow_count),
    'coverage',      jsonb_build_object('a', v_a.coverage_score,     'b', v_b.coverage_score,     'delta', v_b.coverage_score     - v_a.coverage_score)
  );

  v_added := GREATEST(0, (v_b.pages_count - v_a.pages_count))
           + GREATEST(0, (v_b.backend_count - v_a.backend_count))
           + GREATEST(0, (v_b.workflow_count - v_a.workflow_count))
           + GREATEST(0, (v_b.rule_count - v_a.rule_count))
           + GREATEST(0, (v_b.integration_count - v_a.integration_count))
           + GREATEST(0, (v_b.data_flow_count - v_a.data_flow_count));

  v_removed := GREATEST(0, (v_a.pages_count - v_b.pages_count))
             + GREATEST(0, (v_a.backend_count - v_b.backend_count))
             + GREATEST(0, (v_a.workflow_count - v_b.workflow_count))
             + GREATEST(0, (v_a.rule_count - v_b.rule_count))
             + GREATEST(0, (v_a.integration_count - v_b.integration_count))
             + GREATEST(0, (v_a.data_flow_count - v_b.data_flow_count));

  v_modified := ABS(v_b.coverage_score - v_a.coverage_score);

  INSERT INTO public.system_version_diffs (version_a, version_b, diff_summary, added_count, removed_count, modified_count)
  VALUES (_version_a, _version_b, v_diff, v_added, v_removed, v_modified)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'diff_id', v_id,
    'version_a', _version_a,
    'version_b', _version_b,
    'added', v_added,
    'removed', v_removed,
    'modified', v_modified,
    'summary', v_diff
  );
END;
$$;

-- ============================================================
-- 3. RUNTIME VS DOCUMENTATION VALIDATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_runtime_vs_documentation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mismatches jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_workflow record;
  v_required_tables text[];
  v_table text;
  v_exists boolean;
BEGIN
  -- For each documented workflow, verify that every linked_table on each step actually exists
  FOR v_workflow IN
    SELECT w.workflow_key, w.workflow_name, s.step_index, s.step_name,
           string_to_array(COALESCE(s.linked_tables, ''), ',') AS tables_arr
    FROM public.system_workflows_full w
    JOIN public.system_workflow_steps s ON s.workflow_id = w.id
  LOOP
    FOREACH v_table IN ARRAY v_workflow.tables_arr LOOP
      v_table := trim(v_table);
      IF v_table = '' THEN CONTINUE; END IF;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = v_table
      ) INTO v_exists;
      IF NOT v_exists THEN
        v_count := v_count + 1;
        v_mismatches := v_mismatches || jsonb_build_object(
          'workflow', v_workflow.workflow_key,
          'step', v_workflow.step_name,
          'missing_table', v_table
        );
      END IF;
    END LOOP;
  END LOOP;

  IF v_count > 0 THEN
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES (
      'runtime_documentation_mismatch',
      'system_mirror',
      'critical',
      'Runtime/documentation mismatch: ' || v_count || ' issue(s) detected',
      jsonb_build_object('mismatches', v_mismatches)
    );
    INSERT INTO public.activity_log (event_type, description, entity_type)
    VALUES ('system_alert', 'Runtime vs documentation mismatch detected (' || v_count || ')', 'system_mirror');
  END IF;

  RETURN jsonb_build_object(
    'mismatches_found', v_count,
    'details', v_mismatches,
    'checked_at', now()
  );
END;
$$;

-- ============================================================
-- 4. ORPHAN CONTENT DETECTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.detect_orphan_content()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orphans jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT c.id, c.page, c.content_type, c.linked_feature
    FROM public.system_content c
    LEFT JOIN public.system_pages_index p ON p.route_path = c.page
    WHERE p.id IS NULL
       OR c.linked_feature IS NULL
       OR c.linked_feature = ''
  LOOP
    v_count := v_count + 1;
    v_orphans := v_orphans || jsonb_build_object(
      'id', v_row.id, 'page', v_row.page,
      'type', v_row.content_type, 'linked_feature', v_row.linked_feature
    );
  END LOOP;

  IF v_count > 0 THEN
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES (
      'orphan_content_detected',
      'system_content',
      'medium',
      'Orphan content found: ' || v_count || ' entries unlinked',
      jsonb_build_object('orphans', v_orphans)
    );
  END IF;

  RETURN jsonb_build_object(
    'orphans_found', v_count,
    'details', v_orphans,
    'checked_at', now()
  );
END;
$$;

-- ============================================================
-- 5. FULL SNAPSHOT EXPORT
-- ============================================================
CREATE OR REPLACE FUNCTION public.export_full_system_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb;
  v_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 1) INTO v_version FROM public.system_versions;

  v_snapshot := jsonb_build_object(
    'exported_at', now(),
    'manual_version', v_version,
    'pages',         (SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb) FROM public.system_pages_index p),
    'content',       (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public.system_content c),
    'backend',       (SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) FROM public.system_backend_objects b),
    'workflows',     (SELECT COALESCE(jsonb_agg(to_jsonb(w)), '[]'::jsonb) FROM public.system_workflows_full w),
    'workflow_steps',(SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.system_workflow_steps s),
    'rules',         (SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.system_rules r),
    'integrations',  (SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]'::jsonb) FROM public.system_integrations_full i),
    'data_flows',    (SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb) FROM public.system_data_flows f),
    'versions',      (SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM public.system_versions v),
    'changes',       (SELECT COALESCE(jsonb_agg(to_jsonb(ch)), '[]'::jsonb) FROM (SELECT * FROM public.system_changes ORDER BY created_at DESC LIMIT 500) ch)
  );

  RETURN v_snapshot;
END;
$$;

-- ============================================================
-- 6. HARDEN COVERAGE VALIDATION (100% enforcement)
-- ============================================================
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
  -- Pages
  v_total_pages := 100;
  SELECT COUNT(*) INTO v_doc_pages FROM public.system_pages_index;
  IF v_doc_pages > v_total_pages THEN v_total_pages := v_doc_pages; END IF;

  -- Tables
  SELECT COUNT(*) INTO v_total_tables
  FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE';
  SELECT COUNT(*) INTO v_doc_tables
  FROM public.system_backend_objects WHERE object_kind='table';

  -- Functions
  SELECT COUNT(*) INTO v_total_funcs
  FROM information_schema.routines
  WHERE routine_schema='public' AND routine_type='FUNCTION';
  SELECT COUNT(*) INTO v_doc_funcs
  FROM public.system_backend_objects WHERE object_kind='function';

  -- Workflows / rules / integrations / flows / content
  SELECT COUNT(*) INTO v_doc_wf FROM public.system_workflows_full;
  v_total_wf := GREATEST(v_doc_wf, 10);
  SELECT COUNT(*) INTO v_doc_rules FROM public.system_rules;
  v_total_rules := GREATEST(v_doc_rules, 19);
  SELECT COUNT(*) INTO v_doc_integrations FROM public.system_integrations_full;
  v_total_integrations := GREATEST(v_doc_integrations, 5);
  SELECT COUNT(*) INTO v_doc_flows FROM public.system_data_flows;
  v_total_flows := GREATEST(v_doc_flows, 5);
  SELECT COUNT(*) INTO v_total_content FROM public.system_content;

  -- Find undocumented tables → critical event each
  FOR v_table IN
    SELECT t.table_name FROM information_schema.tables t
    LEFT JOIN public.system_backend_objects b
      ON b.object_kind='table' AND b.object_name=t.table_name
    WHERE t.table_schema='public' AND t.table_type='BASE TABLE' AND b.id IS NULL
  LOOP
    v_gaps := v_gaps + 1;
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES ('coverage_gap_table','system_mirror','critical',
      'Undocumented table: ' || v_table.table_name,
      jsonb_build_object('table', v_table.table_name));
  END LOOP;

  -- Undocumented functions → critical event each
  FOR v_func IN
    SELECT r.routine_name FROM information_schema.routines r
    LEFT JOIN public.system_backend_objects b
      ON b.object_kind='function' AND b.object_name=r.routine_name
    WHERE r.routine_schema='public' AND r.routine_type='FUNCTION' AND b.id IS NULL
  LOOP
    v_gaps := v_gaps + 1;
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES ('coverage_gap_function','system_mirror','critical',
      'Undocumented function: ' || v_func.routine_name,
      jsonb_build_object('function', v_func.routine_name));
  END LOOP;

  -- Run secondary validators
  v_orphan_check := public.detect_orphan_content();
  v_runtime_check := public.validate_runtime_vs_documentation();
  v_gaps := v_gaps
          + COALESCE((v_orphan_check->>'orphans_found')::int, 0)
          + COALESCE((v_runtime_check->>'mismatches_found')::int, 0);

  -- Weighted coverage score (pages/tables/functions = 20 each, workflows/rules/integrations/flows = 10 each)
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

  IF v_score < 100 OR v_gaps > 0 THEN
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

-- ============================================================
-- 7. AUTO PARTIAL REBUILD (called by DDL trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_partial_rebuild()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obj record;
BEGIN
  FOR v_obj IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    IF v_obj.schema_name = 'public' THEN
      INSERT INTO public.system_changes (entity_type, entity_key, change_type, summary)
      VALUES (
        COALESCE(v_obj.object_type, 'object'),
        COALESCE(v_obj.object_identity, 'unknown'),
        v_obj.command_tag,
        'DDL: ' || v_obj.command_tag || ' on ' || COALESCE(v_obj.object_identity, '?')
      );
    END IF;
  END LOOP;

  -- Trigger lightweight rebuild
  PERFORM public.rebuild_full_manual();
EXCEPTION WHEN OTHERS THEN
  -- Never block DDL
  NULL;
END;
$$;

DROP EVENT TRIGGER IF EXISTS auto_mirror_rebuild_trigger;
CREATE EVENT TRIGGER auto_mirror_rebuild_trigger
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE','ALTER TABLE','DROP TABLE',
               'CREATE FUNCTION','ALTER FUNCTION','DROP FUNCTION',
               'CREATE TRIGGER','DROP TRIGGER')
  EXECUTE FUNCTION public.auto_partial_rebuild();

-- ============================================================
-- 8. SCHEDULED VALIDATION JOBS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('mirror-coverage-6h');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('mirror-runtime-12h');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('mirror-orphan-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('mirror-coverage-6h',  '0 */6 * * *', $$SELECT public.validate_full_system_coverage();$$);
SELECT cron.schedule('mirror-runtime-12h',  '0 */12 * * *', $$SELECT public.validate_runtime_vs_documentation();$$);
SELECT cron.schedule('mirror-orphan-daily', '0 3 * * *',    $$SELECT public.detect_orphan_content();$$);
