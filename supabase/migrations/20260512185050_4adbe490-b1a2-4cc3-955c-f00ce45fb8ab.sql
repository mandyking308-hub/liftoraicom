
CREATE TABLE IF NOT EXISTS public.business_autopilot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  auto_scan_imported_leads boolean NOT NULL DEFAULT true,
  auto_dedupe_apollo_leads boolean NOT NULL DEFAULT true,
  auto_crm_cross_check boolean NOT NULL DEFAULT true,
  auto_lifecycle_classify boolean NOT NULL DEFAULT true,
  auto_archive_duplicates boolean NOT NULL DEFAULT true,
  auto_archive_poor_fit boolean NOT NULL DEFAULT true,
  auto_hold_missing_email_old_pool boolean NOT NULL DEFAULT true,
  auto_build_unlock_shortlist boolean NOT NULL DEFAULT true,
  auto_promote_verified_qualified_leads boolean NOT NULL DEFAULT false,
  auto_enqueue_contacts boolean NOT NULL DEFAULT false,
  auto_unlock_apollo_emails boolean NOT NULL DEFAULT false,
  auto_send_live_batches boolean NOT NULL DEFAULT false,
  ai_classification_allowed boolean NOT NULL DEFAULT false,
  max_apollo_unlock_credits_without_founder_approval integer NOT NULL DEFAULT 0,
  stale_needs_verification_days integer NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_autopilot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage autopilot settings"
  ON public.business_autopilot_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'founder'::app_role));
CREATE TRIGGER trg_autopilot_settings_updated
  BEFORE UPDATE ON public.business_autopilot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.autopilot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  trigger text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  scanned_count integer NOT NULL DEFAULT 0,
  duplicates_collapsed integer NOT NULL DEFAULT 0,
  poor_fit_archived integer NOT NULL DEFAULT 0,
  missing_email_held integer NOT NULL DEFAULT 0,
  already_in_crm_matched integer NOT NULL DEFAULT 0,
  no_email_attempts_excluded integer NOT NULL DEFAULT 0,
  safe_to_unlock integer NOT NULL DEFAULT 0,
  safe_to_promote integer NOT NULL DEFAULT 0,
  safe_to_queue integer NOT NULL DEFAULT 0,
  decisions_created integer NOT NULL DEFAULT 0,
  source_quality_score numeric(4,2),
  next_recommended_action text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.autopilot_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read autopilot runs"
  ON public.autopilot_runs FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_autopilot_runs_created ON public.autopilot_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.founder_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  decision_type text NOT NULL,
  title text NOT NULL,
  finding text,
  recommendation text,
  cost_credit_impact text,
  risk text,
  status text NOT NULL DEFAULT 'pending',
  resolution_note text,
  related_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_run uuid REFERENCES public.autopilot_runs(id) ON DELETE SET NULL,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founder_decisions_status_chk CHECK (status IN ('pending','approved','rejected','hold'))
);
ALTER TABLE public.founder_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage decisions"
  ON public.founder_decisions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_founder_decisions_status ON public.founder_decisions(status, created_at DESC);
CREATE TRIGGER trg_founder_decisions_updated
  BEFORE UPDATE ON public.founder_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
