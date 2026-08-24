-- Reconcile the complete GitHub research layer to the stored 2026 wealth snapshot
-- and, through that snapshot, to the historical production billionaire_id.
-- Only the additive research table is changed here.

DO $check$
DECLARE
  v_rows integer;
  v_outreach integer;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE outreach_allowed)
    INTO v_rows, v_outreach
  FROM public.billionaire_access_research_2026;

  IF v_rows <> 3428 THEN
    RAISE EXCEPTION 'Expected 3428 billionaire research rows, found %', v_rows;
  END IF;

  IF v_outreach <> 0 THEN
    RAISE EXCEPTION 'Research import must not enable outreach; found % enabled rows', v_outreach;
  END IF;
END
$check$;

UPDATE public.billionaire_access_research_2026
SET snapshot_id = NULL,
    billionaire_id = NULL,
    match_status = 'pending',
    match_confidence = 0,
    updated_at = now();

-- Pass 1: a normalized name appears exactly once in both the research layer
-- and the stored 2026 snapshot.
WITH research_counts AS (
  SELECT normalized_name, count(*) AS n
  FROM public.billionaire_access_research_2026
  GROUP BY normalized_name
),
snapshot_scope AS (
  SELECT *
  FROM public.billionaire_wealth_snapshots
  WHERE source_name = 'forbes_world_billionaires_2026'
    AND snapshot_date = DATE '2026-03-01'
),
snapshot_counts AS (
  SELECT normalized_name, count(*) AS n
  FROM snapshot_scope
  GROUP BY normalized_name
),
pairs AS (
  SELECT
    r.source_row,
    s.id AS snapshot_id,
    s.billionaire_id,
    s.match_status,
    s.match_confidence
  FROM public.billionaire_access_research_2026 r
  JOIN research_counts rc
    ON rc.normalized_name = r.normalized_name
   AND rc.n = 1
  JOIN snapshot_scope s
    ON s.normalized_name = r.normalized_name
  JOIN snapshot_counts sc
    ON sc.normalized_name = s.normalized_name
   AND sc.n = 1
)
UPDATE public.billionaire_access_research_2026 r
SET snapshot_id = p.snapshot_id,
    billionaire_id = p.billionaire_id,
    match_status = CASE p.match_status
      WHEN 'matched' THEN 'matched'
      WHEN 'ambiguous' THEN 'ambiguous'
      WHEN 'unmatched_new_2026' THEN 'unmatched_new_2026'
      ELSE 'manual_review'
    END,
    match_confidence = p.match_confidence,
    metadata = r.metadata || jsonb_build_object(
      'snapshot_match_method', 'unique_normalized_name',
      'snapshot_match_recorded_at', now()
    ),
    updated_at = now()
FROM pairs p
WHERE r.source_row = p.source_row;

-- Pass 2: resolve residual collisions only when the exact displayed-name pair
-- is unique on both sides. Nothing is guessed.
WITH snapshot_scope AS (
  SELECT *
  FROM public.billionaire_wealth_snapshots
  WHERE source_name = 'forbes_world_billionaires_2026'
    AND snapshot_date = DATE '2026-03-01'
),
candidates AS (
  SELECT
    r.source_row,
    s.id AS snapshot_id,
    s.billionaire_id,
    s.match_status,
    s.match_confidence,
    count(*) OVER (PARTITION BY r.source_row) AS research_candidates,
    count(*) OVER (PARTITION BY s.id) AS snapshot_candidates
  FROM public.billionaire_access_research_2026 r
  JOIN snapshot_scope s
    ON lower(btrim(s.source_name_raw)) = lower(btrim(r.billionaire_name))
  WHERE r.match_status = 'pending'
),
pairs AS (
  SELECT *
  FROM candidates
  WHERE research_candidates = 1
    AND snapshot_candidates = 1
)
UPDATE public.billionaire_access_research_2026 r
SET snapshot_id = p.snapshot_id,
    billionaire_id = p.billionaire_id,
    match_status = CASE p.match_status
      WHEN 'matched' THEN 'matched'
      WHEN 'ambiguous' THEN 'ambiguous'
      WHEN 'unmatched_new_2026' THEN 'unmatched_new_2026'
      ELSE 'manual_review'
    END,
    match_confidence = p.match_confidence,
    metadata = r.metadata || jsonb_build_object(
      'snapshot_match_method', 'unique_exact_display_name',
      'snapshot_match_recorded_at', now()
    ),
    updated_at = now()
FROM pairs p
WHERE r.source_row = p.source_row;

-- Preserve every unresolved collision for manual review.
UPDATE public.billionaire_access_research_2026 r
SET match_status = CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.billionaire_wealth_snapshots s
        WHERE s.source_name = 'forbes_world_billionaires_2026'
          AND s.snapshot_date = DATE '2026-03-01'
          AND (
            s.normalized_name = r.normalized_name
            OR lower(btrim(s.source_name_raw)) = lower(btrim(r.billionaire_name))
          )
      ) THEN 'manual_review'
      ELSE 'missing_snapshot'
    END,
    metadata = r.metadata || jsonb_build_object(
      'snapshot_match_method', 'manual_review_required',
      'snapshot_match_recorded_at', now()
    ),
    updated_at = now()
WHERE r.match_status = 'pending';

CREATE OR REPLACE VIEW public.billionaire_access_research_2026_summary
WITH (security_invoker = true)
AS
SELECT
  count(*)::integer AS source_rows,
  count(*) FILTER (WHERE snapshot_id IS NOT NULL)::integer AS snapshot_rows_linked,
  count(*) FILTER (WHERE billionaire_id IS NOT NULL)::integer AS historical_ids_linked,
  count(*) FILTER (WHERE match_status = 'matched')::integer AS matched,
  count(*) FILTER (WHERE match_status = 'ambiguous')::integer AS ambiguous,
  count(*) FILTER (WHERE match_status = 'unmatched_new_2026')::integer AS new_2026_names,
  count(*) FILTER (WHERE match_status = 'manual_review')::integer AS manual_review,
  count(*) FILTER (WHERE match_status = 'missing_snapshot')::integer AS missing_snapshot,
  count(*) FILTER (WHERE verification_status = 'verified_public_institutional')::integer
    AS verified_public_institutional,
  count(*) FILTER (WHERE verification_status = 'verified_institutional_restricted')::integer
    AS verified_institutional_restricted,
  count(*) FILTER (WHERE verification_status = 'verified_institutional_source_age_warning')::integer
    AS verified_institutional_source_age_warning,
  count(*) FILTER (WHERE verification_status = 'verified_institutional_switchboard_or_postal')::integer
    AS verified_institutional_switchboard_or_postal,
  count(*) FILTER (WHERE verification_status = 'legal_compliance_block')::integer
    AS legal_compliance_block,
  count(*) FILTER (WHERE verification_status = 'deceased_remove_from_active_outreach')::integer
    AS deceased_remove_from_active_outreach,
  count(*) FILTER (WHERE verification_status = 'enhanced_compliance_review')::integer
    AS enhanced_compliance_review,
  bool_or(outreach_allowed) AS any_outreach_enabled
FROM public.billionaire_access_research_2026;

REVOKE ALL ON public.billionaire_access_research_2026_summary FROM anon;
GRANT SELECT ON public.billionaire_access_research_2026_summary TO authenticated;
GRANT SELECT ON public.billionaire_access_research_2026_summary TO service_role;

COMMENT ON VIEW public.billionaire_access_research_2026_summary IS
  'Completion and reconciliation audit for the 3,428-row GitHub billionaire access research layer.';
