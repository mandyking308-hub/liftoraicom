-- GitHub-controlled research layer for the completed 2026 billionaire access sweep.
-- This table is additive: it does not replace or delete the historical 2,754-person universe.

CREATE TABLE IF NOT EXISTS public.billionaire_access_research_2026 (
  source_row integer PRIMARY KEY CHECK (source_row BETWEEN 1 AND 3428),
  billionaire_name text NOT NULL,
  normalized_name text GENERATED ALWAYS AS (public.bi_normalize_name(billionaire_name)) STORED,
  institutional_route text NOT NULL,
  access_mode text,
  restriction_notes text,
  verification_status text NOT NULL CHECK (
    verification_status IN (
      'verified_public_institutional',
      'verified_institutional_restricted',
      'verified_institutional_switchboard_or_postal',
      'verified_institutional_source_age_warning',
      'legal_compliance_block',
      'enhanced_compliance_review',
      'deceased_remove_from_active_outreach'
    )
  ),
  official_source text,
  evidence_file text NOT NULL,
  correction_notes text,
  reviewed_at date NOT NULL,
  outreach_allowed boolean NOT NULL DEFAULT false CHECK (outreach_allowed = false),
  snapshot_id uuid REFERENCES public.billionaire_wealth_snapshots(id) ON DELETE SET NULL,
  billionaire_id uuid REFERENCES public.billionaire_intelligence(id) ON DELETE SET NULL,
  match_status text NOT NULL DEFAULT 'pending' CHECK (
    match_status IN (
      'pending',
      'matched',
      'ambiguous',
      'unmatched_new_2026',
      'manual_review',
      'missing_snapshot'
    )
  ),
  match_confidence smallint NOT NULL DEFAULT 0 CHECK (match_confidence BETWEEN 0 AND 100),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bar2026_normalized_name_idx
  ON public.billionaire_access_research_2026 (normalized_name);
CREATE INDEX IF NOT EXISTS bar2026_billionaire_id_idx
  ON public.billionaire_access_research_2026 (billionaire_id);
CREATE INDEX IF NOT EXISTS bar2026_match_status_idx
  ON public.billionaire_access_research_2026 (match_status);
CREATE INDEX IF NOT EXISTS bar2026_verification_status_idx
  ON public.billionaire_access_research_2026 (verification_status);

ALTER TABLE public.billionaire_access_research_2026 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billionaire_access_research_2026 FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.billionaire_access_research_2026 TO authenticated;
GRANT ALL ON public.billionaire_access_research_2026 TO service_role;

DROP POLICY IF EXISTS "Founders manage billionaire access research 2026"
  ON public.billionaire_access_research_2026;
CREATE POLICY "Founders manage billionaire access research 2026"
  ON public.billionaire_access_research_2026
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'founder'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'founder'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

COMMENT ON TABLE public.billionaire_access_research_2026 IS
  'GitHub-evidenced institutional-route research for all 3,428 Forbes 2026 source rows. Outreach is always disabled; production-ID reconciliation is explicit.';
