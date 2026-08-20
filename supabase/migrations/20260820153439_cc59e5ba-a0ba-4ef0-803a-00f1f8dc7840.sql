CREATE OR REPLACE FUNCTION public.match_billionaire_wealth_snapshots(
  _source text DEFAULT 'forbes_world_billionaires_2026', _snapshot_date date DEFAULT '2026-03-01')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  UPDATE public.billionaire_wealth_snapshots
  SET billionaire_id = NULL, match_status = 'unmatched_new_2026', match_method = NULL,
      match_confidence = 0, match_notes = NULL, updated_at = now()
  WHERE source_name = _source AND snapshot_date = _snapshot_date AND match_status <> 'manual_review';

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

  WITH old AS (SELECT id, citizenship, public.bi_normalize_name(full_name) n FROM public.billionaire_intelligence bi
               WHERE NOT EXISTS (SELECT 1 FROM public.billionaire_wealth_snapshots s
                                 WHERE s.billionaire_id = bi.id
                                   AND s.source_name = _source AND s.snapshot_date = _snapshot_date)),
       snap AS (SELECT id, citizenship, normalized_name n FROM public.billionaire_wealth_snapshots
                WHERE source_name = _source AND snapshot_date = _snapshot_date AND match_status = 'unmatched_new_2026'),
       pair AS (
         SELECT s.id sid, o.id oid, s.n, lower(COALESCE(s.citizenship,'')) cit
         FROM snap s JOIN old o ON o.n = s.n
         WHERE lower(COALESCE(s.citizenship,'')) = lower(COALESCE(o.citizenship,''))
           AND COALESCE(s.citizenship,'') <> ''
       ),
       uniqp AS (SELECT sid, (array_agg(oid))[1] AS oid FROM pair GROUP BY sid, n, cit HAVING count(*) = 1),
       dedup AS (SELECT oid, (array_agg(sid))[1] AS sid FROM uniqp GROUP BY oid HAVING count(*) = 1)
  UPDATE public.billionaire_wealth_snapshots b
  SET billionaire_id = d.oid, match_status = 'matched', match_method = 'name_plus_citizenship',
      match_confidence = 80, match_notes = 'ambiguous name resolved by unique citizenship agreement', updated_at = now()
  FROM dedup d WHERE b.id = d.sid;

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