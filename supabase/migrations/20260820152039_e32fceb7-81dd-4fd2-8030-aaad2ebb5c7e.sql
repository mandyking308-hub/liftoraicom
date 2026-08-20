
-- 1. COVERAGE
CREATE TABLE IF NOT EXISTS public.billionaire_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billionaire_id uuid NOT NULL UNIQUE REFERENCES public.billionaire_intelligence(id) ON DELETE CASCADE,
  full_name text,
  citizenship text,
  primary_industry text,
  verified_institutional_routes integer NOT NULL DEFAULT 0,
  verified_intermediary_routes integer NOT NULL DEFAULT 0,
  candidate_route_count integer NOT NULL DEFAULT 0,
  foundation_count integer NOT NULL DEFAULT 0,
  family_office_count integer NOT NULL DEFAULT 0,
  company_route_count integer NOT NULL DEFAULT 0,
  enrichment_status text NOT NULL DEFAULT 'not_started'
    CHECK (enrichment_status IN ('not_started','queued','in_progress','verified_route','candidate_only','no_public_route','needs_manual_review')),
  outreach_readiness text NOT NULL DEFAULT 'no_route'
    CHECK (outreach_readiness IN ('ready','ready_low_confidence','candidate_only','no_route','blocked')),
  outreach_blocker_reason text,
  last_enriched_at timestamptz,
  next_enrichment_priority integer NOT NULL DEFAULT 50,
  research_confidence smallint NOT NULL DEFAULT 0,
  historical_networth_usd_m numeric,
  historical_networth_as_of date,
  current_networth_usd_m numeric,
  current_networth_as_of date,
  wealth_data_freshness text NOT NULL DEFAULT 'unknown'
    CHECK (wealth_data_freshness IN ('current','recent','historical','stale','unknown')),
  wealth_trajectory text NOT NULL DEFAULT 'unknown'
    CHECK (wealth_trajectory IN ('rising','stable','falling','unknown')),
  liquidity_capacity_score smallint NOT NULL DEFAULT 0,
  urgency_priority_score smallint NOT NULL DEFAULT 0,
  ghat_fit_score smallint NOT NULL DEFAULT 0,
  philanthropy_intensity_score smallint NOT NULL DEFAULT 0,
  health_relevance_score smallint NOT NULL DEFAULT 0,
  africa_relevance_score smallint NOT NULL DEFAULT 0,
  giving_pledge_signal boolean NOT NULL DEFAULT false,
  has_foundation boolean NOT NULL DEFAULT false,
  has_family_office boolean NOT NULL DEFAULT false,
  ghat_priority_score smallint NOT NULL DEFAULT 0,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bcov_ghat ON public.billionaire_coverage (ghat_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_bcov_status ON public.billionaire_coverage (enrichment_status, outreach_readiness);
CREATE INDEX IF NOT EXISTS idx_bcov_country ON public.billionaire_coverage (citizenship);
CREATE INDEX IF NOT EXISTS idx_bcov_industry ON public.billionaire_coverage (primary_industry);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billionaire_coverage TO authenticated;
GRANT ALL ON public.billionaire_coverage TO service_role;
ALTER TABLE public.billionaire_coverage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage billionaire_coverage" ON public.billionaire_coverage;
CREATE POLICY "Founders manage billionaire_coverage" ON public.billionaire_coverage
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

-- 2. CANDIDATE ROUTES (never verified, never sendable)
CREATE TABLE IF NOT EXISTS public.billionaire_candidate_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billionaire_id uuid NOT NULL REFERENCES public.billionaire_intelligence(id) ON DELETE CASCADE,
  source_affiliation_id uuid REFERENCES public.billionaire_affiliations(id) ON DELETE SET NULL,
  candidate_type text NOT NULL
    CHECK (candidate_type IN ('foundation','family_office','company','bank','adviser','private_equity','network','institutional_connector','philanthropic_advisor','wealth_source_company','philanthropic_initiative')),
  organisation_name text NOT NULL,
  route_basis text NOT NULL,
  derived_from text NOT NULL DEFAULT 'affiliation',
  website_url text,
  confidence_score smallint NOT NULL DEFAULT 20,
  verification_state text NOT NULL DEFAULT 'candidate' CHECK (verification_state = 'candidate'),
  outreach_allowed boolean NOT NULL DEFAULT false CHECK (outreach_allowed = false),
  evidence_summary text,
  source_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bcand_route
  ON public.billionaire_candidate_routes (billionaire_id, candidate_type, lower(organisation_name));
CREATE INDEX IF NOT EXISTS idx_bcand_bid ON public.billionaire_candidate_routes (billionaire_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billionaire_candidate_routes TO authenticated;
GRANT ALL ON public.billionaire_candidate_routes TO service_role;
ALTER TABLE public.billionaire_candidate_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage billionaire_candidate_routes" ON public.billionaire_candidate_routes;
CREATE POLICY "Founders manage billionaire_candidate_routes" ON public.billionaire_candidate_routes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

-- 3. ENRICHMENT QUEUE
CREATE TABLE IF NOT EXISTS public.billionaire_enrichment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billionaire_id uuid NOT NULL UNIQUE REFERENCES public.billionaire_intelligence(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','verified','no_public_route','needs_manual_review')),
  priority integer NOT NULL DEFAULT 50,
  batch_key text,
  attempts integer NOT NULL DEFAULT 0,
  last_checked_at timestamptz,
  next_check_at timestamptz NOT NULL DEFAULT now(),
  source_types_checked jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_result text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bq_work ON public.billionaire_enrichment_queue (status, priority DESC, next_check_at);
CREATE INDEX IF NOT EXISTS idx_bq_batch ON public.billionaire_enrichment_queue (batch_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billionaire_enrichment_queue TO authenticated;
GRANT ALL ON public.billionaire_enrichment_queue TO service_role;
ALTER TABLE public.billionaire_enrichment_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage billionaire_enrichment_queue" ON public.billionaire_enrichment_queue;
CREATE POLICY "Founders manage billionaire_enrichment_queue" ON public.billionaire_enrichment_queue
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

-- timestamps
DROP TRIGGER IF EXISTS trg_bcov_upd ON public.billionaire_coverage;
CREATE TRIGGER trg_bcov_upd BEFORE UPDATE ON public.billionaire_coverage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_bcand_upd ON public.billionaire_candidate_routes;
CREATE TRIGGER trg_bcand_upd BEFORE UPDATE ON public.billionaire_candidate_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_bq_upd ON public.billionaire_enrichment_queue;
CREATE TRIGGER trg_bq_upd BEFORE UPDATE ON public.billionaire_enrichment_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. REBUILD / BACKFILL
CREATE OR REPLACE FUNCTION public.rebuild_billionaire_coverage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_result jsonb;
BEGIN
  -- candidate routes derived from meaningful affiliations
  INSERT INTO public.billionaire_candidate_routes
    (billionaire_id, source_affiliation_id, candidate_type, organisation_name, route_basis,
     derived_from, website_url, confidence_score, evidence_summary, source_url)
  SELECT DISTINCT ON (a.billionaire_id, a.affiliation_type, lower(a.organisation_name))
    a.billionaire_id, a.id, a.affiliation_type, a.organisation_name,
    CASE WHEN a.affiliation_type IN ('foundation','philanthropic_initiative') THEN 'philanthropic_entity_public_channel'
         WHEN a.affiliation_type = 'family_office' THEN 'family_office_institutional_channel'
         ELSE 'institutional_company_channel' END,
    'affiliation', a.website_url,
    LEAST(60, COALESCE(a.confidence_score, 20)),
    a.evidence_summary, a.evidence_url
  FROM public.billionaire_affiliations a
  WHERE a.organisation_name IS NOT NULL AND btrim(a.organisation_name) <> ''
    AND a.affiliation_type IN ('foundation','family_office','company','bank','adviser','private_equity',
                               'network','institutional_connector','philanthropic_advisor',
                               'wealth_source_company','philanthropic_initiative')
  ON CONFLICT (billionaire_id, candidate_type, lower(organisation_name)) DO UPDATE
    SET website_url = COALESCE(EXCLUDED.website_url, public.billionaire_candidate_routes.website_url),
        evidence_summary = COALESCE(EXCLUDED.evidence_summary, public.billionaire_candidate_routes.evidence_summary),
        updated_at = now();

  -- coverage upsert for EVERY billionaire
  WITH pw AS (
    SELECT billionaire_id,
      count(*) FILTER (WHERE COALESCE(intermediary_name,'') = '') AS inst,
      count(*) FILTER (WHERE COALESCE(intermediary_name,'') <> '') AS interm,
      bool_or(outreach_allowed AND COALESCE(route_status,'') <> 'rejected'
              AND (COALESCE(public_email,'') <> '' OR COALESCE(contact_url,'') <> '' OR COALESCE(linkedin_url,'') <> '')) AS sendable,
      max(COALESCE(confidence_score,0)) AS conf,
      max(last_verified_at) AS last_ver
    FROM public.billionaire_access_pathways
    WHERE COALESCE(route_status,'') <> 'rejected'
    GROUP BY billionaire_id
  ), cand AS (
    SELECT billionaire_id, count(*) AS n,
      count(*) FILTER (WHERE candidate_type IN ('foundation','philanthropic_initiative')) AS fnd,
      count(*) FILTER (WHERE candidate_type = 'family_office') AS fo,
      count(*) FILTER (WHERE candidate_type IN ('company','wealth_source_company')) AS co
    FROM public.billionaire_candidate_routes GROUP BY billionaire_id
  ), base AS (
    SELECT b.id,
      b.full_name, b.citizenship,
      COALESCE(NULLIF(b.industries::text,'null'),'') AS ind_txt,
      COALESCE(NULLIF(b.wealth_sources::text,'null'),'') AS src_txt,
      CASE WHEN jsonb_typeof(b.industries) = 'array' THEN b.industries->>0 ELSE NULLIF(b.industries::text,'null') END AS primary_industry,
      b.networth_usd_m, b.snapshot_date,
      COALESCE(p.inst,0) AS inst, COALESCE(p.interm,0) AS interm,
      COALESCE(p.sendable,false) AS sendable, COALESCE(p.conf,0) AS pconf, p.last_ver,
      COALESCE(c.n,0) AS cand_n, COALESCE(c.fnd,0) AS fnd, COALESCE(c.fo,0) AS fo, COALESCE(c.co,0) AS co
    FROM public.billionaire_intelligence b
    LEFT JOIN pw p ON p.billionaire_id = b.id
    LEFT JOIN cand c ON c.billionaire_id = b.id
  ), scored AS (
    SELECT base.*,
      (base.inst + base.interm) > 0 AS has_verified,
      -- wealth freshness: historical Forbes figure only
      CASE WHEN base.snapshot_date IS NULL THEN 'unknown'
           WHEN base.snapshot_date > (current_date - interval '180 days') THEN 'recent'
           WHEN base.snapshot_date > (current_date - interval '540 days') THEN 'historical'
           ELSE 'stale' END AS freshness,
      LEAST(100, GREATEST(0, (ln(GREATEST(base.networth_usd_m,1)) / ln(200000)) * 100))::smallint AS capacity,
      (CASE WHEN base.fnd > 0 THEN 45 ELSE 0 END
       + CASE WHEN base.src_txt ILIKE '%philanthrop%' OR base.ind_txt ILIKE '%philanthrop%' THEN 15 ELSE 0 END
       + CASE WHEN base.fo > 0 THEN 15 ELSE 0 END)::smallint AS phil,
      (CASE WHEN base.ind_txt ILIKE '%healthcare%' OR base.ind_txt ILIKE '%health%'
                 OR base.src_txt ILIKE '%pharma%' OR base.src_txt ILIKE '%health%'
                 OR base.src_txt ILIKE '%hospital%' OR base.src_txt ILIKE '%biotech%' THEN 100 ELSE 0 END)::smallint AS health,
      (CASE WHEN base.citizenship IN ('Nigeria','South Africa','Egypt','Morocco','Algeria','Tanzania','Zimbabwe','Kenya','Ghana','Uganda','Angola','Ethiopia','Sudan','Ivory Coast','Senegal','Namibia','Botswana','Zambia','Mozambique','Rwanda') THEN 100
            WHEN base.src_txt ILIKE '%africa%' OR base.ind_txt ILIKE '%africa%' THEN 70 ELSE 0 END)::smallint AS africa
    FROM base
  ), final AS (
    SELECT s.*,
      CASE WHEN s.freshness IN ('recent') THEN 1.0 WHEN s.freshness = 'historical' THEN 0.8
           WHEN s.freshness = 'stale' THEN 0.6 ELSE 0.5 END AS fresh_factor,
      CASE WHEN s.has_verified THEN 100 WHEN s.cand_n > 0 THEN 35 ELSE 0 END AS route_strength
    FROM scored s
  )
  INSERT INTO public.billionaire_coverage AS t (
    billionaire_id, full_name, citizenship, primary_industry,
    verified_institutional_routes, verified_intermediary_routes, candidate_route_count,
    foundation_count, family_office_count, company_route_count,
    enrichment_status, outreach_readiness, outreach_blocker_reason,
    last_enriched_at, next_enrichment_priority, research_confidence,
    historical_networth_usd_m, historical_networth_as_of,
    wealth_data_freshness, wealth_trajectory,
    liquidity_capacity_score, urgency_priority_score,
    ghat_fit_score, philanthropy_intensity_score, health_relevance_score, africa_relevance_score,
    giving_pledge_signal, has_foundation, has_family_office, ghat_priority_score, evidence
  )
  SELECT f.id, f.full_name, f.citizenship, f.primary_industry,
    f.inst, f.interm, f.cand_n, f.fnd, f.fo, f.co,
    CASE WHEN f.has_verified THEN 'verified_route'
         WHEN f.cand_n > 0 THEN 'candidate_only'
         ELSE 'queued' END,
    CASE WHEN f.sendable AND f.fresh_factor >= 0.8 THEN 'ready'
         WHEN f.sendable THEN 'ready_low_confidence'
         WHEN f.has_verified THEN 'blocked'
         WHEN f.cand_n > 0 THEN 'candidate_only'
         ELSE 'no_route' END,
    CASE WHEN f.sendable THEN NULL
         WHEN f.has_verified THEN 'verified route exists but no approved public contact channel'
         WHEN f.cand_n > 0 THEN 'candidate routes only — require verification before any outreach'
         ELSE 'no public or institutional route identified yet' END,
    now(),
    LEAST(100, GREATEST(1, round(
        (CASE WHEN f.has_verified THEN 20 ELSE 60 END)
      + (f.fnd * 10) + (f.fo * 5)
      + ((0.3 * ((ln(GREATEST(f.networth_usd_m,1)) / ln(200000)) * 100)))
    )))::int,
    LEAST(100, GREATEST(0, round(
        (CASE WHEN f.has_verified THEN 55 WHEN f.cand_n > 0 THEN 25 ELSE 5 END)
      * f.fresh_factor
      + (CASE WHEN f.pconf > 0 THEN f.pconf * 0.3 ELSE 0 END)
    )))::smallint,
    f.networth_usd_m, f.snapshot_date,
    f.freshness, 'unknown',
    f.capacity,
    LEAST(100, GREATEST(0, round(f.capacity * f.fresh_factor)))::smallint,
    LEAST(100, GREATEST(0, round(0.45 * f.capacity + 0.35 * f.phil + 0.20 * f.route_strength)))::smallint,
    f.phil, f.health, f.africa,
    false, f.fnd > 0, f.fo > 0,
    LEAST(100, GREATEST(0, round((
        0.22 * LEAST(100, 0.45 * f.capacity + 0.35 * f.phil + 0.20 * f.route_strength)
      + 0.20 * f.phil
      + 0.15 * f.health
      + 0.13 * f.africa
      + 0.15 * f.route_strength
      + 0.15 * f.capacity
    ) * f.fresh_factor)))::smallint,
    jsonb_build_object('derived_at', now(), 'pathway_confidence', f.pconf, 'candidate_routes', f.cand_n)
  FROM final f
  ON CONFLICT (billionaire_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    citizenship = EXCLUDED.citizenship,
    primary_industry = EXCLUDED.primary_industry,
    verified_institutional_routes = EXCLUDED.verified_institutional_routes,
    verified_intermediary_routes = EXCLUDED.verified_intermediary_routes,
    candidate_route_count = EXCLUDED.candidate_route_count,
    foundation_count = EXCLUDED.foundation_count,
    family_office_count = EXCLUDED.family_office_count,
    company_route_count = EXCLUDED.company_route_count,
    enrichment_status = CASE WHEN t.enrichment_status IN ('in_progress','needs_manual_review','no_public_route')
                             AND EXCLUDED.enrichment_status <> 'verified_route'
                        THEN t.enrichment_status ELSE EXCLUDED.enrichment_status END,
    outreach_readiness = EXCLUDED.outreach_readiness,
    outreach_blocker_reason = EXCLUDED.outreach_blocker_reason,
    last_enriched_at = EXCLUDED.last_enriched_at,
    next_enrichment_priority = EXCLUDED.next_enrichment_priority,
    research_confidence = EXCLUDED.research_confidence,
    historical_networth_usd_m = EXCLUDED.historical_networth_usd_m,
    historical_networth_as_of = EXCLUDED.historical_networth_as_of,
    wealth_data_freshness = CASE WHEN t.current_networth_as_of IS NOT NULL THEN t.wealth_data_freshness ELSE EXCLUDED.wealth_data_freshness END,
    liquidity_capacity_score = EXCLUDED.liquidity_capacity_score,
    urgency_priority_score = EXCLUDED.urgency_priority_score,
    ghat_fit_score = EXCLUDED.ghat_fit_score,
    philanthropy_intensity_score = EXCLUDED.philanthropy_intensity_score,
    health_relevance_score = EXCLUDED.health_relevance_score,
    africa_relevance_score = EXCLUDED.africa_relevance_score,
    has_foundation = EXCLUDED.has_foundation,
    has_family_office = EXCLUDED.has_family_office,
    ghat_priority_score = EXCLUDED.ghat_priority_score,
    evidence = EXCLUDED.evidence,
    updated_at = now();

  -- queue every billionaire lacking a verified route
  INSERT INTO public.billionaire_enrichment_queue (billionaire_id, status, priority, batch_key, next_check_at, notes)
  SELECT c.billionaire_id, 'pending', c.next_enrichment_priority,
         'auto-' || to_char(now(),'YYYYMMDD'), now(),
         'auto-queued: ' || c.enrichment_status
  FROM public.billionaire_coverage c
  WHERE (c.verified_institutional_routes + c.verified_intermediary_routes) = 0
  ON CONFLICT (billionaire_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = CASE WHEN public.billionaire_enrichment_queue.status IN ('in_progress','needs_manual_review','no_public_route')
                  THEN public.billionaire_enrichment_queue.status ELSE 'pending' END,
    updated_at = now();

  -- close queue rows that now have verified routes
  UPDATE public.billionaire_enrichment_queue q
  SET status = 'verified', last_checked_at = now(), updated_at = now()
  FROM public.billionaire_coverage c
  WHERE c.billionaire_id = q.billionaire_id
    AND (c.verified_institutional_routes + c.verified_intermediary_routes) > 0
    AND q.status <> 'verified';

  SELECT jsonb_build_object(
    'universe', (SELECT count(*) FROM public.billionaire_intelligence),
    'coverage_records', (SELECT count(*) FROM public.billionaire_coverage),
    'verified_routes', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes > 0),
    'candidate_only', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes = 0 AND candidate_route_count > 0),
    'no_route', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes = 0 AND candidate_route_count = 0),
    'outreach_ready', (SELECT count(*) FROM public.billionaire_coverage WHERE outreach_readiness IN ('ready','ready_low_confidence')),
    'stale_wealth', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_data_freshness IN ('stale','historical','unknown')),
    'queued', (SELECT count(*) FROM public.billionaire_enrichment_queue WHERE status IN ('pending','in_progress','needs_manual_review')),
    'candidate_routes', (SELECT count(*) FROM public.billionaire_candidate_routes),
    'missing_coverage', (SELECT count(*) FROM public.billionaire_intelligence b WHERE NOT EXISTS (SELECT 1 FROM public.billionaire_coverage c WHERE c.billionaire_id = b.id))
  ) INTO v_result;
  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.rebuild_billionaire_coverage() FROM public;
GRANT EXECUTE ON FUNCTION public.rebuild_billionaire_coverage() TO authenticated, service_role;
