-- helper index for name matching
CREATE INDEX IF NOT EXISTS bi_norm_name_idx ON public.billionaire_intelligence (public.bi_normalize_name(full_name));
CREATE UNIQUE INDEX IF NOT EXISTS bnl_unique_pair ON public.billionaire_network_links (billionaire_id, network_member_id);

-- ============================================================
-- 1. route evidence grading (researched != verified)
-- ============================================================
CREATE OR REPLACE FUNCTION public.derive_billionaire_route_evidence_states()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  UPDATE public.billionaire_access_pathways p
  SET route_evidence_state = CASE
        WHEN COALESCE(p.route_status,'') = 'rejected' THEN 'rejected'
        WHEN COALESCE(p.route_status,'') IN ('verified','confirmed','active')
             AND COALESCE(p.intermediary_name,'') <> '' THEN 'verified_warm_intermediary'
        WHEN COALESCE(p.route_status,'') IN ('verified','confirmed','active')
             AND (COALESCE(p.public_email,'') <> '' OR COALESCE(p.contact_url,'') <> '')
             AND COALESCE(p.source_url,'') <> '' THEN 'verified_public_institutional'
        ELSE 'researched_candidate' END,
      updated_at = now();

  SELECT jsonb_object_agg(route_evidence_state, n) INTO v
  FROM (SELECT route_evidence_state, count(*) n FROM public.billionaire_access_pathways GROUP BY 1) x;
  RETURN COALESCE(v, '{}'::jsonb);
END; $$;

-- ============================================================
-- 2. philanthropy network + warm relationship evidence mapping
-- ============================================================
CREATE OR REPLACE FUNCTION public.map_billionaire_network_evidence()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_pnm_matched int; v_pnm_amb int; v_pnm_total int; v_hic int; v_sai int;
BEGIN
  -- Giving Pledge / philanthropy network members -> billionaires (unique normalized name both sides only)
  WITH old AS (SELECT id, public.bi_normalize_name(full_name) n FROM public.billionaire_intelligence),
       oldc AS (SELECT n, count(*) c FROM old GROUP BY n),
       mem AS (SELECT id, public.bi_normalize_name(member_display_name) n FROM public.philanthropy_network_members),
       memc AS (SELECT n, count(*) c FROM mem GROUP BY n),
       pair AS (
         SELECT m.id mid, o.id oid FROM mem m JOIN old o ON o.n = m.n
         JOIN oldc oc ON oc.n = m.n JOIN memc mc ON mc.n = m.n
         WHERE oc.c = 1 AND mc.c = 1 AND m.n IS NOT NULL
       )
  INSERT INTO public.billionaire_network_links (billionaire_id, network_member_id, match_method, confidence_score, route_status, outreach_allowed)
  SELECT oid, mid, 'exact_normalized_name', 90, 'researched', false FROM pair
  ON CONFLICT (billionaire_id, network_member_id) DO UPDATE
    SET match_method = EXCLUDED.match_method, confidence_score = GREATEST(public.billionaire_network_links.confidence_score, EXCLUDED.confidence_score);

  SELECT count(*) INTO v_pnm_total FROM public.philanthropy_network_members;
  SELECT count(DISTINCT network_member_id) INTO v_pnm_matched FROM public.billionaire_network_links;
  SELECT count(*) INTO v_pnm_amb FROM (
    SELECT public.bi_normalize_name(m.member_display_name) n
    FROM public.philanthropy_network_members m
    WHERE EXISTS (SELECT 1 FROM public.billionaire_intelligence b
                  WHERE public.bi_normalize_name(b.full_name) = public.bi_normalize_name(m.member_display_name))
      AND NOT EXISTS (SELECT 1 FROM public.billionaire_network_links l WHERE l.network_member_id = m.id)
  ) x;

  -- historical investor connections: concrete evidence only
  UPDATE public.historical_investor_connections h
  SET billionaire_link_status = CASE WHEN b.id IS NOT NULL THEN 'linked_evidence' ELSE 'no_match_manual_review' END,
      metadata = COALESCE(h.metadata,'{}'::jsonb) || jsonb_build_object('billionaire_id', b.id, 'match_method','exact_normalized_name'),
      updated_at = now()
  FROM (SELECT public.bi_normalize_name(person_name) n, id FROM public.historical_investor_connections) src
  LEFT JOIN LATERAL (
    SELECT bi.id FROM public.billionaire_intelligence bi
    WHERE public.bi_normalize_name(bi.full_name) = src.n
    LIMIT 1
  ) b ON true
  WHERE h.id = src.id;
  GET DIAGNOSTICS v_hic = ROW_COUNT;

  UPDATE public.strategic_access_intermediaries s SET updated_at = now() WHERE true;
  GET DIAGNOSTICS v_sai = ROW_COUNT;

  RETURN jsonb_build_object(
    'philanthropy_network_members', v_pnm_total,
    'philanthropy_members_matched', v_pnm_matched,
    'philanthropy_members_unmatched', v_pnm_total - v_pnm_matched,
    'philanthropy_members_needing_manual_link', v_pnm_amb,
    'historical_investor_connections_processed', v_hic,
    'historical_investor_connections_linked', (SELECT count(*) FROM public.historical_investor_connections WHERE billionaire_link_status = 'linked_evidence'),
    'strategic_intermediaries', v_sai);
END; $$;

-- ============================================================
-- 3. 2026 snapshot matching
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_billionaire_wealth_snapshots(
  _source text DEFAULT 'forbes_world_billionaires_2026', _snapshot_date date DEFAULT '2026-03-01')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  UPDATE public.billionaire_wealth_snapshots
  SET billionaire_id = NULL, match_status = 'unmatched_new_2026', match_method = NULL,
      match_confidence = 0, match_notes = NULL, updated_at = now()
  WHERE source_name = _source AND snapshot_date = _snapshot_date AND match_status <> 'manual_review';

  -- pass 1: unique normalized name on both sides
  WITH old AS (SELECT id, citizenship, public.bi_normalize_name(full_name) n FROM public.billionaire_intelligence),
       oldc AS (SELECT n, count(*) c FROM old GROUP BY n),
       snap AS (SELECT id, citizenship, normalized_name n FROM public.billionaire_wealth_snapshots
                WHERE source_name = _source AND snapshot_date = _snapshot_date AND match_status <> 'manual_review'),
       snapc AS (SELECT n, count(*) c FROM snap GROUP BY n),
       uniq AS (
         SELECT s.id sid, o.id oid,
                lower(COALESCE(s.citizenship,'')) = lower(COALESCE(o.citizenship,'')) AS cit_match
         FROM snap s JOIN old o ON o.n = s.n
         JOIN oldc oc ON oc.n = s.n JOIN snapc sc ON sc.n = s.n
         WHERE oc.c = 1 AND sc.c = 1
       )
  UPDATE public.billionaire_wealth_snapshots b
  SET billionaire_id = u.oid, match_status = 'matched', match_method = 'exact_normalized_name',
      match_confidence = CASE WHEN u.cit_match THEN 98 ELSE 88 END,
      match_notes = CASE WHEN u.cit_match THEN 'unique normalised name, citizenship agrees'
                         ELSE 'unique normalised name, citizenship differs or missing' END,
      updated_at = now()
  FROM uniq u WHERE b.id = u.sid;

  -- pass 2: non-unique names resolved by citizenship, only when that pair is unique
  WITH old AS (SELECT id, citizenship, public.bi_normalize_name(full_name) n FROM public.billionaire_intelligence
               WHERE NOT EXISTS (SELECT 1 FROM public.billionaire_wealth_snapshots s
                                 WHERE s.billionaire_id = billionaire_intelligence.id
                                   AND s.source_name = _source AND s.snapshot_date = _snapshot_date)),
       snap AS (SELECT id, citizenship, normalized_name n FROM public.billionaire_wealth_snapshots
                WHERE source_name = _source AND snapshot_date = _snapshot_date AND match_status = 'unmatched_new_2026'),
       pair AS (
         SELECT s.id sid, o.id oid, s.n, lower(COALESCE(s.citizenship,'')) cit
         FROM snap s JOIN old o ON o.n = s.n
         WHERE lower(COALESCE(s.citizenship,'')) = lower(COALESCE(o.citizenship,''))
           AND COALESCE(s.citizenship,'') <> ''
       ),
       uniqp AS (
         SELECT sid, min(oid) oid FROM pair GROUP BY sid, n, cit
         HAVING count(*) = 1
       ),
       dedup AS (SELECT oid, min(sid::text)::uuid sid FROM uniqp GROUP BY oid HAVING count(*) = 1)
  UPDATE public.billionaire_wealth_snapshots b
  SET billionaire_id = d.oid, match_status = 'matched', match_method = 'name_plus_citizenship',
      match_confidence = 80, match_notes = 'ambiguous name resolved by unique citizenship agreement', updated_at = now()
  FROM dedup d WHERE b.id = d.sid;

  -- remaining rows that DO have same-name candidates but could not be resolved => ambiguous
  UPDATE public.billionaire_wealth_snapshots b
  SET match_status = 'ambiguous', match_method = 'name_collision',
      match_notes = 'same normalised name exists in the 2025 universe but could not be resolved safely', updated_at = now()
  WHERE b.source_name = _source AND b.snapshot_date = _snapshot_date AND b.match_status = 'unmatched_new_2026'
    AND EXISTS (SELECT 1 FROM public.billionaire_intelligence o
                WHERE public.bi_normalize_name(o.full_name) = b.normalized_name);

  SELECT jsonb_build_object(
    'snapshot_rows', count(*),
    'matched', count(*) FILTER (WHERE match_status = 'matched'),
    'matched_high_confidence', count(*) FILTER (WHERE match_status = 'matched' AND match_confidence >= 80),
    'ambiguous', count(*) FILTER (WHERE match_status = 'ambiguous'),
    'new_2026_not_in_old_universe', count(*) FILTER (WHERE match_status = 'unmatched_new_2026'),
    'manual_review', count(*) FILTER (WHERE match_status = 'manual_review')
  ) INTO v FROM public.billionaire_wealth_snapshots
  WHERE source_name = _source AND snapshot_date = _snapshot_date;
  RETURN v;
END; $$;