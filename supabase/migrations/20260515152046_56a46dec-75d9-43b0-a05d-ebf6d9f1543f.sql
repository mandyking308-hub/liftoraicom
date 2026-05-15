
CREATE TABLE IF NOT EXISTS public.business_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  signal_type text NOT NULL,
  source_table text,
  source_id uuid,
  contact_id uuid,
  campaign_id uuid,
  agent_key text,
  signal_value numeric,
  signal_label text,
  outcome text,
  positive_signal boolean,
  negative_signal boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bls_business ON public.business_learning_signals(business_id);
CREATE INDEX IF NOT EXISTS idx_bls_signal_type ON public.business_learning_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_bls_captured ON public.business_learning_signals(captured_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bls_source ON public.business_learning_signals(signal_type, source_table, source_id) WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

ALTER TABLE public.business_learning_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view learning signals"
  ON public.business_learning_signals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders can insert learning signals"
  ON public.business_learning_signals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.optimisation_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  recommendation_type text NOT NULL,
  title text NOT NULL,
  summary text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_change jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  impact_estimate text,
  risk_level text NOT NULL DEFAULT 'medium',
  founder_approval_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_optrec_business ON public.optimisation_recommendations(business_id);
CREATE INDEX IF NOT EXISTS idx_optrec_status ON public.optimisation_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_optrec_type ON public.optimisation_recommendations(recommendation_type);

ALTER TABLE public.optimisation_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view optimisation recommendations"
  ON public.optimisation_recommendations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders can manage optimisation recommendations"
  ON public.optimisation_recommendations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_optrec_updated_at
  BEFORE UPDATE ON public.optimisation_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
