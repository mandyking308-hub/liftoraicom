ALTER TABLE public.relationship_intelligence_contacts
  ADD COLUMN IF NOT EXISTS role_or_title text;

CREATE INDEX IF NOT EXISTS idx_ric_role_or_title ON public.relationship_intelligence_contacts (lower(coalesce(role_or_title,'')));