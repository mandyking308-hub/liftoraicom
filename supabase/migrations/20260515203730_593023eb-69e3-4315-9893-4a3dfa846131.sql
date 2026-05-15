-- Prompt 102A: Rehearsal Data Registry + Cleanliness

CREATE TABLE public.rehearsal_data_registry (
  id uuid primary key default gen_random_uuid(),
  rehearsal_run_id uuid not null,
  business_id uuid not null,
  source_table text not null,
  source_id uuid not null,
  record_label text,
  data_type text,
  purge_action text not null default 'delete',
  purge_status text not null default 'pending',
  purged_at timestamptz,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_rdr_run ON public.rehearsal_data_registry(rehearsal_run_id);
CREATE INDEX idx_rdr_business ON public.rehearsal_data_registry(business_id);
CREATE INDEX idx_rdr_status ON public.rehearsal_data_registry(purge_status);
ALTER TABLE public.rehearsal_data_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all rdr" ON public.rehearsal_data_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.rehearsal_cleanliness_checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  rehearsal_run_id uuid,
  check_status text not null default 'not_checked',
  test_records_remaining integer not null default 0,
  suspicious_records integer not null default 0,
  real_mode_ready boolean not null default false,
  blockers jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
CREATE INDEX idx_rcc_business ON public.rehearsal_cleanliness_checks(business_id);
ALTER TABLE public.rehearsal_cleanliness_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all rcc" ON public.rehearsal_cleanliness_checks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- Add convenience flags to rehearsal scenarios (test_data_only already on runs)
ALTER TABLE public.business_rehearsal_scenarios
  ADD COLUMN IF NOT EXISTS is_test_data boolean not null default true,
  ADD COLUMN IF NOT EXISTS simulation_source text not null default 'business_rehearsal',
  ADD COLUMN IF NOT EXISTS environment_mode text not null default 'simulation',
  ADD COLUMN IF NOT EXISTS created_by_rehearsal boolean not null default true;

ALTER TABLE public.business_rehearsal_runs
  ADD COLUMN IF NOT EXISTS environment_mode text not null default 'simulation',
  ADD COLUMN IF NOT EXISTS reset_status text not null default 'not_required',
  ADD COLUMN IF NOT EXISTS reset_completed_at timestamptz;