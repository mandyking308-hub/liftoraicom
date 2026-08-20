
CREATE OR REPLACE FUNCTION public.process_billionaire_enrichment_batch(p_batch_size int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_key text; v_n int; v_ver int; v_warm int; v_cand int; v_none int;
BEGIN
  IF NOT (public._is_founder_or_admin()
          OR (auth.uid() IS NULL AND current_user IN ('postgres','service_role','supabase_admin'))) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  SELECT batch_key INTO v_key
  FROM public.billionaire_enrichment_batches
  WHERE status = 'in_progress' AND batch_key LIKE 'access_2026_b%'
  ORDER BY batch_key LIMIT 1;

  IF v_key IS NULL THEN
    SELECT 'access_2026_b' || lpad((COALESCE(max(substring(batch_key from 'b([0-9]+)$')::int), 0) + 1)::text, 3, '0')
      INTO v_key
    FROM public.billionaire_enrichment_batches WHERE batch_key LIKE 'access_2026_b%';
    v_key := COALESCE(v_key, 'access_2026_b001');
  END IF;

  DROP TABLE IF EXISTS _batch;
  CREATE TEMP TABLE _batch ON COMMIT DROP AS
  SELECT q.id AS queue_id, q.billionaire_id
  FROM public.billionaire_enrichment_queue q
  LEFT JOIN public.billionaire_coverage c ON c.billionaire_id = q.billionaire_id
  WHERE q.status IN ('pending','in_progress') OR COALESCE(q.batch_key,'') NOT LIKE 'access_2026_b%'
  ORDER BY (q.batch_key = v_key) DESC,
           COALESCE(c.ghat_priority_score,0) DESC,
           COALESCE(c.liquidity_capacity_score,0) DESC,
           q.priority DESC,
           q.billionaire_id
  LIMIT p_batch_size;

  SELECT count(*) INTO v_n FROM _batch;
  IF v_n = 0 THEN
    RETURN jsonb_build_object('batch_key', null, 'selected', 0, 'remaining', 0);
  END IF;

  INSERT INTO public.billionaire_enrichment_batches (batch_key, batch_size, status, started_at, records_selected)
  VALUES (v_key, p_batch_size, 'in_progress', now(), v_n)
  ON CONFLICT (batch_key) DO UPDATE SET records_selected = EXCLUDED.records_selected, status = 'in_progress';

  UPDATE public.billionaire_enrichment_queue q
  SET batch_key = v_key, status = 'in_progress', attempts = COALESCE(q.attempts,0) + 1, updated_at = now()
  FROM _batch b WHERE b.queue_id = q.id;

  INSERT INTO public.billionaire_candidate_routes
    (billionaire_id, source_affiliation_id, candidate_type, organisation_name, route_basis,
     derived_from, website_url, confidence_score, evidence_summary, source_url, priority_rank,
     route_access_mode, route_restriction_notes, last_reviewed_at, verification_state, outreach_allowed)
  SELECT DISTINCT ON (a.billionaire_id, a.affiliation_type, lower(a.organisation_name))
    a.billionaire_id, a.id, a.affiliation_type, a.organisation_name,
    CASE WHEN a.affiliation_type IN ('foundation','philanthropic_initiative') THEN 'philanthropic_entity_public_channel'
         WHEN a.affiliation_type = 'family_office' THEN 'family_office_institutional_channel'
         WHEN a.affiliation_type IN ('network','institutional_connector','philanthropic_advisor') THEN 'network_institutional_channel'
         ELSE 'institutional_company_channel' END,
    'affiliation', a.website_url, LEAST(60, COALESCE(a.confidence_score, 20)),
    a.evidence_summary, a.evidence_url,
    CASE a.affiliation_type
      WHEN 'foundation' THEN 1 WHEN 'philanthropic_initiative' THEN 1
      WHEN 'family_office' THEN 2
      WHEN 'philanthropic_advisor' THEN 3 WHEN 'network' THEN 3 WHEN 'institutional_connector' THEN 3
      WHEN 'bank' THEN 4 WHEN 'adviser' THEN 4 WHEN 'private_equity' THEN 4
      WHEN 'company' THEN 5 ELSE 6 END,
    'unknown_requires_verification',
    'No public contact channel evidenced in Liftor yet — requires external public-source verification pass.',
    now(), 'candidate', false
  FROM public.billionaire_affiliations a
  JOIN _batch b ON b.billionaire_id = a.billionaire_id
  WHERE a.organisation_name IS NOT NULL AND btrim(a.organisation_name) <> ''
    AND a.affiliation_type IN ('foundation','family_office','company','bank','adviser','private_equity',
                               'network','institutional_connector','philanthropic_advisor',
                               'wealth_source_company','philanthropic_initiative','corporate_foundation','csr')
  ON CONFLICT (billionaire_id, candidate_type, lower(organisation_name)) DO UPDATE
    SET website_url = COALESCE(EXCLUDED.website_url, public.billionaire_candidate_routes.website_url),
        evidence_summary = COALESCE(EXCLUDED.evidence_summary, public.billionaire_candidate_routes.evidence_summary),
        source_url = COALESCE(EXCLUDED.source_url, public.billionaire_candidate_routes.source_url),
        priority_rank = EXCLUDED.priority_rank, last_reviewed_at = now(), updated_at = now();

  UPDATE public.billionaire_access_pathways p
  SET route_evidence_state = CASE
        WHEN COALESCE(p.route_status,'') = 'rejected' THEN 'rejected'
        WHEN COALESCE(p.route_status,'') IN ('verified','confirmed','active')
             AND COALESCE(p.intermediary_name,'') <> '' AND COALESCE(p.source_url,'') <> ''
             THEN 'verified_warm_intermediary'
        WHEN COALESCE(p.route_status,'') IN ('verified','confirmed','active')
             AND (COALESCE(p.public_email,'') <> '' OR COALESCE(p.contact_url,'') <> '')
             AND COALESCE(p.source_url,'') <> '' THEN 'verified_public_institutional'
        ELSE 'researched_candidate' END,
      route_access_mode = CASE
        WHEN COALESCE(p.route_status,'') IN ('verified','confirmed','active')
             AND (COALESCE(p.public_email,'') <> '' OR COALESCE(p.contact_url,'') <> '')
             AND COALESCE(p.source_url,'') <> '' THEN 'public_enquiry'
        WHEN COALESCE(p.intermediary_name,'') <> '' THEN 'warm_intro_required'
        ELSE 'unknown_requires_verification' END,
      outreach_allowed = false, updated_at = now()
  FROM _batch b WHERE b.billionaire_id = p.billionaire_id;

  WITH pw AS (
    SELECT p.billionaire_id,
      count(*) FILTER (WHERE p.route_evidence_state = 'verified_public_institutional') inst,
      count(*) FILTER (WHERE p.route_evidence_state = 'verified_warm_intermediary') interm,
      count(*) FILTER (WHERE p.route_evidence_state = 'researched_candidate') researched
    FROM public.billionaire_access_pathways p
    JOIN _batch b ON b.billionaire_id = p.billionaire_id
    WHERE p.route_evidence_state <> 'rejected' GROUP BY 1
  ), cand AS (
    SELECT r.billionaire_id, count(*) n,
      count(*) FILTER (WHERE r.candidate_type IN ('foundation','philanthropic_initiative','corporate_foundation','csr')) fnd,
      count(*) FILTER (WHERE r.candidate_type = 'family_office') fo,
      count(*) FILTER (WHERE r.candidate_type IN ('company','wealth_source_company')) co
    FROM public.billionaire_candidate_routes r
    JOIN _batch b ON b.billionaire_id = r.billionaire_id GROUP BY 1
  )
  UPDATE public.billionaire_coverage c
  SET verified_institutional_routes = COALESCE(pw.inst,0),
      verified_intermediary_routes  = COALESCE(pw.interm,0),
      researched_route_count        = COALESCE(pw.researched,0),
      candidate_route_count         = COALESCE(cand.n,0),
      foundation_count              = COALESCE(cand.fnd,0),
      family_office_count           = COALESCE(cand.fo,0),
      company_route_count           = COALESCE(cand.co,0),
      has_foundation                = COALESCE(cand.fnd,0) > 0,
      has_family_office             = COALESCE(cand.fo,0) > 0,
      enrichment_status = CASE
        WHEN COALESCE(pw.inst,0) + COALESCE(pw.interm,0) > 0 THEN 'verified_route'
        WHEN COALESCE(cand.n,0) > 0 THEN 'needs_manual_review'
        ELSE 'no_public_route' END,
      outreach_readiness = CASE
        WHEN COALESCE(pw.inst,0) + COALESCE(pw.interm,0) > 0 THEN 'blocked'
        WHEN COALESCE(cand.n,0) > 0 THEN 'candidate_only'
        ELSE 'no_route' END,
      outreach_blocker_reason = CASE
        WHEN COALESCE(pw.inst,0) + COALESCE(pw.interm,0) > 0 THEN 'verified route exists but outreach not approved'
        WHEN COALESCE(cand.n,0) > 0 THEN 'candidate routes only — public-source verification pass still required'
        ELSE 'no public or institutional route identified in existing evidence' END,
      last_enriched_at = now(),
      evidence = COALESCE(c.evidence,'{}'::jsonb) || jsonb_build_object(
        'batch_key', v_key, 'batch_processed_at', now(),
        'evidence_basis', 'existing_liftor_evidence_only',
        'external_public_source_verification', 'not_performed'),
      updated_at = now()
  FROM _batch b
  LEFT JOIN pw ON pw.billionaire_id = b.billionaire_id
  LEFT JOIN cand ON cand.billionaire_id = b.billionaire_id
  WHERE c.billionaire_id = b.billionaire_id;

  UPDATE public.billionaire_enrichment_queue q
  SET status = CASE
        WHEN c.verified_institutional_routes + c.verified_intermediary_routes > 0 THEN 'verified'
        WHEN c.candidate_route_count > 0 THEN 'needs_manual_review'
        ELSE 'no_public_route' END,
      last_result = CASE
        WHEN c.verified_institutional_routes + c.verified_intermediary_routes > 0 THEN 'verified route confirmed from existing evidence'
        WHEN c.candidate_route_count > 0 THEN 'candidate routes preserved; awaiting external public-source verification'
        ELSE 'no credible institutional route in existing evidence' END,
      source_types_checked = to_jsonb(ARRAY['billionaire_affiliations','billionaire_candidate_routes','billionaire_access_pathways','philanthropy_network_members','billionaire_network_links','historical_investor_connections','strategic_access_intermediaries','billionaire_wealth_snapshots']),
      last_checked_at = now(), next_check_at = now() + interval '90 days', updated_at = now()
  FROM _batch b JOIN public.billionaire_coverage c ON c.billionaire_id = b.billionaire_id
  WHERE q.id = b.queue_id;

  SELECT count(*) FILTER (WHERE c.verified_institutional_routes > 0),
         count(*) FILTER (WHERE c.verified_intermediary_routes > 0),
         count(*) FILTER (WHERE c.verified_institutional_routes + c.verified_intermediary_routes = 0 AND c.candidate_route_count > 0),
         count(*) FILTER (WHERE c.verified_institutional_routes + c.verified_intermediary_routes + c.candidate_route_count = 0)
    INTO v_ver, v_warm, v_cand, v_none
  FROM _batch b JOIN public.billionaire_coverage c ON c.billionaire_id = b.billionaire_id;

  UPDATE public.billionaire_enrichment_batches
  SET status = 'completed', completed_at = now(), records_selected = v_n,
      records_with_verified_route = v_ver + v_warm,
      records_candidate_only = v_cand, records_no_route = v_none,
      notes = 'Deterministic existing-evidence reconciliation. No external public-source verification performed; no outreach.',
      metadata = jsonb_build_object('verified_institutional', v_ver, 'verified_warm', v_warm,
                                    'candidate_only', v_cand, 'no_route', v_none)
  WHERE batch_key = v_key;

  DROP TABLE IF EXISTS _batch;

  RETURN jsonb_build_object('batch_key', v_key, 'selected', v_n,
    'verified_institutional', v_ver, 'verified_warm', v_warm,
    'candidate_only', v_cand, 'no_route', v_none,
    'remaining', (SELECT count(*) FROM public.billionaire_enrichment_queue q2
                  WHERE q2.status IN ('pending','in_progress') OR COALESCE(q2.batch_key,'') NOT LIKE 'access_2026_b%'));
END; $function$;
