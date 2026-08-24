ALTER TABLE public.relationship_intelligence_contacts
  ADD COLUMN IF NOT EXISTS apollo_person_id text,
  ADD COLUMN IF NOT EXISTS email_status text,
  ADD COLUMN IF NOT EXISTS email_status_reason text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ric_apollo_person_id
  ON public.relationship_intelligence_contacts (apollo_person_id)
  WHERE apollo_person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ric_relationship_type_org
  ON public.relationship_intelligence_contacts (relationship_type, lower(coalesce(organisation_name,'')));

CREATE INDEX IF NOT EXISTS idx_ric_name_org_norm
  ON public.relationship_intelligence_contacts (lower(contact_name), lower(coalesce(organisation_name,'')));

CREATE INDEX IF NOT EXISTS idx_ric_email_status
  ON public.relationship_intelligence_contacts (email_status);