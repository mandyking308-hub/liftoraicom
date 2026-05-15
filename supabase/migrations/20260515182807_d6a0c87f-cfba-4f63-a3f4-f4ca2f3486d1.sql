
CREATE TABLE IF NOT EXISTS public.contract_register (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid,
  business_id uuid references public.businesses(id) on delete set null,
  related_contact_id uuid,
  related_supplier_id uuid,
  contract_type text not null,
  contract_name text not null,
  counterparty_name text,
  status text default 'draft',
  effective_date date,
  expiry_date date,
  renewal_date date,
  termination_notice_days integer,
  value_estimate numeric,
  currency text default 'GBP',
  document_id uuid,
  signed boolean default false,
  founder_review_required boolean default true,
  legal_review_recommended boolean default false,
  risk_level text default 'medium',
  key_terms_summary text,
  obligations jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.procurement_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  entity_id uuid,
  request_name text not null,
  request_type text not null,
  supplier_id uuid,
  estimated_cost numeric,
  currency text default 'GBP',
  business_reason text,
  status text default 'draft',
  founder_approval_required boolean default true,
  approved_at timestamptz,
  rejected_at timestamptz,
  contract_required boolean default false,
  risk_level text default 'medium',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.supplier_risk_reviews (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  business_id uuid,
  review_status text default 'draft',
  performance_score numeric,
  reliability_score numeric,
  cost_score numeric,
  compliance_score numeric,
  capacity_score numeric,
  risk_level text default 'medium',
  risks jsonb default '[]'::jsonb,
  recommended_action text,
  backup_supplier_needed boolean default false,
  founder_review_required boolean default true,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE public.contract_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_risk_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage contracts" ON public.contract_register FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage procurement" ON public.procurement_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage supplier risk" ON public.supplier_risk_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_contract_register_status ON public.contract_register(status);
CREATE INDEX IF NOT EXISTS idx_contract_register_renewal ON public.contract_register(renewal_date);
CREATE INDEX IF NOT EXISTS idx_contract_register_expiry ON public.contract_register(expiry_date);
CREATE INDEX IF NOT EXISTS idx_contract_register_supplier ON public.contract_register(related_supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_status ON public.procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_procurement_supplier ON public.procurement_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_risk_supplier ON public.supplier_risk_reviews(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_risk_level ON public.supplier_risk_reviews(risk_level);
