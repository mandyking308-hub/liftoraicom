
-- =========================================================
-- PROMPT 6 — Campaign + Offer Content Engine
-- =========================================================

-- 1. social_campaign_plans
CREATE TABLE IF NOT EXISTS public.social_campaign_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'awareness',
  campaign_status text NOT NULL DEFAULT 'draft',
  campaign_goal text,
  target_audience text,
  primary_offer text,
  secondary_offer text,
  linked_revenue_target_id uuid,
  linked_social_content_pack_id uuid,
  start_date date,
  end_date date,
  platforms text[] NOT NULL DEFAULT '{}',
  customer_journey_stage text,
  funnel_stage text,
  campaign_summary text,
  key_message text,
  primary_cta text,
  secondary_cta text,
  proof_needed text[] NOT NULL DEFAULT '{}',
  required_assets text[] NOT NULL DEFAULT '{}',
  missing_assets text[] NOT NULL DEFAULT '{}',
  risk_flags text[] NOT NULL DEFAULT '{}',
  compliance_warnings text[] NOT NULL DEFAULT '{}',
  readiness_score integer NOT NULL DEFAULT 0,
  approval_status text NOT NULL DEFAULT 'draft',
  founder_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_campaign_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_admin_all_camp_plans" ON public.social_campaign_plans;
CREATE POLICY "founder_admin_all_camp_plans" ON public.social_campaign_plans
  FOR ALL TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());
CREATE INDEX IF NOT EXISTS idx_scp_business ON public.social_campaign_plans(business_id);

-- 2. social_campaign_content_map
CREATE TABLE IF NOT EXISTS public.social_campaign_content_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid NOT NULL REFERENCES public.social_campaign_plans(id) ON DELETE CASCADE,
  content_pack_id uuid REFERENCES public.social_content_packs(id) ON DELETE SET NULL,
  content_item_id uuid REFERENCES public.social_content_items(id) ON DELETE SET NULL,
  content_variant_id uuid REFERENCES public.social_content_variants(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.social_assets(id) ON DELETE SET NULL,
  map_role text NOT NULL,
  funnel_stage text,
  customer_journey_stage text,
  platform text,
  priority_score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_campaign_content_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_admin_all_camp_map" ON public.social_campaign_content_map;
CREATE POLICY "founder_admin_all_camp_map" ON public.social_campaign_content_map
  FOR ALL TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());
CREATE INDEX IF NOT EXISTS idx_sccm_business ON public.social_campaign_content_map(business_id);
CREATE INDEX IF NOT EXISTS idx_sccm_campaign ON public.social_campaign_content_map(campaign_plan_id);

-- 3. social_revenue_content_strategy
CREATE TABLE IF NOT EXISTS public.social_revenue_content_strategy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  revenue_target_id uuid,
  campaign_plan_id uuid REFERENCES public.social_campaign_plans(id) ON DELETE SET NULL,
  strategy_status text NOT NULL DEFAULT 'draft',
  target_summary text,
  target_amount numeric,
  target_count integer,
  currency text NOT NULL DEFAULT 'GBP',
  period_start date,
  period_end date,
  primary_offer text,
  estimated_leads_needed integer,
  estimated_conversion_rate numeric,
  estimated_content_volume integer,
  recommended_platforms text[] NOT NULL DEFAULT '{}',
  recommended_campaigns text[] NOT NULL DEFAULT '{}',
  recommended_content_mix jsonb NOT NULL DEFAULT '{}'::jsonb,
  revenue_assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  blockers text[] NOT NULL DEFAULT '{}',
  confidence_score integer NOT NULL DEFAULT 0,
  approval_status text NOT NULL DEFAULT 'draft',
  founder_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_revenue_content_strategy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_admin_all_rev_strat" ON public.social_revenue_content_strategy;
CREATE POLICY "founder_admin_all_rev_strat" ON public.social_revenue_content_strategy
  FOR ALL TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());
CREATE INDEX IF NOT EXISTS idx_srcs_business ON public.social_revenue_content_strategy(business_id);

-- 4. social_customer_journey_content_rules
CREATE TABLE IF NOT EXISTS public.social_customer_journey_content_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  journey_stage text NOT NULL,
  rule_name text NOT NULL,
  rule_description text,
  recommended_content_types text[] NOT NULL DEFAULT '{}',
  recommended_platforms text[] NOT NULL DEFAULT '{}',
  recommended_ctas text[] NOT NULL DEFAULT '{}',
  proof_needed text[] NOT NULL DEFAULT '{}',
  tone_notes text,
  risk_notes text,
  approval_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_customer_journey_content_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_admin_all_journey_rules" ON public.social_customer_journey_content_rules;
CREATE POLICY "founder_admin_all_journey_rules" ON public.social_customer_journey_content_rules
  FOR ALL TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());
CREATE INDEX IF NOT EXISTS idx_scjcr_business ON public.social_customer_journey_content_rules(business_id);

-- 5. social_campaign_readiness_reviews
CREATE TABLE IF NOT EXISTS public.social_campaign_readiness_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid NOT NULL REFERENCES public.social_campaign_plans(id) ON DELETE CASCADE,
  review_status text NOT NULL DEFAULT 'pending',
  readiness_score integer NOT NULL DEFAULT 0,
  offer_clarity_score integer NOT NULL DEFAULT 0,
  asset_readiness_score integer NOT NULL DEFAULT 0,
  proof_readiness_score integer NOT NULL DEFAULT 0,
  compliance_score integer NOT NULL DEFAULT 0,
  content_coverage_score integer NOT NULL DEFAULT 0,
  revenue_alignment_score integer NOT NULL DEFAULT 0,
  blockers text[] NOT NULL DEFAULT '{}',
  recommendations text[] NOT NULL DEFAULT '{}',
  founder_review_required boolean NOT NULL DEFAULT true,
  legal_review_required boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_campaign_readiness_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_admin_all_camp_readiness" ON public.social_campaign_readiness_reviews;
CREATE POLICY "founder_admin_all_camp_readiness" ON public.social_campaign_readiness_reviews
  FOR ALL TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());
CREATE INDEX IF NOT EXISTS idx_scrr_business ON public.social_campaign_readiness_reviews(business_id);

-- Extend social_content_packs
ALTER TABLE public.social_content_packs
  ADD COLUMN IF NOT EXISTS campaign_plan_id uuid,
  ADD COLUMN IF NOT EXISTS revenue_strategy_id uuid,
  ADD COLUMN IF NOT EXISTS customer_journey_stage text,
  ADD COLUMN IF NOT EXISTS funnel_stage text,
  ADD COLUMN IF NOT EXISTS offer_mapping_id uuid,
  ADD COLUMN IF NOT EXISTS revenue_alignment_status text NOT NULL DEFAULT 'not_checked';

-- Extend social_content_items
ALTER TABLE public.social_content_items
  ADD COLUMN IF NOT EXISTS campaign_plan_id uuid,
  ADD COLUMN IF NOT EXISTS revenue_strategy_id uuid,
  ADD COLUMN IF NOT EXISTS customer_journey_stage text,
  ADD COLUMN IF NOT EXISTS conversion_goal text,
  ADD COLUMN IF NOT EXISTS revenue_alignment_status text NOT NULL DEFAULT 'not_checked';
-- (funnel_stage and offer_mapping_id already exist from Prompt 5)
