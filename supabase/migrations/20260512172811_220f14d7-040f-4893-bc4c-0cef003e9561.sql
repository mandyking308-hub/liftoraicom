
-- 1. internal_email_identities: unique index on lower(email)
CREATE UNIQUE INDEX IF NOT EXISTS internal_email_identities_email_lower_idx
  ON public.internal_email_identities ((lower(email)));

-- 2. contacts: add is_internal, archived_at, archive_reason
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_reason text;

CREATE INDEX IF NOT EXISTS contacts_is_internal_idx ON public.contacts (is_internal);
CREATE INDEX IF NOT EXISTS contacts_archived_at_idx ON public.contacts (archived_at);

-- 3. business_contact_relationships: add nullable business_id FK
ALTER TABLE public.business_contact_relationships
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id);

CREATE INDEX IF NOT EXISTS bcr_business_id_idx ON public.business_contact_relationships (business_id);

-- 4. proposals: add nullable contact_id, business_id, crm_reconciliation_status
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id),
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id),
  ADD COLUMN IF NOT EXISTS crm_reconciliation_status text NOT NULL DEFAULT 'pending'
    CHECK (crm_reconciliation_status IN ('pending','matched','unmatched','needs_review'));

CREATE INDEX IF NOT EXISTS proposals_contact_id_idx ON public.proposals (contact_id);
CREATE INDEX IF NOT EXISTS proposals_business_id_idx ON public.proposals (business_id);
CREATE INDEX IF NOT EXISTS proposals_crm_recon_status_idx ON public.proposals (crm_reconciliation_status);

-- 5. Helpers
CREATE OR REPLACE FUNCTION public.is_internal_identity(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_email_identities
    WHERE lower(email) = lower(_email)
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_contact_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.contacts WHERE lower(email) = lower(_email) LIMIT 1;
$$;

-- 6. Proposal reconciliation trigger
CREATE OR REPLACE FUNCTION public.proposals_reconcile_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_business_id uuid;
BEGIN
  IF NEW.contact_email IS NULL OR length(trim(NEW.contact_email)) = 0 THEN
    NEW.contact_id := NULL;
    NEW.business_id := NULL;
    NEW.crm_reconciliation_status := 'unmatched';
    RETURN NEW;
  END IF;

  SELECT id INTO v_contact_id
  FROM public.contacts
  WHERE lower(email) = lower(NEW.contact_email)
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    NEW.contact_id := NULL;
    NEW.business_id := NULL;
    NEW.crm_reconciliation_status := 'unmatched';
  ELSE
    NEW.contact_id := v_contact_id;
    SELECT business_id INTO v_business_id
    FROM public.business_contact_relationships
    WHERE contact_id = v_contact_id AND business_id IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1;
    NEW.business_id := v_business_id;
    NEW.crm_reconciliation_status :=
      CASE WHEN v_business_id IS NULL THEN 'needs_review' ELSE 'matched' END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proposals_reconcile_crm_trg ON public.proposals;
CREATE TRIGGER proposals_reconcile_crm_trg
BEFORE INSERT OR UPDATE OF contact_email ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.proposals_reconcile_crm();

-- 7. Views
CREATE OR REPLACE VIEW public.proposal_crm_reconciliation AS
SELECT
  p.id AS proposal_id,
  p.contact_email,
  p.contact_id,
  p.business_id,
  p.crm_reconciliation_status,
  c.name AS contact_name,
  b.name AS business_name,
  p.created_at
FROM public.proposals p
LEFT JOIN public.contacts c ON c.id = p.contact_id
LEFT JOIN public.businesses b ON b.id = p.business_id;

CREATE OR REPLACE VIEW public.crm_spine_summary AS
WITH
  c_total AS (SELECT count(*) AS n FROM public.contacts WHERE archived_at IS NULL),
  c_internal AS (SELECT count(*) AS n FROM public.contacts WHERE is_internal = true),
  c_with_bcr AS (
    SELECT count(DISTINCT c.id) AS n
    FROM public.contacts c
    JOIN public.business_contact_relationships b ON b.contact_id = c.id
    WHERE c.archived_at IS NULL AND c.is_internal = false
  ),
  c_missing_bcr AS (
    SELECT count(*) AS n FROM public.contacts c
    WHERE c.archived_at IS NULL AND c.is_internal = false
      AND NOT EXISTS (SELECT 1 FROM public.business_contact_relationships b WHERE b.contact_id = c.id)
  ),
  c_suppressed AS (
    SELECT count(*) AS n FROM public.contacts
    WHERE archived_at IS NULL AND (sendable_status = 'suppressed' OR hard_bounced = true OR is_globally_suppressed = true)
  ),
  apollo_promoted AS (
    SELECT count(*) AS n FROM public.lead_quality_profiles WHERE promoted_contact_id IS NOT NULL
  ),
  apollo_needs_verify AS (
    SELECT count(*) AS n FROM public.lead_quality_profiles
    WHERE quality_status::text IN ('raw','needs_verification') OR verification_status::text IN ('pending','unverified')
  ),
  apollo_dups AS (
    SELECT count(*) AS n FROM public.lead_quality_profiles WHERE dup_of_contact_id IS NOT NULL OR dup_of_lead_id IS NOT NULL
  ),
  prop_needs_recon AS (
    SELECT count(*) AS n FROM public.proposals WHERE crm_reconciliation_status IN ('unmatched','needs_review','pending')
  ),
  bcr_with_business_id AS (
    SELECT count(*) AS n FROM public.business_contact_relationships WHERE business_id IS NOT NULL
  ),
  bcr_missing_business_id AS (
    SELECT count(*) AS n FROM public.business_contact_relationships WHERE business_id IS NULL
  ),
  internal_ids AS (SELECT count(*) AS n FROM public.internal_email_identities),
  safe_to_unlock AS (
    SELECT count(*) AS n FROM public.lead_quality_profiles lqp
    JOIN public.apollo_leads al ON al.id = lqp.apollo_lead_id
    WHERE lqp.unlock_recommendation = 'recommended_first_batch_unique'
      AND lqp.dup_of_contact_id IS NULL
      AND lqp.dup_of_lead_id IS NULL
      AND lqp.promoted_contact_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE (al.email IS NOT NULL AND lower(c.email) = lower(al.email))
           OR (al.apollo_person_id IS NOT NULL AND c.apollo_person_id = al.apollo_person_id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.internal_email_identities i
        WHERE al.email IS NOT NULL AND lower(i.email) = lower(al.email)
      )
  )
SELECT
  (SELECT n FROM c_total) AS contacts_total,
  (SELECT n FROM c_with_bcr) AS contacts_with_bcr,
  (SELECT n FROM c_missing_bcr) AS contacts_missing_bcr,
  (SELECT n FROM c_internal) AS internal_contacts,
  (SELECT n FROM internal_ids) AS internal_identities,
  (SELECT n FROM c_suppressed) AS suppressed_contacts,
  (SELECT n FROM apollo_promoted) AS apollo_promoted,
  (SELECT n FROM apollo_needs_verify) AS apollo_needs_verification,
  (SELECT n FROM apollo_dups) AS apollo_duplicates_collapsed,
  (SELECT n FROM prop_needs_recon) AS proposals_needing_reconciliation,
  (SELECT n FROM bcr_with_business_id) AS bcr_with_business_id,
  (SELECT n FROM bcr_missing_business_id) AS bcr_missing_business_id,
  (SELECT n FROM safe_to_unlock) AS safe_to_unlock_count;

GRANT SELECT ON public.crm_spine_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.proposal_crm_reconciliation TO authenticated, service_role;
