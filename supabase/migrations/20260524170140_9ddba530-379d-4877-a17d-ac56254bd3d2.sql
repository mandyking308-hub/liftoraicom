
-- =========================================================
-- 1. DATA INGESTION
-- =========================================================
CREATE TABLE public.ma_data_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_name TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'csv','xlsx','paste','adviser_notes','apollo','hubspot','pitchbook','crunchbase','dealroom','beauhurst','companies_house','sec_edgar','opencorporates','lse_rns','other'
  )),
  target_entity TEXT NOT NULL CHECK (target_entity IN (
    'companies','investors','buyer_matches','competitor_profiles','deals','adviser_channels','people','signals','generic'
  )),
  licence_status TEXT NOT NULL DEFAULT 'unknown' CHECK (licence_status IN (
    'public','licensed_reuse_allowed','licensed_internal_only','do_not_store','restricted','unknown'
  )),
  storage_allowed BOOLEAN NOT NULL DEFAULT true,
  reuse_allowed BOOLEAN NOT NULL DEFAULT false,
  confidence_level TEXT NOT NULL DEFAULT 'medium' CHECK (confidence_level IN ('low','medium','high')),
  import_owner_id UUID NOT NULL,
  file_storage_path TEXT,
  raw_paste_excerpt TEXT,
  row_count_total INT DEFAULT 0,
  row_count_mapped INT DEFAULT 0,
  row_count_created INT DEFAULT 0,
  row_count_updated INT DEFAULT 0,
  row_count_rejected INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','mapping','reviewing','approved','rejected','completed','error'
  )),
  field_mapping JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  error_message TEXT,
  date_imported TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ma_import_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.ma_data_imports(id) ON DELETE CASCADE,
  row_index INT NOT NULL,
  raw_payload JSONB NOT NULL,
  mapped_payload JSONB DEFAULT '{}'::jsonb,
  dedupe_status TEXT NOT NULL DEFAULT 'unchecked' CHECK (dedupe_status IN (
    'unchecked','unique','possible_duplicate','duplicate_confirmed','merge_required'
  )),
  matched_record_table TEXT,
  matched_record_id UUID,
  action TEXT NOT NULL DEFAULT 'needs_review' CHECK (action IN (
    'needs_review','create','update','merge','reject','skipped'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved','rejected','applied','error'
  )),
  validation_errors JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_records_import ON public.ma_import_records(import_id);
CREATE INDEX idx_import_records_status ON public.ma_import_records(status);

-- =========================================================
-- 2. GOLDEN RECORDS + DE-DUP
-- =========================================================
CREATE TABLE public.ma_golden_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL CHECK (record_type IN ('company','investor','person','adviser')),
  canonical_name TEXT NOT NULL,
  legal_name TEXT,
  primary_domain TEXT,
  ticker TEXT,
  country TEXT,
  aliases TEXT[] DEFAULT ARRAY[]::TEXT[],
  external_ids JSONB DEFAULT '{}'::jsonb,
  linked_company_id UUID,
  linked_investor_id UUID,
  linked_adviser_id UUID,
  confidence_score INT DEFAULT 70 CHECK (confidence_score BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_golden_type_name ON public.ma_golden_records(record_type, canonical_name);
CREATE INDEX idx_golden_domain ON public.ma_golden_records(primary_domain);

CREATE TABLE public.ma_dedupe_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type TEXT NOT NULL CHECK (record_type IN ('company','investor','person','adviser')),
  source_table TEXT NOT NULL,
  source_record_id UUID NOT NULL,
  target_table TEXT NOT NULL,
  target_record_id UUID NOT NULL,
  match_signals JSONB DEFAULT '{}'::jsonb,
  similarity_score INT NOT NULL CHECK (similarity_score BETWEEN 0 AND 100),
  diff_fields JSONB DEFAULT '{}'::jsonb,
  suggested_action TEXT NOT NULL DEFAULT 'review' CHECK (suggested_action IN (
    'review','merge_safe','keep_separate','link_alias'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved_merge','approved_keep','rejected','actioned'
  )),
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 3. EVIDENCE LINKS
-- =========================================================
CREATE TABLE public.ma_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_table TEXT NOT NULL,
  subject_id UUID NOT NULL,
  evidence_table TEXT NOT NULL,
  evidence_id UUID NOT NULL,
  source_name TEXT,
  source_date DATE,
  confidence_score INT CHECK (confidence_score BETWEEN 0 AND 100),
  freshness_score INT CHECK (freshness_score BETWEEN 0 AND 100),
  licence_status TEXT,
  paid_source BOOLEAN DEFAULT false,
  adviser_review_required BOOLEAN DEFAULT false,
  missing_data_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidence_subject ON public.ma_evidence_links(subject_table, subject_id);

-- =========================================================
-- 4. SCHEDULED RUNS
-- =========================================================
CREATE TABLE public.ma_intelligence_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL CHECK (run_type IN (
    'weekly_ma_refresh','weekly_signal_review','monthly_portfolio_exit_review',
    'quarterly_build_selection','quarterly_governance_review','monthly_data_room_review','adhoc'
  )),
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','running','completed','failed','cancelled','partial'
  )),
  records_reviewed INT DEFAULT 0,
  records_added INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  recommendations_generated INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  next_actions JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 5. DECISION MEMORY
-- =========================================================
CREATE TABLE public.ma_governance_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id UUID REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  build_candidate_id UUID REFERENCES public.ma_build_candidates(id) ON DELETE SET NULL,
  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'build','scale','iterate','park','kill','warm_buyers','sell','adviser_review','reject','pause','approve_import','approve_outreach','approve_paid_connector','other'
  )),
  decision_summary TEXT NOT NULL,
  reasoning TEXT,
  supporting_signals JSONB DEFAULT '[]'::jsonb,
  rejected_alternatives JSONB DEFAULT '[]'::jsonb,
  approved_by UUID,
  decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  review_date DATE,
  outcome_notes TEXT,
  lessons_learned TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gov_decisions_asset ON public.ma_governance_decisions(portfolio_asset_id);
CREATE INDEX idx_gov_decisions_candidate ON public.ma_governance_decisions(build_candidate_id);

-- =========================================================
-- 6. APPROVAL QUEUE
-- =========================================================
CREATE TABLE public.ma_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL CHECK (request_type IN (
    'buyer_outreach','investor_outreach','adviser_outreach','paid_data_activation',
    'data_export','high_risk_build','legal_ip_action','jurisdiction_decision',
    'spend_commitment','external_message','promote_to_portfolio_asset','kill_decision',
    'sell_decision','merge_records','reject_import','approve_import','other'
  )),
  subject_table TEXT,
  subject_id UUID,
  portfolio_asset_id UUID REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  build_candidate_id UUID REFERENCES public.ma_build_candidates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  proposed_action TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  evidence JSONB DEFAULT '{}'::jsonb,
  requested_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved','rejected','needs_more_information','escalated_to_adviser','actioned','archived'
  )),
  decision_notes TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_status ON public.ma_approval_queue(status);
CREATE INDEX idx_approval_asset ON public.ma_approval_queue(portfolio_asset_id);

-- =========================================================
-- 7. OPERATING CAPACITY
-- =========================================================
CREATE TABLE public.ma_capacity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_businesses INT DEFAULT 0,
  pending_approvals INT DEFAULT 0,
  oversight_hours_per_week NUMERIC DEFAULT 0,
  open_execution_targets INT DEFAULT 0,
  overdue_execution_targets INT DEFAULT 0,
  data_room_gaps INT DEFAULT 0,
  revenue_assets_needing_attention INT DEFAULT 0,
  agent_readiness_score INT DEFAULT 0 CHECK (agent_readiness_score BETWEEN 0 AND 100),
  adviser_bottleneck_count INT DEFAULT 0,
  capacity_score INT DEFAULT 0 CHECK (capacity_score BETWEEN 0 AND 100),
  capacity_verdict TEXT CHECK (capacity_verdict IN ('healthy','stretched','overloaded','critical')),
  recommendation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- 8. PORTFOLIO LESSONS
-- =========================================================
CREATE TABLE public.ma_portfolio_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id UUID REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  build_candidate_id UUID REFERENCES public.ma_build_candidates(id) ON DELETE SET NULL,
  what_worked TEXT,
  what_failed TEXT,
  strongest_acquisition_signal TEXT,
  strongest_sales_channel TEXT,
  best_converting_outreach TEXT,
  weakest_assumption TEXT,
  biggest_operational_burden TEXT,
  actual_vs_expected_revenue TEXT,
  actual_vs_expected_buyer_interest TEXT,
  actual_vs_expected_operability TEXT,
  kill_or_scale_lessons TEXT,
  reusable_playbook_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_asset ON public.ma_portfolio_lessons(portfolio_asset_id);

-- =========================================================
-- 9. ASSET PLAYBOOKS
-- =========================================================
CREATE TABLE public.ma_asset_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id UUID NOT NULL REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  business_thesis TEXT,
  target_customer TEXT,
  target_buyer TEXT,
  revenue_model TEXT,
  sales_process TEXT,
  lead_sources TEXT,
  outreach_rules TEXT,
  inbox_rules TEXT,
  crm_stages TEXT,
  content_rules TEXT,
  human_approval_points TEXT,
  compliance_rules TEXT,
  data_room_checklist TEXT,
  exit_target_summary TEXT,
  kill_scale_criteria TEXT,
  generated_by_ai BOOLEAN DEFAULT false,
  ai_model TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_playbook_asset ON public.ma_asset_playbooks(portfolio_asset_id);

-- =========================================================
-- 10. PAID CONNECTORS
-- =========================================================
CREATE TABLE public.ma_paid_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_name TEXT NOT NULL UNIQUE CHECK (connector_name IN (
    'crunchbase','pitchbook','dealroom','beauhurst','companies_house','sec_edgar','opencorporates','lse_rns','apollo','hubspot'
  )),
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN (
    'not_configured','configured','active','paused','error'
  )),
  secret_reference_name TEXT,
  licence_status TEXT DEFAULT 'unknown' CHECK (licence_status IN (
    'unknown','public','licensed_reuse_allowed','licensed_internal_only','do_not_store','restricted'
  )),
  allowed_use_notes TEXT,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================
-- TRIGGERS: updated_at + audit
-- =========================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ma_data_imports','ma_import_records','ma_golden_records','ma_dedupe_suggestions',
    'ma_intelligence_runs','ma_governance_decisions','ma_approval_queue','ma_portfolio_lessons',
    'ma_asset_playbooks','ma_paid_connectors'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ma_audit_trigger();', t, t);
  END LOOP;
END $$;

-- ma_evidence_links + ma_capacity_snapshots are append-only (no updated_at trigger, but audit insert)
CREATE TRIGGER trg_ma_evidence_links_audit AFTER INSERT OR UPDATE OR DELETE ON public.ma_evidence_links FOR EACH ROW EXECUTE FUNCTION public.ma_audit_trigger();
CREATE TRIGGER trg_ma_capacity_snapshots_audit AFTER INSERT OR UPDATE OR DELETE ON public.ma_capacity_snapshots FOR EACH ROW EXECUTE FUNCTION public.ma_audit_trigger();

-- =========================================================
-- RLS: founder/admin only on all new tables
-- =========================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ma_data_imports','ma_import_records','ma_golden_records','ma_dedupe_suggestions',
    'ma_evidence_links','ma_intelligence_runs','ma_governance_decisions','ma_approval_queue',
    'ma_capacity_snapshots','ma_portfolio_lessons','ma_asset_playbooks','ma_paid_connectors'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$CREATE POLICY "founder_admin_select_%s" ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));$p$, t, t);
    EXECUTE format($p$CREATE POLICY "founder_admin_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));$p$, t, t);
    EXECUTE format($p$CREATE POLICY "founder_admin_update_%s" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));$p$, t, t);
    EXECUTE format($p$CREATE POLICY "founder_admin_delete_%s" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));$p$, t, t);
  END LOOP;
END $$;

-- =========================================================
-- STORAGE BUCKET for uploads
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('ma-imports', 'ma-imports', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ma_imports_founder_admin_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ma-imports' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)));
CREATE POLICY "ma_imports_founder_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ma-imports' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)));
CREATE POLICY "ma_imports_founder_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ma-imports' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)));
CREATE POLICY "ma_imports_founder_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ma-imports' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)));

-- =========================================================
-- Seed paid connector placeholders (not_configured)
-- =========================================================
INSERT INTO public.ma_paid_connectors (connector_name, status, licence_status, allowed_use_notes)
VALUES
  ('crunchbase','not_configured','unknown','Placeholder — no API key provided. Do not call without founder approval.'),
  ('pitchbook','not_configured','unknown','Placeholder — paid licence required.'),
  ('dealroom','not_configured','unknown','Placeholder — paid licence required.'),
  ('beauhurst','not_configured','unknown','Placeholder — paid licence required.'),
  ('companies_house','not_configured','public','UK public registry. Activate when API key + use rules confirmed.'),
  ('sec_edgar','not_configured','public','US public filings.'),
  ('opencorporates','not_configured','licensed_reuse_allowed','Mixed licence. Confirm per-use.'),
  ('lse_rns','not_configured','public','UK regulatory news.'),
  ('apollo','not_configured','licensed_internal_only','Do not export externally without approval.'),
  ('hubspot','not_configured','licensed_internal_only','Per-account licence; internal use only.')
ON CONFLICT (connector_name) DO NOTHING;

-- =========================================================
-- Helper view: open approvals
-- =========================================================
CREATE OR REPLACE VIEW public.ma_approval_queue_open AS
SELECT * FROM public.ma_approval_queue
WHERE status IN ('pending','needs_more_information','escalated_to_adviser');
