
CREATE TABLE IF NOT EXISTS public.business_daily_operating_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  activation_record_id uuid,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  run_status text NOT NULL DEFAULT 'draft',
  run_type text NOT NULL DEFAULT 'daily_internal_operating_loop',
  provider_status text NOT NULL DEFAULT 'unknown',
  actions_loaded integer NOT NULL DEFAULT 0,
  actions_completed integer NOT NULL DEFAULT 0,
  actions_blocked integer NOT NULL DEFAULT 0,
  actions_parked integer NOT NULL DEFAULT 0,
  runbook_items_loaded integer NOT NULL DEFAULT 0,
  recommendations_created integer NOT NULL DEFAULT 0,
  drafts_created integer NOT NULL DEFAULT 0,
  founder_review_items_created integer NOT NULL DEFAULT 0,
  missing_context_count integer NOT NULL DEFAULT 0,
  risk_warning_count integer NOT NULL DEFAULT 0,
  external_actions_locked boolean NOT NULL DEFAULT true,
  auto_send_enabled boolean NOT NULL DEFAULT false,
  cron_enabled boolean NOT NULL DEFAULT false,
  internal_run_summary text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  no_forbidden_action_audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bdor_status_chk CHECK (run_status IN ('draft','previewed','completed','partial','blocked','failed')),
  CONSTRAINT bdor_external_locked CHECK (external_actions_locked = true),
  CONSTRAINT bdor_no_auto_send CHECK (auto_send_enabled = false),
  CONSTRAINT bdor_no_cron CHECK (cron_enabled = false)
);

CREATE INDEX IF NOT EXISTS bdor_business_idx ON public.business_daily_operating_runs(business_id);
CREATE INDEX IF NOT EXISTS bdor_activation_idx ON public.business_daily_operating_runs(activation_record_id);
CREATE INDEX IF NOT EXISTS bdor_run_date_idx ON public.business_daily_operating_runs(run_date);
CREATE INDEX IF NOT EXISTS bdor_status_idx ON public.business_daily_operating_runs(run_status);
CREATE INDEX IF NOT EXISTS bdor_created_idx ON public.business_daily_operating_runs(created_at DESC);

ALTER TABLE public.business_daily_operating_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bdor_founder_admin_all" ON public.business_daily_operating_runs;
CREATE POLICY "bdor_founder_admin_all" ON public.business_daily_operating_runs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS bdor_updated_at ON public.business_daily_operating_runs;
CREATE TRIGGER bdor_updated_at
BEFORE UPDATE ON public.business_daily_operating_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.business_daily_operating_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  daily_run_id uuid,
  activation_record_id uuid,
  source_action_id uuid,
  output_type text NOT NULL,
  output_status text NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  summary text,
  body text,
  structured_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_agent text,
  destination_module text,
  priority text NOT NULL DEFAULT 'normal',
  risk_level text NOT NULL DEFAULT 'low',
  requires_founder_review boolean NOT NULL DEFAULT true,
  external_action_required boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  founder_approval_id uuid,
  missing_context jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bdoo_output_type_chk CHECK (output_type IN ('daily_summary','recommendation','draft_review','founder_brief','knowledge_gap','social_draft_recommendation','support_draft_recommendation','customer_success_recommendation','revenue_recommendation','supplier_recommendation','compliance_warning','diagnostic_note','other')),
  CONSTRAINT bdoo_output_status_chk CHECK (output_status IN ('draft','needs_review','approved_internal','rejected','parked','archived')),
  CONSTRAINT bdoo_destination_chk CHECK (destination_module IS NULL OR destination_module IN ('command_centre','approvals','knowledge','social','support','customer_success','revenue','supplier','compliance','diagnostics','other')),
  CONSTRAINT bdoo_priority_chk CHECK (priority IN ('low','normal','high','urgent','critical')),
  CONSTRAINT bdoo_risk_chk CHECK (risk_level IN ('low','normal','high','critical')),
  CONSTRAINT bdoo_external_blocked CHECK (external_action_blocked = true)
);

CREATE INDEX IF NOT EXISTS bdoo_business_idx ON public.business_daily_operating_outputs(business_id);
CREATE INDEX IF NOT EXISTS bdoo_daily_run_idx ON public.business_daily_operating_outputs(daily_run_id);
CREATE INDEX IF NOT EXISTS bdoo_type_idx ON public.business_daily_operating_outputs(output_type);
CREATE INDEX IF NOT EXISTS bdoo_status_idx ON public.business_daily_operating_outputs(output_status);
CREATE INDEX IF NOT EXISTS bdoo_dest_idx ON public.business_daily_operating_outputs(destination_module);
CREATE INDEX IF NOT EXISTS bdoo_created_idx ON public.business_daily_operating_outputs(created_at DESC);

ALTER TABLE public.business_daily_operating_outputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bdoo_founder_admin_all" ON public.business_daily_operating_outputs;
CREATE POLICY "bdoo_founder_admin_all" ON public.business_daily_operating_outputs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS bdoo_updated_at ON public.business_daily_operating_outputs;
CREATE TRIGGER bdoo_updated_at
BEFORE UPDATE ON public.business_daily_operating_outputs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.founder_approval_types (type_key, label, description, default_priority, execution_enabled, auto_execute_allowed, active)
VALUES ('business_daily_operating_review','Business Daily Operating Review','Review the daily internal operating loop output for a business. No external action permitted.','normal',false,false,true)
ON CONFLICT (type_key) DO NOTHING;
