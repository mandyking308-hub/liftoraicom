
CREATE TABLE public.experiment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  channel TEXT,
  product_or_offer TEXT,
  hypothesis TEXT NOT NULL,
  success_metric TEXT NOT NULL,
  audience TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'draft',
  requires_external_launch BOOLEAN NOT NULL DEFAULT true,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_plans TO authenticated;
GRANT ALL ON public.experiment_plans TO service_role;
ALTER TABLE public.experiment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_experiment_plans" ON public.experiment_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.experiment_plans(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  is_control BOOLEAN NOT NULL DEFAULT false,
  traffic_split NUMERIC NOT NULL DEFAULT 50,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_variants TO authenticated;
GRANT ALL ON public.experiment_variants TO service_role;
ALTER TABLE public.experiment_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_experiment_variants" ON public.experiment_variants FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.experiment_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.experiment_plans(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'primary',
  target_value NUMERIC,
  unit TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_metrics TO authenticated;
GRANT ALL ON public.experiment_metrics TO service_role;
ALTER TABLE public.experiment_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_experiment_metrics" ON public.experiment_metrics FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.experiment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.experiment_plans(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.experiment_variants(id) ON DELETE SET NULL,
  metric_name TEXT NOT NULL,
  observed_value NUMERIC NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  lift_pct NUMERIC,
  significance NUMERIC,
  notes TEXT,
  source TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_results TO authenticated;
GRANT ALL ON public.experiment_results TO service_role;
ALTER TABLE public.experiment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_experiment_results" ON public.experiment_results FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.experiment_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.experiment_plans(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.experiment_variants(id) ON DELETE SET NULL,
  winning_hypothesis TEXT NOT NULL,
  recommendation TEXT NOT NULL DEFAULT 'scale',
  confidence NUMERIC NOT NULL DEFAULT 0.8,
  requires_external_rollout BOOLEAN NOT NULL DEFAULT true,
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_winners TO authenticated;
GRANT ALL ON public.experiment_winners TO service_role;
ALTER TABLE public.experiment_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_experiment_winners" ON public.experiment_winners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.experiment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.experiment_plans(id) ON DELETE CASCADE,
  failure_reason TEXT NOT NULL,
  detail TEXT,
  recommendation TEXT NOT NULL DEFAULT 'retire',
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_failures TO authenticated;
GRANT ALL ON public.experiment_failures TO service_role;
ALTER TABLE public.experiment_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_experiment_failures" ON public.experiment_failures FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.experiment_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.experiment_plans(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  learning TEXT NOT NULL,
  applies_to TEXT,
  feeds_into TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0.7,
  applied BOOLEAN NOT NULL DEFAULT false,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiment_learnings TO authenticated;
GRANT ALL ON public.experiment_learnings TO service_role;
ALTER TABLE public.experiment_learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_experiment_learnings" ON public.experiment_learnings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
