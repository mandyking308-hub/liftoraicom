-- ============================================================
-- Apollo integration + central contact pool foundation
-- ============================================================

-- pgcrypto for AES encryption of Apollo API keys
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. Extend contacts with Apollo / portfolio / suppression fields
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE apollo_enrichment_status AS ENUM (
    'pending','attempted','succeeded','failed','no_email','skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_sendable_status AS ENUM (
    'sendable','not_sendable','needs_review','suppressed','duplicate','enrichment_failed','no_email'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_name              text,
  ADD COLUMN IF NOT EXISTS last_name               text,
  ADD COLUMN IF NOT EXISTS phone                   text,
  ADD COLUMN IF NOT EXISTS apollo_person_id        text,
  ADD COLUMN IF NOT EXISTS apollo_organization_id  text,
  ADD COLUMN IF NOT EXISTS first_imported_business text,
  ADD COLUMN IF NOT EXISTS first_imported_campaign uuid,
  ADD COLUMN IF NOT EXISTS email_verified_status   text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS sendable_status         contact_sendable_status NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS apollo_enrichment_status apollo_enrichment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS apollo_last_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_globally_suppressed  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS global_suppression_reason text,
  ADD COLUMN IF NOT EXISTS global_suppression_at   timestamptz,
  ADD COLUMN IF NOT EXISTS hard_bounced            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags                    text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes                   text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS contacts_apollo_person_id_uniq
  ON public.contacts(apollo_person_id)
  WHERE apollo_person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS contacts_tags_gin ON public.contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS contacts_sendable_status_idx ON public.contacts(sendable_status);
CREATE INDEX IF NOT EXISTS contacts_globally_suppressed_idx ON public.contacts(is_globally_suppressed) WHERE is_globally_suppressed = true;

-- ------------------------------------------------------------
-- 2. business_contact_relationships
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE bcr_qualification AS ENUM ('qualified','maybe','not_qualified','needs_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bcr_stage AS ENUM ('ready_to_stage','staged','contacted','engaged','client','do_not_contact','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.business_contact_relationships (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  business_name       text NOT NULL,
  relevance_category  text,
  qualification       bcr_qualification NOT NULL DEFAULT 'needs_review',
  qualification_reason text NOT NULL DEFAULT '',
  campaign_eligible   boolean NOT NULL DEFAULT false,
  do_not_contact      boolean NOT NULL DEFAULT false,
  do_not_contact_reason text NOT NULL DEFAULT '',
  current_stage       bcr_stage NOT NULL DEFAULT 'ready_to_stage',
  source_segment_id   uuid,
  last_campaign_id    uuid,
  notes               text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, business_name)
);

CREATE INDEX IF NOT EXISTS bcr_business_idx ON public.business_contact_relationships(business_name);
CREATE INDEX IF NOT EXISTS bcr_qualification_idx ON public.business_contact_relationships(qualification);
CREATE INDEX IF NOT EXISTS bcr_stage_idx ON public.business_contact_relationships(current_stage);

ALTER TABLE public.business_contact_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage business_contact_relationships"
  ON public.business_contact_relationships
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER bcr_updated_at
  BEFORE UPDATE ON public.business_contact_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Global suppression always wins: block eligibility if globally suppressed
CREATE OR REPLACE FUNCTION public.guard_bcr_global_suppression()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_suppressed boolean;
BEGIN
  IF NEW.campaign_eligible = true OR NEW.current_stage IN ('staged','contacted') THEN
    SELECT is_globally_suppressed INTO is_suppressed
    FROM public.contacts WHERE id = NEW.contact_id;
    IF is_suppressed THEN
      RAISE EXCEPTION 'Contact % is globally suppressed and cannot be made campaign-eligible', NEW.contact_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bcr_guard_suppression ON public.business_contact_relationships;
CREATE TRIGGER trg_bcr_guard_suppression
  BEFORE INSERT OR UPDATE ON public.business_contact_relationships
  FOR EACH ROW EXECUTE FUNCTION public.guard_bcr_global_suppression();

-- ------------------------------------------------------------
-- 3. Apollo connections (per-business, encrypted key)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.apollo_connections (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name               text NOT NULL UNIQUE,
  api_key_cipher              bytea NOT NULL,
  api_key_last4               text NOT NULL,
  search_api_verified_at      timestamptz,
  search_api_status           text NOT NULL DEFAULT 'unverified',
  search_api_error            text NOT NULL DEFAULT '',
  enrichment_api_verified_at  timestamptz,
  enrichment_api_status       text NOT NULL DEFAULT 'unverified',
  enrichment_api_error        text NOT NULL DEFAULT '',
  is_active                   boolean NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apollo_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage apollo_connections"
  ON public.apollo_connections
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER apollo_connections_updated_at
  BEFORE UPDATE ON public.apollo_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Encryption helpers (only useful from service role / edge functions)
CREATE OR REPLACE FUNCTION public.apollo_encrypt_key(plain text, enc_key text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF enc_key IS NULL OR length(enc_key) < 16 THEN
    RAISE EXCEPTION 'apollo encryption key missing or too short';
  END IF;
  RETURN pgp_sym_encrypt(plain, enc_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.apollo_decrypt_key(cipher bytea, enc_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF enc_key IS NULL OR length(enc_key) < 16 THEN
    RAISE EXCEPTION 'apollo encryption key missing or too short';
  END IF;
  RETURN pgp_sym_decrypt(cipher, enc_key);
END;
$$;

REVOKE ALL ON FUNCTION public.apollo_encrypt_key(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apollo_decrypt_key(bytea,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apollo_encrypt_key(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apollo_decrypt_key(bytea,text) TO service_role;

-- ------------------------------------------------------------
-- 4. Apollo sync segments (per-business sync config)
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE apollo_segment_mode AS ENUM ('saved_list','people_search');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.apollo_sync_segments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name            text NOT NULL,
  segment_name             text NOT NULL,
  mode                     apollo_segment_mode NOT NULL DEFAULT 'saved_list',
  saved_list_id            text,
  search_criteria          jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_contacts_per_run     integer NOT NULL DEFAULT 25,
  hold_for_approval        boolean NOT NULL DEFAULT true,
  auto_qualify             boolean NOT NULL DEFAULT true,
  default_tags             text[] NOT NULL DEFAULT '{}',
  default_relevance_category text,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_name, segment_name)
);

ALTER TABLE public.apollo_sync_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage apollo_sync_segments"
  ON public.apollo_sync_segments
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER apollo_sync_segments_updated_at
  BEFORE UPDATE ON public.apollo_sync_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 5. Apollo sync runs (audit log)
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE apollo_run_status AS ENUM (
    'pending','search_running','awaiting_enrichment_approval','enriching','importing','completed','failed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.apollo_sync_runs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id               uuid NOT NULL REFERENCES public.apollo_sync_segments(id) ON DELETE CASCADE,
  business_name            text NOT NULL,
  status                   apollo_run_status NOT NULL DEFAULT 'pending',
  triggered_by             uuid,
  search_pages_fetched     integer NOT NULL DEFAULT 0,
  people_found             integer NOT NULL DEFAULT 0,
  people_with_email_flag   integer NOT NULL DEFAULT 0,
  enrichment_attempted     integer NOT NULL DEFAULT 0,
  emails_returned          integer NOT NULL DEFAULT 0,
  contacts_imported        integer NOT NULL DEFAULT 0,
  contacts_skipped_no_email integer NOT NULL DEFAULT 0,
  contacts_duplicate       integer NOT NULL DEFAULT 0,
  contacts_suppressed      integer NOT NULL DEFAULT 0,
  qualified_count          integer NOT NULL DEFAULT 0,
  maybe_count              integer NOT NULL DEFAULT 0,
  not_qualified_count      integer NOT NULL DEFAULT 0,
  needs_review_count       integer NOT NULL DEFAULT 0,
  ready_to_stage_count     integer NOT NULL DEFAULT 0,
  apollo_credits_used      integer,
  errors                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at               timestamptz NOT NULL DEFAULT now(),
  completed_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS apollo_sync_runs_segment_idx ON public.apollo_sync_runs(segment_id);
CREATE INDEX IF NOT EXISTS apollo_sync_runs_status_idx ON public.apollo_sync_runs(status);

ALTER TABLE public.apollo_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage apollo_sync_runs"
  ON public.apollo_sync_runs
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER apollo_sync_runs_updated_at
  BEFORE UPDATE ON public.apollo_sync_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 6. Apollo leads (per-sync person snapshots)
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE apollo_lead_status AS ENUM (
    'found','has_email','enrichment_pending','enriched','imported',
    'skipped_no_email','duplicate','suppressed','error','not_qualified','maybe','qualified'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.apollo_leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              uuid NOT NULL REFERENCES public.apollo_sync_runs(id) ON DELETE CASCADE,
  segment_id          uuid NOT NULL REFERENCES public.apollo_sync_segments(id) ON DELETE CASCADE,
  business_name       text NOT NULL,
  apollo_person_id    text NOT NULL,
  apollo_org_id       text,
  has_email_flag      boolean NOT NULL DEFAULT false,
  search_payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  enrichment_payload  jsonb,
  email               text,
  first_name          text,
  last_name           text,
  title               text,
  company             text,
  linkedin_url        text,
  country             text,
  status              apollo_lead_status NOT NULL DEFAULT 'found',
  qualification       bcr_qualification,
  qualification_reason text NOT NULL DEFAULT '',
  ai_tags             text[] NOT NULL DEFAULT '{}',
  contact_id          uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  error               text NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, apollo_person_id)
);

CREATE INDEX IF NOT EXISTS apollo_leads_run_idx ON public.apollo_leads(run_id);
CREATE INDEX IF NOT EXISTS apollo_leads_status_idx ON public.apollo_leads(status);
CREATE INDEX IF NOT EXISTS apollo_leads_apollo_person_idx ON public.apollo_leads(apollo_person_id);

ALTER TABLE public.apollo_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage apollo_leads"
  ON public.apollo_leads
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER apollo_leads_updated_at
  BEFORE UPDATE ON public.apollo_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();