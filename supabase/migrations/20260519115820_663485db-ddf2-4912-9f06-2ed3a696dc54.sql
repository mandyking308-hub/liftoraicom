
CREATE TABLE IF NOT EXISTS public.business_social_knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source_type text NOT NULL,
  title text NOT NULL,
  source_url text,
  storage_path text,
  pasted_text text,
  summary text,
  source_status text DEFAULT 'registered',
  reliability_level text DEFAULT 'unreviewed',
  approved_for_social_training boolean DEFAULT false,
  founder_notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.business_social_knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.business_social_brain_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  profile_status text DEFAULT 'draft',
  business_summary text,
  brand_voice text,
  audience_summary text,
  ideal_customer_profile text,
  primary_offer_summary text,
  secondary_offer_summary text,
  primary_cta text,
  secondary_cta text,
  content_pillars jsonb DEFAULT '[]'::jsonb,
  platform_recommendations jsonb DEFAULT '{}'::jsonb,
  posting_cadence jsonb DEFAULT '{}'::jsonb,
  funnel_stage_rules jsonb DEFAULT '{}'::jsonb,
  engagement_rules jsonb DEFAULT '{}'::jsonb,
  dm_rules jsonb DEFAULT '{}'::jsonb,
  escalation_rules jsonb DEFAULT '{}'::jsonb,
  forbidden_claims text[] DEFAULT '{}',
  forbidden_phrases text[] DEFAULT '{}',
  required_disclaimers text[] DEFAULT '{}',
  compliance_notes text,
  content_do text[] DEFAULT '{}',
  content_do_not text[] DEFAULT '{}',
  offer_angles jsonb DEFAULT '[]'::jsonb,
  objection_bank jsonb DEFAULT '[]'::jsonb,
  hashtag_bank jsonb DEFAULT '[]'::jsonb,
  hook_bank jsonb DEFAULT '[]'::jsonb,
  confidence_score integer DEFAULT 0,
  missing_inputs text[] DEFAULT '{}',
  founder_notes text,
  last_generated_at timestamptz,
  last_approved_at timestamptz,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.business_social_brain_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.business_social_brain_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source_ids uuid[] DEFAULT '{}',
  extraction_status text DEFAULT 'preview',
  extracted_brand_voice text,
  extracted_audience text,
  extracted_offers jsonb DEFAULT '[]'::jsonb,
  extracted_ctas jsonb DEFAULT '[]'::jsonb,
  extracted_content_pillars jsonb DEFAULT '[]'::jsonb,
  extracted_platform_rules jsonb DEFAULT '{}'::jsonb,
  extracted_forbidden_claims text[] DEFAULT '{}',
  extracted_escalation_rules jsonb DEFAULT '{}'::jsonb,
  extracted_compliance_notes text,
  missing_inputs text[] DEFAULT '{}',
  confidence_score integer DEFAULT 0,
  model_notes text,
  founder_review_required boolean DEFAULT true,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.business_social_brain_extractions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.business_social_profile_approval_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  profile_id uuid REFERENCES public.business_social_brain_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  founder_notes text,
  before_json jsonb DEFAULT '{}'::jsonb,
  after_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.business_social_profile_approval_log ENABLE ROW LEVEL SECURITY;

-- Triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'business_social_knowledge_sources','business_social_brain_profiles','business_social_brain_extractions'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.social_set_updated_at();', t, t);
  END LOOP;
END $$;

-- RLS founder/admin policies
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'business_social_knowledge_sources','business_social_brain_profiles',
    'business_social_brain_extractions','business_social_profile_approval_log'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Founders manage %I" ON public.%I;', t, t);
    EXECUTE format($p$
      CREATE POLICY "Founders manage %I" ON public.%I
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));
    $p$, t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_bsk_sources_business ON public.business_social_knowledge_sources(business_id);
CREATE INDEX IF NOT EXISTS idx_bsb_extractions_business ON public.business_social_brain_extractions(business_id);
CREATE INDEX IF NOT EXISTS idx_bsp_approval_log_business ON public.business_social_profile_approval_log(business_id);
