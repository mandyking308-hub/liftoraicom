
CREATE TABLE IF NOT EXISTS public.business_external_activation_readiness_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  activation_record_id uuid,
  latest_weekly_review_id uuid,
  run_status text NOT NULL DEFAULT 'draft',
  readiness_mode text NOT NULL DEFAULT 'controlled_external_readiness',
  provider_status text NOT NULL DEFAULT 'unknown',
  internal_ready boolean NOT NULL DEFAULT false,
  external_ready boolean NOT NULL DEFAULT false,
  external_activation_allowed boolean NOT NULL DEFAULT false,
  all_external_gates_locked boolean NOT NULL DEFAULT true,
  compliance_ready boolean NOT NULL DEFAULT false,
  crm_ready boolean NOT NULL DEFAULT false,
  knowledge_ready boolean NOT NULL DEFAULT false,
  draft_assets_ready boolean NOT NULL DEFAULT false,
  provider_lanes_ready boolean NOT NULL DEFAULT false,
  founder_approval_ready boolean NOT NULL DEFAULT false,
  readiness_score integer NOT NULL DEFAULT 0,
  blocker_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  channel_count integer NOT NULL DEFAULT 0,
  channels_ready integer NOT NULL DEFAULT 0,
  channels_blocked integer NOT NULL DEFAULT 0,
  channels_warning integer NOT NULL DEFAULT 0,
  recommended_first_batch_size integer NOT NULL DEFAULT 0,
  recommended_mode text NOT NULL DEFAULT 'do_not_activate_yet',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  no_forbidden_action_audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bear_status_chk CHECK (run_status IN ('draft','previewed','completed','partial','blocked','failed')),
  CONSTRAINT bear_mode_chk CHECK (recommended_mode IN ('do_not_activate_yet','internal_only','ready_for_founder_review','ready_for_controlled_micro_batch_later','blocked')),
  CONSTRAINT bear_ext_alw_chk CHECK (external_activation_allowed = false),
  CONSTRAINT bear_ext_ready_chk CHECK (external_ready = false),
  CONSTRAINT bear_gates_locked_chk CHECK (all_external_gates_locked = true)
);

CREATE INDEX IF NOT EXISTS bear_business_idx ON public.business_external_activation_readiness_runs(business_id);
CREATE INDEX IF NOT EXISTS bear_activation_idx ON public.business_external_activation_readiness_runs(activation_record_id);
CREATE INDEX IF NOT EXISTS bear_status_idx ON public.business_external_activation_readiness_runs(run_status);
CREATE INDEX IF NOT EXISTS bear_score_idx ON public.business_external_activation_readiness_runs(readiness_score);
CREATE INDEX IF NOT EXISTS bear_created_idx ON public.business_external_activation_readiness_runs(created_at DESC);

ALTER TABLE public.business_external_activation_readiness_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bear_founder_admin_all" ON public.business_external_activation_readiness_runs;
CREATE POLICY "bear_founder_admin_all" ON public.business_external_activation_readiness_runs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS bear_updated_at ON public.business_external_activation_readiness_runs;
CREATE TRIGGER bear_updated_at BEFORE UPDATE ON public.business_external_activation_readiness_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.business_external_activation_channel_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  readiness_run_id uuid,
  channel_key text NOT NULL,
  channel_name text NOT NULL,
  channel_status text NOT NULL DEFAULT 'blocked',
  provider_key text,
  provider_status text NOT NULL DEFAULT 'unknown',
  gate_key text,
  gate_exists boolean NOT NULL DEFAULT false,
  gate_enabled boolean NOT NULL DEFAULT false,
  gate_locked boolean NOT NULL DEFAULT true,
  secret_required boolean NOT NULL DEFAULT false,
  secret_present boolean NOT NULL DEFAULT false,
  secret_value_returned boolean NOT NULL DEFAULT false,
  batch_limit integer NOT NULL DEFAULT 0,
  recommended_first_batch_size integer NOT NULL DEFAULT 0,
  confirmation_phrase text,
  compliance_ready boolean NOT NULL DEFAULT false,
  draft_ready boolean NOT NULL DEFAULT false,
  crm_ready boolean NOT NULL DEFAULT false,
  webhook_ready boolean NOT NULL DEFAULT false,
  tracking_disclosure_ready boolean NOT NULL DEFAULT false,
  unsubscribe_ready boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  founder_approval_present boolean NOT NULL DEFAULT false,
  blocker_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_safe_action text,
  external_action_blocked boolean NOT NULL DEFAULT true,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beacc_status_chk CHECK (channel_status IN ('ready_for_founder_review','warning','blocked','not_configured','not_applicable')),
  CONSTRAINT beacc_secret_value_chk CHECK (secret_value_returned = false),
  CONSTRAINT beacc_external_blocked_chk CHECK (external_action_blocked = true)
);

CREATE INDEX IF NOT EXISTS beacc_business_idx ON public.business_external_activation_channel_checks(business_id);
CREATE INDEX IF NOT EXISTS beacc_run_idx ON public.business_external_activation_channel_checks(readiness_run_id);
CREATE INDEX IF NOT EXISTS beacc_channel_idx ON public.business_external_activation_channel_checks(channel_key);
CREATE INDEX IF NOT EXISTS beacc_status_idx ON public.business_external_activation_channel_checks(channel_status);
CREATE INDEX IF NOT EXISTS beacc_gate_idx ON public.business_external_activation_channel_checks(gate_key);
CREATE INDEX IF NOT EXISTS beacc_created_idx ON public.business_external_activation_channel_checks(created_at DESC);

ALTER TABLE public.business_external_activation_channel_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "beacc_founder_admin_all" ON public.business_external_activation_channel_checks;
CREATE POLICY "beacc_founder_admin_all" ON public.business_external_activation_channel_checks
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS beacc_updated_at ON public.business_external_activation_channel_checks;
CREATE TRIGGER beacc_updated_at BEFORE UPDATE ON public.business_external_activation_channel_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.business_external_activation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  readiness_run_id uuid,
  plan_status text NOT NULL DEFAULT 'draft',
  plan_type text NOT NULL DEFAULT 'controlled_micro_batch',
  plan_title text NOT NULL,
  plan_summary text,
  recommended_sequence jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_founder_decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_provider_setup jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_compliance_fixes jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_crm_fixes jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_draft_reviews jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  ready_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_first_batch integer NOT NULL DEFAULT 0,
  rollback_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  stop_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_activation_allowed boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  founder_review_required boolean NOT NULL DEFAULT true,
  founder_approval_id uuid,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beap_status_chk CHECK (plan_status IN ('draft','needs_review','approved_internal','blocked','archived')),
  CONSTRAINT beap_ext_alw_chk CHECK (external_activation_allowed = false),
  CONSTRAINT beap_ext_blocked_chk CHECK (external_action_blocked = true)
);

CREATE INDEX IF NOT EXISTS beap_business_idx ON public.business_external_activation_plans(business_id);
CREATE INDEX IF NOT EXISTS beap_run_idx ON public.business_external_activation_plans(readiness_run_id);
CREATE INDEX IF NOT EXISTS beap_status_idx ON public.business_external_activation_plans(plan_status);
CREATE INDEX IF NOT EXISTS beap_type_idx ON public.business_external_activation_plans(plan_type);
CREATE INDEX IF NOT EXISTS beap_created_idx ON public.business_external_activation_plans(created_at DESC);

ALTER TABLE public.business_external_activation_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "beap_founder_admin_all" ON public.business_external_activation_plans;
CREATE POLICY "beap_founder_admin_all" ON public.business_external_activation_plans
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS beap_updated_at ON public.business_external_activation_plans;
CREATE TRIGGER beap_updated_at BEFORE UPDATE ON public.business_external_activation_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.founder_approval_types (type_key, label, description, default_priority, execution_enabled, auto_execute_allowed, active)
VALUES ('controlled_external_activation_readiness_review','Controlled External Activation Readiness Review','Review channel-by-channel readiness and the controlled micro-batch activation plan for a business. No gate enable, no external action permitted.','normal',false,false,true)
ON CONFLICT (type_key) DO NOTHING;
