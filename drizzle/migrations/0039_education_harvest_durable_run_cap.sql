CREATE TABLE public.education_harvest_run_claims (
  run_key text NOT NULL REFERENCES public.education_harvest_runs(run_key),
  urn text NOT NULL REFERENCES public.education_harvest_queue(urn),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (run_key, urn)
);
GRANT SELECT ON public.education_harvest_run_claims TO authenticated;
GRANT ALL ON public.education_harvest_run_claims TO service_role;
REVOKE ALL ON public.education_harvest_run_claims FROM anon;
ALTER TABLE public.education_harvest_run_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder read harvest run claims" ON public.education_harvest_run_claims FOR SELECT TO authenticated USING (public._is_founder_or_admin());

INSERT INTO public.education_harvest_run_claims(run_key, urn)
  SELECT claimed_run_key, urn FROM public.education_harvest_queue WHERE claimed_run_key IS NOT NULL
  UNION SELECT completed_run_key, urn FROM public.education_harvest_queue WHERE completed_run_key IS NOT NULL
  ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION edu_harvest.claim(p_run_key text, p_limit int DEFAULT 500)
RETURNS TABLE(urn text, establishment_name text, establishment_type text, phase text, town text, postcode text, website text, establishment_group text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
#variable_conflict use_column
DECLARE v_have int; v_need int;
BEGIN
  IF p_run_key !~ '^\d{4}-\d{2}-\d{2}-(AM|PM)$' THEN RAISE EXCEPTION 'run_key must be YYYY-MM-DD-AM or YYYY-MM-DD-PM'; END IF;
  IF p_limit < 1 OR p_limit > 500 THEN RAISE EXCEPTION 'limit must be 1..500'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('edu_harvest_claim'));
  INSERT INTO education_harvest_runs(run_key, run_date, slot) VALUES (p_run_key, left(p_run_key,10)::date, right(p_run_key,2))
    ON CONFLICT (run_key) DO NOTHING;
  UPDATE education_harvest_runs SET claim_calls = claim_calls + 1, updated_at = now() WHERE run_key = p_run_key;
  -- Durable, monotonic quota: every URN ever reserved by this run counts, whatever its later outcome.
  SELECT count(*) INTO v_have FROM education_harvest_run_claims c WHERE c.run_key = p_run_key;
  v_need := greatest(least(p_limit, 500) - v_have, 0);
  IF v_need > 0 AND (SELECT r.status FROM education_harvest_runs r WHERE r.run_key = p_run_key) = 'claimed' THEN
    WITH picked AS (
      INSERT INTO education_harvest_queue AS q (urn, status, claimed_run_key, lease_expires_at, establishment_name, establishment_type, establishment_status, phase, town, county, postcode, website)
      SELECT s.urn, 'claimed', p_run_key, now() + interval '6 hours', s.establishment_name, s.establishment_type, s.establishment_status, s.phase, s.town, s.county, s.postcode, s.website
      FROM education_harvest_open_schools s
      LEFT JOIN education_harvest_queue e ON e.urn = s.urn
      WHERE (e.urn IS NULL OR e.status = 'queued'
         OR (e.status = 'claimed' AND e.lease_expires_at < now())
         OR (e.status = 'error' AND e.retries < 3))
        AND NOT EXISTS (SELECT 1 FROM education_harvest_run_claims c WHERE c.run_key = p_run_key AND c.urn = s.urn)
      ORDER BY s.urn LIMIT v_need
      ON CONFLICT (urn) DO UPDATE SET status = 'claimed', claimed_run_key = EXCLUDED.claimed_run_key,
        lease_expires_at = EXCLUDED.lease_expires_at, updated_at = now()
      WHERE q.status IN ('queued','error') OR (q.status = 'claimed' AND q.lease_expires_at < now())
      RETURNING q.urn
    )
    INSERT INTO education_harvest_run_claims(run_key, urn) SELECT p_run_key, picked.urn FROM picked ON CONFLICT DO NOTHING;
  END IF;
  UPDATE education_harvest_runs r SET claimed_count = (SELECT count(*) FROM education_harvest_run_claims c WHERE c.run_key = p_run_key), updated_at = now() WHERE r.run_key = p_run_key;
  RETURN QUERY SELECT q.urn, q.establishment_name, q.establishment_type, q.phase, q.town, q.postcode, q.website, s.establishment_group
    FROM education_harvest_queue q LEFT JOIN education_harvest_open_schools s ON s.urn = q.urn
    WHERE q.claimed_run_key = p_run_key AND q.status = 'claimed' ORDER BY q.urn;
END $$;
REVOKE EXECUTE ON FUNCTION edu_harvest.claim(text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION edu_harvest.claim(text,int) TO service_role;