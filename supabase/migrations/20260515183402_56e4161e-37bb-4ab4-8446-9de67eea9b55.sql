
CREATE TABLE IF NOT EXISTS public.people_register (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  email text,
  role_type text not null,
  relationship_type text,
  business_id uuid,
  entity_id uuid,
  status text default 'active',
  start_date date,
  end_date date,
  nda_status text default 'not_checked',
  contract_status text default 'not_checked',
  data_access_level text default 'none',
  system_access_required boolean default false,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.access_review_items (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people_register(id) on delete cascade,
  system_name text not null,
  access_type text,
  access_status text default 'not_checked',
  business_id uuid,
  risk_level text default 'medium',
  last_reviewed_at timestamptz,
  next_review_due_at date,
  founder_review_required boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.training_sop_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  sop_name text not null,
  sop_category text,
  sop_status text default 'draft',
  sop_content text,
  assigned_to_person_id uuid,
  training_required boolean default false,
  training_completed_at timestamptz,
  review_due_at date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE public.people_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sop_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage people register" ON public.people_register FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage access review" ON public.access_review_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage training sops" ON public.training_sop_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_people_status ON public.people_register(status);
CREATE INDEX IF NOT EXISTS idx_people_role ON public.people_register(role_type);
CREATE INDEX IF NOT EXISTS idx_access_review_due ON public.access_review_items(next_review_due_at);
CREATE INDEX IF NOT EXISTS idx_access_review_person ON public.access_review_items(person_id);
CREATE INDEX IF NOT EXISTS idx_training_due ON public.training_sop_records(review_due_at);
CREATE INDEX IF NOT EXISTS idx_training_person ON public.training_sop_records(assigned_to_person_id);
