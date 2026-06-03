-- 1. Acquisition opportunities
CREATE TABLE public.distressed_acquisition_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_name TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  country TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  distress_type TEXT NOT NULL DEFAULT 'unknown',
  asking_price NUMERIC,
  revenue_ttm NUMERIC,
  profit_ttm NUMERIC,
  monthly_recurring_revenue NUMERIC,
  annual_recurring_revenue NUMERIC,
  customer_count INTEGER,
  user_count INTEGER,
  email_list_size INTEGER,
  social_following INTEGER,
  domain_strength INTEGER,
  trademark_status TEXT,
  ip_assets TEXT,
  code_assets TEXT,
  customer_data_status TEXT,
  operational_complexity INTEGER,
  founder_dependency INTEGER,
  liftor_advantage_notes TEXT,
  liftor_fit_score INTEGER,
  brand_value_score INTEGER,
  replacement_cost_score INTEGER,
  turnaround_score INTEGER,
  legal_risk_score INTEGER,
  financing_feasibility_score INTEGER,
  exit_route_score INTEGER,
  overall_priority_score INTEGER,
  financing_required NUMERIC,
  recommended_structure TEXT NOT NULL DEFAULT 'do_not_buy',
  recommended_action TEXT NOT NULL DEFAULT 'watch',
  notes TEXT,
  next_action TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  founder_approved BOOLEAN NOT NULL DEFAULT false,
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distressed_acquisition_opportunities TO authenticated;
GRANT ALL ON public.distressed_acquisition_opportunities TO service_role;
ALTER TABLE public.distressed_acquisition_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage acquisition opportunities"
  ON public.distressed_acquisition_opportunities FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Disposal assets
CREATE TABLE public.distressed_disposal_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  build_status TEXT,
  revenue_status TEXT,
  reason_for_disposal TEXT,
  sale_route TEXT NOT NULL DEFAULT 'do_not_sell',
  asking_price_estimate NUMERIC,
  evidence_pack_status TEXT NOT NULL DEFAULT 'missing',
  handover_docs_status TEXT NOT NULL DEFAULT 'missing',
  code_ip_status TEXT,
  customer_data_status TEXT,
  compliance_risk TEXT,
  recommended_action TEXT NOT NULL DEFAULT 'hold',
  notes TEXT,
  founder_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distressed_disposal_assets TO authenticated;
GRANT ALL ON public.distressed_disposal_assets TO service_role;
ALTER TABLE public.distressed_disposal_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage disposal assets"
  ON public.distressed_disposal_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Financing options
CREATE TABLE public.distressed_deal_financing_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.distressed_acquisition_opportunities(id) ON DELETE CASCADE,
  structure TEXT NOT NULL,
  feasibility_score INTEGER,
  estimated_capital NUMERIC,
  estimated_term_months INTEGER,
  notes TEXT,
  recommended BOOLEAN NOT NULL DEFAULT false,
  founder_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distressed_deal_financing_options TO authenticated;
GRANT ALL ON public.distressed_deal_financing_options TO service_role;
ALTER TABLE public.distressed_deal_financing_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage deal financing"
  ON public.distressed_deal_financing_options FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER distressed_acq_updated BEFORE UPDATE ON public.distressed_acquisition_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER distressed_disp_updated BEFORE UPDATE ON public.distressed_disposal_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER distressed_fin_updated BEFORE UPDATE ON public.distressed_deal_financing_options
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_distressed_acq_priority ON public.distressed_acquisition_opportunities(overall_priority_score DESC NULLS LAST);
CREATE INDEX idx_distressed_acq_action ON public.distressed_acquisition_opportunities(recommended_action);
CREATE INDEX idx_distressed_fin_opp ON public.distressed_deal_financing_options(opportunity_id);