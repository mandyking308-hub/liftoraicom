
CREATE TABLE IF NOT EXISTS public.business_weekly_review_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  activation_record_id uuid,
  week_start date NOT NULL,
  week_end date NOT NULL,
  run_status text NOT NULL DEFAULT 'draft',
  provider_status text NOT NULL DEFAULT 'unknown',
  daily_runs_reviewed integer NOT NULL DEFAULT 0,
  daily_actions_reviewed integer NOT NULL DEFAULT 0,
  outputs_reviewed integer NOT NULL DEFAULT 0,
  completed_actions integer NOT NULL DEFAULT 0,
  blocked_actions integer NOT NULL DEFAULT 0,
  parked_actions integer NOT NULL DEFAULT 0,
  founder_reviews_open integer NOT NULL DEFAULT 0,
  missing_context_count integer NOT NULL DEFAULT 0,
  risk_warning_count integer NOT NULL DEFAULT 0,
  recommendations_created integer NOT NULL DEFAULT 0,
  score_overall integer NOT NULL DEFAULT 0,
  score_readiness integer NOT NULL DEFAULT 0,
  score_knowledge integer NOT NULL DEFAULT 0,
  score_content integer NOT NULL DEFAULT 0,
  score_customer integer NOT NULL DEFAULT 0,
  score_revenue integer NOT NULL DEFAULT 0,
  score_operations integer NOT NULL DEFAULT 0,
  internal_ready boolean NOT NULL DEFAULT false,
  external_ready boolean NOT NULL DEFAULT false,
  external_actions_locked boolean NOT NULL DEFAULT true,
  weekly_summary text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  no_forbidden_action_audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bwrr_status_chk CHECK (run_status IN ('draft','previewed','completed','partial','blocked','failed')),
  CONSTRAINT bwrr_external_ready_chk CHECK (external_ready = false),
  CONSTRAINT bwrr_external_locked_chk CHECK (external_actions_locked = true)
);

CREATE INDEX IF NOT EXISTS bwrr_business_idx ON public.business_weekly_review_runs(business_id);
CREATE INDEX IF NOT EXISTS bwrr_activation_idx ON public.business_weekly_review_runs(activation_record_id);
CREATE INDEX IF NOT EXISTS bwrr_week_start_idx ON public.business_weekly_review_runs(week_start);
CREATE INDEX IF NOT EXISTS bwrr_week_end_idx ON public.business_weekly_review_runs(week_end);
CREATE INDEX IF NOT EXISTS bwrr_status_idx ON public.business_weekly_review_runs(run_status);
CREATE INDEX IF NOT EXISTS bwrr_created_idx ON public.business_weekly_review_runs(created_at DESC);

ALTER TABLE public.business_weekly_review_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bwrr_founder_admin_all" ON public.business_weekly_review_runs;
CREATE POLICY "bwrr_founder_admin_all" ON public.business_weekly_review_runs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS bwrr_updated_at ON public.business_weekly_review_runs;
CREATE TRIGGER bwrr_updated_at
BEFORE UPDATE ON public.business_weekly_review_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.business_weekly_review_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  weekly_review_run_id uuid,
  activation_record_id uuid,
  output_type text NOT NULL,
  output_status text NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  summary text,
  body text,
  structured_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'normal',
  risk_level text NOT NULL DEFAULT 'low',
  owner_agent text,
  destination_module text,
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
  CONSTRAINT bwro_output_type_chk CHECK (output_type IN ('weekly_summary','optimisation_recommendation','knowledge_gap','readiness_gap','draft_quality_issue','revenue_recommendation','social_content_recommendation','support_recommendation','customer_success_recommendation','crm_memory_gap','compliance_warning','founder_decision_needed','next_week_plan','diagnostic_note','other')),
  CONSTRAINT bwro_output_status_chk CHECK (output_status IN ('draft','needs_review','approved_internal','rejected','parked','archived')),
  CONSTRAINT bwro_destination_chk CHECK (destination_module IS NULL OR destination_module IN ('command_centre','approvals','knowledge','social','support','customer_success','revenue','crm','supplier','compliance','diagnostics','other')),
  CONSTRAINT bwro_priority_chk CHECK (priority IN ('low','normal','high','urgent','critical')),
  CONSTRAINT bwro_risk_chk CHECK (risk_level IN ('low','normal','high','critical')),
  CONSTRAINT bwro_external_blocked_chk CHECK (external_action_blocked = true)
);

CREATE INDEX IF NOT EXISTS bwro_business_idx ON public.business_weekly_review_outputs(business_id);
CREATE INDEX IF NOT EXISTS bwro_weekly_run_idx ON public.business_weekly_review_outputs(weekly_review_run_id);
CREATE INDEX IF NOT EXISTS bwro_type_idx ON public.business_weekly_review_outputs(output_type);
CREATE INDEX IF NOT EXISTS bwro_status_idx ON public.business_weekly_review_outputs(output_status);
CREATE INDEX IF NOT EXISTS bwro_dest_idx ON public.business_weekly_review_outputs(destination_module);
CREATE INDEX IF NOT EXISTS bwro_priority_idx ON public.business_weekly_review_outputs(priority);
CREATE INDEX IF NOT EXISTS bwro_created_idx ON public.business_weekly_review_outputs(created_at DESC);

ALTER TABLE public.business_weekly_review_outputs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bwro_founder_admin_all" ON public.business_weekly_review_outputs;
CREATE POLICY "bwro_founder_admin_all" ON public.business_weekly_review_outputs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS bwro_updated_at ON public.business_weekly_review_outputs;
CREATE TRIGGER bwro_updated_at
BEFORE UPDATE ON public.business_weekly_review_outputs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.founder_approval_types (type_key, label, description, default_priority, execution_enabled, auto_execute_allowed, active)
VALUES ('business_weekly_review','Business Weekly Review','Review the weekly internal scorecard, blockers and optimisation recommendations for a business. No external action permitted.','normal',false,false,true)
ON CONFLICT (type_key) DO NOTHING;
