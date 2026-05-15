
CREATE TABLE public.business_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  kpi_name text NOT NULL,
  kpi_category text NOT NULL,
  target_value numeric,
  current_value numeric,
  unit text,
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'tracking',
  owner_agent_key text,
  owner_person_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_okrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  objective text NOT NULL,
  key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  period_start date,
  period_end date,
  progress_score numeric,
  status text NOT NULL DEFAULT 'active',
  owner_agent_key text,
  founder_review_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.performance_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  scorecard_period_start date NOT NULL,
  scorecard_period_end date NOT NULL,
  scorecard_type text NOT NULL DEFAULT 'weekly',
  revenue_score numeric,
  customer_score numeric,
  social_score numeric,
  operations_score numeric,
  risk_score numeric,
  overall_score numeric,
  summary text,
  next_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpis_admin_founder_all" ON public.business_kpis FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE POLICY "okrs_admin_founder_all" ON public.business_okrs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE POLICY "scorecards_admin_founder_all" ON public.performance_scorecards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER update_business_kpis_updated_at BEFORE UPDATE ON public.business_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_okrs_updated_at BEFORE UPDATE ON public.business_okrs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_business_kpis_business ON public.business_kpis(business_id);
CREATE INDEX idx_business_okrs_business ON public.business_okrs(business_id);
CREATE INDEX idx_scorecards_business ON public.performance_scorecards(business_id);
