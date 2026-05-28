
-- 1. funding_watchlist
CREATE TABLE public.funding_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.funding_radar_companies(id) ON DELETE CASCADE,
  watch_status text NOT NULL DEFAULT 'active',
  watch_reason text,
  priority text NOT NULL DEFAULT 'medium',
  problem_cluster_id uuid REFERENCES public.funding_problem_clusters(id) ON DELETE SET NULL,
  founder_notes text,
  last_reviewed_at timestamptz,
  next_review_due_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funding_watchlist_status_chk CHECK (watch_status IN ('active','paused','archived')),
  CONSTRAINT funding_watchlist_priority_chk CHECK (priority IN ('low','medium','high','critical')),
  CONSTRAINT funding_watchlist_company_unique UNIQUE (company_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_watchlist TO authenticated;
GRANT ALL ON public.funding_watchlist TO service_role;

ALTER TABLE public.funding_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_select_funding_watchlist" ON public.funding_watchlist FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "founder_insert_funding_watchlist" ON public.funding_watchlist FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "founder_update_funding_watchlist" ON public.funding_watchlist FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "founder_delete_funding_watchlist" ON public.funding_watchlist FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role));

CREATE INDEX idx_funding_watchlist_company ON public.funding_watchlist(company_id);
CREATE INDEX idx_funding_watchlist_status ON public.funding_watchlist(watch_status);
CREATE INDEX idx_funding_watchlist_priority ON public.funding_watchlist(priority);
CREATE INDEX idx_funding_watchlist_review_due ON public.funding_watchlist(next_review_due_at);

CREATE TRIGGER trg_funding_watchlist_updated_at
BEFORE UPDATE ON public.funding_watchlist
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 2. funding_weakness_signals
CREATE TABLE public.funding_weakness_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.funding_radar_companies(id) ON DELETE CASCADE,
  watchlist_id uuid REFERENCES public.funding_watchlist(id) ON DELETE SET NULL,
  signal_type text NOT NULL,
  signal_polarity text NOT NULL DEFAULT 'negative',
  signal_title text NOT NULL,
  signal_summary text,
  source_name text,
  source_url text,
  source_type text,
  signal_date date,
  confidence_score integer,
  severity_score integer,
  relevance_to_liftor_score integer,
  customer_pain_relevance integer,
  capital_efficiency_relevance integer,
  legal_ip_notes text,
  founder_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fws_signal_type_chk CHECK (signal_type IN (
    'customer_complaint','poor_review','support_issue','onboarding_issue','pricing_complaint',
    'product_complexity','slow_implementation','failed_launch','delayed_expansion',
    'leadership_exit','founder_exit','senior_hire_departure','layoffs','hiring_freeze',
    'funding_pressure','down_round','regulatory_pressure','compliance_issue',
    'integration_problem','churn_signal','competitor_pressure','market_confusion',
    'trust_issue','geographic_expansion_problem','marketplace_supply_problem',
    'marketplace_demand_problem','public_praise','strong_customer_love',
    'strong_growth_signal','neutral_update'
  )),
  CONSTRAINT fws_polarity_chk CHECK (signal_polarity IN ('positive','negative','neutral')),
  CONSTRAINT fws_confidence_chk CHECK (confidence_score IS NULL OR (confidence_score BETWEEN 0 AND 100)),
  CONSTRAINT fws_severity_chk CHECK (severity_score IS NULL OR (severity_score BETWEEN 0 AND 100)),
  CONSTRAINT fws_relevance_chk CHECK (relevance_to_liftor_score IS NULL OR (relevance_to_liftor_score BETWEEN 0 AND 100)),
  CONSTRAINT fws_customer_pain_chk CHECK (customer_pain_relevance IS NULL OR (customer_pain_relevance BETWEEN 0 AND 100)),
  CONSTRAINT fws_capital_chk CHECK (capital_efficiency_relevance IS NULL OR (capital_efficiency_relevance BETWEEN 0 AND 100))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_weakness_signals TO authenticated;
GRANT ALL ON public.funding_weakness_signals TO service_role;

ALTER TABLE public.funding_weakness_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_select_fws" ON public.funding_weakness_signals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "founder_insert_fws" ON public.funding_weakness_signals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "founder_update_fws" ON public.funding_weakness_signals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "founder_delete_fws" ON public.funding_weakness_signals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role));

CREATE INDEX idx_fws_company ON public.funding_weakness_signals(company_id);
CREATE INDEX idx_fws_watchlist ON public.funding_weakness_signals(watchlist_id);
CREATE INDEX idx_fws_type ON public.funding_weakness_signals(signal_type);
CREATE INDEX idx_fws_polarity ON public.funding_weakness_signals(signal_polarity);
CREATE INDEX idx_fws_date ON public.funding_weakness_signals(signal_date DESC);

CREATE TRIGGER trg_fws_updated_at
BEFORE UPDATE ON public.funding_weakness_signals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
