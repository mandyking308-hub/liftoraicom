
CREATE TABLE IF NOT EXISTS public.ma_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id uuid REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  recommendation_type ma_recommendation_type NOT NULL,
  summary text NOT NULL,
  reasoning text,
  supporting_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score integer CHECK (confidence_score BETWEEN 0 AND 100),
  urgency_score integer CHECK (urgency_score BETWEEN 0 AND 100),
  risk_level ma_risk_level NOT NULL DEFAULT 'medium',
  required_human_approval boolean NOT NULL DEFAULT true,
  recommended_owner text,
  due_date date,
  status ma_ai_rec_status NOT NULL DEFAULT 'proposed',
  ai_model text,
  ai_generated boolean NOT NULL DEFAULT true,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ma_ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_admin_founder_all" ON public.ma_ai_recommendations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE TRIGGER trg_ma_ai_recommendations_updated_at
  BEFORE UPDATE ON public.ma_ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ma_ai_recommendations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ma_ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.ma_audit_trigger();
CREATE INDEX IF NOT EXISTS idx_ma_ai_recs_asset ON public.ma_ai_recommendations(portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_ma_ai_recs_status ON public.ma_ai_recommendations(status);

CREATE TABLE IF NOT EXISTS public.ma_ai_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind ma_briefing_kind NOT NULL,
  portfolio_asset_id uuid REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  build_candidate_id uuid REFERENCES public.ma_build_candidates(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score integer CHECK (confidence_score BETWEEN 0 AND 100),
  ai_model text,
  source_count integer DEFAULT 0,
  evidence_strength text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ma_ai_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_admin_founder_all" ON public.ma_ai_briefings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE TRIGGER trg_ma_ai_briefings_updated_at
  BEFORE UPDATE ON public.ma_ai_briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ma_ai_briefings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ma_ai_briefings
  FOR EACH ROW EXECUTE FUNCTION public.ma_audit_trigger();
CREATE INDEX IF NOT EXISTS idx_ma_ai_briefings_kind ON public.ma_ai_briefings(kind);
CREATE INDEX IF NOT EXISTS idx_ma_ai_briefings_asset ON public.ma_ai_briefings(portfolio_asset_id);
