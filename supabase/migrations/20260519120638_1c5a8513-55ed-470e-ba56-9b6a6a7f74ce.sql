-- ============================================================
-- Business Social Profile Generator — schema (Prompt 3)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_social_content_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  social_brain_profile_id uuid NULL,
  pillar_name text NOT NULL,
  pillar_description text NULL,
  target_audience text NULL,
  funnel_stage text NULL,
  recommended_platforms text[] NOT NULL DEFAULT '{}',
  example_topics text[] NOT NULL DEFAULT '{}',
  example_hooks text[] NOT NULL DEFAULT '{}',
  linked_offer text NULL,
  priority_score integer NOT NULL DEFAULT 0,
  approval_status text NOT NULL DEFAULT 'draft',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bscp_status_chk CHECK (approval_status IN ('draft','needs_review','approved','rejected','archived')),
  CONSTRAINT bscp_funnel_chk CHECK (funnel_stage IS NULL OR funnel_stage IN
    ('awareness','trust_building','lead_generation','conversion','onboarding','retention','upsell','win_back','authority','community'))
);
CREATE INDEX IF NOT EXISTS bscp_business_idx ON public.business_social_content_pillars(business_id);

CREATE TABLE IF NOT EXISTS public.business_social_platform_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  social_brain_profile_id uuid NULL,
  platform text NOT NULL,
  suitability_score integer NOT NULL DEFAULT 0,
  recommended_use text NULL,
  content_types text[] NOT NULL DEFAULT '{}',
  tone_adjustments text NULL,
  posting_frequency text NULL,
  best_time_notes text NULL,
  caption_rules text NULL,
  hashtag_rules text NULL,
  link_rules text NULL,
  engagement_rules text NULL,
  risk_notes text NULL,
  approval_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bspr_platform_chk CHECK (platform IN
    ('instagram','tiktok','youtube_shorts','facebook','linkedin','x_twitter','website_blog','email_newsletter','pinterest','other'))
);
CREATE INDEX IF NOT EXISTS bspr_business_idx ON public.business_social_platform_rules(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS bspr_business_platform_uniq ON public.business_social_platform_rules(business_id, platform);

CREATE TABLE IF NOT EXISTS public.business_social_offer_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  social_brain_profile_id uuid NULL,
  offer_name text NOT NULL,
  offer_summary text NULL,
  target_customer text NULL,
  pain_points text[] NOT NULL DEFAULT '{}',
  value_props text[] NOT NULL DEFAULT '{}',
  proof_needed text[] NOT NULL DEFAULT '{}',
  content_angles text[] NOT NULL DEFAULT '{}',
  suggested_ctas text[] NOT NULL DEFAULT '{}',
  linked_revenue_goal_id uuid NULL,
  funnel_stage text NOT NULL DEFAULT 'lead_generation',
  priority_score integer NOT NULL DEFAULT 0,
  approval_status text NOT NULL DEFAULT 'draft',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bsom_status_chk CHECK (approval_status IN ('draft','needs_review','approved','rejected','archived'))
);
CREATE INDEX IF NOT EXISTS bsom_business_idx ON public.business_social_offer_mappings(business_id);

CREATE TABLE IF NOT EXISTS public.business_social_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  social_brain_profile_id uuid NULL,
  risk_type text NOT NULL,
  risk_level text NOT NULL DEFAULT 'medium',
  risk_description text NOT NULL,
  affected_platforms text[] NOT NULL DEFAULT '{}',
  suggested_guardrail text NULL,
  founder_review_required boolean NOT NULL DEFAULT true,
  legal_review_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bsrf_type_chk CHECK (risk_type IN
    ('regulated_claims','health_claims','financial_claims','legal_claims','investment_claims',
     'children_education','charity_donor','property_investment','employment','privacy','copyright_ip',
     'testimonials','platform_policy','reputational','other')),
  CONSTRAINT bsrf_level_chk CHECK (risk_level IN ('low','medium','high','critical')),
  CONSTRAINT bsrf_status_chk CHECK (status IN ('open','acknowledged','mitigated','archived'))
);
CREATE INDEX IF NOT EXISTS bsrf_business_idx ON public.business_social_risk_flags(business_id);

CREATE TABLE IF NOT EXISTS public.business_social_profile_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  profile_id uuid NULL,
  version_number integer NOT NULL DEFAULT 1,
  version_status text NOT NULL DEFAULT 'draft',
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_from_sources uuid[] NOT NULL DEFAULT '{}',
  change_summary text NULL,
  founder_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bspv_status_chk CHECK (version_status IN ('draft','reviewed','approved','superseded','archived'))
);
CREATE INDEX IF NOT EXISTS bspv_business_idx ON public.business_social_profile_versions(business_id);

-- updated_at triggers (reuse existing function if present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $f$;
  END IF;
END $$;

CREATE TRIGGER bscp_updated BEFORE UPDATE ON public.business_social_content_pillars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bspr_updated BEFORE UPDATE ON public.business_social_platform_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bsom_updated BEFORE UPDATE ON public.business_social_offer_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER bsrf_updated BEFORE UPDATE ON public.business_social_risk_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS — founder/admin only
-- ============================================================
ALTER TABLE public.business_social_content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_social_platform_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_social_offer_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_social_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_social_profile_versions ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_social_content_pillars',
    'business_social_platform_rules',
    'business_social_offer_mappings',
    'business_social_risk_flags',
    'business_social_profile_versions'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_founder_all" ON public.%1$s', t);
    EXECUTE format($p$CREATE POLICY "%1$s_founder_all" ON public.%1$s
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))$p$, t);
  END LOOP;
END $$;