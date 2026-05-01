-- Automation fields on segments
ALTER TABLE public.apollo_sync_segments
  ADD COLUMN IF NOT EXISTS automation_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_cron text NOT NULL DEFAULT '0 6 * * *',
  ADD COLUMN IF NOT EXISTS daily_search_cap integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS daily_enrichment_cap integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS auto_enrich boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_good_fit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_only boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS skip_suppressed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_scheduled_run_at timestamptz;

-- Daily automation audit log
CREATE TABLE IF NOT EXISTS public.apollo_automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid NOT NULL REFERENCES public.apollo_sync_segments(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  run_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  status text NOT NULL DEFAULT 'started',
  search_run_id uuid,
  searched integer NOT NULL DEFAULT 0,
  found integer NOT NULL DEFAULT 0,
  skipped_duplicates integer NOT NULL DEFAULT 0,
  skipped_suppressed integer NOT NULL DEFAULT 0,
  segment_fit text,
  enrichment_credits_used integer NOT NULL DEFAULT 0,
  enrichment_skipped_reason text,
  contacts_new integer NOT NULL DEFAULT 0,
  contacts_updated integer NOT NULL DEFAULT 0,
  qualified integer NOT NULL DEFAULT 0,
  staged integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS apollo_automation_runs_segment_date_idx
  ON public.apollo_automation_runs(segment_id, run_date DESC);
CREATE INDEX IF NOT EXISTS apollo_automation_runs_date_idx
  ON public.apollo_automation_runs(run_date DESC);

ALTER TABLE public.apollo_automation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage apollo_automation_runs"
  ON public.apollo_automation_runs
  FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER apollo_automation_runs_updated_at
  BEFORE UPDATE ON public.apollo_automation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();