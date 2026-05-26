
-- =========================================================
-- Scheduled Jobs / Automation Control Centre
-- =========================================================

CREATE TABLE IF NOT EXISTS public.scheduled_job_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  job_code TEXT NOT NULL UNIQUE,
  job_category TEXT NOT NULL DEFAULT 'other',
  schedule_cron TEXT NOT NULL DEFAULT '0 6 * * *',
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  owner_module TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  external_action_possible BOOLEAN NOT NULL DEFAULT false,
  external_action_allowed BOOLEAN NOT NULL DEFAULT false,
  founder_approval_required_for_external BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_job_definitions TO authenticated;
GRANT ALL ON public.scheduled_job_definitions TO service_role;

ALTER TABLE public.scheduled_job_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view scheduled jobs" ON public.scheduled_job_definitions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders manage scheduled jobs" ON public.scheduled_job_definitions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_scheduled_job_definitions_updated
  BEFORE UPDATE ON public.scheduled_job_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scheduled_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_definition_id UUID NOT NULL REFERENCES public.scheduled_job_definitions(id) ON DELETE CASCADE,
  run_status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  output_summary TEXT,
  failure_reason TEXT,
  created_work_items_count INTEGER NOT NULL DEFAULT 0,
  created_notifications_count INTEGER NOT NULL DEFAULT 0,
  external_actions_attempted_count INTEGER NOT NULL DEFAULT 0,
  external_actions_blocked_count INTEGER NOT NULL DEFAULT 0,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_job_runs TO authenticated;
GRANT ALL ON public.scheduled_job_runs TO service_role;

ALTER TABLE public.scheduled_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view scheduled job runs" ON public.scheduled_job_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders manage scheduled job runs" ON public.scheduled_job_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_job_runs_def ON public.scheduled_job_runs(job_definition_id);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON public.scheduled_job_runs(run_status);
CREATE INDEX IF NOT EXISTS idx_job_runs_started ON public.scheduled_job_runs(started_at DESC);

CREATE TRIGGER trg_scheduled_job_runs_updated
  BEFORE UPDATE ON public.scheduled_job_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scheduled_job_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_definition_id UUID NOT NULL REFERENCES public.scheduled_job_definitions(id) ON DELETE CASCADE,
  job_run_id UUID REFERENCES public.scheduled_job_runs(id) ON DELETE SET NULL,
  failure_type TEXT NOT NULL DEFAULT 'unknown',
  failure_summary TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_job_failures TO authenticated;
GRANT ALL ON public.scheduled_job_failures TO service_role;

ALTER TABLE public.scheduled_job_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view scheduled job failures" ON public.scheduled_job_failures
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders manage scheduled job failures" ON public.scheduled_job_failures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_job_failures_def ON public.scheduled_job_failures(job_definition_id);
CREATE INDEX IF NOT EXISTS idx_job_failures_status ON public.scheduled_job_failures(status);

CREATE TRIGGER trg_scheduled_job_failures_updated
  BEFORE UPDATE ON public.scheduled_job_failures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- Seed canonical job definitions
-- ---------------------------------------------------------

INSERT INTO public.scheduled_job_definitions (job_name, job_code, job_category, schedule_cron, owner_module, description, external_action_possible)
VALUES
 ('Daily Founder Cockpit Refresh',     'daily_founder_cockpit_refresh',     'daily',      '0 5 * * *',  'command_centre',     'Refreshes founder cockpit metrics and rollups.', false),
 ('Daily Master Work Queue Sync',      'daily_master_work_queue_sync',      'daily',      '5 5 * * *',  'master_work_queue',  'Re-prioritises master work queue and rolls up cross-module items.', false),
 ('Daily Notification Digest',         'daily_notification_digest_internal','daily',      '15 7 * * *', 'notifications',      'Builds internal notification digest. Internal only.', false),
 ('Daily AI Gateway Health Scan',      'daily_ai_gateway_health_scan',      'monitoring', '20 5 * * *', 'ai_eval',            'Scans AI gateway health, error rates and cost anomalies.', false),
 ('Daily Data Quality Scan',           'daily_data_quality_scan',           'daily',      '30 5 * * *', 'data_quality',       'Scans data freshness, completeness and anomalies.', false),
 ('Daily Support SLA Scan',            'daily_support_sla_scan',            'daily',      '0 6 * * *',  'support_sla',        'Flags breached / at-risk support SLAs.', false),
 ('Daily Privacy Deadline Scan',       'daily_privacy_deadline_scan',       'privacy',    '10 6 * * *', 'privacy_ops',        'Scans privacy / DSAR deadlines and consent expiries.', false),
 ('Daily Incident Scan',               'daily_incident_scan',               'monitoring', '20 6 * * *', 'incident',           'Scans open incidents and overdue postmortems.', false),
 ('Daily Vendor Renewal Scan',         'daily_vendor_renewal_scan',         'compliance', '30 6 * * *', 'vendors',            'Flags upcoming vendor renewals and price changes.', false),
 ('Daily Capacity Scan',               'daily_capacity_scan',               'daily',      '40 6 * * *', 'capacity',           'Reviews capacity utilisation against demand.', false),
 ('Daily Marketplace Liquidity Scan',  'daily_marketplace_liquidity_scan',  'marketplace','50 6 * * *', 'marketplace',        'Scans marketplace liquidity, fill rate and dead inventory.', false),
 ('Weekly Founder Report Draft',       'weekly_founder_report_draft',       'weekly',     '0 7 * * 1',  'reporting',          'Drafts weekly founder report. Internal draft only.', false),
 ('Weekly AI Eval Run',                'weekly_ai_eval_run',                'ai_eval',    '0 8 * * 1',  'ai_eval',            'Runs weekly AI evaluation suite.', false),
 ('Weekly Portfolio Priority Score',   'weekly_portfolio_priority_score',   'weekly',     '0 9 * * 1',  'portfolio',          'Rescores portfolio priorities.', false),
 ('Weekly Risk Matrix Refresh',        'weekly_risk_matrix_refresh',        'weekly',     '30 9 * * 1', 'portfolio_risk',     'Refreshes portfolio risk matrix.', false),
 ('Monthly Finance Pack Draft',        'monthly_finance_pack_draft',        'finance',    '0 7 1 * *',  'finance',            'Drafts monthly finance pack. Internal draft only.', false),
 ('Monthly Adviser Pack Draft',        'monthly_adviser_pack_draft',        'reporting',  '0 8 1 * *',  'adviser_pack',       'Drafts monthly adviser pack. Internal draft only.', false),
 ('Monthly SOP Stale Scan',            'monthly_sop_stale_scan',            'compliance', '0 9 1 * *',  'sop_engine',         'Scans stale / overdue SOPs and playbooks.', false),
 ('Monthly Backup Status Review',      'monthly_backup_status_review',      'monitoring', '0 10 1 * *', 'backup_recovery',    'Reviews backup status across all critical systems.', false)
ON CONFLICT (job_code) DO NOTHING;
