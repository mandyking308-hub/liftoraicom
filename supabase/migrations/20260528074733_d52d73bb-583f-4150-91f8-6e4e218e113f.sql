
-- ============================================================
-- Funding Radar Phase 1
-- ============================================================

-- Helper: founder check uses existing public.has_role(user_id, 'founder')

-- 1. funding_imports (referenced by funding_radar_companies via import_id)
CREATE TABLE IF NOT EXISTS public.funding_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT,
  ingestion_method TEXT NOT NULL DEFAULT 'manual',
  source_label TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_log JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_imports TO authenticated;
GRANT ALL ON public.funding_imports TO service_role;
ALTER TABLE public.funding_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_select_funding_imports" ON public.funding_imports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_insert_funding_imports" ON public.funding_imports FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_update_funding_imports" ON public.funding_imports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_delete_funding_imports" ON public.funding_imports FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'founder'));

-- 2. funding_problem_clusters
CREATE TABLE IF NOT EXISTS public.funding_problem_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_name TEXT NOT NULL,
  problem_thesis TEXT,
  customer_pain TEXT,
  buyer_type TEXT,
  market_validation_summary TEXT,
  capital_efficiency_rationale TEXT,
  distinct_execution_route TEXT,
  needs_verification BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_problem_clusters TO authenticated;
GRANT ALL ON public.funding_problem_clusters TO service_role;
ALTER TABLE public.funding_problem_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_select_funding_clusters" ON public.funding_problem_clusters FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_insert_funding_clusters" ON public.funding_problem_clusters FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_update_funding_clusters" ON public.funding_problem_clusters FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_delete_funding_clusters" ON public.funding_problem_clusters FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'founder'));

-- 3. funding_radar_companies
CREATE TABLE IF NOT EXISTS public.funding_radar_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  website TEXT,
  sector TEXT,
  sub_sector TEXT,
  country TEXT,
  region TEXT,
  hq_city TEXT,
  headcount INTEGER,
  last_funding_amount_usd NUMERIC,
  last_funding_round TEXT,
  last_funding_date DATE,
  total_funding_usd NUMERIC,
  problem_thesis TEXT,
  customer_pain TEXT,
  market_validation TEXT,
  buyer_type TEXT,
  pricing_logic TEXT,
  revenue_model_pattern TEXT,
  publicly_visible_weakness TEXT,
  distinct_execution_route TEXT,
  needs_verification BOOLEAN NOT NULL DEFAULT true,
  source_url TEXT,
  source_type TEXT,
  ingestion_method TEXT NOT NULL DEFAULT 'manual',
  import_id UUID REFERENCES public.funding_imports(id) ON DELETE SET NULL,
  cluster_id UUID REFERENCES public.funding_problem_clusters(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_funding_companies_sector ON public.funding_radar_companies(sector);
CREATE INDEX IF NOT EXISTS idx_funding_companies_cluster ON public.funding_radar_companies(cluster_id);
CREATE INDEX IF NOT EXISTS idx_funding_companies_import ON public.funding_radar_companies(import_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_radar_companies TO authenticated;
GRANT ALL ON public.funding_radar_companies TO service_role;
ALTER TABLE public.funding_radar_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_select_funding_companies" ON public.funding_radar_companies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_insert_funding_companies" ON public.funding_radar_companies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_update_funding_companies" ON public.funding_radar_companies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_delete_funding_companies" ON public.funding_radar_companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'founder'));

-- 4. funding_radar_scores
CREATE TABLE IF NOT EXISTS public.funding_radar_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_company_id UUID NOT NULL REFERENCES public.funding_radar_companies(id) ON DELETE CASCADE,
  capital_efficiency_advantage_score INTEGER CHECK (capital_efficiency_advantage_score BETWEEN 0 AND 100),
  investor_validation_score INTEGER CHECK (investor_validation_score BETWEEN 0 AND 100),
  ai_automation_advantage_score INTEGER CHECK (ai_automation_advantage_score BETWEEN 0 AND 100),
  recurring_revenue_score INTEGER CHECK (recurring_revenue_score BETWEEN 0 AND 100),
  global_expansion_score INTEGER CHECK (global_expansion_score BETWEEN 0 AND 100),
  total_score INTEGER,
  staff_heavy BOOLEAN,
  sales_heavy BOOLEAN,
  onboarding_heavy BOOLEAN,
  support_heavy BOOLEAN,
  compliance_heavy BOOLEAN,
  delivery_manual BOOLEAN,
  ai_can_collapse_cost BOOLEAN,
  liftor_can_operate BOOLEAN,
  rationale TEXT,
  scored_by UUID,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_funding_scores_company ON public.funding_radar_scores(funding_company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_radar_scores TO authenticated;
GRANT ALL ON public.funding_radar_scores TO service_role;
ALTER TABLE public.funding_radar_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_select_funding_scores" ON public.funding_radar_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_insert_funding_scores" ON public.funding_radar_scores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_update_funding_scores" ON public.funding_radar_scores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_delete_funding_scores" ON public.funding_radar_scores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'founder'));

-- 5. funding_monthly_runs
CREATE TABLE IF NOT EXISTS public.funding_monthly_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  candidates_reviewed INTEGER NOT NULL DEFAULT 0,
  shortlist_size INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  finalised_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_monthly_runs TO authenticated;
GRANT ALL ON public.funding_monthly_runs TO service_role;
ALTER TABLE public.funding_monthly_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_select_funding_runs" ON public.funding_monthly_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_insert_funding_runs" ON public.funding_monthly_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_update_funding_runs" ON public.funding_monthly_runs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_delete_funding_runs" ON public.funding_monthly_runs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'founder'));

-- 6. funding_shortlist
CREATE TABLE IF NOT EXISTS public.funding_shortlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_run_id UUID REFERENCES public.funding_monthly_runs(id) ON DELETE SET NULL,
  funding_company_id UUID NOT NULL REFERENCES public.funding_radar_companies(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES public.funding_problem_clusters(id) ON DELETE SET NULL,
  capital_efficiency_summary TEXT,
  build_thesis TEXT,
  acquirer_pain_thesis TEXT,
  status TEXT NOT NULL DEFAULT 'shortlisted',
  promoted_build_candidate_id UUID REFERENCES public.ma_build_candidates(id) ON DELETE SET NULL,
  founder_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_funding_shortlist_run ON public.funding_shortlist(monthly_run_id);
CREATE INDEX IF NOT EXISTS idx_funding_shortlist_company ON public.funding_shortlist(funding_company_id);
CREATE INDEX IF NOT EXISTS idx_funding_shortlist_status ON public.funding_shortlist(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_shortlist TO authenticated;
GRANT ALL ON public.funding_shortlist TO service_role;
ALTER TABLE public.funding_shortlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_select_funding_shortlist" ON public.funding_shortlist FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_insert_funding_shortlist" ON public.funding_shortlist FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_update_funding_shortlist" ON public.funding_shortlist FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founder_delete_funding_shortlist" ON public.funding_shortlist FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'founder'));

-- 7. Extend ma_build_candidates with nullable funding context columns
ALTER TABLE public.ma_build_candidates
  ADD COLUMN IF NOT EXISTS funding_shortlist_id UUID REFERENCES public.funding_shortlist(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funding_company_id UUID REFERENCES public.funding_radar_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funding_cluster_id UUID REFERENCES public.funding_problem_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capital_efficiency_advantage_score INTEGER CHECK (capital_efficiency_advantage_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS investor_validation_score INTEGER CHECK (investor_validation_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ai_automation_advantage_score INTEGER CHECK (ai_automation_advantage_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS recurring_revenue_score INTEGER CHECK (recurring_revenue_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS global_expansion_score INTEGER CHECK (global_expansion_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS funding_source_summary TEXT,
  ADD COLUMN IF NOT EXISTS build_thesis TEXT,
  ADD COLUMN IF NOT EXISTS acquirer_pain_thesis TEXT;

-- updated_at triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'funding_imports','funding_problem_clusters','funding_radar_companies',
    'funding_radar_scores','funding_monthly_runs','funding_shortlist'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;
