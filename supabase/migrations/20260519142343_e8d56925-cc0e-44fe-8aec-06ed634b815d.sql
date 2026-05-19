
-- 1. social_competitor_profiles
CREATE TABLE IF NOT EXISTS public.social_competitor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  competitor_name text NOT NULL,
  competitor_type text NOT NULL DEFAULT 'direct_competitor',
  website_url text,
  notes text,
  relevance_reason text,
  target_audience_notes text,
  offer_notes text,
  positioning_notes text,
  strengths text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  watch_priority text NOT NULL DEFAULT 'normal',
  watch_status text NOT NULL DEFAULT 'active',
  evidence_level text NOT NULL DEFAULT 'manual_unverified',
  founder_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scp_business ON public.social_competitor_profiles(business_id);

-- 2. social_competitor_accounts
CREATE TABLE IF NOT EXISTS public.social_competitor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  competitor_id uuid NOT NULL REFERENCES public.social_competitor_profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  account_handle text,
  account_url text,
  account_status text NOT NULL DEFAULT 'active',
  follower_count integer,
  follower_count_observed_at timestamptz,
  notes text,
  evidence_level text NOT NULL DEFAULT 'manual_unverified',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sca_business ON public.social_competitor_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_sca_competitor ON public.social_competitor_accounts(competitor_id);

-- 3. social_competitor_observations
CREATE TABLE IF NOT EXISTS public.social_competitor_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  competitor_id uuid REFERENCES public.social_competitor_profiles(id) ON DELETE SET NULL,
  competitor_account_id uuid REFERENCES public.social_competitor_accounts(id) ON DELETE SET NULL,
  observation_type text NOT NULL,
  observation_status text NOT NULL DEFAULT 'draft',
  platform text,
  source_url text,
  source_label text,
  observed_at timestamptz,
  observation_title text,
  observation_text text NOT NULL,
  content_format text,
  hook_observed text,
  cta_observed text,
  offer_observed text,
  audience_reaction_notes text,
  apparent_strength text,
  apparent_weakness text,
  evidence_level text NOT NULL DEFAULT 'manual_unverified',
  risk_flags text[] NOT NULL DEFAULT '{}',
  founder_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sco_business ON public.social_competitor_observations(business_id);
CREATE INDEX IF NOT EXISTS idx_sco_competitor ON public.social_competitor_observations(competitor_id);

-- 4. social_competitor_content_patterns
CREATE TABLE IF NOT EXISTS public.social_competitor_content_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  competitor_id uuid REFERENCES public.social_competitor_profiles(id) ON DELETE SET NULL,
  pattern_type text NOT NULL,
  pattern_status text NOT NULL DEFAULT 'draft',
  platform text,
  pattern_title text NOT NULL,
  pattern_description text,
  evidence_observation_ids uuid[] NOT NULL DEFAULT '{}',
  example_summary text,
  why_it_may_work text,
  legally_distinct_adaptation text,
  risk_flags text[] NOT NULL DEFAULT '{}',
  confidence_score integer NOT NULL DEFAULT 0,
  founder_review_required boolean NOT NULL DEFAULT true,
  approved_for_strategy boolean NOT NULL DEFAULT false,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sccp_business ON public.social_competitor_content_patterns(business_id);

-- 5. social_trend_signals
CREATE TABLE IF NOT EXISTS public.social_trend_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  trend_title text NOT NULL,
  trend_type text NOT NULL,
  trend_status text NOT NULL DEFAULT 'draft',
  platform text,
  source_url text,
  source_label text,
  observed_at timestamptz,
  trend_description text,
  audience_notes text,
  relevance_to_business text,
  suggested_use text,
  risk_flags text[] NOT NULL DEFAULT '{}',
  evidence_level text NOT NULL DEFAULT 'manual_unverified',
  confidence_score integer NOT NULL DEFAULT 0,
  founder_review_required boolean NOT NULL DEFAULT true,
  approved_for_strategy boolean NOT NULL DEFAULT false,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sts_business ON public.social_trend_signals(business_id);

-- 6. social_market_positioning_reviews
CREATE TABLE IF NOT EXISTS public.social_market_positioning_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  review_name text NOT NULL,
  review_status text NOT NULL DEFAULT 'draft',
  period_start date,
  period_end date,
  competitors_reviewed integer NOT NULL DEFAULT 0,
  observations_reviewed integer NOT NULL DEFAULT 0,
  trends_reviewed integer NOT NULL DEFAULT 0,
  content_gaps text[] NOT NULL DEFAULT '{}',
  offer_gaps text[] NOT NULL DEFAULT '{}',
  proof_gaps text[] NOT NULL DEFAULT '{}',
  positioning_opportunities text[] NOT NULL DEFAULT '{}',
  risk_warnings text[] NOT NULL DEFAULT '{}',
  recommended_actions text[] NOT NULL DEFAULT '{}',
  confidence_score integer NOT NULL DEFAULT 0,
  founder_review_required boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'draft',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_smpr_business ON public.social_market_positioning_reviews(business_id);

-- 7. social_market_learning_signals
CREATE TABLE IF NOT EXISTS public.social_market_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  signal_type text NOT NULL,
  signal_status text NOT NULL DEFAULT 'draft',
  source_competitor_id uuid REFERENCES public.social_competitor_profiles(id) ON DELETE SET NULL,
  source_observation_id uuid REFERENCES public.social_competitor_observations(id) ON DELETE SET NULL,
  source_trend_id uuid REFERENCES public.social_trend_signals(id) ON DELETE SET NULL,
  positioning_review_id uuid REFERENCES public.social_market_positioning_reviews(id) ON DELETE SET NULL,
  signal_title text NOT NULL,
  signal_description text,
  evidence_summary text,
  recommendation text,
  legally_distinct_adaptation text,
  impact_area text,
  confidence_score integer NOT NULL DEFAULT 0,
  founder_review_required boolean NOT NULL DEFAULT true,
  approved_for_strategy boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  approved_by text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_smls_business ON public.social_market_learning_signals(business_id);

-- 8. social_competitor_trend_audit
CREATE TABLE IF NOT EXISTS public.social_competitor_trend_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  competitor_id uuid REFERENCES public.social_competitor_profiles(id) ON DELETE SET NULL,
  observation_id uuid REFERENCES public.social_competitor_observations(id) ON DELETE SET NULL,
  trend_id uuid REFERENCES public.social_trend_signals(id) ON DELETE SET NULL,
  pattern_id uuid REFERENCES public.social_competitor_content_patterns(id) ON DELETE SET NULL,
  positioning_review_id uuid REFERENCES public.social_market_positioning_reviews(id) ON DELETE SET NULL,
  market_signal_id uuid REFERENCES public.social_market_learning_signals(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text NOT NULL DEFAULT 'recorded',
  before_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_calls integer NOT NULL DEFAULT 0,
  scraped_pages integer NOT NULL DEFAULT 0,
  competitor_claims_published integer NOT NULL DEFAULT 0,
  copied_assets_created integer NOT NULL DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scta_business ON public.social_competitor_trend_audit(business_id);

-- Extensions on existing tables
DO $$ BEGIN
  ALTER TABLE public.social_content_packs ADD COLUMN IF NOT EXISTS market_learning_signal_id uuid;
  ALTER TABLE public.social_content_packs ADD COLUMN IF NOT EXISTS competitor_inspiration_status text DEFAULT 'none';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS market_learning_signal_id uuid;
  ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS competitor_inspiration_status text DEFAULT 'none';
  ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS trend_signal_id uuid;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS market_positioning_review_id uuid;
  ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS market_learning_status text DEFAULT 'not_reviewed';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.social_strategy_recommendations ADD COLUMN IF NOT EXISTS market_learning_signal_id uuid;
  ALTER TABLE public.social_strategy_recommendations ADD COLUMN IF NOT EXISTS competitor_pattern_id uuid;
  ALTER TABLE public.social_strategy_recommendations ADD COLUMN IF NOT EXISTS trend_signal_id uuid;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Enable RLS
ALTER TABLE public.social_competitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_competitor_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_competitor_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_competitor_content_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_trend_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_market_positioning_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_market_learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_competitor_trend_audit ENABLE ROW LEVEL SECURITY;

-- Policies (founder/admin only)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'social_competitor_profiles','social_competitor_accounts','social_competitor_observations',
    'social_competitor_content_patterns','social_trend_signals','social_market_positioning_reviews',
    'social_market_learning_signals','social_competitor_trend_audit'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_founder_all" ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%I_founder_all" ON public.%I
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
    $p$, t, t);
  END LOOP;
END $$;

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'social_competitor_profiles','social_competitor_accounts','social_competitor_observations',
    'social_competitor_content_patterns','social_trend_signals','social_market_positioning_reviews',
    'social_market_learning_signals'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;
