-- CRM-native education correction (additive only).
-- organisations becomes the canonical education company/account spine.
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS account_domain text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS education_group_id text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS operating_footprint text,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS primary_source text,
  ADD COLUMN IF NOT EXISTS source_version text,
  ADD COLUMN IF NOT EXISTS research_program_key text,
  ADD COLUMN IF NOT EXISTS is_education_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Safe partial uniqueness: only where the value is actually present.
CREATE UNIQUE INDEX IF NOT EXISTS organisations_source_key_uidx
  ON public.organisations (source_key)
  WHERE source_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organisations_account_domain_uidx
  ON public.organisations (lower(account_domain))
  WHERE account_domain IS NOT NULL AND account_domain <> '';

CREATE INDEX IF NOT EXISTS organisations_education_group_idx
  ON public.organisations (education_group_id)
  WHERE education_group_id IS NOT NULL;

-- contacts: canonical organisation FK + minimal education mapping fields.
-- contacts.company (text) is intentionally retained for legacy display.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS education_group_id text,
  ADD COLUMN IF NOT EXISTS education_role_family text,
  ADD COLUMN IF NOT EXISTS education_role_score integer,
  ADD COLUMN IF NOT EXISTS research_program_key text,
  ADD COLUMN IF NOT EXISTS reveal_status text NOT NULL DEFAULT 'not_revealed',
  ADD COLUMN IF NOT EXISTS is_research_candidate boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS contacts_organisation_id_idx ON public.contacts (organisation_id);
CREATE INDEX IF NOT EXISTS contacts_research_program_idx
  ON public.contacts (research_program_key)
  WHERE research_program_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_apollo_person_id_idx
  ON public.contacts (apollo_person_id)
  WHERE apollo_person_id IS NOT NULL;
