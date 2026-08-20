-- name normalisation helper
CREATE OR REPLACE FUNCTION public.bi_normalize_name(_n text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT nullif(btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(translate(coalesce(_n,''),
            'àáâãäåāăąçćčďđèéêëēėęěğĝĥìíîïĩīįıĵķĺļľłñńņňòóôõöøōŏőŕŗřśŝşšţťùúûüũūŭůűųŵýÿŷźżžðþß',
            'aaaaaaaaacccddeeeeeeeegghiiiiiiiijkllllnnnnooooooooorrrssssttuuuuuuuuuuwyyyzzzdps')),
          '\s*(&|and)\s+family\b', '', 'g'),
        '\m(jr|sr|ii|iii|iv)\M', '', 'g'),
      '[^a-z0-9 ]', ' ', 'g'),
    '\s+', ' ', 'g')), '')
$$;

CREATE TABLE IF NOT EXISTS public.billionaire_wealth_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billionaire_id uuid NULL REFERENCES public.billionaire_intelligence(id) ON DELETE SET NULL,
  source_name text NOT NULL,
  source_type text NOT NULL DEFAULT 'third_party_derivative'
    CHECK (source_type IN ('official_publisher','third_party_derivative','manual_entry')),
  source_url text,
  official_source_url text,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_date date NOT NULL,
  source_rank integer,
  source_name_raw text NOT NULL,
  normalized_name text NOT NULL,
  networth_usd_m numeric CHECK (networth_usd_m IS NULL OR networth_usd_m >= 0),
  country text,
  citizenship text,
  source_of_wealth text,
  industry text,
  match_status text NOT NULL DEFAULT 'unmatched_new_2026'
    CHECK (match_status IN ('matched','ambiguous','unmatched_new_2026','manual_review')),
  match_method text,
  match_confidence smallint NOT NULL DEFAULT 0 CHECK (match_confidence BETWEEN 0 AND 100),
  match_notes text,
  raw_record jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bws_unique_source_row
  ON public.billionaire_wealth_snapshots (source_name, snapshot_date, source_rank, normalized_name);
CREATE INDEX IF NOT EXISTS bws_norm_idx ON public.billionaire_wealth_snapshots (normalized_name);
CREATE INDEX IF NOT EXISTS bws_billionaire_idx ON public.billionaire_wealth_snapshots (billionaire_id);
CREATE INDEX IF NOT EXISTS bws_status_idx ON public.billionaire_wealth_snapshots (match_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billionaire_wealth_snapshots TO authenticated;
GRANT ALL ON public.billionaire_wealth_snapshots TO service_role;
ALTER TABLE public.billionaire_wealth_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage billionaire_wealth_snapshots" ON public.billionaire_wealth_snapshots;
CREATE POLICY "Founders manage billionaire_wealth_snapshots"
  ON public.billionaire_wealth_snapshots FOR ALL TO authenticated
  USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

-- coverage additions
ALTER TABLE public.billionaire_coverage
  ADD COLUMN IF NOT EXISTS current_networth_source text,
  ADD COLUMN IF NOT EXISTS current_networth_change_pct numeric,
  ADD COLUMN IF NOT EXISTS snapshot_match_status text NOT NULL DEFAULT 'not_checked',
  ADD COLUMN IF NOT EXISTS dropoff_candidate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS researched_route_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS philanthropy_network_matches integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warm_relationship_evidence_count integer NOT NULL DEFAULT 0;

-- pathway evidence state
ALTER TABLE public.billionaire_access_pathways
  ADD COLUMN IF NOT EXISTS route_evidence_state text NOT NULL DEFAULT 'researched_candidate';
ALTER TABLE public.billionaire_access_pathways
  DROP CONSTRAINT IF EXISTS bap_route_evidence_state_chk;
ALTER TABLE public.billionaire_access_pathways
  ADD CONSTRAINT bap_route_evidence_state_chk CHECK (route_evidence_state IN
    ('researched_candidate','verified_public_institutional','verified_warm_intermediary','rejected'));
CREATE INDEX IF NOT EXISTS bap_evidence_state_idx ON public.billionaire_access_pathways (route_evidence_state);

-- candidate route ranking
ALTER TABLE public.billionaire_candidate_routes
  ADD COLUMN IF NOT EXISTS priority_rank smallint NOT NULL DEFAULT 5;