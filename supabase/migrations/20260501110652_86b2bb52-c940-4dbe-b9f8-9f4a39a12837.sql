ALTER TABLE public.apollo_sync_runs
  ADD COLUMN IF NOT EXISTS contacts_new integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contacts_updated integer NOT NULL DEFAULT 0;

-- Backfill: for any past completed run, infer counts from current values:
-- contacts_imported = total saved (new + existing updated combined)
-- contacts_duplicate = subset of imported that were existing matches
UPDATE public.apollo_sync_runs
SET contacts_updated = COALESCE(contacts_duplicate, 0),
    contacts_new = GREATEST(COALESCE(contacts_imported, 0) - COALESCE(contacts_duplicate, 0), 0)
WHERE status = 'completed'
  AND contacts_new = 0
  AND contacts_updated = 0;