
CREATE TABLE IF NOT EXISTS public.portfolio_intelligence_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  score_date date NOT NULL DEFAULT current_date,
  growth_score numeric NOT NULL DEFAULT 0,
  revenue_score numeric NOT NULL DEFAULT 0,
  risk_score numeric NOT NULL DEFAULT 0,
  attention_score numeric NOT NULL DEFAULT 0,
  readiness_score numeric NOT NULL DEFAULT 0,
  opportunity_score numeric NOT NULL DEFAULT 0,
  overall_priority_score numeric NOT NULL DEFAULT 0,
  recommended_status text,
  recommended_action text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pis_biz_date ON public.portfolio_intelligence_scores(business_id, score_date);
CREATE INDEX IF NOT EXISTS idx_pis_priority ON public.portfolio_intelligence_scores(overall_priority_score DESC);

ALTER TABLE public.portfolio_intelligence_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view portfolio scores"
  ON public.portfolio_intelligence_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders can manage portfolio scores"
  ON public.portfolio_intelligence_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.portfolio_strategy_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  recommendation_key text NOT NULL,
  recommendation_title text NOT NULL,
  recommendation_summary text,
  recommendation_type text NOT NULL,
  priority_level text NOT NULL DEFAULT 'normal',
  confidence numeric,
  expected_impact text,
  founder_approval_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psr_business ON public.portfolio_strategy_recommendations(business_id);
CREATE INDEX IF NOT EXISTS idx_psr_status ON public.portfolio_strategy_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_psr_type ON public.portfolio_strategy_recommendations(recommendation_type);

ALTER TABLE public.portfolio_strategy_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view portfolio recommendations"
  ON public.portfolio_strategy_recommendations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders can manage portfolio recommendations"
  ON public.portfolio_strategy_recommendations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_psr_updated_at BEFORE UPDATE ON public.portfolio_strategy_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
