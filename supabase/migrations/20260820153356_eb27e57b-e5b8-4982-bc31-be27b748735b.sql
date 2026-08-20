CREATE OR REPLACE FUNCTION public.rebuild_billionaire_coverage()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  PERFORM public.derive_billionaire_route_evidence_states();

  -- candidate routes derived from meaningful affiliations, ranked by usefulness
  INSERT INTO public.billionaire_candidate_routes
    (billionaire_id, source_affiliation_id, candidate_type, organisation_name, route_basis,
     derived_from, website_url, confidence_score, evidence_summary, source_url, priority_rank)
  SELECT DISTINCT ON (a.billionaire_id, a.affiliation_type, lower(a.organisation_name))
    a.billionaire_id, a.id, a.affiliation_type, a.organisation_name,
    CASE WHEN a.affiliation_type IN ('foundation','philanthropic_initiative') THEN 'philanthropic_entity_public_channel'
         WHEN a.affiliation_type = 'family_office' THEN 'family_office_institutional_channel'
         WHEN a.affiliation_type IN ('network','institutional_connector','philanthropic_advisor') THEN 'network_institutional_channel'
         ELSE 'institutional_company_channel' END,
    'affiliation', a.website_url,
    LEAST(60, COALESCE(a.confidence_score, 20)),
    a.evidence_summary, a.evidence_url,
    CASE a.affiliation_type
      WHEN 'foundation' THEN 1 WHEN 'philanthropic_initiative' THEN 1
      WHEN 'family_office' THEN 2
      WHEN 'philanthropic_advisor' THEN 3 WHEN 'network' THEN 3 WHEN 'institutional_connector' THEN 3
      WHEN 'bank' THEN 4 WHEN 'adviser' THEN 4 WHEN 'private_equity' THEN 4
      WHEN 'company' THEN 5 ELSE 6 END
  FROM public.billionaire_affiliations a
  WHERE a.organisation_name IS NOT NULL AND btrim(a.organisation_name) <> ''
    AND a.affiliation_type IN ('foundation','family_office','company','bank','adviser','private_equity',
                               'network','institutional_connector','philanthropic_advisor',
                               'wealth_source_company','philanthropic_initiative')
  ON CONFLICT (billionaire_id, candidate_type, lower(organisation_name)) DO UPDATE
    SET website_url = COALESCE(EXCLUDED.website_url, public.billionaire_candidate_routes.website_url),
        evidence_summary = COALESCE(EXCLUDED.evidence_summary, public.billionaire_candidate_routes.evidence_summary),
        source_url = COALESCE(EXCLUDED.source_url, public.billionaire_candidate_routes.source_url),
        priority_rank = EXCLUDED.priority_rank,
        updated_at = now();

  WITH pw AS (
    SELECT billionaire_id,
      count(*) FILTER (WHERE route_evidence_state = 'verified_public_institutional') AS inst,
      count(*) FILTER (WHERE route_evidence_state = 'verified_warm_intermediary')    AS interm,
      count(*) FILTER (WHERE route_evidence_state = 'researched_candidate')          AS researched,
      bool_or(outreach_allowed AND route_evidence_state IN ('verified_public_institutional','verified_warm_intermediary')
              AND (COALESCE(public_email,'') <> '' OR COALESCE(contact_url,'') <> '')) AS sendable,
      max(COALESCE(confidence_score,0)) AS conf
    FROM public.billionaire_access_pathways
    WHERE route_evidence_state <> 'rejected'
    GROUP BY billionaire_id
  ), cand AS (
    SELECT billionaire_id, count(*) AS n,
      count(*) FILTER (WHERE candidate_type IN ('foundation','philanthropic_initiative')) AS fnd,
      count(*) FILTER (WHERE candidate_type = 'family_office') AS fo,
      count(*) FILTER (WHERE candidate_type IN ('company','wealth_source_company')) AS co
    FROM public.billionaire_candidate_routes GROUP BY billionaire_id
  ), pledge AS (
    SELECT l.billionaire_id, count(*) AS n,
           bool_or(m.network_name ILIKE '%giving pledge%') AS pledged,
           jsonb_agg(DISTINCT jsonb_build_object('network', m.network_name, 'source', m.source_url)) AS ev
    FROM public.billionaire_network_links l
    JOIN public.philanthropy_network_members m ON m.id = l.network_member_id
    GROUP BY l.billionaire_id
  ), warm AS (
    SELECT (metadata->>'billionaire_id')::uuid AS billionaire_id, count(*) AS n
    FROM public.historical_investor_connections
    WHERE billionaire_link_status = 'linked_evidence' AND metadata->>'billionaire_id' IS NOT NULL
    GROUP BY 1
  ), snap AS (
    SELECT billionaire_id, networth_usd_m, snapshot_date, source_name, match_confidence
    FROM public.billionaire_wealth_snapshots
    WHERE match_status = 'matched' AND match_confidence >= 80 AND billionaire_id IS NOT NULL
  ), base AS (
    SELECT b.id, b.full_name, b.citizenship,
      COALESCE(NULLIF(b.industries::text,'null'),'') AS ind_txt,
      COALESCE(NULLIF(b.wealth_sources::text,'null'),'') AS src_txt,
      CASE WHEN jsonb_typeof(b.industries) = 'array' THEN b.industries->>0 ELSE NULLIF(b.industries::text,'null') END AS primary_industry,
      b.networth_usd_m AS hist_nw, b.snapshot_date AS hist_date,
      s.networth_usd_m AS cur_nw, s.snapshot_date AS cur_date, s.source_name AS cur_src,
      COALESCE(p.inst,0) AS inst, COALESCE(p.interm,0) AS interm, COALESCE(p.researched,0) AS researched,
      COALESCE(p.sendable,false) AS sendable, COALESCE(p.conf,0) AS pconf,
      COALESCE(c.n,0) AS cand_n, COALESCE(c.fnd,0) AS fnd, COALESCE(c.fo,0) AS fo, COALESCE(c.co,0) AS co,
      COALESCE(pl.n,0) AS pnm_n, COALESCE(pl.pledged,false) AS pledged, pl.ev AS pledge_ev,
      COALESCE(w.n,0) AS warm_n
    FROM public.billionaire_intelligence b
    LEFT JOIN pw p ON p.billionaire_id = b.id
    LEFT JOIN cand c ON c.billionaire_id = b.id
    LEFT JOIN pledge pl ON pl.billionaire_id = b.id
    LEFT JOIN warm w ON w.billionaire_id = b.id
    LEFT JOIN snap s ON s.billionaire_id = b.id
  ), scored AS (
    SELECT base.*,
      (base.inst + base.interm) > 0 AS has_verified,
      COALESCE(base.cur_nw, base.hist_nw) AS eff_nw,
      CASE WHEN base.cur_date IS NOT NULL AND base.cur_date > (current_date - interval '210 days') THEN 'current'
           WHEN base.cur_date IS NOT NULL AND base.cur_date > (current_date - interval '400 days') THEN 'recent'
           WHEN base.hist_date IS NULL THEN 'unknown'
           WHEN base.hist_date > (current_date - interval '540 days') THEN 'historical'
           ELSE 'stale' END AS freshness,
      CASE WHEN base.cur_nw IS NOT NULL AND base.hist_nw > 0 AND base.cur_nw > 0
           THEN round(((base.cur_nw - base.hist_nw) / base.hist_nw) * 100, 2) END AS change_pct,
      (CASE WHEN base.fnd > 0 THEN 40 ELSE 0 END
       + CASE WHEN base.pledged THEN 25 ELSE 0 END
       + CASE WHEN base.src_txt ILIKE '%philanthrop%' OR base.ind_txt ILIKE '%philanthrop%' THEN 15 ELSE 0 END
       + CASE WHEN base.fo > 0 THEN 15 ELSE 0 END)::smallint AS phil,
      (CASE WHEN base.ind_txt ILIKE '%health%' OR base.src_txt ILIKE '%pharma%' OR base.src_txt ILIKE '%health%'
                 OR base.src_txt ILIKE '%hospital%' OR base.src_txt ILIKE '%biotech%' THEN 100 ELSE 0 END)::smallint AS health,
      (CASE WHEN base.citizenship IN ('Nigeria','South Africa','Egypt','Morocco','Algeria','Tanzania','Zimbabwe','Kenya','Ghana','Uganda','Angola','Ethiopia','Sudan','Ivory Coast','Senegal','Namibia','Botswana','Zambia','Mozambique','Rwanda') THEN 100
            WHEN base.src_txt ILIKE '%africa%' OR base.ind_txt ILIKE '%africa%' THEN 70 ELSE 0 END)::smallint AS africa
    FROM base
  ), final AS (
    SELECT s.*,
      LEAST(100, GREATEST(0, (ln(GREATEST(s.eff_nw,1)) / ln(200000)) * 100))::smallint AS capacity,
      CASE WHEN s.freshness = 'current' THEN 1.0 WHEN s.freshness = 'recent' THEN 0.9
           WHEN s.freshness = 'historical' THEN 0.7 WHEN s.freshness = 'stale' THEN 0.55 ELSE 0.5 END AS fresh_factor,
      CASE WHEN s.change_pct IS NULL THEN 'unknown'
           WHEN s.change_pct > 10 THEN 'rising'
           WHEN s.change_pct < -10 THEN 'falling'
           ELSE 'stable' END AS trajectory,
      CASE WHEN s.has_verified THEN 100 WHEN s.cand_n > 0 THEN 35 ELSE 0 END AS route_strength,
      (s.cur_nw IS NULL) AS match_missing
    FROM scored s
  )
  INSERT INTO public.billionaire_coverage AS t (
    billionaire_id, full_name, citizenship, primary_industry,
    verified_institutional_routes, verified_intermediary_routes, researched_route_count, candidate_route_count,
    foundation_count, family_office_count, company_route_count,
    enrichment_status, outreach_readiness, outreach_blocker_reason,
    last_enriched_at, next_enrichment_priority, research_confidence,
    historical_networth_usd_m, historical_networth_as_of,
    current_networth_usd_m, current_networth_as_of, current_networth_source, current_networth_change_pct,
    snapshot_match_status, dropoff_candidate,
    wealth_data_freshness, wealth_trajectory,
    liquidity_capacity_score, urgency_priority_score,
    ghat_fit_score, philanthropy_intensity_score, health_relevance_score, africa_relevance_score,
    giving_pledge_signal, philanthropy_network_matches, warm_relationship_evidence_count,
    has_foundation, has_family_office, ghat_priority_score, evidence
  )
  SELECT f.id, f.full_name, f.citizenship, f.primary_industry,
    f.inst, f.interm, f.researched, f.cand_n, f.fnd, f.fo, f.co,
    CASE WHEN f.has_verified THEN 'verified_route' WHEN f.cand_n > 0 THEN 'candidate_only' ELSE 'queued' END,
    CASE WHEN f.sendable AND f.fresh_factor >= 0.9 THEN 'ready'
         WHEN f.sendable THEN 'ready_low_confidence'
         WHEN f.has_verified THEN 'blocked'
         WHEN f.cand_n > 0 THEN 'candidate_only'
         ELSE 'no_route' END,
    CASE WHEN f.sendable THEN NULL
         WHEN f.has_verified THEN 'verified route exists but outreach not approved / no public contact channel'
         WHEN f.cand_n > 0 THEN 'candidate routes only — require verification before any outreach'
         ELSE 'no public or institutional route identified yet' END,
    now(),
    LEAST(100, GREATEST(1, round(
        (CASE WHEN f.has_verified THEN 20 ELSE 60 END)
      + (CASE WHEN f.match_missing THEN 15 ELSE 0 END)
      + (f.fnd * 10) + (f.fo * 5) + (CASE WHEN f.pledged THEN 15 ELSE 0 END)
      + (0.3 * ((ln(GREATEST(f.eff_nw,1)) / ln(200000)) * 100))
    )))::int,
    LEAST(100, GREATEST(0, round(
        (CASE WHEN f.has_verified THEN 55 WHEN f.cand_n > 0 THEN 25 ELSE 5 END) * f.fresh_factor
      + (CASE WHEN f.pconf > 0 THEN f.pconf * 0.3 ELSE 0 END)
      + (CASE WHEN f.match_missing THEN -10 ELSE 10 END)
    )))::smallint,
    f.hist_nw, f.hist_date,
    f.cur_nw, f.cur_date, f.cur_src, f.change_pct,
    CASE WHEN f.cur_nw IS NOT NULL THEN 'matched_2026' ELSE '2026_list_match_missing' END,
    f.match_missing,
    f.freshness, f.trajectory,
    f.capacity,
    LEAST(100, GREATEST(0, round(f.capacity * f.fresh_factor)))::smallint,
    LEAST(100, GREATEST(0, round(0.45 * f.capacity + 0.35 * f.phil + 0.20 * f.route_strength)))::smallint,
    f.phil, f.health, f.africa,
    f.pledged, f.pnm_n, f.warm_n,
    f.fnd > 0, f.fo > 0,
    LEAST(100, GREATEST(0, round((
        0.22 * LEAST(100, 0.45 * f.capacity + 0.35 * f.phil + 0.20 * f.route_strength)
      + 0.20 * f.phil + 0.15 * f.health + 0.13 * f.africa
      + 0.15 * f.route_strength + 0.15 * f.capacity) * f.fresh_factor)))::smallint,
    jsonb_build_object('derived_at', now(), 'pathway_confidence', f.pconf,
      'candidate_routes', f.cand_n, 'wealth_change_pct', f.change_pct,
      'wealth_basis', CASE WHEN f.cur_nw IS NOT NULL THEN 'forbes_2026_matched_snapshot' ELSE 'forbes_jan_2025_historical_only' END,
      'philanthropy_network_evidence', f.pledge_ev, 'warm_relationship_evidence', f.warm_n)
  FROM final f
  ON CONFLICT (billionaire_id) DO UPDATE SET
    full_name = EXCLUDED.full_name, citizenship = EXCLUDED.citizenship, primary_industry = EXCLUDED.primary_industry,
    verified_institutional_routes = EXCLUDED.verified_institutional_routes,
    verified_intermediary_routes = EXCLUDED.verified_intermediary_routes,
    researched_route_count = EXCLUDED.researched_route_count,
    candidate_route_count = EXCLUDED.candidate_route_count,
    foundation_count = EXCLUDED.foundation_count, family_office_count = EXCLUDED.family_office_count,
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
    current_networth_usd_m = COALESCE(EXCLUDED.current_networth_usd_m, t.current_networth_usd_m),
    current_networth_as_of = COALESCE(EXCLUDED.current_networth_as_of, t.current_networth_as_of),
    current_networth_source = COALESCE(EXCLUDED.current_networth_source, t.current_networth_source),
    current_networth_change_pct = COALESCE(EXCLUDED.current_networth_change_pct, t.current_networth_change_pct),
    snapshot_match_status = EXCLUDED.snapshot_match_status,
    dropoff_candidate = EXCLUDED.dropoff_candidate,
    wealth_data_freshness = EXCLUDED.wealth_data_freshness,
    wealth_trajectory = EXCLUDED.wealth_trajectory,
    liquidity_capacity_score = EXCLUDED.liquidity_capacity_score,
    urgency_priority_score = EXCLUDED.urgency_priority_score,
    ghat_fit_score = EXCLUDED.ghat_fit_score,
    philanthropy_intensity_score = EXCLUDED.philanthropy_intensity_score,
    health_relevance_score = EXCLUDED.health_relevance_score,
    africa_relevance_score = EXCLUDED.africa_relevance_score,
    giving_pledge_signal = EXCLUDED.giving_pledge_signal,
    philanthropy_network_matches = EXCLUDED.philanthropy_network_matches,
    warm_relationship_evidence_count = EXCLUDED.warm_relationship_evidence_count,
    has_foundation = EXCLUDED.has_foundation, has_family_office = EXCLUDED.has_family_office,
    ghat_priority_score = EXCLUDED.ghat_priority_score,
    evidence = EXCLUDED.evidence, updated_at = now();

  -- enrichment queue: anyone lacking a verified route
  INSERT INTO public.billionaire_enrichment_queue (billionaire_id, status, priority, batch_key, next_check_at, notes)
  SELECT c.billionaire_id, 'pending', c.next_enrichment_priority,
         'access-' || to_char(now(),'YYYYMMDD'), now(), 'auto-queued: ' || c.enrichment_status
  FROM public.billionaire_coverage c
  WHERE (c.verified_institutional_routes + c.verified_intermediary_routes) = 0
  ON CONFLICT (billionaire_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = CASE WHEN public.billionaire_enrichment_queue.status IN ('in_progress','needs_manual_review','no_public_route')
                  THEN public.billionaire_enrichment_queue.status ELSE 'pending' END,
    updated_at = now();

  -- wealth-match manual review batch for old records with no confident 2026 match
  UPDATE public.billionaire_enrichment_queue q
  SET batch_key = 'wealth-match-review',
      notes = COALESCE(q.notes,'') || ' | no confident 2026 list match — dropoff candidate, not confirmed drop-off',
      updated_at = now()
  FROM public.billionaire_coverage c
  WHERE c.billionaire_id = q.billionaire_id AND c.dropoff_candidate
    AND COALESCE(q.batch_key,'') <> 'wealth-match-review';

  INSERT INTO public.billionaire_enrichment_queue (billionaire_id, status, priority, batch_key, next_check_at, notes)
  SELECT c.billionaire_id, 'needs_manual_review', 90, 'wealth-match-review', now(),
         'no confident 2026 list match — dropoff candidate, not confirmed drop-off'
  FROM public.billionaire_coverage c WHERE c.dropoff_candidate
  ON CONFLICT (billionaire_id) DO UPDATE SET
    status = CASE WHEN public.billionaire_enrichment_queue.status = 'verified' THEN 'verified' ELSE 'needs_manual_review' END,
    batch_key = 'wealth-match-review', updated_at = now();

  UPDATE public.billionaire_enrichment_queue q
  SET status = 'verified', last_checked_at = now(), updated_at = now()
  FROM public.billionaire_coverage c
  WHERE c.billionaire_id = q.billionaire_id
    AND (c.verified_institutional_routes + c.verified_intermediary_routes) > 0
    AND q.status <> 'verified';

  SELECT jsonb_build_object(
    'universe', (SELECT count(*) FROM public.billionaire_intelligence),
    'coverage_records', (SELECT count(*) FROM public.billionaire_coverage),
    'missing_coverage', (SELECT count(*) FROM public.billionaire_intelligence b WHERE NOT EXISTS (SELECT 1 FROM public.billionaire_coverage c WHERE c.billionaire_id = b.id)),
    'verified_public_institutional', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes > 0),
    'verified_warm_intermediary', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_intermediary_routes > 0),
    'researched_or_candidate_only', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes = 0 AND (candidate_route_count > 0 OR researched_route_count > 0)),
    'no_route', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes + candidate_route_count + researched_route_count = 0),
    'current_wealth', (SELECT count(*) FROM public.billionaire_coverage WHERE current_networth_as_of IS NOT NULL),
    'stale_wealth', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_data_freshness IN ('stale','historical','unknown')),
    'rising', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'rising'),
    'stable', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'stable'),
    'falling', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'falling'),
    'dropoff_candidates', (SELECT count(*) FROM public.billionaire_coverage WHERE dropoff_candidate),
    'giving_pledge', (SELECT count(*) FROM public.billionaire_coverage WHERE giving_pledge_signal),
    'foundations_unique', (SELECT count(*) FROM public.billionaire_coverage WHERE has_foundation),
    'family_offices_unique', (SELECT count(*) FROM public.billionaire_coverage WHERE has_family_office),
    'outreach_ready', (SELECT count(*) FROM public.billionaire_coverage WHERE outreach_readiness IN ('ready','ready_low_confidence')),
    'queued', (SELECT count(*) FROM public.billionaire_enrichment_queue WHERE status IN ('pending','in_progress','needs_manual_review'))
  ) INTO v_result;
  RETURN v_result;
END; $$;

CREATE OR REPLACE VIEW public.billionaire_completion_metrics
WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.billionaire_intelligence) AS universe_2025,
  (SELECT count(*) FROM public.billionaire_coverage) AS coverage_records,
  (SELECT count(*) FROM public.billionaire_wealth_snapshots WHERE source_name = 'forbes_world_billionaires_2026') AS snapshot_2026_rows,
  (SELECT count(*) FROM public.billionaire_wealth_snapshots WHERE match_status = 'matched' AND match_confidence >= 80) AS matched_high_confidence,
  (SELECT count(*) FROM public.billionaire_wealth_snapshots WHERE match_status = 'ambiguous') AS ambiguous_matches,
  (SELECT count(*) FROM public.billionaire_coverage WHERE dropoff_candidate) AS dropoff_candidates,
  (SELECT count(*) FROM public.billionaire_wealth_snapshots WHERE match_status = 'unmatched_new_2026') AS new_2026_names,
  (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'rising') AS rising,
  (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'stable') AS stable,
  (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'falling') AS falling,
  (SELECT count(*) FROM public.billionaire_coverage WHERE current_networth_as_of IS NOT NULL) AS current_wealth,
  (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_data_freshness IN ('stale','historical','unknown')) AS stale_wealth,
  (SELECT count(*) FROM public.billionaire_coverage WHERE giving_pledge_signal) AS giving_pledge,
  (SELECT count(*) FROM public.billionaire_coverage WHERE philanthropy_network_matches > 0) AS philanthropy_network_matched,
  (SELECT count(*) FROM public.billionaire_coverage WHERE has_foundation) AS foundations_unique,
  (SELECT count(*) FROM public.billionaire_coverage WHERE has_family_office) AS family_offices_unique,
  (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes > 0) AS verified_public_institutional,
  (SELECT count(*) FROM public.billionaire_coverage WHERE verified_intermediary_routes > 0) AS verified_warm_intermediary,
  (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes = 0 AND (candidate_route_count > 0 OR researched_route_count > 0)) AS researched_candidate_only,
  (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes + candidate_route_count + researched_route_count = 0) AS no_route,
  (SELECT count(*) FROM public.billionaire_enrichment_queue WHERE status IN ('pending','in_progress','needs_manual_review')) AS enrichment_queue,
  (SELECT count(*) FROM public.billionaire_enrichment_queue WHERE batch_key = 'wealth-match-review' AND status <> 'verified') AS wealth_match_review_queue,
  (SELECT count(*) FROM public.billionaire_coverage WHERE outreach_readiness IN ('ready','ready_low_confidence')) AS outreach_ready;

GRANT SELECT ON public.billionaire_completion_metrics TO authenticated;