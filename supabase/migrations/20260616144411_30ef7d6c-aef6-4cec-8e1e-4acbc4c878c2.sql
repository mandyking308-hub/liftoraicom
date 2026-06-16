
-- 1. Per-business exit intelligence profile (auto-created on business attachment)
CREATE TABLE public.business_exit_intelligence_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_model TEXT,
  sector TEXT,
  target_customer_type TEXT,
  target_buyer_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  likely_buyer_rationale TEXT,
  likely_strategic_acquirers JSONB NOT NULL DEFAULT '[]'::jsonb,
  likely_competitor_acquirers JSONB NOT NULL DEFAULT '[]'::jsonb,
  likely_financial_buyers JSONB NOT NULL DEFAULT '[]'::jsonb,
  likely_cash_rich_buyers JSONB NOT NULL DEFAULT '[]'::jsonb,
  likely_international_buyers JSONB NOT NULL DEFAULT '[]'::jsonb,
  operating_start_date DATE,
  twelve_month_review_date DATE,
  sale_review_status TEXT NOT NULL DEFAULT 'not_due'
    CHECK (sale_review_status IN ('not_due','due','in_review','prepare_for_sale','actively_marketing','hold','sold','parked')),
  founder_decision TEXT,
  for_sale BOOLEAN NOT NULL DEFAULT false,
  outreach_approved BOOLEAN NOT NULL DEFAULT false,
  data_room_open BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_exit_intelligence_profiles TO authenticated;
GRANT ALL ON public.business_exit_intelligence_profiles TO service_role;
ALTER TABLE public.business_exit_intelligence_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_exit_intelligence_profiles_founder_only"
  ON public.business_exit_intelligence_profiles FOR ALL
  TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());
CREATE TRIGGER trg_business_exit_intelligence_profiles_updated_at
  BEFORE UPDATE ON public.business_exit_intelligence_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create exit intelligence profile when a business is attached
CREATE OR REPLACE FUNCTION public.auto_create_exit_intelligence_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_exit_intelligence_profiles (business_id, business_name, twelve_month_review_date)
  VALUES (NEW.id, NEW.name, (NEW.created_at::date + INTERVAL '12 months')::date)
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auto_create_exit_intelligence_profile
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_exit_intelligence_profile();

-- 2. Competitor intelligence map (lawful public-source only)
CREATE TABLE public.competitor_intelligence_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  website TEXT,
  product_service TEXT,
  pricing_notes TEXT,
  customer_segment TEXT,
  public_customer_evidence TEXT,
  strengths TEXT,
  weaknesses TEXT,
  market_gap TEXT,
  what_we_can_do_better TEXT,
  buyer_relevance TEXT
    CHECK (buyer_relevance IN ('could_buy_us','could_be_beaten','problem_thesis','monitor_only','none')),
  risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical')),
  source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  lawful_public_source_only BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_intelligence_map TO authenticated;
GRANT ALL ON public.competitor_intelligence_map TO service_role;
ALTER TABLE public.competitor_intelligence_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitor_intelligence_map_founder_only"
  ON public.competitor_intelligence_map FOR ALL
  TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());
CREATE TRIGGER trg_competitor_intelligence_map_updated_at
  BEFORE UPDATE ON public.competitor_intelligence_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Lawful customer/prospect segment map
CREATE TABLE public.customer_prospect_segment_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  segment_name TEXT NOT NULL,
  customer_type TEXT,
  geography TEXT,
  pain_point TEXT,
  buying_trigger TEXT,
  public_data_source TEXT,
  outreach_suitability TEXT
    CHECK (outreach_suitability IN ('research_only','warm_intro_only','founder_approved_outreach','blocked')),
  lawful_basis TEXT,
  compliance_status TEXT NOT NULL DEFAULT 'not_checked'
    CHECK (compliance_status IN ('not_checked','needs_adviser_review','approved_for_research_only','approved_for_founder_contact','blocked')),
  email_contact_source_status TEXT
    CHECK (email_contact_source_status IN ('not_collected','public_only','consent_required','blocked')),
  competitor_overlap BOOLEAN NOT NULL DEFAULT false,
  target_priority INTEGER CHECK (target_priority BETWEEN 0 AND 10),
  campaign_idea TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','founder_approved','blocked','parked')),
  source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_prospect_segment_map TO authenticated;
GRANT ALL ON public.customer_prospect_segment_map TO service_role;
ALTER TABLE public.customer_prospect_segment_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_prospect_segment_map_founder_only"
  ON public.customer_prospect_segment_map FOR ALL
  TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());
CREATE TRIGGER trg_customer_prospect_segment_map_updated_at
  BEFORE UPDATE ON public.customer_prospect_segment_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Extend founder_led_buyer_targets with worldwide buyer universe fields
ALTER TABLE public.founder_led_buyer_targets
  ADD COLUMN IF NOT EXISTS buyer_type TEXT,
  ADD COLUMN IF NOT EXISTS country_region TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS public_source_evidence TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_history TEXT,
  ADD COLUMN IF NOT EXISTS fit_score INTEGER,
  ADD COLUMN IF NOT EXISTS cash_strength_notes TEXT,
  ADD COLUMN IF NOT EXISTS warm_path TEXT,
  ADD COLUMN IF NOT EXISTS draft_prepared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jurisdiction_compliance_status TEXT NOT NULL DEFAULT 'not_checked';

-- Add fit_score range guard (defer-safe: validated only on new/changed rows)
ALTER TABLE public.founder_led_buyer_targets
  DROP CONSTRAINT IF EXISTS founder_led_buyer_targets_fit_score_check;
ALTER TABLE public.founder_led_buyer_targets
  ADD CONSTRAINT founder_led_buyer_targets_fit_score_check
  CHECK (fit_score IS NULL OR (fit_score BETWEEN 0 AND 100));

ALTER TABLE public.founder_led_buyer_targets
  DROP CONSTRAINT IF EXISTS founder_led_buyer_targets_buyer_type_check;
ALTER TABLE public.founder_led_buyer_targets
  ADD CONSTRAINT founder_led_buyer_targets_buyer_type_check
  CHECK (buyer_type IS NULL OR buyer_type IN (
    'competitor','strategic_acquirer','pe_backed','cash_rich_company',
    'international_acquirer','marketplace_platform','supplier','customer','partner','other'
  ));

ALTER TABLE public.founder_led_buyer_targets
  DROP CONSTRAINT IF EXISTS founder_led_buyer_targets_jurisdiction_compliance_check;
ALTER TABLE public.founder_led_buyer_targets
  ADD CONSTRAINT founder_led_buyer_targets_jurisdiction_compliance_check
  CHECK (jurisdiction_compliance_status IN (
    'not_checked','needs_adviser_review','approved_for_research_only','approved_for_founder_contact','blocked'
  ));

-- Expand outreach_status to include "monitoring" and "draft_prepared"
ALTER TABLE public.founder_led_buyer_targets
  DROP CONSTRAINT IF EXISTS founder_led_buyer_targets_outreach_status_check;
ALTER TABLE public.founder_led_buyer_targets
  ADD CONSTRAINT founder_led_buyer_targets_outreach_status_check
  CHECK (outreach_status IN (
    'not_contacted','monitoring','warm_path_identified','founder_approved_to_contact',
    'draft_prepared','contacted','replied','meeting','diligence','offer','closed','parked'
  ));
