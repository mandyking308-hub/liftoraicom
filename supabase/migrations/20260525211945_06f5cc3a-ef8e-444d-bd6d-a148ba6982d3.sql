
-- Portfolio Prioritisation Engine
CREATE TABLE public.portfolio_priority_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  score_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  score_period_end DATE NOT NULL DEFAULT CURRENT_DATE,
  revenue_potential_score NUMERIC NOT NULL DEFAULT 0,
  speed_to_revenue_score NUMERIC NOT NULL DEFAULT 0,
  buildability_score NUMERIC NOT NULL DEFAULT 0,
  ai_operability_score NUMERIC NOT NULL DEFAULT 0,
  margin_score NUMERIC NOT NULL DEFAULT 0,
  compliance_risk_score NUMERIC NOT NULL DEFAULT 0,
  exit_potential_score NUMERIC NOT NULL DEFAULT 0,
  founder_attention_required_score NUMERIC NOT NULL DEFAULT 0,
  cash_required_score NUMERIC NOT NULL DEFAULT 0,
  market_signal_score NUMERIC NOT NULL DEFAULT 0,
  total_priority_score NUMERIC NOT NULL DEFAULT 0,
  recommended_decision TEXT NOT NULL DEFAULT 'operate',
  reason_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.portfolio_priority_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  decision_type TEXT NOT NULL,
  decision_status TEXT NOT NULL DEFAULT 'recommended',
  reason TEXT,
  expected_impact TEXT,
  founder_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pps_business ON public.portfolio_priority_scores(business_id);
CREATE INDEX idx_pps_decision ON public.portfolio_priority_scores(recommended_decision);
CREATE INDEX idx_ppd_business ON public.portfolio_priority_decisions(business_id);
CREATE INDEX idx_ppd_status ON public.portfolio_priority_decisions(decision_status);

ALTER TABLE public.portfolio_priority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_priority_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins manage priority scores" ON public.portfolio_priority_scores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins manage priority decisions" ON public.portfolio_priority_decisions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_ppd_updated_at
  BEFORE UPDATE ON public.portfolio_priority_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
