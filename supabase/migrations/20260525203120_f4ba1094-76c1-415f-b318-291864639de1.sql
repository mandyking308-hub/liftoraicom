
CREATE TABLE public.marketplace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_name text NOT NULL,
  marketplace_type text NOT NULL DEFAULT 'service',
  supply_side_name text,
  demand_side_name text,
  core_categories text[] DEFAULT '{}',
  core_locations text[] DEFAULT '{}',
  seller_value_proposition text,
  buyer_value_proposition text,
  commission_model text,
  platform_fee_model text,
  payout_model text,
  seller_terms_summary text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.seller_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  prospect_name text NOT NULL,
  prospect_type text NOT NULL DEFAULT 'seller',
  company_name text,
  website text,
  email text,
  phone text,
  location text,
  category text,
  source text,
  qualification_status text NOT NULL DEFAULT 'new',
  fit_score numeric DEFAULT 0,
  supply_quality_score numeric DEFAULT 0,
  reputation_score numeric DEFAULT 0,
  capacity_score numeric DEFAULT 0,
  expected_value numeric DEFAULT 0,
  risk_flags text[] DEFAULT '{}',
  recommended_pitch text,
  founder_approval_required boolean NOT NULL DEFAULT true,
  external_action_locked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.seller_recruitment_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  campaign_name text NOT NULL,
  target_category text,
  target_location text,
  target_seller_profile text,
  campaign_status text NOT NULL DEFAULT 'draft',
  value_proposition text,
  outreach_sequence_summary text,
  approval_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.seller_onboarding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  seller_prospect_id uuid REFERENCES public.seller_prospects(id) ON DELETE SET NULL,
  seller_account_id uuid,
  onboarding_status text NOT NULL DEFAULT 'not_started',
  required_documents text[] DEFAULT '{}',
  missing_information text[] DEFAULT '{}',
  verification_status text DEFAULT 'pending',
  terms_accepted boolean NOT NULL DEFAULT false,
  payout_setup_status text NOT NULL DEFAULT 'not_started',
  listing_setup_status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.seller_verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  seller_prospect_id uuid REFERENCES public.seller_prospects(id) ON DELETE SET NULL,
  check_type text NOT NULL,
  check_status text NOT NULL DEFAULT 'pending',
  check_summary text,
  evidence_url text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  seller_id uuid,
  seller_prospect_id uuid REFERENCES public.seller_prospects(id) ON DELETE SET NULL,
  listing_title text NOT NULL,
  listing_description text,
  category text,
  location text,
  price_type text DEFAULT 'fixed',
  price_amount numeric,
  price_currency text DEFAULT 'GBP',
  listing_status text NOT NULL DEFAULT 'draft',
  quality_score numeric DEFAULT 0,
  risk_flags text[] DEFAULT '{}',
  founder_approval_required boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.marketplace_supply_demand_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  category text,
  location text,
  supply_count integer DEFAULT 0,
  active_seller_count integer DEFAULT 0,
  demand_count integer DEFAULT 0,
  buyer_request_count integer DEFAULT 0,
  supply_gap_score numeric DEFAULT 0,
  demand_gap_score numeric DEFAULT 0,
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.marketplace_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_recruitment_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_onboarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_supply_demand_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'marketplace_profiles','seller_prospects','seller_recruitment_campaigns',
    'seller_onboarding_records','seller_verification_checks','marketplace_listings',
    'marketplace_supply_demand_snapshots'
  ]) LOOP
    EXECUTE format('CREATE POLICY "founder_admin_all_%I" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''founder''::app_role) OR public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''founder''::app_role) OR public.has_role(auth.uid(), ''admin''::app_role));', t, t);
  END LOOP;
END $$;

CREATE TRIGGER trg_marketplace_profiles_updated BEFORE UPDATE ON public.marketplace_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seller_prospects_updated BEFORE UPDATE ON public.seller_prospects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seller_recruitment_campaigns_updated BEFORE UPDATE ON public.seller_recruitment_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seller_onboarding_records_updated BEFORE UPDATE ON public.seller_onboarding_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seller_verification_checks_updated BEFORE UPDATE ON public.seller_verification_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_marketplace_listings_updated BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_seller_prospects_status ON public.seller_prospects(business_id, qualification_status);
CREATE INDEX idx_seller_onboarding_status ON public.seller_onboarding_records(business_id, onboarding_status);
CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings(business_id, listing_status);
CREATE INDEX idx_supply_demand_business ON public.marketplace_supply_demand_snapshots(business_id, created_at DESC);
