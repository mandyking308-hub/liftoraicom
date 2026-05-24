
-- =====================================================================
-- LIFTOR PORTFOLIO & EXIT ARCHITECTURE ENGINE — Foundational schema
-- All tables prefixed ma_ to avoid colliding with existing CRM `deals`.
-- =====================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE ma_asset_type AS ENUM ('brand','SaaS','service_business','media_ip','ecommerce','marketplace','ai_tool','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_asset_status AS ENUM ('idea','validating','building','active','scaling','parked','exit_warmup','sale_process','sold','killed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_next_decision AS ENUM ('build','scale','iterate','park','warm_buyers','sell','kill','adviser_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_source_type AS ENUM ('public','paid_database','manual_upload','adviser_input','news','filing','api','internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_licence_status AS ENUM ('unknown','public_allowed','internal_use_only','paid_restricted','api_allowed','do_not_store');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_company_type AS ENUM ('strategic_acquirer','competitor','comparable','portfolio_company','pe_backed_platform','corporate_venture','supplier','partner','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_investor_type AS ENUM ('angel','vc','pe','family_office','corporate_venture','accelerator','strategic_investor','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_deal_type AS ENUM ('funding_round','acquisition','merger','asset_purchase','strategic_partnership','ipo','shutdown','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_legal_copy_risk AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_buyer_type AS ENUM ('strategic','pe','pe_backed_platform','competitor','corporate_venture','media_group','aggregator','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_buyer_warmth AS ENUM ('cold','aware','engaged','warm','strategic_conversation','exit_ready');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_adviser_type AS ENUM ('m_and_a_adviser','corporate_finance','exit_prep','capital_raiser','broker','pe_adviser','sector_specialist','legal','tax','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_adviser_status AS ENUM ('watch','active_contact','promising','parked','not_fit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_valuation_method AS ENUM ('revenue_multiple','arr_multiple','ebitda_multiple','ip_premium','strategic_premium','mixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_signal_type AS ENUM ('acquisition','funding','expansion','hiring','strategic_review','product_launch','partnership','regulation','competitor_move','investor_move','buyer_signal','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_signal_status AS ENUM ('new','reviewed','actioned','ignored','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_data_room_category AS ENUM ('ip','legal','finance','contracts','domain','brand','customer_data','crm','campaign_metrics','supplier','agent_logs','approval_logs','compliance','buyer_map','valuation','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_data_room_status AS ENUM ('missing','requested','in_progress','complete','needs_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_assigned_agent AS ENUM ('outreach','crm','inbox','content','reporting','compliance','buyer_warmup','founder_approval','data_room');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_execution_target_status AS ENUM ('planned','active','completed','missed','revised');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_recommendation_status AS ENUM ('candidate','shortlisted','selected','rejected','parked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- TABLES ----------

-- 1. portfolio assets
CREATE TABLE IF NOT EXISTS public.ma_portfolio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL,
  asset_type ma_asset_type NOT NULL DEFAULT 'other',
  status ma_asset_status NOT NULL DEFAULT 'idea',
  description TEXT,
  owner_entity TEXT,
  jurisdiction_notes TEXT,
  target_customer_market TEXT,
  target_buyer_market TEXT,
  target_exit_value_low NUMERIC,
  target_exit_value_base NUMERIC,
  target_exit_value_high NUMERIC,
  current_monthly_revenue NUMERIC,
  current_annual_revenue NUMERIC,
  current_monthly_profit NUMERIC,
  current_annual_profit NUMERIC,
  current_pipeline_value NUMERIC,
  current_stage TEXT,
  liftor_operability_score INTEGER CHECK (liftor_operability_score BETWEEN 0 AND 100),
  founder_dependency_score INTEGER CHECK (founder_dependency_score BETWEEN 0 AND 100),
  data_room_readiness_score INTEGER CHECK (data_room_readiness_score BETWEEN 0 AND 100),
  exit_readiness_score INTEGER CHECK (exit_readiness_score BETWEEN 0 AND 100),
  next_decision ma_next_decision,
  next_action TEXT,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. intelligence sources
CREATE TABLE IF NOT EXISTS public.ma_intelligence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type ma_source_type NOT NULL DEFAULT 'internal',
  provider_name TEXT,
  source_url TEXT,
  licence_status ma_licence_status NOT NULL DEFAULT 'unknown',
  storage_allowed BOOLEAN NOT NULL DEFAULT false,
  reuse_allowed BOOLEAN NOT NULL DEFAULT false,
  confidence_default NUMERIC CHECK (confidence_default BETWEEN 0 AND 1),
  refresh_frequency TEXT,
  access_method TEXT,
  api_secret_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. companies
CREATE TABLE IF NOT EXISTS public.ma_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  legal_name TEXT,
  aliases TEXT[],
  website TEXT,
  country TEXT,
  region TEXT,
  sector TEXT,
  subsector TEXT,
  company_type ma_company_type NOT NULL DEFAULT 'unknown',
  public_private_status TEXT,
  ticker TEXT,
  estimated_revenue NUMERIC,
  market_cap NUMERIC,
  cash_capacity_notes TEXT,
  acquisition_history_notes TEXT,
  expansion_signals TEXT,
  strategic_gaps TEXT,
  buyer_appetite_score INTEGER CHECK (buyer_appetite_score BETWEEN 0 AND 100),
  relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  last_researched_at TIMESTAMPTZ,
  source_id UUID REFERENCES public.ma_intelligence_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. investors
CREATE TABLE IF NOT EXISTS public.ma_investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_name TEXT NOT NULL,
  investor_type ma_investor_type NOT NULL DEFAULT 'other',
  website TEXT,
  country TEXT,
  sectors TEXT[],
  stage_focus TEXT,
  cheque_size_notes TEXT,
  portfolio_notes TEXT,
  exit_history_notes TEXT,
  likely_end_buyer_notes TEXT,
  relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  source_id UUID REFERENCES public.ma_intelligence_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. M&A deals (NOT the CRM `deals`)
CREATE TABLE IF NOT EXISTS public.ma_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_type ma_deal_type NOT NULL DEFAULT 'other',
  target_company_id UUID REFERENCES public.ma_companies(id) ON DELETE SET NULL,
  buyer_company_id UUID REFERENCES public.ma_companies(id) ON DELETE SET NULL,
  investor_id UUID REFERENCES public.ma_investors(id) ON DELETE SET NULL,
  deal_date DATE,
  announced_date DATE,
  amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  valuation NUMERIC,
  revenue_at_deal NUMERIC,
  arr_at_deal NUMERIC,
  ebitda_at_deal NUMERIC,
  implied_revenue_multiple NUMERIC,
  implied_arr_multiple NUMERIC,
  implied_ebitda_multiple NUMERIC,
  deal_notes TEXT,
  source_id UUID REFERENCES public.ma_intelligence_sources(id) ON DELETE SET NULL,
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. competitor profiles
CREATE TABLE IF NOT EXISTS public.ma_competitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.ma_companies(id) ON DELETE CASCADE,
  problem_solved TEXT,
  target_customer TEXT,
  pricing_notes TEXT,
  positioning_notes TEXT,
  funding_notes TEXT,
  growth_signals TEXT,
  weaknesses TEXT,
  legal_copy_risk ma_legal_copy_risk NOT NULL DEFAULT 'low',
  what_we_can_learn TEXT,
  what_we_must_not_copy TEXT,
  liftor_advantage_notes TEXT,
  portfolio_asset_match_id UUID REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. buyer matches
CREATE TABLE IF NOT EXISTS public.ma_buyer_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id UUID NOT NULL REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  buyer_company_id UUID NOT NULL REFERENCES public.ma_companies(id) ON DELETE CASCADE,
  buyer_type ma_buyer_type NOT NULL DEFAULT 'other',
  fit_score INTEGER CHECK (fit_score BETWEEN 0 AND 100),
  strategic_reason TEXT,
  likely_deal_size_low NUMERIC,
  likely_deal_size_base NUMERIC,
  likely_deal_size_high NUMERIC,
  buyer_warmth_status ma_buyer_warmth NOT NULL DEFAULT 'cold',
  warm_route TEXT,
  decision_makers_notes TEXT,
  next_warmup_action TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_contact_due_at TIMESTAMPTZ,
  risk_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. adviser channels
CREATE TABLE IF NOT EXISTS public.ma_adviser_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adviser_name TEXT NOT NULL,
  firm_name TEXT,
  adviser_type ma_adviser_type NOT NULL DEFAULT 'other',
  website TEXT,
  country TEXT,
  sector_strengths TEXT,
  best_for TEXT,
  not_suitable_for TEXT,
  fee_model_notes TEXT,
  minimum_deal_size_notes TEXT,
  buyer_network_notes TEXT,
  chemistry_score INTEGER CHECK (chemistry_score BETWEEN 0 AND 100),
  trust_score INTEGER CHECK (trust_score BETWEEN 0 AND 100),
  nda_readiness TEXT,
  next_step TEXT,
  status ma_adviser_status NOT NULL DEFAULT 'watch',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. valuation benchmarks
CREATE TABLE IF NOT EXISTS public.ma_valuation_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector TEXT,
  subsector TEXT,
  asset_type ma_asset_type,
  valuation_method ma_valuation_method NOT NULL DEFAULT 'mixed',
  low_multiple NUMERIC,
  base_multiple NUMERIC,
  high_multiple NUMERIC,
  source_id UUID REFERENCES public.ma_intelligence_sources(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. exit targets
CREATE TABLE IF NOT EXISTS public.ma_exit_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id UUID NOT NULL REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  desired_exit_value NUMERIC,
  currency TEXT DEFAULT 'USD',
  valuation_method ma_valuation_method,
  assumed_multiple NUMERIC,
  required_annual_revenue NUMERIC,
  required_monthly_revenue NUMERIC,
  required_annual_profit NUMERIC,
  required_monthly_profit NUMERIC,
  required_pipeline_value NUMERIC,
  required_customer_count INTEGER,
  required_growth_rate NUMERIC,
  required_buyer_warmth_level ma_buyer_warmth,
  target_exit_timeline_months INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. weekly signals
CREATE TABLE IF NOT EXISTS public.ma_weekly_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type ma_signal_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  summary TEXT,
  related_company_id UUID REFERENCES public.ma_companies(id) ON DELETE SET NULL,
  related_investor_id UUID REFERENCES public.ma_investors(id) ON DELETE SET NULL,
  related_portfolio_asset_id UUID REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.ma_intelligence_sources(id) ON DELETE SET NULL,
  signal_date DATE,
  relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  recommended_action TEXT,
  status ma_signal_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. data room items
CREATE TABLE IF NOT EXISTS public.ma_data_room_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id UUID NOT NULL REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  item_category ma_data_room_category NOT NULL DEFAULT 'other',
  item_name TEXT NOT NULL,
  status ma_data_room_status NOT NULL DEFAULT 'missing',
  storage_location TEXT,
  owner TEXT,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. execution targets
CREATE TABLE IF NOT EXISTS public.ma_execution_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id UUID NOT NULL REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  exit_target_id UUID REFERENCES public.ma_exit_targets(id) ON DELETE SET NULL,
  target_period_start DATE,
  target_period_end DATE,
  monthly_revenue_target NUMERIC,
  monthly_profit_target NUMERIC,
  pipeline_target NUMERIC,
  qualified_leads_target INTEGER,
  outreach_target INTEGER,
  content_output_target INTEGER,
  buyer_warmup_target INTEGER,
  crm_opportunity_target INTEGER,
  inbox_response_sla TEXT,
  assigned_agent ma_assigned_agent,
  status ma_execution_target_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. build candidates
CREATE TABLE IF NOT EXISTS public.ma_build_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  description TEXT,
  source_signal TEXT,
  target_buyer_type ma_buyer_type,
  target_customer TEXT,
  revenue_model TEXT,
  lovable_buildability_score INTEGER CHECK (lovable_buildability_score BETWEEN 0 AND 100),
  liftor_operability_score INTEGER CHECK (liftor_operability_score BETWEEN 0 AND 100),
  low_capex_score INTEGER CHECK (low_capex_score BETWEEN 0 AND 100),
  distribution_score INTEGER CHECK (distribution_score BETWEEN 0 AND 100),
  buyer_clarity_score INTEGER CHECK (buyer_clarity_score BETWEEN 0 AND 100),
  regulatory_friction_score INTEGER CHECK (regulatory_friction_score BETWEEN 0 AND 100),
  legal_ip_safety_score INTEGER CHECK (legal_ip_safety_score BETWEEN 0 AND 100),
  ninety_day_proof_score INTEGER CHECK (ninety_day_proof_score BETWEEN 0 AND 100),
  total_build_score INTEGER,
  rejection_reason TEXT,
  recommendation_status ma_recommendation_status NOT NULL DEFAULT 'candidate',
  quarter INTEGER CHECK (quarter BETWEEN 1 AND 4),
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. audit logs (immutable)
CREATE TABLE IF NOT EXISTS public.ma_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ma_audit_logs_table_record ON public.ma_audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_ma_audit_logs_actor ON public.ma_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_ma_audit_logs_created ON public.ma_audit_logs(created_at DESC);

-- ---------- updated_at triggers (use existing public.update_updated_at_column) ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ma_portfolio_assets','ma_intelligence_sources','ma_companies','ma_investors','ma_deals',
    'ma_competitor_profiles','ma_buyer_matches','ma_adviser_channels','ma_valuation_benchmarks',
    'ma_exit_targets','ma_weekly_signals','ma_data_room_items','ma_execution_targets','ma_build_candidates'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

-- ---------- Audit trigger function ----------
CREATE OR REPLACE FUNCTION public.ma_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec_id := (to_jsonb(OLD)->>'id')::uuid;
    INSERT INTO public.ma_audit_logs(actor_user_id, action_type, table_name, record_id, old_value, new_value)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, rec_id, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    rec_id := (to_jsonb(NEW)->>'id')::uuid;
    INSERT INTO public.ma_audit_logs(actor_user_id, action_type, table_name, record_id, old_value, new_value)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, rec_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    rec_id := (to_jsonb(NEW)->>'id')::uuid;
    INSERT INTO public.ma_audit_logs(actor_user_id, action_type, table_name, record_id, old_value, new_value)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, rec_id, NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ma_portfolio_assets','ma_intelligence_sources','ma_companies','ma_investors','ma_deals',
    'ma_competitor_profiles','ma_buyer_matches','ma_adviser_channels','ma_valuation_benchmarks',
    'ma_exit_targets','ma_weekly_signals','ma_data_room_items','ma_execution_targets','ma_build_candidates'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_audit ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ma_audit_trigger();', t, t);
  END LOOP;
END $$;

-- ---------- RLS: admin or founder only on all ma_* tables ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ma_portfolio_assets','ma_intelligence_sources','ma_companies','ma_investors','ma_deals',
    'ma_competitor_profiles','ma_buyer_matches','ma_adviser_channels','ma_valuation_benchmarks',
    'ma_exit_targets','ma_weekly_signals','ma_data_room_items','ma_execution_targets','ma_build_candidates'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "ma_admin_founder_all" ON public.%I;', t);
    EXECUTE format($p$CREATE POLICY "ma_admin_founder_all" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));$p$, t);
  END LOOP;
END $$;

-- Audit log: append-only. Admin/founder can read. Inserts only via SECURITY DEFINER trigger.
ALTER TABLE public.ma_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ma_audit_read" ON public.ma_audit_logs;
CREATE POLICY "ma_audit_read" ON public.ma_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
-- No INSERT/UPDATE/DELETE policy → blocked for clients; SECURITY DEFINER trigger bypasses RLS for inserts.

-- ---------- Seed placeholder portfolio assets (idempotent, flagged needs_review) ----------
INSERT INTO public.ma_portfolio_assets (asset_name, asset_type, status, description, needs_review)
SELECT v.asset_name, v.asset_type::ma_asset_type, v.status::ma_asset_status, v.description, true
FROM (VALUES
  ('NeonCandy','brand','active','Placeholder seed — needs founder review and real metrics.'),
  ('GloBlast','brand','validating','Placeholder seed — needs founder review and real metrics.'),
  ('FutureCandy','brand','idea','Placeholder seed — needs founder review and real metrics.'),
  ('Liftor B2B Service','service_business','active','Placeholder seed — Liftor-powered B2B service business. Needs founder review.')
) AS v(asset_name, asset_type, status, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ma_portfolio_assets p WHERE p.asset_name = v.asset_name
);
