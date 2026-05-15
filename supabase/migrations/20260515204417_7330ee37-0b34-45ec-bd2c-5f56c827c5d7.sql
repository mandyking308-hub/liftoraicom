-- Prompt 102B: Pre-Live Baseline + Operating Standards + Change Log

CREATE TABLE public.business_pre_live_baselines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  baseline_name text not null,
  baseline_status text not null default 'draft',
  operating_mode text,
  rehearsal_reset_completed boolean not null default false,
  clean_real_mode_confirmed boolean not null default false,
  command_centre_ready boolean not null default false,
  user_manual_ready boolean not null default false,
  technical_manual_ready boolean not null default false,
  business_training_ready boolean not null default false,
  starter_pack_ready boolean not null default false,
  templates_approved boolean not null default false,
  external_gates_locked boolean not null default true,
  integrations_checked boolean not null default false,
  data_import_checked boolean not null default false,
  crm_memory_checked boolean not null default false,
  agents_checked boolean not null default false,
  customer_journey_checked boolean not null default false,
  human_layer_checked boolean not null default false,
  revenue_flow_checked boolean not null default false,
  support_recovery_checked boolean not null default false,
  social_marketing_checked boolean not null default false,
  risk_security_checked boolean not null default false,
  baseline_summary text,
  readiness_score numeric,
  blockers jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  approved_by_founder boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_bplb_business ON public.business_pre_live_baselines(business_id);
ALTER TABLE public.business_pre_live_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all bplb" ON public.business_pre_live_baselines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_bplb_updated BEFORE UPDATE ON public.business_pre_live_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.business_operating_standards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  standards_status text not null default 'draft',
  standard_response_time_hours integer,
  high_priority_response_time_hours integer,
  complaint_acknowledgement_hours integer,
  complaint_resolution_target_days integer,
  support_response_time_hours integer,
  onboarding_first_checkin_days integer,
  bedding_in_checkin_days integer,
  quarterly_report_cadence text not null default 'quarterly',
  renewal_checkin_days_before integer,
  winback_after_inactive_days integer,
  escalation_rules jsonb not null default '[]'::jsonb,
  owner_agent_rules jsonb not null default '[]'::jsonb,
  founder_review_required boolean not null default true,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_bos_business ON public.business_operating_standards(business_id);
ALTER TABLE public.business_operating_standards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all bos" ON public.business_operating_standards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_bos_updated BEFORE UPDATE ON public.business_operating_standards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.baseline_change_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  baseline_id uuid references public.business_pre_live_baselines(id) on delete set null,
  change_type text not null,
  source_table text,
  source_id uuid,
  change_summary text,
  before_snapshot jsonb not null default '{}'::jsonb,
  after_snapshot jsonb not null default '{}'::jsonb,
  changed_by text,
  change_risk text not null default 'medium',
  rollback_possible boolean not null default false,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_bcl_business ON public.baseline_change_log(business_id);
CREATE INDEX idx_bcl_baseline ON public.baseline_change_log(baseline_id);
ALTER TABLE public.baseline_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all bcl" ON public.baseline_change_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));