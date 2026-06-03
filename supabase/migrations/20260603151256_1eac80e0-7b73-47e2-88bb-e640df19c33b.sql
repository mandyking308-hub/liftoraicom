
-- ========== 1. Acquisition Opportunities ==========
CREATE TABLE public.acquisition_funding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_name TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  country TEXT,
  asking_price NUMERIC,
  revenue_ttm NUMERIC,
  profit_ttm NUMERIC,
  current_mrr NUMERIC,
  current_arr NUMERIC,
  customer_count INTEGER,
  user_count INTEGER,
  email_list_size INTEGER,
  social_following INTEGER,
  owner_reason_for_sale TEXT,
  distress_signal TEXT NOT NULL DEFAULT 'unknown',
  asset_quality_score INTEGER,
  brand_value_score INTEGER,
  liftor_fit_score INTEGER,
  turnaround_potential_score INTEGER,
  replacement_cost_score INTEGER,
  legal_risk_score INTEGER,
  overall_priority_score INTEGER,
  liftor_operating_advantage TEXT,
  recommended_action TEXT NOT NULL DEFAULT 'watch',
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  founder_approved BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_funding_opportunities TO authenticated;
GRANT ALL ON public.acquisition_funding_opportunities TO service_role;
ALTER TABLE public.acquisition_funding_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage acq funding opportunities" ON public.acquisition_funding_opportunities
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== 2. Funding Sources ==========
CREATE TABLE public.acquisition_funding_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funder_name TEXT NOT NULL,
  funder_type TEXT NOT NULL DEFAULT 'other',
  contact_name TEXT,
  contact_email TEXT,
  contact_url TEXT,
  geography TEXT,
  preferred_deal_size_min NUMERIC,
  preferred_deal_size_max NUMERIC,
  preferred_asset_type TEXT,
  accepts_pre_revenue BOOLEAN NOT NULL DEFAULT false,
  accepts_loss_making BOOLEAN NOT NULL DEFAULT false,
  requires_profitability BOOLEAN NOT NULL DEFAULT false,
  preferred_structure TEXT NOT NULL DEFAULT 'other',
  risk_appetite TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'not_contacted',
  notes TEXT,
  next_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_funding_sources TO authenticated;
GRANT ALL ON public.acquisition_funding_sources TO service_role;
ALTER TABLE public.acquisition_funding_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage acq funding sources" ON public.acquisition_funding_sources
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== 3. Deal Structures ==========
CREATE TABLE public.acquisition_funding_deal_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.acquisition_funding_opportunities(id) ON DELETE CASCADE,
  total_purchase_price NUMERIC,
  cash_upfront NUMERIC,
  seller_finance_amount NUMERIC,
  deferred_payment_amount NUMERIC,
  earn_out_amount NUMERIC,
  revenue_share_terms TEXT,
  investor_equity_required NUMERIC,
  debt_required NUMERIC,
  spv_required BOOLEAN NOT NULL DEFAULT false,
  legal_review_required BOOLEAN NOT NULL DEFAULT false,
  tax_review_required BOOLEAN NOT NULL DEFAULT false,
  regulatory_risk TEXT,
  recommended_structure TEXT,
  founder_approval_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_funding_deal_structures TO authenticated;
GRANT ALL ON public.acquisition_funding_deal_structures TO service_role;
ALTER TABLE public.acquisition_funding_deal_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage acq deal structures" ON public.acquisition_funding_deal_structures
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== 4. Pitch Packs ==========
CREATE TABLE public.acquisition_funding_pitch_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.acquisition_funding_opportunities(id) ON DELETE CASCADE,
  pitch_status TEXT NOT NULL DEFAULT 'not_started',
  acquisition_memo TEXT,
  investment_thesis TEXT,
  why_this_asset TEXT,
  why_now TEXT,
  distress_or_value_gap TEXT,
  liftor_advantage TEXT,
  ninety_day_relaunch_plan TEXT,
  twelve_month_growth_plan TEXT,
  funding_required NUMERIC,
  proposed_capital_stack TEXT,
  expected_return_routes TEXT,
  key_risks TEXT,
  due_diligence_required TEXT,
  funder_shortlist JSONB NOT NULL DEFAULT '[]'::jsonb,
  founder_approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_funding_pitch_packs TO authenticated;
GRANT ALL ON public.acquisition_funding_pitch_packs TO service_role;
ALTER TABLE public.acquisition_funding_pitch_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage acq pitch packs" ON public.acquisition_funding_pitch_packs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== Updated-at trigger ==========
CREATE OR REPLACE FUNCTION public.touch_acquisition_funding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_afo_touch BEFORE UPDATE ON public.acquisition_funding_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.touch_acquisition_funding_updated_at();
CREATE TRIGGER trg_afs_touch BEFORE UPDATE ON public.acquisition_funding_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_acquisition_funding_updated_at();
CREATE TRIGGER trg_afd_touch BEFORE UPDATE ON public.acquisition_funding_deal_structures
  FOR EACH ROW EXECUTE FUNCTION public.touch_acquisition_funding_updated_at();
CREATE TRIGGER trg_afp_touch BEFORE UPDATE ON public.acquisition_funding_pitch_packs
  FOR EACH ROW EXECUTE FUNCTION public.touch_acquisition_funding_updated_at();
