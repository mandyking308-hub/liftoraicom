
CREATE TABLE public.operating_cost_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  entity_id uuid,
  cost_category text NOT NULL,
  vendor_name text,
  cost_name text NOT NULL,
  amount numeric,
  currency text DEFAULT 'GBP',
  billing_frequency text,
  next_billing_date date,
  status text DEFAULT 'active',
  owner_module text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.usage_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  provider_key text NOT NULL,
  usage_type text NOT NULL,
  credits_used numeric DEFAULT 0,
  estimated_cost numeric,
  currency text DEFAULT 'GBP',
  source_table text,
  source_id uuid,
  used_at timestamptz DEFAULT now(),
  founder_approval_required boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.business_margin_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  revenue numeric DEFAULT 0,
  direct_costs numeric DEFAULT 0,
  software_costs numeric DEFAULT 0,
  supplier_costs numeric DEFAULT 0,
  estimated_gross_margin numeric,
  margin_status text,
  risk_flags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.operating_cost_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_margin_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage operating costs" ON public.operating_cost_register
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage credit ledger" ON public.usage_credit_ledger
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage margin snapshots" ON public.business_margin_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_operating_cost_register_updated_at
  BEFORE UPDATE ON public.operating_cost_register
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cost_status ON public.operating_cost_register(status);
CREATE INDEX idx_cost_category ON public.operating_cost_register(cost_category);
CREATE INDEX idx_cost_next_billing ON public.operating_cost_register(next_billing_date);
CREATE INDEX idx_usage_provider ON public.usage_credit_ledger(provider_key);
CREATE INDEX idx_usage_used_at ON public.usage_credit_ledger(used_at DESC);
CREATE INDEX idx_margin_business ON public.business_margin_snapshots(business_id);
