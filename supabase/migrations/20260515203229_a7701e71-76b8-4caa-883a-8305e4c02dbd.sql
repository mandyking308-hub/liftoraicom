-- Prompt 102: Business Rehearsal / Simulation + Operator Training

CREATE TABLE public.business_rehearsal_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  rehearsal_name text not null,
  rehearsal_type text not null,
  rehearsal_status text not null default 'draft',
  scenario_pack text,
  test_data_only boolean not null default true,
  started_at timestamptz,
  completed_at timestamptz,
  readiness_score numeric,
  pass_fail_status text not null default 'not_run',
  blockers jsonb not null default '[]'::jsonb,
  results_summary text,
  founder_review_required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_brr_business ON public.business_rehearsal_runs(business_id);
ALTER TABLE public.business_rehearsal_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all brr" ON public.business_rehearsal_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_brr_updated BEFORE UPDATE ON public.business_rehearsal_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.business_rehearsal_scenarios (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  rehearsal_run_id uuid references public.business_rehearsal_runs(id) on delete cascade,
  scenario_key text not null,
  scenario_title text not null,
  scenario_description text,
  scenario_stage text not null,
  expected_agent_key text,
  expected_output text,
  scenario_status text not null default 'pending',
  test_contact_id uuid,
  result_summary text,
  passed boolean not null default false,
  blockers jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_brs_run ON public.business_rehearsal_scenarios(rehearsal_run_id);
CREATE INDEX idx_brs_business ON public.business_rehearsal_scenarios(business_id);
ALTER TABLE public.business_rehearsal_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all brs" ON public.business_rehearsal_scenarios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_brs_updated BEFORE UPDATE ON public.business_rehearsal_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.operator_training_checklists (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  checklist_name text not null,
  operator_name text,
  checklist_status text not null default 'draft',
  training_area text not null,
  tasks jsonb not null default '[]'::jsonb,
  completed_tasks jsonb not null default '[]'::jsonb,
  confidence_score numeric,
  signed_off_at timestamptz,
  founder_review_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_otc_business ON public.operator_training_checklists(business_id);
ALTER TABLE public.operator_training_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all otc" ON public.operator_training_checklists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_otc_updated BEFORE UPDATE ON public.operator_training_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();