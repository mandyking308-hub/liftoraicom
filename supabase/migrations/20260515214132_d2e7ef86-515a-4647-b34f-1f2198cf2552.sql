CREATE TABLE IF NOT EXISTS public.business_valuation_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  valuation_stage TEXT NOT NULL,
  valuation_method TEXT,
  low_estimate NUMERIC,
  base_estimate NUMERIC,
  high_estimate NUMERIC,
  currency TEXT NOT NULL DEFAULT 'GBP',
  revenue_amount NUMERIC,
  gross_profit NUMERIC,
  net_profit NUMERIC,
  ebitda NUMERIC,
  monthly_recurring_revenue NUMERIC,
  annual_recurring_revenue NUMERIC,
  customer_count INTEGER,
  active_subscriptions INTEGER,
  churn_rate NUMERIC,
  gross_margin NUMERIC,
  growth_rate NUMERIC,
  valuation_multiple_low NUMERIC,
  valuation_multiple_base NUMERIC,
  valuation_multiple_high NUMERIC,
  confidence_level TEXT,
  assumptions JSONB DEFAULT '{}'::jsonb,
  blockers JSONB DEFAULT '[]'::jsonb,
  adviser_review_required BOOLEAN NOT NULL DEFAULT true,
  founder_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bvs_business ON public.business_valuation_snapshots(business_id);
CREATE INDEX IF NOT EXISTS idx_bvs_stage ON public.business_valuation_snapshots(valuation_stage);

ALTER TABLE public.business_valuation_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage valuation snapshots"
ON public.business_valuation_snapshots FOR ALL
USING (has_role(auth.uid(), 'founder'::app_role))
WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER update_bvs_updated_at
BEFORE UPDATE ON public.business_valuation_snapshots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.business_valuation_assumptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  sector TEXT,
  business_model TEXT,
  stage TEXT,
  revenue_quality TEXT,
  customer_quality TEXT,
  margin_quality TEXT,
  growth_quality TEXT,
  ip_strength TEXT,
  automation_strength TEXT,
  founder_dependency TEXT,
  recurring_revenue_strength TEXT,
  strategic_value TEXT,
  risk_score NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bva_business ON public.business_valuation_assumptions(business_id);

ALTER TABLE public.business_valuation_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage valuation assumptions"
ON public.business_valuation_assumptions FOR ALL
USING (has_role(auth.uid(), 'founder'::app_role))
WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER update_bva_updated_at
BEFORE UPDATE ON public.business_valuation_assumptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();