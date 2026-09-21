-- Stage 1 security perimeter hardening: enable RLS on the three remaining
-- RLS-off public tables and apply the canonical founder/admin access pattern
-- already used by billionaire_coverage / billionaire_intelligence.
-- No business data is read, written or deleted by this migration.

REVOKE ALL ON public.billionaire_institution_links FROM anon;
REVOKE ALL ON public.philanthropic_institutions FROM anon;
REVOKE ALL ON public.billionaire_enrichment_batches FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billionaire_institution_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.philanthropic_institutions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billionaire_enrichment_batches TO authenticated;

GRANT ALL ON public.billionaire_institution_links TO service_role;
GRANT ALL ON public.philanthropic_institutions TO service_role;
GRANT ALL ON public.billionaire_enrichment_batches TO service_role;

ALTER TABLE public.billionaire_institution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.philanthropic_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billionaire_enrichment_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage billionaire_institution_links"
  ON public.billionaire_institution_links
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "Founders manage philanthropic_institutions"
  ON public.philanthropic_institutions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "Founders manage billionaire_enrichment_batches"
  ON public.billionaire_enrichment_batches
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));