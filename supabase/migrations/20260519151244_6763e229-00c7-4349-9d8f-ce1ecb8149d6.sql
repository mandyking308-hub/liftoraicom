
-- Helper: has_role assumed to exist from earlier migrations. If not, fall back to a permissive founder check via user_roles.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='has_role') THEN
    CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $f$
      SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role::text=_role)
    $f$;
  END IF;
END $$;

-- 1. paid_media_campaign_plans
CREATE TABLE IF NOT EXISTS public.paid_media_campaign_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_name text NOT NULL,
  campaign_type text NOT NULL,
  campaign_status text DEFAULT 'draft',
  target_audience text,
  primary_goal text,
  offer_name text,
  platform_list text[] DEFAULT '{}',
  linked_social_campaign_plan_id uuid REFERENCES public.social_campaign_plans(id) ON DELETE SET NULL,
  linked_funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  linked_landing_page_id uuid REFERENCES public.website_landing_page_drafts(id) ON DELETE SET NULL,
  linked_lead_magnet_id uuid REFERENCES public.lead_magnet_assets(id) ON DELETE SET NULL,
  linked_revenue_target_id uuid,
  linked_learning_signal_id uuid,
  linked_market_signal_id uuid,
  funnel_destination_url text,
  budget_total numeric,
  daily_budget numeric,
  currency text DEFAULT 'GBP',
  start_date date,
  end_date date,
  success_metric text,
  expected_result_notes text,
  assumptions text[] DEFAULT '{}',
  caveats text[] DEFAULT '{}',
  risk_warnings text[] DEFAULT '{}',
  approval_status text DEFAULT 'draft',
  readiness_score integer DEFAULT 0,
  manual_launch_status text DEFAULT 'not_launched',
  founder_notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. paid_media_audience_segments
CREATE TABLE IF NOT EXISTS public.paid_media_audience_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid REFERENCES public.paid_media_campaign_plans(id) ON DELETE CASCADE,
  segment_name text NOT NULL,
  segment_type text NOT NULL,
  platform text,
  audience_description text,
  inclusion_criteria text[] DEFAULT '{}',
  exclusion_criteria text[] DEFAULT '{}',
  geo_targets text[] DEFAULT '{}',
  age_range text,
  interests text[] DEFAULT '{}',
  behaviours text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  retargeting_source text,
  lookalike_source text,
  customer_list_required boolean DEFAULT false,
  risk_warnings text[] DEFAULT '{}',
  privacy_warnings text[] DEFAULT '{}',
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. paid_media_creative_variants
CREATE TABLE IF NOT EXISTS public.paid_media_creative_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid REFERENCES public.paid_media_campaign_plans(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  platform text,
  creative_type text NOT NULL,
  creative_status text DEFAULT 'draft',
  headline text,
  primary_text text,
  description text,
  cta_text text,
  destination_url text,
  hook text,
  script_text text,
  visual_brief text,
  asset_id uuid REFERENCES public.social_assets(id) ON DELETE SET NULL,
  asset_requirements text[] DEFAULT '{}',
  missing_assets text[] DEFAULT '{}',
  claims_to_verify text[] DEFAULT '{}',
  unsupported_claims text[] DEFAULT '{}',
  compliance_warnings text[] DEFAULT '{}',
  risk_flags text[] DEFAULT '{}',
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. paid_media_budget_guards
CREATE TABLE IF NOT EXISTS public.paid_media_budget_guards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid REFERENCES public.paid_media_campaign_plans(id) ON DELETE CASCADE,
  guard_name text NOT NULL,
  guard_status text DEFAULT 'draft',
  currency text DEFAULT 'GBP',
  total_budget_cap numeric,
  daily_budget_cap numeric,
  weekly_budget_cap numeric,
  monthly_budget_cap numeric,
  test_budget_cap numeric,
  max_cac_target numeric,
  max_cpl_target numeric,
  min_roas_target numeric,
  stop_loss_rules jsonb DEFAULT '[]'::jsonb,
  approval_required_for_spend boolean DEFAULT true,
  founder_approval_required boolean DEFAULT true,
  risk_level text DEFAULT 'high',
  assumptions text[] DEFAULT '{}',
  caveats text[] DEFAULT '{}',
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. paid_media_spend_scenarios
CREATE TABLE IF NOT EXISTS public.paid_media_spend_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid REFERENCES public.paid_media_campaign_plans(id) ON DELETE CASCADE,
  scenario_name text NOT NULL,
  scenario_status text DEFAULT 'draft',
  currency text DEFAULT 'GBP',
  planned_spend numeric,
  daily_spend numeric,
  expected_cpc numeric,
  expected_cpl numeric,
  expected_cac numeric,
  expected_clicks integer,
  expected_leads integer,
  expected_conversions integer,
  expected_revenue numeric,
  expected_roas numeric,
  confidence_score integer DEFAULT 0,
  evidence_level text DEFAULT 'estimate_only',
  assumptions text[] DEFAULT '{}',
  caveats text[] DEFAULT '{}',
  warning_text text DEFAULT 'Forecast only. Not real spend or proven performance.',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. paid_media_readiness_checks
CREATE TABLE IF NOT EXISTS public.paid_media_readiness_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid REFERENCES public.paid_media_campaign_plans(id) ON DELETE CASCADE,
  check_name text NOT NULL,
  check_status text DEFAULT 'draft',
  readiness_score integer DEFAULT 0,
  platform_readiness jsonb DEFAULT '{}'::jsonb,
  funnel_ready boolean DEFAULT false,
  landing_page_ready boolean DEFAULT false,
  creative_ready boolean DEFAULT false,
  audience_ready boolean DEFAULT false,
  budget_guard_ready boolean DEFAULT false,
  tracking_plan_ready boolean DEFAULT false,
  compliance_ready boolean DEFAULT false,
  privacy_ready boolean DEFAULT false,
  missing_items text[] DEFAULT '{}',
  blockers text[] DEFAULT '{}',
  warnings text[] DEFAULT '{}',
  recommended_next_actions text[] DEFAULT '{}',
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. paid_media_manual_export_packs
CREATE TABLE IF NOT EXISTS public.paid_media_manual_export_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid REFERENCES public.paid_media_campaign_plans(id) ON DELETE SET NULL,
  export_name text NOT NULL,
  export_type text NOT NULL,
  export_status text DEFAULT 'draft',
  platform text,
  export_payload jsonb DEFAULT '{}'::jsonb,
  setup_instructions text,
  copy_blocks jsonb DEFAULT '[]'::jsonb,
  audience_blocks jsonb DEFAULT '[]'::jsonb,
  creative_blocks jsonb DEFAULT '[]'::jsonb,
  budget_blocks jsonb DEFAULT '[]'::jsonb,
  operator_checklist jsonb DEFAULT '[]'::jsonb,
  validation_status text DEFAULT 'not_checked',
  validation_errors text[] DEFAULT '{}',
  validation_warnings text[] DEFAULT '{}',
  confirmed_external_at timestamptz,
  confirmed_external_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. paid_media_risk_reviews
CREATE TABLE IF NOT EXISTS public.paid_media_risk_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid REFERENCES public.paid_media_campaign_plans(id) ON DELETE CASCADE,
  creative_variant_id uuid REFERENCES public.paid_media_creative_variants(id) ON DELETE SET NULL,
  review_name text NOT NULL,
  review_status text DEFAULT 'draft',
  risk_level text DEFAULT 'medium',
  regulated_claims_present boolean DEFAULT false,
  unsupported_claims text[] DEFAULT '{}',
  privacy_issues text[] DEFAULT '{}',
  targeting_issues text[] DEFAULT '{}',
  landing_page_issues text[] DEFAULT '{}',
  required_disclaimers text[] DEFAULT '{}',
  recommended_fixes text[] DEFAULT '{}',
  legal_review_required boolean DEFAULT false,
  founder_review_required boolean DEFAULT true,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. paid_media_audit
CREATE TABLE IF NOT EXISTS public.paid_media_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_plan_id uuid REFERENCES public.paid_media_campaign_plans(id) ON DELETE SET NULL,
  audience_segment_id uuid REFERENCES public.paid_media_audience_segments(id) ON DELETE SET NULL,
  creative_variant_id uuid REFERENCES public.paid_media_creative_variants(id) ON DELETE SET NULL,
  budget_guard_id uuid REFERENCES public.paid_media_budget_guards(id) ON DELETE SET NULL,
  spend_scenario_id uuid REFERENCES public.paid_media_spend_scenarios(id) ON DELETE SET NULL,
  readiness_check_id uuid REFERENCES public.paid_media_readiness_checks(id) ON DELETE SET NULL,
  export_pack_id uuid REFERENCES public.paid_media_manual_export_packs(id) ON DELETE SET NULL,
  risk_review_id uuid REFERENCES public.paid_media_risk_reviews(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text DEFAULT 'recorded',
  before_json jsonb DEFAULT '{}'::jsonb,
  after_json jsonb DEFAULT '{}'::jsonb,
  result_json jsonb DEFAULT '{}'::jsonb,
  external_api_calls integer DEFAULT 0,
  campaigns_launched integer DEFAULT 0,
  ads_created_externally integer DEFAULT 0,
  money_spent numeric DEFAULT 0,
  payment_methods_created integer DEFAULT 0,
  pixels_created integer DEFAULT 0,
  fake_metrics_created integer DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Extensions on existing tables
ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS paid_media_campaign_plan_id uuid;
ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS paid_media_status text DEFAULT 'not_configured';
ALTER TABLE public.website_funnel_strategies ADD COLUMN IF NOT EXISTS paid_media_campaign_plan_id uuid;
ALTER TABLE public.website_funnel_strategies ADD COLUMN IF NOT EXISTS ads_readiness_status text DEFAULT 'not_reviewed';
ALTER TABLE public.website_landing_page_drafts ADD COLUMN IF NOT EXISTS ads_readiness_status text DEFAULT 'not_reviewed';
ALTER TABLE public.website_landing_page_drafts ADD COLUMN IF NOT EXISTS paid_media_campaign_plan_id uuid;
ALTER TABLE public.conversion_cta_maps ADD COLUMN IF NOT EXISTS paid_media_campaign_plan_id uuid;
ALTER TABLE public.conversion_cta_maps ADD COLUMN IF NOT EXISTS ads_destination_status text DEFAULT 'not_reviewed';
ALTER TABLE public.social_strategy_recommendations ADD COLUMN IF NOT EXISTS paid_media_campaign_plan_id uuid;

-- RLS
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'paid_media_campaign_plans','paid_media_audience_segments','paid_media_creative_variants',
    'paid_media_budget_guards','paid_media_spend_scenarios','paid_media_readiness_checks',
    'paid_media_manual_export_packs','paid_media_risk_reviews','paid_media_audit'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "founder_admin_all_%1$s" ON public.%1$I$p$, t);
    EXECUTE format($p$CREATE POLICY "founder_admin_all_%1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))$p$, t);
  END LOOP;
END $$;

-- updated_at trigger
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'paid_media_campaign_plans','paid_media_audience_segments','paid_media_creative_variants',
    'paid_media_budget_guards','paid_media_spend_scenarios','paid_media_readiness_checks',
    'paid_media_manual_export_packs','paid_media_risk_reviews'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at_%1$s BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;
