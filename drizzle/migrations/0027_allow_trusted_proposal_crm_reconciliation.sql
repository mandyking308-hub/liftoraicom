DROP POLICY IF EXISTS "Anyone can submit a proposal" ON public.proposals;
CREATE POLICY "Anyone can submit a proposal"
ON public.proposals
FOR INSERT
TO public
WITH CHECK (
  status = 'submitted'
  AND lead_status = 'new_inquiry'
  AND crm_reconciliation_status IN ('pending', 'unmatched', 'needs_review', 'matched')
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