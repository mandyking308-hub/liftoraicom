
-- =====================================================================
-- Global PR Radar / Media Atlas — Phase 1: database foundation only
-- Founder/admin-only. No external sending, no Gmail scanning, no AI,
-- no seeded operational data beyond the controlled pr_sources catalogue.
-- =====================================================================

-- ---------- TABLES ----------

CREATE TABLE IF NOT EXISTS public.pr_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_type text NOT NULL,
  website_url text,
  account_email text,
  sender_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  platform_status text DEFAULT 'active',
  cost_status text DEFAULT 'free_or_trial',
  trial_status text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pr_inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.pr_sources(id) ON DELETE SET NULL,
  gmail_message_id text UNIQUE,
  gmail_thread_id text,
  sender_email text,
  sender_name text,
  subject text,
  snippet text,
  body_text text,
  received_at timestamptz,
  source_label text,
  raw_status text DEFAULT 'new',
  processed_status text DEFAULT 'unprocessed',
  is_likely_opportunity boolean DEFAULT false,
  ai_processed boolean DEFAULT false,
  ai_usage_id uuid,
  duplicate_of uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_message_id uuid REFERENCES public.pr_inbound_messages(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.pr_sources(id) ON DELETE SET NULL,
  opportunity_type text,
  category text,
  title text,
  publication_name text,
  journalist_name text,
  journalist_email text,
  platform_contact_only boolean DEFAULT false,
  platform_name text,
  country_market text,
  region_state text,
  beat text,
  topic text,
  request_summary text,
  exact_ask text,
  requested_assets text,
  deadline_at timestamptz,
  pitch_email text,
  pitch_url text,
  contact_route text,
  urgency_score integer DEFAULT 0,
  publication_value_score integer DEFAULT 0,
  global_relevance_score integer DEFAULT 0,
  seo_value_score integer DEFAULT 0,
  sales_value_score integer DEFAULT 0,
  relationship_value_score integer DEFAULT 0,
  risk_score integer DEFAULT 0,
  status text DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_name text NOT NULL,
  website_url text,
  country text,
  region_state text,
  city text,
  outlet_type text,
  audience_type text,
  beats jsonb NOT NULL DEFAULT '[]'::jsonb,
  submission_url text,
  contact_page_url text,
  pitch_policy_notes text,
  domain_authority_estimate integer,
  backlink_value_score integer DEFAULT 0,
  quality_score integer DEFAULT 0,
  caution_status text DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journalist_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  outlet_id uuid REFERENCES public.media_outlets(id) ON DELETE SET NULL,
  publication_name text,
  email text,
  platform_profile_url text,
  platform_name text,
  country text,
  region_state text,
  city text,
  beat text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_first_seen text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  last_verified_at timestamptz,
  contact_route text DEFAULT 'unknown',
  relationship_status text DEFAULT 'new',
  warmth_score integer DEFAULT 0,
  reply_history_score integer DEFAULT 0,
  coverage_history_score integer DEFAULT 0,
  do_not_contact boolean DEFAULT false,
  opt_out_at timestamptz,
  caution_notes text,
  priority_score integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sector_leader_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  title text,
  company text,
  country text,
  region_state text,
  city text,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_url text,
  source_platform text,
  latest_quote_or_signal text,
  matched_business_id uuid,
  potential_use_case text,
  contact_route text DEFAULT 'unknown',
  relationship_status text DEFAULT 'new',
  priority_score integer DEFAULT 0,
  permission_status text DEFAULT 'not_requested',
  caution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_opportunity_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.media_opportunities(id) ON DELETE CASCADE,
  business_id uuid,
  match_score integer DEFAULT 0,
  match_reason text,
  active_business_gate_status text,
  press_readiness_status text,
  missing_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_notes text,
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_press_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  business_name text,
  is_active boolean DEFAULT false,
  website_live boolean DEFAULT false,
  public_offer_live boolean DEFAULT false,
  approved_one_line_description text,
  approved_50_word_description text,
  approved_150_word_description text,
  approved_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_logo jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_founder_quote text,
  approved_company_quotes jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_case_studies jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_press_contact text,
  blocked_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  compliance_clearance_status text DEFAULT 'not_checked',
  press_ready_status text DEFAULT 'not_active',
  missing_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_press_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  pack_name text,
  one_line_description text,
  short_description text,
  long_description text,
  website_url text,
  product_service_details text,
  pricing_notes text,
  availability_notes text,
  approved_quote_bank jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_asset_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  logo_asset_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_bio_public text,
  company_backgrounder text,
  approved_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  press_contact_details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_pitch_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.media_opportunities(id) ON DELETE SET NULL,
  business_id uuid,
  journalist_relationship_id uuid REFERENCES public.journalist_relationships(id) ON DELETE SET NULL,
  outlet_id uuid REFERENCES public.media_outlets(id) ON DELETE SET NULL,
  draft_subject text,
  draft_body text,
  quote_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  asset_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  send_method text DEFAULT 'manual_review_only',
  platform_instructions text,
  risk_level text DEFAULT 'medium',
  compliance_notes text,
  approval_status text DEFAULT 'draft',
  founder_approved_at timestamptz,
  created_by_ai boolean DEFAULT false,
  ai_usage_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_pitch_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_draft_id uuid REFERENCES public.media_pitch_drafts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.media_opportunities(id) ON DELETE SET NULL,
  business_id uuid,
  submitted_via text,
  submitted_at timestamptz,
  submitted_by uuid,
  gmail_thread_id text,
  platform_name text,
  reply_status text DEFAULT 'not_submitted',
  follow_up_due_at timestamptz,
  outcome_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coverage_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  outlet_id uuid REFERENCES public.media_outlets(id) ON DELETE SET NULL,
  journalist_relationship_id uuid REFERENCES public.journalist_relationships(id) ON DELETE SET NULL,
  article_title text,
  article_url text,
  publication_name text,
  published_at timestamptz,
  coverage_type text,
  quote_used text,
  backlink_url text,
  screenshot_asset_url text,
  pdf_asset_url text,
  traffic_impact_notes text,
  lead_sales_impact_notes text,
  seo_value_score integer DEFAULT 0,
  reuse_permission_status text DEFAULT 'unknown',
  featured_in_allowed boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quarterly_pr_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  quarter text,
  year integer,
  campaign_theme text,
  target_markets jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_outlet_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_journalists jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_sector_leaders jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  owned_article_needed boolean DEFAULT false,
  pitch_angle text,
  status text DEFAULT 'planned',
  due_date date,
  founder_approval_status text DEFAULT 'not_requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.owned_media_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  campaign_id uuid REFERENCES public.quarterly_pr_campaigns(id) ON DELETE SET NULL,
  title text,
  article_type text,
  draft_body text,
  target_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_opportunity_id uuid REFERENCES public.media_opportunities(id) ON DELETE SET NULL,
  related_journalist_id uuid REFERENCES public.journalist_relationships(id) ON DELETE SET NULL,
  publication_status text DEFAULT 'draft',
  publish_url text,
  approval_status text DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pr_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_type text,
  related_id uuid,
  risk_category text,
  risk_level text,
  description text,
  recommended_action text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pr_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  event_type text,
  related_type text,
  related_id uuid,
  event_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- GRANTS (founder/admin policies; service_role for admin code) ----------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pr_sources','pr_inbound_messages','media_opportunities','media_outlets',
    'journalist_relationships','sector_leader_profiles','media_opportunity_matches',
    'business_press_readiness','business_press_packs','media_pitch_drafts',
    'media_pitch_submissions','coverage_mentions','quarterly_pr_campaigns',
    'owned_media_articles','pr_risk_events','pr_audit_events'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END$$;

-- ---------- RLS POLICIES (founder/admin only, matching project convention) ----------

DO $$
DECLARE
  t text;
  pol text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pr_sources','pr_inbound_messages','media_opportunities','media_outlets',
    'journalist_relationships','sector_leader_profiles','media_opportunity_matches',
    'business_press_readiness','business_press_packs','media_pitch_drafts',
    'media_pitch_submissions','coverage_mentions','quarterly_pr_campaigns',
    'owned_media_articles','pr_risk_events','pr_audit_events'
  ] LOOP
    pol := format('Founders/admins manage %s', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (has_role(auth.uid(), ''admin''::app_role) OR has_role(auth.uid(), ''founder''::app_role))
         WITH CHECK (has_role(auth.uid(), ''admin''::app_role) OR has_role(auth.uid(), ''founder''::app_role));',
      pol, t
    );
  END LOOP;
END$$;

-- ---------- updated_at TRIGGERS ----------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pr_sources','pr_inbound_messages','media_opportunities','media_outlets',
    'journalist_relationships','sector_leader_profiles','media_opportunity_matches',
    'business_press_readiness','business_press_packs','media_pitch_drafts',
    'media_pitch_submissions','coverage_mentions','quarterly_pr_campaigns',
    'owned_media_articles'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t, t
    );
  END LOOP;
END$$;

-- ---------- INDEXES ----------

CREATE INDEX IF NOT EXISTS idx_pr_inbound_gmail_message_id ON public.pr_inbound_messages (gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_pr_inbound_gmail_thread_id  ON public.pr_inbound_messages (gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_pr_inbound_source_id        ON public.pr_inbound_messages (source_id);
CREATE INDEX IF NOT EXISTS idx_pr_inbound_received_at      ON public.pr_inbound_messages (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_inbound_created_at       ON public.pr_inbound_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_opp_source_id      ON public.media_opportunities (source_id);
CREATE INDEX IF NOT EXISTS idx_media_opp_deadline_at    ON public.media_opportunities (deadline_at);
CREATE INDEX IF NOT EXISTS idx_media_opp_status         ON public.media_opportunities (status);
CREATE INDEX IF NOT EXISTS idx_media_opp_contact_route  ON public.media_opportunities (contact_route);
CREATE INDEX IF NOT EXISTS idx_media_opp_created_at     ON public.media_opportunities (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_journalist_email          ON public.journalist_relationships (email);
CREATE INDEX IF NOT EXISTS idx_journalist_platform_name  ON public.journalist_relationships (platform_name);
CREATE INDEX IF NOT EXISTS idx_journalist_contact_route  ON public.journalist_relationships (contact_route);
CREATE INDEX IF NOT EXISTS idx_journalist_outlet_id      ON public.journalist_relationships (outlet_id);

CREATE INDEX IF NOT EXISTS idx_sector_leader_source_platform ON public.sector_leader_profiles (source_platform);
CREATE INDEX IF NOT EXISTS idx_sector_leader_contact_route   ON public.sector_leader_profiles (contact_route);

CREATE INDEX IF NOT EXISTS idx_opp_match_business_id    ON public.media_opportunity_matches (business_id);
CREATE INDEX IF NOT EXISTS idx_opp_match_opportunity_id ON public.media_opportunity_matches (opportunity_id);

CREATE INDEX IF NOT EXISTS idx_pitch_draft_approval_status ON public.media_pitch_drafts (approval_status);
CREATE INDEX IF NOT EXISTS idx_pitch_draft_business_id     ON public.media_pitch_drafts (business_id);

CREATE INDEX IF NOT EXISTS idx_pitch_submission_business_id ON public.media_pitch_submissions (business_id);
CREATE INDEX IF NOT EXISTS idx_pitch_submission_opp_id      ON public.media_pitch_submissions (opportunity_id);

CREATE INDEX IF NOT EXISTS idx_quarterly_pr_business_id ON public.quarterly_pr_campaigns (business_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_pr_due_date    ON public.quarterly_pr_campaigns (due_date);

CREATE INDEX IF NOT EXISTS idx_coverage_business_id ON public.coverage_mentions (business_id);
CREATE INDEX IF NOT EXISTS idx_coverage_outlet_id   ON public.coverage_mentions (outlet_id);
CREATE INDEX IF NOT EXISTS idx_coverage_published_at ON public.coverage_mentions (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_pr_audit_created_at ON public.pr_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_risk_created_at  ON public.pr_risk_events  (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_outlets_country ON public.media_outlets (country);
CREATE INDEX IF NOT EXISTS idx_business_press_ready_business_id ON public.business_press_readiness (business_id);
CREATE INDEX IF NOT EXISTS idx_business_press_packs_business_id ON public.business_press_packs (business_id);
CREATE INDEX IF NOT EXISTS idx_owned_articles_business_id ON public.owned_media_articles (business_id);
CREATE INDEX IF NOT EXISTS idx_owned_articles_campaign_id ON public.owned_media_articles (campaign_id);

-- ---------- SEED: pr_sources catalogue only ----------

INSERT INTO public.pr_sources (source_name, source_type, cost_status, platform_status)
VALUES
  ('Editorielle',     'email_feed',          'free_or_trial', 'active'),
  ('Source of Sources','email_feed',         'free_or_trial', 'active'),
  ('HARO',            'email_feed',          'free_or_trial', 'active'),
  ('PressPlugs',      'email_feed',          'free_or_trial', 'active'),
  ('ResponseSource',  'email_feed_future',   'free_or_trial', 'parked'),
  ('Qwoted',          'platform_only',       'free_or_trial', 'active'),
  ('Featured',        'parked',              'free_or_trial', 'parked'),
  ('Muck Rack',       'paid_database_future','paid_future',   'parked'),
  ('Cision',          'paid_database_future','paid_future',   'parked'),
  ('Vuelio',          'paid_database_future','paid_future',   'parked'),
  ('Meltwater',       'paid_database_future','paid_future',   'parked'),
  ('GDELT',           'public_web_future',   'free_or_trial', 'parked')
ON CONFLICT DO NOTHING;
