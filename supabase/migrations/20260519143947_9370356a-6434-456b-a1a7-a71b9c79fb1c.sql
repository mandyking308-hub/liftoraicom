
-- ============ WEBSITE / FUNNEL ENGINE TABLES ============

CREATE TABLE IF NOT EXISTS public.website_funnel_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  strategy_name text NOT NULL,
  strategy_type text NOT NULL,
  strategy_status text NOT NULL DEFAULT 'draft',
  target_audience text,
  primary_offer text,
  primary_goal text,
  funnel_stage text,
  traffic_sources text[] NOT NULL DEFAULT '{}',
  linked_campaign_plan_id uuid,
  linked_revenue_target_id uuid,
  linked_market_signal_id uuid,
  linked_learning_signal_id uuid,
  website_url text,
  page_goal text,
  value_proposition text,
  proof_required text[] NOT NULL DEFAULT '{}',
  missing_proof text[] NOT NULL DEFAULT '{}',
  risk_warnings text[] NOT NULL DEFAULT '{}',
  recommended_pages text[] NOT NULL DEFAULT '{}',
  recommended_assets text[] NOT NULL DEFAULT '{}',
  founder_notes text,
  approval_status text NOT NULL DEFAULT 'draft',
  readiness_score integer NOT NULL DEFAULT 0,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_landing_page_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  page_name text NOT NULL,
  page_type text NOT NULL,
  page_status text NOT NULL DEFAULT 'draft',
  target_audience text,
  primary_goal text,
  page_url_intended text,
  hero_headline text,
  hero_subheadline text,
  primary_cta text,
  secondary_cta text,
  page_outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  section_copy jsonb NOT NULL DEFAULT '[]'::jsonb,
  proof_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_disclaimers text[] NOT NULL DEFAULT '{}',
  asset_requirements text[] NOT NULL DEFAULT '{}',
  missing_assets text[] NOT NULL DEFAULT '{}',
  compliance_warnings text[] NOT NULL DEFAULT '{}',
  copy_risk_flags text[] NOT NULL DEFAULT '{}',
  builder_export_status text NOT NULL DEFAULT 'not_exported',
  founder_approval_review_id uuid,
  approval_status text NOT NULL DEFAULT 'draft',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  page_draft_id uuid NOT NULL REFERENCES public.website_landing_page_drafts(id) ON DELETE CASCADE,
  section_order integer NOT NULL DEFAULT 0,
  section_type text NOT NULL,
  section_title text,
  section_goal text,
  section_copy text,
  cta_text text,
  cta_url text,
  asset_id uuid,
  asset_requirement text,
  status text NOT NULL DEFAULT 'draft',
  risk_flags text[] NOT NULL DEFAULT '{}',
  compliance_warnings text[] NOT NULL DEFAULT '{}',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_magnet_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  campaign_plan_id uuid,
  lead_magnet_name text NOT NULL,
  lead_magnet_type text NOT NULL,
  lead_magnet_status text NOT NULL DEFAULT 'draft',
  target_audience text,
  promised_outcome text,
  delivery_method text,
  title text,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  draft_content text,
  cover_asset_id uuid,
  opt_in_copy text,
  thank_you_copy text,
  follow_up_needed boolean NOT NULL DEFAULT true,
  compliance_warnings text[] NOT NULL DEFAULT '{}',
  proof_required text[] NOT NULL DEFAULT '{}',
  risk_flags text[] NOT NULL DEFAULT '{}',
  founder_approval_review_id uuid,
  approval_status text NOT NULL DEFAULT 'draft',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversion_cta_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  map_name text NOT NULL,
  map_status text NOT NULL DEFAULT 'draft',
  source_type text NOT NULL,
  source_id uuid,
  platform text,
  campaign_plan_id uuid,
  content_item_id uuid,
  calendar_item_id uuid,
  keyword_rule_id uuid,
  funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  page_draft_id uuid REFERENCES public.website_landing_page_drafts(id) ON DELETE SET NULL,
  lead_magnet_id uuid REFERENCES public.lead_magnet_assets(id) ON DELETE SET NULL,
  cta_text text,
  cta_url text,
  destination_type text,
  destination_status text NOT NULL DEFAULT 'draft',
  risk_warnings text[] NOT NULL DEFAULT '{}',
  approval_status text NOT NULL DEFAULT 'draft',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversion_asset_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  pack_name text NOT NULL,
  pack_type text NOT NULL,
  pack_status text NOT NULL DEFAULT 'draft',
  funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  page_draft_id uuid REFERENCES public.website_landing_page_drafts(id) ON DELETE SET NULL,
  lead_magnet_id uuid REFERENCES public.lead_magnet_assets(id) ON DELETE SET NULL,
  campaign_plan_id uuid,
  copy_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  asset_requirements text[] NOT NULL DEFAULT '{}',
  asset_ids uuid[] NOT NULL DEFAULT '{}',
  builder_instructions text,
  operator_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  export_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_export_status text NOT NULL DEFAULT 'not_exported',
  validation_status text NOT NULL DEFAULT 'not_checked',
  validation_errors text[] NOT NULL DEFAULT '{}',
  validation_warnings text[] NOT NULL DEFAULT '{}',
  founder_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_funnel_gap_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE CASCADE,
  page_draft_id uuid REFERENCES public.website_landing_page_drafts(id) ON DELETE CASCADE,
  gap_type text NOT NULL,
  gap_description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  recommended_fix text,
  status text NOT NULL DEFAULT 'open',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_funnel_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  page_draft_id uuid REFERENCES public.website_landing_page_drafts(id) ON DELETE SET NULL,
  lead_magnet_id uuid REFERENCES public.lead_magnet_assets(id) ON DELETE SET NULL,
  cta_map_id uuid REFERENCES public.conversion_cta_maps(id) ON DELETE SET NULL,
  asset_pack_id uuid REFERENCES public.conversion_asset_packs(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text NOT NULL DEFAULT 'recorded',
  before_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_api_calls integer NOT NULL DEFAULT 0,
  pages_published integer NOT NULL DEFAULT 0,
  live_forms_created integer NOT NULL DEFAULT 0,
  payments_created integer NOT NULL DEFAULT 0,
  emails_sent integer NOT NULL DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ EXTEND EXISTING TABLES ============
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_campaign_plans') THEN
    ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS funnel_strategy_id uuid;
    ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS conversion_page_id uuid;
    ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS lead_magnet_id uuid;
    ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS conversion_asset_pack_id uuid;
    ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS funnel_status text DEFAULT 'not_configured';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_content_items') THEN
    ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS cta_map_id uuid;
    ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS funnel_destination_status text DEFAULT 'not_configured';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_calendar_items') THEN
    ALTER TABLE public.social_calendar_items ADD COLUMN IF NOT EXISTS cta_map_id uuid;
    ALTER TABLE public.social_calendar_items ADD COLUMN IF NOT EXISTS funnel_destination_status text DEFAULT 'not_configured';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_strategy_recommendations') THEN
    ALTER TABLE public.social_strategy_recommendations ADD COLUMN IF NOT EXISTS funnel_strategy_id uuid;
    ALTER TABLE public.social_strategy_recommendations ADD COLUMN IF NOT EXISTS conversion_asset_pack_id uuid;
  END IF;
END$$;

-- ============ RLS ============
ALTER TABLE public.website_funnel_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_landing_page_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_magnet_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_cta_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_asset_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_funnel_gap_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_funnel_audit ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'website_funnel_strategies','website_landing_page_drafts','website_page_sections',
    'lead_magnet_assets','conversion_cta_maps','conversion_asset_packs',
    'website_funnel_gap_reviews','website_funnel_audit'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "founder_admin_all_%I" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "founder_admin_all_%I" ON public.%I
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))$p$, t, t);
  END LOOP;
END$$;

CREATE INDEX IF NOT EXISTS idx_wfs_biz ON public.website_funnel_strategies(business_id);
CREATE INDEX IF NOT EXISTS idx_wlpd_biz ON public.website_landing_page_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_wps_page ON public.website_page_sections(page_draft_id);
CREATE INDEX IF NOT EXISTS idx_lma_biz ON public.lead_magnet_assets(business_id);
CREATE INDEX IF NOT EXISTS idx_ccm_biz ON public.conversion_cta_maps(business_id);
CREATE INDEX IF NOT EXISTS idx_cap_biz ON public.conversion_asset_packs(business_id);
CREATE INDEX IF NOT EXISTS idx_wfgr_biz ON public.website_funnel_gap_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_wfa_biz ON public.website_funnel_audit(business_id);
