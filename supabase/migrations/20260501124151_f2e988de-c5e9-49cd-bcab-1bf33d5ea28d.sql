
ALTER TABLE public.apollo_sync_segments
  ADD COLUMN IF NOT EXISTS current_page integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS next_page integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_page_processed integer,
  ADD COLUMN IF NOT EXISTS apollo_person_ids_seen text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS apollo_person_ids_enriched text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS apollo_person_ids_imported text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS apollo_person_ids_skipped_existing text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS apollo_person_ids_skipped_no_email text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.apollo_sync_runs
  ADD COLUMN IF NOT EXISTS page_fetched integer,
  ADD COLUMN IF NOT EXISTS unseen_in_batch integer,
  ADD COLUMN IF NOT EXISTS skipped_already_seen integer;

-- Backfill seen ids from existing apollo_leads so today's previously-fetched
-- contacts aren't returned again on the very next page-1 fetch.
UPDATE public.apollo_sync_segments seg
SET apollo_person_ids_seen = COALESCE(seg.apollo_person_ids_seen, '{}') || COALESCE(sub.ids, '{}')
FROM (
  SELECT segment_id, array_agg(DISTINCT apollo_person_id) FILTER (WHERE apollo_person_id IS NOT NULL) AS ids
  FROM public.apollo_leads
  GROUP BY segment_id
) sub
WHERE sub.segment_id = seg.id;

-- Deduplicate seen array
UPDATE public.apollo_sync_segments
SET apollo_person_ids_seen = ARRAY(SELECT DISTINCT unnest(apollo_person_ids_seen));
