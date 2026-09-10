-- Education CRM-native correction — 10 September 2026
-- Additive only. No education data import in this migration.
-- Canonical company truth: organisations. Canonical person truth: contacts.

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS education_group_id text,
  ADD COLUMN IF NOT EXISTS website_domain text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS operating_footprint text,
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS source_notes text,
  ADD COLUMN IF NOT EXISTS primary_source text,
  ADD COLUMN IF NOT EXISTS is_education_target boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS education_priority_tier text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_organisations_education_source_key
  ON public.organisations (source_key)
  WHERE source_key LIKE 'education_152_master:%';

CREATE UNIQUE INDEX IF NOT EXISTS ux_organisations_education_group_id
  ON public.organisations (education_group_id)
  WHERE education_group_id IS NOT NULL AND is_education_target = true;

CREATE INDEX IF NOT EXISTS ix_organisations_education_domain
  ON public.organisations (lower(website_domain))
  WHERE is_education_target = true AND website_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_organisations_education_qualification
  ON public.organisations (qualification)
  WHERE is_education_target = true;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id),
  ADD COLUMN IF NOT EXISTS education_group_id text,
  ADD COLUMN IF NOT EXISTS strategic_target_account_id uuid REFERENCES public.strategic_target_accounts(id),
  ADD COLUMN IF NOT EXISTS education_role_family text,
  ADD COLUMN IF NOT EXISTS education_role_score numeric,
  ADD COLUMN IF NOT EXISTS research_program_key text,
  ADD COLUMN IF NOT EXISTS reveal_status text;

CREATE INDEX IF NOT EXISTS ix_contacts_organisation_id
  ON public.contacts (organisation_id)
  WHERE organisation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_contacts_education_group_id
  ON public.contacts (education_group_id)
  WHERE education_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_contacts_education_program
  ON public.contacts (research_program_key)
  WHERE research_program_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_contacts_education_reveal_status
  ON public.contacts (reveal_status)
  WHERE research_program_key = 'education_152_master_2026_09';

COMMENT ON COLUMN public.organisations.education_group_id IS
  'Stable EDU-### identifier for the reviewed education account universe. Canonical account identity remains organisations.id.';
COMMENT ON COLUMN public.contacts.organisation_id IS
  'Canonical CRM company/account link for contacts. New education contacts must use this FK; contacts.company remains legacy display text.';
COMMENT ON COLUMN public.contacts.reveal_status IS
  'Education/Apollo reveal lifecycle. Free-search candidates begin not_revealed; paid reveal remains separately firewalled.';
