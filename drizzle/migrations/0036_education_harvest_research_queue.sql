CREATE SCHEMA IF NOT EXISTS edu_harvest;
REVOKE ALL ON SCHEMA edu_harvest FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA edu_harvest TO service_role;

CREATE TABLE public.education_harvest_runs (
  run_key text PRIMARY KEY CHECK (run_key ~ '^\d{4}-\d{2}-\d{2}-(AM|PM)$'),
  run_date date NOT NULL,
  slot text NOT NULL CHECK (slot IN ('AM','PM')),
  status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','completed','failed')),
  claimed_count int NOT NULL DEFAULT 0,
  screened_count int NOT NULL DEFAULT 0,
  buyer_researched_count int NOT NULL DEFAULT 0,
  held_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  claim_calls int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_date, slot)
);

CREATE TABLE public.education_harvest_queue (
  urn text PRIMARY KEY,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','claimed','institution_screened','buyer_researched','held','error')),
  claimed_run_key text REFERENCES public.education_harvest_runs(run_key),
  lease_expires_at timestamptz,
  establishment_name text, establishment_type text, establishment_status text, phase text,
  town text, county text, postcode text, website text,
  verified_trust_or_group text,
  organisation_id uuid REFERENCES public.organisations(id),
  purchasing_route text, product_fit text,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  evidence_retrieved_at timestamptz,
  confidence text CHECK (confidence IS NULL OR confidence IN ('high','medium','low')),
  retries int NOT NULL DEFAULT 0,
  last_error text,
  completed_run_key text,
  screened_at timestamptz,
  buyer_researched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX education_harvest_queue_status_idx ON public.education_harvest_queue(status, lease_expires_at);
CREATE INDEX education_harvest_queue_screened_idx ON public.education_harvest_queue(screened_at);

CREATE TABLE public.education_harvest_buyer_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  urn text NOT NULL REFERENCES public.education_harvest_queue(urn),
  run_key text NOT NULL REFERENCES public.education_harvest_runs(run_key),
  buyer_role text NOT NULL,
  named_person text,
  source_url text NOT NULL CHECK (source_url ~ '^https?://'),
  retrieved_at timestamptz NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('high','medium','low')),
  verification_status text NOT NULL DEFAULT 'staged_unverified' CHECK (verification_status IN ('staged_unverified','verified','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (urn, buyer_role, source_url)
);

GRANT SELECT ON public.education_harvest_runs, public.education_harvest_queue, public.education_harvest_buyer_evidence TO authenticated;
GRANT ALL ON public.education_harvest_runs, public.education_harvest_queue, public.education_harvest_buyer_evidence TO service_role;
ALTER TABLE public.education_harvest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_harvest_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_harvest_buyer_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder read harvest runs" ON public.education_harvest_runs FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "founder read harvest queue" ON public.education_harvest_queue FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "founder read harvest evidence" ON public.education_harvest_buyer_evidence FOR SELECT TO authenticated USING (public._is_founder_or_admin());

-- Restricted projection of public institutional fields; security_invoker keeps the original founder-only GIAS RLS in force.
CREATE VIEW public.education_harvest_open_schools WITH (security_invoker = true) AS
  SELECT DISTINCT ON (urn) urn, establishment_name, establishment_type, establishment_status, phase, town, county, postcode, website, establishment_group
  FROM public.gias_establishments WHERE establishment_status = 'Open' ORDER BY urn, updated_at DESC;
GRANT SELECT ON public.education_harvest_open_schools TO authenticated;
GRANT SELECT ON public.education_harvest_open_schools TO service_role;

CREATE VIEW public.education_harvest_weekly WITH (security_invoker = true) AS
  SELECT date_trunc('week', screened_at)::date AS week_start,
         count(DISTINCT urn) FILTER (WHERE status IN ('institution_screened','buyer_researched')) AS schools_screened,
         count(DISTINCT urn) FILTER (WHERE status = 'buyer_researched') AS schools_buyer_researched
  FROM public.education_harvest_queue WHERE screened_at IS NOT NULL GROUP BY 1;
GRANT SELECT ON public.education_harvest_weekly TO authenticated, service_role;

CREATE OR REPLACE FUNCTION edu_harvest.claim(p_run_key text, p_limit int DEFAULT 500)
RETURNS TABLE(urn text, establishment_name text, establishment_type text, phase text, town text, postcode text, website text, establishment_group text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_have int; v_need int;
BEGIN
  IF p_run_key !~ '^\d{4}-\d{2}-\d{2}-(AM|PM)$' THEN RAISE EXCEPTION 'run_key must be YYYY-MM-DD-AM or YYYY-MM-DD-PM'; END IF;
  IF p_limit < 1 OR p_limit > 500 THEN RAISE EXCEPTION 'limit must be 1..500'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('edu_harvest_claim'));
  INSERT INTO education_harvest_runs(run_key, run_date, slot) VALUES (p_run_key, left(p_run_key,10)::date, right(p_run_key,2))
    ON CONFLICT (run_key) DO NOTHING;
  UPDATE education_harvest_runs SET claim_calls = claim_calls + 1, updated_at = now() WHERE run_key = p_run_key;
  SELECT count(*) INTO v_have FROM education_harvest_queue q WHERE q.claimed_run_key = p_run_key AND q.status = 'claimed';
  v_need := greatest(p_limit - v_have, 0);
  IF v_need > 0 AND (SELECT r.status FROM education_harvest_runs r WHERE r.run_key = p_run_key) = 'claimed' THEN
    INSERT INTO education_harvest_queue AS q (urn, status, claimed_run_key, lease_expires_at, establishment_name, establishment_type, establishment_status, phase, town, county, postcode, website)
    SELECT s.urn, 'claimed', p_run_key, now() + interval '6 hours', s.establishment_name, s.establishment_type, s.establishment_status, s.phase, s.town, s.county, s.postcode, s.website
    FROM education_harvest_open_schools s
    LEFT JOIN education_harvest_queue e ON e.urn = s.urn
    WHERE e.urn IS NULL OR e.status = 'queued'
       OR (e.status = 'claimed' AND e.lease_expires_at < now())
       OR (e.status = 'error' AND e.retries < 3)
    ORDER BY s.urn LIMIT v_need
    ON CONFLICT (urn) DO UPDATE SET status = 'claimed', claimed_run_key = EXCLUDED.claimed_run_key,
      lease_expires_at = EXCLUDED.lease_expires_at, updated_at = now()
    WHERE q.status IN ('queued','error') OR (q.status = 'claimed' AND q.lease_expires_at < now());
  END IF;
  UPDATE education_harvest_runs r SET claimed_count = (SELECT count(*) FROM education_harvest_queue q WHERE q.claimed_run_key = p_run_key), updated_at = now() WHERE r.run_key = p_run_key;
  RETURN QUERY SELECT q.urn, q.establishment_name, q.establishment_type, q.phase, q.town, q.postcode, q.website, s.establishment_group
    FROM education_harvest_queue q LEFT JOIN education_harvest_open_schools s ON s.urn = q.urn
    WHERE q.claimed_run_key = p_run_key AND q.status = 'claimed' ORDER BY q.urn;
END $$;

CREATE OR REPLACE FUNCTION edu_harvest.complete(p_run_key text, p_results jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE r jsonb; v_out text; v_urls text[]; v_ok int := 0; v_skip int := 0; b jsonb;
BEGIN
  IF jsonb_typeof(p_results) <> 'array' OR jsonb_array_length(p_results) > 100 THEN RAISE EXCEPTION 'results must be a JSON array of at most 100 items'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_results) LOOP
    v_out := r->>'outcome';
    IF v_out IS NULL OR v_out NOT IN ('institution_screened','buyer_researched','held','error') THEN RAISE EXCEPTION 'bad outcome % for urn %', v_out, r->>'urn'; END IF;
    v_urls := coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'evidence_urls','[]'::jsonb))), '{}');
    IF EXISTS (SELECT 1 FROM unnest(v_urls) u WHERE u !~ '^https?://') THEN RAISE EXCEPTION 'evidence_urls must be http(s) for urn %', r->>'urn'; END IF;
    IF v_out IN ('institution_screened','buyer_researched') AND cardinality(v_urls) = 0 THEN RAISE EXCEPTION 'urn % needs evidence_urls', r->>'urn'; END IF;
    IF v_out = 'buyer_researched' AND coalesce(jsonb_array_length(r->'buyers'),0) = 0 THEN RAISE EXCEPTION 'urn % buyer_researched needs sourced buyers[]', r->>'urn'; END IF;
    UPDATE education_harvest_queue q SET
      status = v_out, lease_expires_at = NULL, completed_run_key = p_run_key,
      website = coalesce(r->>'website', q.website),
      verified_trust_or_group = coalesce(r->>'verified_trust_or_group', q.verified_trust_or_group),
      organisation_id = coalesce((r->>'organisation_id')::uuid, q.organisation_id),
      purchasing_route = coalesce(r->>'purchasing_route', q.purchasing_route),
      product_fit = coalesce(r->>'product_fit', q.product_fit),
      evidence_urls = CASE WHEN cardinality(v_urls) > 0 THEN v_urls ELSE q.evidence_urls END,
      evidence_retrieved_at = CASE WHEN cardinality(v_urls) > 0 THEN coalesce((r->>'retrieved_at')::timestamptz, now()) ELSE q.evidence_retrieved_at END,
      confidence = coalesce(r->>'confidence', q.confidence),
      retries = q.retries + CASE WHEN v_out = 'error' THEN 1 ELSE 0 END,
      last_error = CASE WHEN v_out = 'error' THEN left(r->>'error', 500) ELSE NULL END,
      screened_at = CASE WHEN v_out IN ('institution_screened','buyer_researched') THEN coalesce(q.screened_at, now()) ELSE q.screened_at END,
      buyer_researched_at = CASE WHEN v_out = 'buyer_researched' THEN now() ELSE q.buyer_researched_at END,
      updated_at = now()
    WHERE q.urn = r->>'urn' AND q.claimed_run_key = p_run_key AND q.status = 'claimed';
    IF FOUND THEN
      v_ok := v_ok + 1;
      FOR b IN SELECT * FROM jsonb_array_elements(coalesce(r->'buyers','[]'::jsonb)) LOOP
        INSERT INTO education_harvest_buyer_evidence(urn, run_key, buyer_role, named_person, source_url, retrieved_at, confidence)
        VALUES (r->>'urn', p_run_key, b->>'buyer_role', b->>'named_person', b->>'source_url', coalesce((b->>'retrieved_at')::timestamptz, now()), coalesce(b->>'confidence','low'))
        ON CONFLICT (urn, buyer_role, source_url) DO NOTHING;
      END LOOP;
    ELSE v_skip := v_skip + 1; END IF;
  END LOOP;
  UPDATE education_harvest_runs SET
    screened_count = (SELECT count(*) FROM education_harvest_queue WHERE completed_run_key = p_run_key AND status IN ('institution_screened','buyer_researched')),
    buyer_researched_count = (SELECT count(*) FROM education_harvest_queue WHERE completed_run_key = p_run_key AND status = 'buyer_researched'),
    held_count = (SELECT count(*) FROM education_harvest_queue WHERE completed_run_key = p_run_key AND status = 'held'),
    error_count = (SELECT count(*) FROM education_harvest_queue WHERE completed_run_key = p_run_key AND status = 'error'),
    updated_at = now() WHERE run_key = p_run_key;
  RETURN jsonb_build_object('updated', v_ok, 'skipped_not_leased_to_run', v_skip);
END $$;

CREATE OR REPLACE FUNCTION edu_harvest.finish(p_run_key text, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_rel int;
BEGIN
  UPDATE education_harvest_queue SET status = 'queued', claimed_run_key = NULL, lease_expires_at = NULL, updated_at = now()
   WHERE claimed_run_key = p_run_key AND status = 'claimed';
  GET DIAGNOSTICS v_rel = ROW_COUNT;
  UPDATE education_harvest_runs SET status = 'completed', finished_at = now(), notes = p_notes, updated_at = now() WHERE run_key = p_run_key;
  RETURN jsonb_build_object('released_unfinished', v_rel);
END $$;

REVOKE EXECUTE ON FUNCTION edu_harvest.claim(text,int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION edu_harvest.complete(text,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION edu_harvest.finish(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION edu_harvest.claim(text,int), edu_harvest.complete(text,jsonb), edu_harvest.finish(text,text) TO service_role;