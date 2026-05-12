
-- Enums for the lead-quality layer
DO $$ BEGIN
  CREATE TYPE public.lead_quality_status AS ENUM (
    'raw','reviewed','qualified','needs_verification','needs_founder_review',
    'promoted_to_contact','rejected','suppressed','bounced','already_contacted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_campaign_fit AS ENUM (
    'dj','playlist_curator','music_blog','radio','event_promoter','creator_influencer','poor_fit'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_verification_status AS ENUM (
    'unknown','valid','risky','invalid','catch_all'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- One quality profile row per apollo_leads row
CREATE TABLE IF NOT EXISTS public.lead_quality_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apollo_lead_id uuid NOT NULL UNIQUE REFERENCES public.apollo_leads(id) ON DELETE CASCADE,
  quality_status public.lead_quality_status NOT NULL DEFAULT 'raw',
  campaign_fit public.lead_campaign_fit,
  fit_confidence numeric(3,2),
  fit_reason text,
  fit_method text, -- 'rules' | 'ai'
  risk_flags text[] NOT NULL DEFAULT ARRAY[]::text[],
  verification_status public.lead_verification_status NOT NULL DEFAULT 'unknown',
  needs_founder_review boolean NOT NULL DEFAULT false,
  founder_review_reason text,
  dup_of_contact_id uuid,
  dup_of_lead_id uuid,
  promoted_contact_id uuid,
  promoted_at timestamptz,
  scanned_at timestamptz,
  classified_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lqp_status   ON public.lead_quality_profiles(quality_status);
CREATE INDEX IF NOT EXISTS idx_lqp_fit      ON public.lead_quality_profiles(campaign_fit);
CREATE INDEX IF NOT EXISTS idx_lqp_lead     ON public.lead_quality_profiles(apollo_lead_id);
CREATE INDEX IF NOT EXISTS idx_lqp_promoted ON public.lead_quality_profiles(promoted_contact_id) WHERE promoted_contact_id IS NOT NULL;

ALTER TABLE public.lead_quality_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Founders manage lead quality profiles"
    ON public.lead_quality_profiles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reuse the existing updated_at trigger function if present
DO $$ BEGIN
  CREATE TRIGGER update_lead_quality_profiles_updated_at
    BEFORE UPDATE ON public.lead_quality_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill: every existing apollo lead gets a 'raw' profile
INSERT INTO public.lead_quality_profiles (apollo_lead_id, quality_status)
SELECT al.id, 'raw'::public.lead_quality_status
FROM public.apollo_leads al
LEFT JOIN public.lead_quality_profiles p ON p.apollo_lead_id = al.id
WHERE p.id IS NULL;

-- Mark apollo_leads that already produced a contact as promoted
UPDATE public.lead_quality_profiles p
SET quality_status = 'promoted_to_contact',
    promoted_contact_id = al.contact_id,
    promoted_at = COALESCE(p.promoted_at, al.updated_at, now())
FROM public.apollo_leads al
WHERE p.apollo_lead_id = al.id
  AND al.contact_id IS NOT NULL
  AND p.quality_status = 'raw';

-- Unified read view (named apollo_raw_leads for UI clarity)
CREATE OR REPLACE VIEW public.apollo_raw_leads AS
SELECT
  al.id                       AS apollo_lead_id,
  al.email,
  lower(split_part(al.email,'@',2)) AS email_domain,
  al.first_name,
  al.last_name,
  al.title,
  al.company,
  al.country,
  al.linkedin_url,
  al.apollo_person_id,
  al.apollo_org_id,
  al.business_name,
  al.status                   AS apollo_status,
  al.qualification            AS apollo_qualification,
  al.contact_id,
  p.id                        AS quality_profile_id,
  p.quality_status,
  p.campaign_fit,
  p.fit_confidence,
  p.fit_reason,
  p.fit_method,
  p.risk_flags,
  p.verification_status,
  p.needs_founder_review,
  p.founder_review_reason,
  p.dup_of_contact_id,
  p.dup_of_lead_id,
  p.promoted_contact_id,
  p.promoted_at,
  p.scanned_at,
  p.classified_at,
  al.created_at               AS lead_created_at,
  p.updated_at                AS profile_updated_at
FROM public.apollo_leads al
LEFT JOIN public.lead_quality_profiles p ON p.apollo_lead_id = al.id;

-- Counts panel for the Command Centre
CREATE OR REPLACE VIEW public.lead_quality_overview AS
SELECT
  COUNT(*)                                                            AS total_leads,
  COUNT(*) FILTER (WHERE p.quality_status = 'raw')                    AS raw_leads,
  COUNT(*) FILTER (WHERE p.quality_status = 'reviewed')               AS reviewed_leads,
  COUNT(*) FILTER (WHERE p.quality_status = 'qualified')              AS qualified_leads,
  COUNT(*) FILTER (WHERE p.quality_status = 'rejected')               AS rejected_leads,
  COUNT(*) FILTER (WHERE p.quality_status = 'needs_verification')     AS needs_verification,
  COUNT(*) FILTER (WHERE p.quality_status = 'needs_founder_review')   AS needs_founder_review,
  COUNT(*) FILTER (WHERE p.quality_status = 'promoted_to_contact')    AS promoted_contacts,
  COUNT(*) FILTER (WHERE p.quality_status IN ('suppressed','bounced','already_contacted')) AS terminal_blocked,
  COUNT(*) FILTER (
    WHERE p.quality_status = 'qualified'
      AND p.campaign_fit IS NOT NULL
      AND p.campaign_fit <> 'poor_fit'
  )                                                                   AS safe_to_queue,
  COUNT(*) FILTER (
    WHERE array_length(p.risk_flags,1) > 0
      AND p.quality_status NOT IN ('rejected','promoted_to_contact')
  )                                                                   AS duplicate_or_risky
FROM public.lead_quality_profiles p;
