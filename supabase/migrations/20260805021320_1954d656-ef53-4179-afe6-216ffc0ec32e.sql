ALTER TABLE public.social_business_channel_map
  ADD COLUMN IF NOT EXISTS dispatch_mode text NOT NULL DEFAULT 'OFF';

DO $$ BEGIN
  ALTER TABLE public.social_business_channel_map
    ADD CONSTRAINT social_business_channel_map_dispatch_mode_chk
    CHECK (dispatch_mode IN ('OFF','DRAFT_TO_BUFFER','AUTO_SCHEDULE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.social_distribution_dispatch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'buffer',
  trigger_source text NOT NULL DEFAULT 'manual',
  business_id uuid,
  run_status text NOT NULL DEFAULT 'completed',
  jobs_considered integer NOT NULL DEFAULT 0,
  jobs_dispatched integer NOT NULL DEFAULT 0,
  jobs_blocked integer NOT NULL DEFAULT 0,
  jobs_failed integer NOT NULL DEFAULT 0,
  jobs_duplicate integer NOT NULL DEFAULT 0,
  jobs_unknown integer NOT NULL DEFAULT 0,
  error_message text,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_distribution_dispatch_runs TO authenticated;
GRANT ALL ON public.social_distribution_dispatch_runs TO service_role;
ALTER TABLE public.social_distribution_dispatch_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "founder_admin_all_social_distribution_dispatch_runs"
    ON public.social_distribution_dispatch_runs FOR ALL TO authenticated
    USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
    WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS social_distribution_dispatch_runs_started_idx
  ON public.social_distribution_dispatch_runs (started_at DESC);