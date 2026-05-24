
CREATE TABLE IF NOT EXISTS public.ma_acceptance_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL UNIQUE,
  completion_status text NOT NULL DEFAULT 'not_started',
  test_status text NOT NULL DEFAULT 'untested',
  owner text, last_checked timestamptz, issues text, next_action text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ma_data_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL, record_id uuid NOT NULL,
  completeness numeric, source_quality numeric, freshness numeric, duplicate_risk numeric, confidence numeric,
  missing_required jsonb NOT NULL DEFAULT '[]'::jsonb, licence_risk text,
  human_review_required boolean NOT NULL DEFAULT false, warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_type, record_id)
);

CREATE TABLE IF NOT EXISTS public.ma_permissions_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL, capability text NOT NULL, allowed boolean NOT NULL DEFAULT false, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_name, capability)
);

ALTER TABLE public.ma_data_room_items ADD COLUMN IF NOT EXISTS sharing_level text NOT NULL DEFAULT 'internal';

CREATE TABLE IF NOT EXISTS public.ma_reporting_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_type text NOT NULL,
  portfolio_asset_id uuid REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  period_start date, period_end date, contents jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid, generated_at timestamptz NOT NULL DEFAULT now(),
  approved_for_export boolean NOT NULL DEFAULT false, approved_by uuid, approved_at timestamptz,
  notes text, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ma_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL, title text NOT NULL, description text,
  severity text NOT NULL DEFAULT 'medium', status text NOT NULL DEFAULT 'open',
  owner uuid, mitigation text, escalation_path text,
  portfolio_asset_id uuid REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  related_record_type text, related_record_id uuid,
  opened_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ma_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_class text NOT NULL UNIQUE, action text NOT NULL, period_months integer,
  manual_review_required boolean NOT NULL DEFAULT false, legal_hold boolean NOT NULL DEFAULT false, do_not_delete boolean NOT NULL DEFAULT false,
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ma_error_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL, module text, message text NOT NULL,
  related_record_type text, related_record_id uuid,
  severity text NOT NULL DEFAULT 'medium', retry_available boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false, resolved_by uuid, resolved_at timestamptz,
  notes text, occurred_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ma_environment_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_mode text NOT NULL DEFAULT 'live', changed_by uuid, changed_at timestamptz NOT NULL DEFAULT now(), notes text
);
INSERT INTO public.ma_environment_mode (current_mode, notes)
SELECT 'live','Initial mode' WHERE NOT EXISTS (SELECT 1 FROM public.ma_environment_mode);

ALTER TABLE public.ma_portfolio_assets    ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;
ALTER TABLE public.ma_companies           ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;
ALTER TABLE public.ma_buyer_matches       ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;
ALTER TABLE public.ma_deals               ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;
ALTER TABLE public.ma_weekly_signals      ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;
ALTER TABLE public.ma_ai_recommendations  ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.ma_strategic_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id uuid REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  assumption text NOT NULL, confidence numeric, evidence text, owner text, test_method text,
  review_date date, outcome text, status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_matches_asset       ON public.ma_buyer_matches(portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_buyer_matches_status      ON public.ma_buyer_matches(buyer_warmth_status);
CREATE INDEX IF NOT EXISTS idx_weekly_signals_asset      ON public.ma_weekly_signals(related_portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_weekly_signals_date       ON public.ma_weekly_signals(signal_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_signals_company    ON public.ma_weekly_signals(related_company_id);
CREATE INDEX IF NOT EXISTS idx_weekly_signals_investor   ON public.ma_weekly_signals(related_investor_id);
CREATE INDEX IF NOT EXISTS idx_weekly_signals_source     ON public.ma_weekly_signals(source_id);
CREATE INDEX IF NOT EXISTS idx_recs_asset                ON public.ma_ai_recommendations(portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_recs_status               ON public.ma_ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recs_created              ON public.ma_ai_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_targets_asset   ON public.ma_execution_targets(portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_execution_targets_status  ON public.ma_execution_targets(status);
CREATE INDEX IF NOT EXISTS idx_data_room_asset           ON public.ma_data_room_items(portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_data_room_status          ON public.ma_data_room_items(status);
CREATE INDEX IF NOT EXISTS idx_data_room_sharing         ON public.ma_data_room_items(sharing_level);
CREATE INDEX IF NOT EXISTS idx_competitor_updated        ON public.ma_competitor_profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_stage              ON public.ma_portfolio_assets(current_stage);
CREATE INDEX IF NOT EXISTS idx_build_candidates_status   ON public.ma_build_candidates(recommendation_status);
CREATE INDEX IF NOT EXISTS idx_lifecycle_trans_asset     ON public.ma_lifecycle_transitions(portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_trans_status    ON public.ma_lifecycle_transitions(status);
CREATE INDEX IF NOT EXISTS idx_alerts_status             ON public.ma_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_asset              ON public.ma_alerts(portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_dqs_record                ON public.ma_data_quality_scores(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status          ON public.ma_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity        ON public.ma_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_error_queue_unresolved    ON public.ma_error_queue(resolved, occurred_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ma_acceptance_criteria','ma_data_quality_scores','ma_permissions_matrix',
    'ma_reporting_packs','ma_incidents','ma_retention_policies',
    'ma_error_queue','ma_environment_mode','ma_strategic_assumptions'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "admins manage %1$s" ON public.%1$I;$p$, t);
    EXECUTE format($p$CREATE POLICY "admins manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));$p$, t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ma_acceptance_criteria','ma_permissions_matrix','ma_incidents',
    'ma_retention_policies','ma_strategic_assumptions'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

INSERT INTO public.ma_acceptance_criteria (module, completion_status, test_status, owner, next_action) VALUES
('Portfolio & Exit Command Centre','complete','needs_qa','Founder','Manual QA pass'),
('M&A Intelligence Database','complete','passing','Founder','Periodic review'),
('Data Ingestion Centre','complete','needs_qa','Founder','Run a real import'),
('Golden Record Resolver','partially_complete','untested','Founder','Wire merge UI'),
('Source Governance','complete','passing','Founder','Periodic licence review'),
('AI Intelligence Orchestrator','complete','needs_qa','Founder','Test all 4 modes'),
('Recommendation Engine','complete','needs_qa','Founder','Approve / reject test cycle'),
('Evidence Trail','complete','needs_qa','Founder','Confirm citations render'),
('Weekly Intelligence Runs','partially_complete','untested','Founder','Enable pg_cron schedule'),
('Quarterly Build Selector','complete','needs_qa','Founder','Run end-to-end candidate'),
('Valuation Engine','complete','needs_qa','Founder','Sanity check vs benchmarks'),
('Execution Handoff','complete','needs_qa','Founder','Verify agent targets'),
('Buyer Warm-Up Tracker','complete','needs_qa','Founder','Add real buyers manually'),
('Founder Approval Queue','complete','needs_qa','Founder','Walk through approvals'),
('Data Room Readiness','complete','needs_qa','Founder','Mark items adviser-reviewed'),
('Mock Buyer Diligence','complete','untested','Founder','Run one against a real asset'),
('Decision Memory','partially_complete','untested','Founder','Wire into Park/Kill flow'),
('Portfolio Lessons','partially_complete','untested','Founder','Capture first lessons'),
('User Manual','complete','passing','Founder','Periodic review'),
('Technical Manual','complete','passing','Founder','Periodic review'),
('Security/RLS','complete','passing','Founder','Re-run scanner monthly'),
('Audit Logs','complete','passing','Founder','Confirm trigger on all tables'),
('Backup/Export Controls','partially_complete','untested','Founder','Document PITR'),
('Do Not Build Library','complete','passing','Founder','Add domain-specific rules'),
('Human Capacity Check','complete','needs_qa','Founder','Record first weekly snapshot')
ON CONFLICT (module) DO NOTHING;

INSERT INTO public.ma_retention_policies (record_class, action, period_months, manual_review_required, legal_hold, do_not_delete, notes) VALUES
('imports','archive',24,false,false,false,'Keep raw imports 2y'),
('source_files','archive',36,false,false,false,'Reference for provenance'),
('investor_records','retain',NULL,false,false,true,'Keep as long as asset is active'),
('buyer_notes','retain',NULL,false,false,true,'Buyer-relationship history'),
('adviser_notes','retain',NULL,true,true,true,'Adviser-privileged'),
('recommendations','archive',24,false,false,false,'AI recommendations'),
('audit_logs','retain',NULL,false,true,true,'Audit log — never auto-delete'),
('data_room_items','retain',NULL,true,false,true,'Manual review before deletion'),
('decision_memory','retain',NULL,false,false,true,'Park / Kill rationale'),
('ai_generated_analysis','archive',12,false,false,false,'Briefings and challenge outputs')
ON CONFLICT (record_class) DO NOTHING;

INSERT INTO public.ma_permissions_matrix (role_name, capability, allowed, notes) VALUES
('founder_admin','view_portfolio_assets',true,NULL),('founder_admin','edit_portfolio_assets',true,NULL),
('founder_admin','view_buyer_notes',true,NULL),('founder_admin','edit_buyer_notes',true,NULL),
('founder_admin','view_adviser_notes',true,NULL),('founder_admin','view_confidential_data',true,NULL),
('founder_admin','approve_external_outreach',true,NULL),('founder_admin','approve_data_imports',true,NULL),
('founder_admin','approve_paid_api_activation',true,NULL),('founder_admin','export_data',true,NULL),
('founder_admin','view_data_room',true,NULL),('founder_admin','mark_items_buyer_safe',true,NULL),
('founder_admin','approve_build_candidate',true,NULL),('founder_admin','approve_scale_park_kill',true,NULL),
('operator','view_portfolio_assets',true,NULL),('operator','edit_portfolio_assets',true,NULL),
('operator','view_buyer_notes',true,NULL),('operator','edit_buyer_notes',true,NULL),
('operator','view_adviser_notes',false,'Privileged'),('operator','view_confidential_data',false,NULL),
('operator','approve_external_outreach',false,'Founder only'),('operator','approve_data_imports',false,NULL),
('operator','approve_paid_api_activation',false,NULL),('operator','export_data',false,NULL),
('operator','view_data_room',true,NULL),('operator','mark_items_buyer_safe',false,'Adviser-reviewed first'),
('operator','approve_build_candidate',false,NULL),('operator','approve_scale_park_kill',false,NULL),
('analyst','view_portfolio_assets',true,NULL),('analyst','edit_portfolio_assets',false,NULL),
('analyst','view_buyer_notes',true,NULL),('analyst','edit_buyer_notes',false,NULL),
('analyst','view_adviser_notes',false,NULL),('analyst','view_confidential_data',false,NULL),
('analyst','approve_external_outreach',false,NULL),('analyst','approve_data_imports',false,NULL),
('analyst','approve_paid_api_activation',false,NULL),('analyst','export_data',false,NULL),
('analyst','view_data_room',true,NULL),('analyst','mark_items_buyer_safe',false,NULL),
('analyst','approve_build_candidate',false,NULL),('analyst','approve_scale_park_kill',false,NULL),
('adviser_view','view_portfolio_assets',true,NULL),('adviser_view','edit_portfolio_assets',false,NULL),
('adviser_view','view_buyer_notes',true,NULL),('adviser_view','edit_buyer_notes',false,NULL),
('adviser_view','view_adviser_notes',true,NULL),('adviser_view','view_confidential_data',true,NULL),
('adviser_view','approve_external_outreach',false,NULL),('adviser_view','approve_data_imports',false,NULL),
('adviser_view','approve_paid_api_activation',false,NULL),('adviser_view','export_data',false,NULL),
('adviser_view','view_data_room',true,NULL),('adviser_view','mark_items_buyer_safe',true,'Adviser sign-off'),
('adviser_view','approve_build_candidate',false,NULL),('adviser_view','approve_scale_park_kill',false,NULL),
('read_only','view_portfolio_assets',true,NULL),('read_only','edit_portfolio_assets',false,NULL),
('read_only','view_buyer_notes',false,NULL),('read_only','edit_buyer_notes',false,NULL),
('read_only','view_adviser_notes',false,NULL),('read_only','view_confidential_data',false,NULL),
('read_only','approve_external_outreach',false,NULL),('read_only','approve_data_imports',false,NULL),
('read_only','approve_paid_api_activation',false,NULL),('read_only','export_data',false,NULL),
('read_only','view_data_room',false,NULL),('read_only','mark_items_buyer_safe',false,NULL),
('read_only','approve_build_candidate',false,NULL),('read_only','approve_scale_park_kill',false,NULL),
('restricted','view_portfolio_assets',false,NULL),('restricted','edit_portfolio_assets',false,NULL),
('restricted','view_buyer_notes',false,NULL),('restricted','edit_buyer_notes',false,NULL),
('restricted','view_adviser_notes',false,NULL),('restricted','view_confidential_data',false,NULL),
('restricted','approve_external_outreach',false,NULL),('restricted','approve_data_imports',false,NULL),
('restricted','approve_paid_api_activation',false,NULL),('restricted','export_data',false,NULL),
('restricted','view_data_room',false,NULL),('restricted','mark_items_buyer_safe',false,NULL),
('restricted','approve_build_candidate',false,NULL),('restricted','approve_scale_park_kill',false,NULL)
ON CONFLICT (role_name,capability) DO NOTHING;
