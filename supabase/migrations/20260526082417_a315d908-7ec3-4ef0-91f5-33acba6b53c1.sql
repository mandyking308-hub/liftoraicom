
-- Portfolio Risk Matrix
CREATE TABLE public.portfolio_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT now(),
  legal_risk NUMERIC NOT NULL DEFAULT 0,
  tax_risk NUMERIC NOT NULL DEFAULT 0,
  data_privacy_risk NUMERIC NOT NULL DEFAULT 0,
  ai_cost_risk NUMERIC NOT NULL DEFAULT 0,
  delivery_risk NUMERIC NOT NULL DEFAULT 0,
  customer_risk NUMERIC NOT NULL DEFAULT 0,
  reputation_risk NUMERIC NOT NULL DEFAULT 0,
  compliance_risk NUMERIC NOT NULL DEFAULT 0,
  cashflow_risk NUMERIC NOT NULL DEFAULT 0,
  integration_risk NUMERIC NOT NULL DEFAULT 0,
  dependency_risk NUMERIC NOT NULL DEFAULT 0,
  founder_overload_risk NUMERIC NOT NULL DEFAULT 0,
  total_risk_score NUMERIC NOT NULL DEFAULT 0,
  risk_status TEXT NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.portfolio_risk_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  risk_category TEXT NOT NULL,
  risk_summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  recommended_action TEXT,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_risk_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage portfolio_risk_scores"
  ON public.portfolio_risk_scores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage portfolio_risk_items"
  ON public.portfolio_risk_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_prs_business ON public.portfolio_risk_scores(business_id, created_at DESC);
CREATE INDEX idx_pri_business ON public.portfolio_risk_items(business_id, status);

CREATE TRIGGER trg_pri_updated
  BEFORE UPDATE ON public.portfolio_risk_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
