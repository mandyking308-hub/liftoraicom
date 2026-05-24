
-- Release Gate Checks
CREATE TABLE IF NOT EXISTS public.ma_release_gate_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_ready' CHECK (status IN ('not_ready','passing','failing','blocked','manual_review')),
  severity TEXT NOT NULL DEFAULT 'critical' CHECK (severity IN ('critical','high','medium','low')),
  evidence_ref TEXT,
  notes TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ma_release_gate_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_release_gate" ON public.ma_release_gate_checks FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Integration Allowlist
CREATE TABLE IF NOT EXISTS public.ma_integration_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'blocked' CHECK (status IN ('blocked','not_configured','pending','approved','active','paused','error')),
  data_accessed TEXT,
  secret_reference TEXT,
  licence_status TEXT,
  approval_owner TEXT,
  risk_rating TEXT DEFAULT 'unknown' CHECK (risk_rating IN ('low','medium','high','unknown')),
  last_reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ma_integration_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_integration_allowlist" ON public.ma_integration_allowlist FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Rate / Cost Guards
CREATE TABLE IF NOT EXISTS public.ma_rate_cost_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL UNIQUE,
  daily_limit INT,
  weekly_limit INT,
  monthly_spend_limit_usd NUMERIC(12,2),
  paid_api_call_limit INT,
  enrichment_limit INT,
  scheduled_job_limit INT,
  alert_threshold_pct INT DEFAULT 80,
  current_usage INT DEFAULT 0,
  status TEXT DEFAULT 'ok' CHECK (status IN ('ok','warning','exceeded','paused')),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ma_rate_cost_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_rate_limits" ON public.ma_rate_cost_limits FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Lockdown Controls
CREATE TABLE IF NOT EXISTS public.ma_lockdown_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  set_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ma_lockdown_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_lockdown" ON public.ma_lockdown_controls FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Red Team Reviews
CREATE TABLE IF NOT EXISTS public.ma_red_team_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_id UUID,
  asset_id UUID,
  prompt TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ma_red_team_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_red_team" ON public.ma_red_team_reviews FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_red_team_target ON public.ma_red_team_reviews(target_type, target_id);

-- Privacy / GDPR Records
CREATE TABLE IF NOT EXISTS public.ma_privacy_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_record_id UUID,
  personal_data BOOLEAN NOT NULL DEFAULT false,
  data_subject_type TEXT,
  lawful_basis_notes TEXT,
  consent_status TEXT,
  retention_period TEXT,
  delete_review_date DATE,
  export_restricted BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ma_privacy_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_privacy" ON public.ma_privacy_records FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_privacy_source ON public.ma_privacy_records(source_table, source_record_id);

-- Seed release gate checks
INSERT INTO public.ma_release_gate_checks (check_key, category, label, description, status, severity) VALUES
('db_tables_exist','infrastructure','Database tables exist','All ma_* tables present and reachable.','passing','critical'),
('rls_enabled','security','RLS / security enabled','Admin-only RLS on all ma_* tables.','passing','critical'),
('audit_logging','security','Audit logging enabled','Audit trail captured for high-risk actions.','manual_review','critical'),
('no_exposed_secrets','security','No exposed secrets','Secrets stored in Lovable Cloud, never in code.','passing','critical'),
('no_fake_data_live','data','No fake/test data in live mode','Test data flagged with is_test_data and purgeable.','manual_review','critical'),
('manuals_updated','documentation','Manuals updated','User and Technical manuals reflect current build.','manual_review','high'),
('source_governance','governance','Source governance working','do_not_store sources blocked at ingestion.','passing','critical'),
('approval_queue','governance','Approval queue working','High-risk actions routed via ma_approval_queue.','passing','critical'),
('data_room_controls','governance','Data-room controls working','Buyer/adviser sharing levels enforced.','passing','high'),
('valuation_assumptions','quality','Valuation assumptions labelled','All targets carry assumption + confidence.','manual_review','high'),
('evidence_backed','quality','AI recommendations evidence-backed','Recs include evidence + confidence + sources.','passing','critical'),
('paid_apis_disabled','security','Paid APIs disabled unless configured','Integration allowlist default = blocked.','passing','critical'),
('external_outreach_blocked','security','External outreach blocked unless approved','LOCKED_BY_DESIGN unless founder approves.','passing','critical'),
('backup_export_docs','resilience','Backup/export instructions present','Disaster recovery in Technical Manual.','passing','high'),
('error_queue','resilience','Error queue present','ma_error_queue captures failures.','passing','high'),
('risk_register','resilience','Risk register present','ma_incidents and strategic assumptions tracked.','passing','high'),
('test_live_mode','governance','Test/live mode visible','ma_environment_mode surfaced in UI.','passing','high')
ON CONFLICT (check_key) DO NOTHING;

-- Seed integration allowlist (all default blocked/not_configured)
INSERT INTO public.ma_integration_allowlist (integration_name, status, data_accessed, risk_rating, notes) VALUES
('Crunchbase','not_configured','Company / funding data','medium','Paid API — keep disabled until founder approves.'),
('Apollo','not_configured','Contact enrichment / personal data','high','Personal data — requires GDPR review.'),
('HubSpot','not_configured','CRM contacts and deals','high','Personal data — requires consent review.'),
('SimilarWeb','not_configured','Traffic / market signals','low','Aggregate market data only.'),
('Outreach Provider','blocked','Email sending','high','LOCKED_BY_DESIGN — no automated outreach.'),
('PDF Export Service','not_configured','Internal data only','medium','Founder-approved exports only.')
ON CONFLICT (integration_name) DO NOTHING;

-- Seed rate / cost limits
INSERT INTO public.ma_rate_cost_limits (scope, daily_limit, weekly_limit, monthly_spend_limit_usd, paid_api_call_limit, enrichment_limit, scheduled_job_limit, alert_threshold_pct) VALUES
('ai_recommendations',50,250,50.00,0,0,10,80),
('ai_red_team_reviews',20,100,25.00,0,0,5,80),
('paid_enrichment',0,0,0.00,0,0,0,80),
('scheduled_jobs',24,168,0.00,0,0,168,90)
ON CONFLICT (scope) DO NOTHING;

-- Seed lockdown controls (safe defaults — restrictive on)
INSERT INTO public.ma_lockdown_controls (control_key, label, description, enabled) VALUES
('pause_ai_recommendations','Pause AI recommendations','Halts orchestrator runs across all assets.',false),
('pause_scheduled_jobs','Pause scheduled jobs','Halts weekly briefings and scheduled imports.',false),
('lock_buyer_outreach','Lock buyer outreach','Blocks any buyer contact action.',true),
('lock_data_exports','Lock data exports','Blocks all export endpoints.',true),
('lock_paid_connectors','Lock paid connectors','Prevents activation of any paid API.',true),
('disable_external_integrations','Disable external integrations','Master kill-switch for all outbound integrations.',true),
('internal_test_only','Mark system internal-test-only','Adds banner: not for live decisions.',true),
('live_controlled_use','Mark system live-controlled-use','Live use under founder supervision.',false)
ON CONFLICT (control_key) DO NOTHING;
