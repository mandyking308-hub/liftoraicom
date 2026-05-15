
CREATE TABLE IF NOT EXISTS public.group_risk_register (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  entity_id uuid,
  risk_title text not null,
  risk_category text not null,
  risk_description text,
  likelihood text,
  impact text,
  risk_score numeric,
  mitigation_plan text,
  owner_agent_key text,
  owner_person_id uuid,
  status text default 'open',
  review_due_at date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.insurance_policy_register (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid,
  business_id uuid,
  policy_type text not null,
  insurer_name text,
  broker_name text,
  policy_number text,
  coverage_summary text,
  renewal_date date,
  premium_amount numeric,
  currency text default 'GBP',
  policy_status text default 'active',
  document_id uuid,
  review_due_at date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.incident_register (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  entity_id uuid,
  incident_type text not null,
  incident_title text not null,
  incident_summary text,
  severity text default 'medium',
  status text default 'open',
  detected_at timestamptz default now(),
  resolved_at timestamptz,
  customer_impact boolean default false,
  data_impact boolean default false,
  financial_impact boolean default false,
  regulatory_review_required boolean default false,
  insurance_review_required boolean default false,
  founder_review_required boolean default true,
  root_cause text,
  corrective_actions jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.business_continuity_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  entity_id uuid,
  plan_name text not null,
  plan_status text default 'draft',
  critical_systems jsonb default '[]'::jsonb,
  backup_processes jsonb default '[]'::jsonb,
  key_contacts jsonb default '[]'::jsonb,
  recovery_steps jsonb default '[]'::jsonb,
  last_tested_at timestamptz,
  next_test_due_at date,
  founder_review_required boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE public.group_risk_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policy_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_continuity_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage risk register" ON public.group_risk_register FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Admins manage insurance" ON public.insurance_policy_register FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Admins manage incidents" ON public.incident_register FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Admins manage continuity" ON public.business_continuity_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_risk_status ON public.group_risk_register(status);
CREATE INDEX IF NOT EXISTS idx_risk_score ON public.group_risk_register(risk_score);
CREATE INDEX IF NOT EXISTS idx_insurance_renewal ON public.insurance_policy_register(renewal_date);
CREATE INDEX IF NOT EXISTS idx_incident_status ON public.incident_register(status);
CREATE INDEX IF NOT EXISTS idx_incident_severity ON public.incident_register(severity);
CREATE INDEX IF NOT EXISTS idx_bcp_test_due ON public.business_continuity_plans(next_test_due_at);
