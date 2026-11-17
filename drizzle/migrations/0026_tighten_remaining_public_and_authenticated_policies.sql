-- Public proposal enquiries: preserve the website form, but fail closed on internal fields and invalid submissions.
DROP POLICY IF EXISTS "Anyone can submit a proposal" ON public.proposals;
CREATE POLICY "Anyone can submit a proposal"
ON public.proposals
FOR INSERT
TO public
WITH CHECK (
  status = 'submitted'
  AND lead_status = 'new_inquiry'
  AND crm_reconciliation_status = 'pending'
  AND contact_id IS NULL
  AND business_id IS NULL
  AND length(btrim(company_name)) BETWEEN 1 AND 200
  AND length(btrim(industry)) BETWEEN 1 AND 120
  AND length(btrim(company_size)) BETWEEN 1 AND 80
  AND length(btrim(business_problem)) BETWEEN 1 AND 10000
  AND length(btrim(project_scale)) BETWEEN 1 AND 120
  AND length(btrim(timeline)) BETWEEN 1 AND 120
  AND cardinality(project_types) BETWEEN 1 AND 20
  AND cardinality(processes_to_automate) BETWEEN 1 AND 50
  AND (contact_email IS NULL OR contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  AND (website_url IS NULL OR website_url ~* '^https?://')
);

-- Public partner applications: preserve the form, but prevent status/user injection and malformed rows.
DROP POLICY IF EXISTS "Anyone can submit partner application" ON public.partner_applications;
CREATE POLICY "Anyone can submit partner application"
ON public.partner_applications
FOR INSERT
TO public
WITH CHECK (
  status = 'pending'
  AND user_id IS NULL
  AND length(btrim(company_name)) BETWEEN 1 AND 200
  AND contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  AND partner_type IN ('agency', 'consultant', 'vc', 'incubator', 'enterprise_advisor')
  AND project_description IS NOT NULL
  AND length(btrim(project_description)) BETWEEN 1 AND 10000
);

-- Policy versions are public only once their publication time has arrived.
DROP POLICY IF EXISTS "Anyone can read legal versions" ON public.legal_document_versions;
CREATE POLICY "Anyone can read legal versions"
ON public.legal_document_versions
FOR SELECT
TO public
USING (published_at <= now());

-- Internal activity and audit writes require a founder/admin session. Service role bypasses RLS.
DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.activity_log;
CREATE POLICY "Founder/admin users can insert activity"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (public._is_founder_or_admin());

DROP POLICY IF EXISTS "authenticated may append audit events" ON public.global_audit_events;
CREATE POLICY "founder/admin may append audit events"
ON public.global_audit_events
FOR INSERT
TO authenticated
WITH CHECK (
  public._is_founder_or_admin()
  AND (actor_id IS NULL OR actor_id = auth.uid())
  AND external_side_effect = false
);

-- Founder-only operational catalogues and schedules.
DROP POLICY IF EXISTS "auth read products" ON public.ecommerce_products;
CREATE POLICY "Founder/admin only: auth read products"
ON public.ecommerce_products
FOR SELECT
TO authenticated
USING (public._is_founder_or_admin());

DROP POLICY IF EXISTS "auth read resources" ON public.scheduling_resources;
CREATE POLICY "Founder/admin only: auth read resources"
ON public.scheduling_resources
FOR SELECT
TO authenticated
USING (public._is_founder_or_admin());