CREATE TABLE IF NOT EXISTS public.crm_hardening_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_hardening_test_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders and admins read crm_hardening_test_runs" ON public.crm_hardening_test_runs;
CREATE POLICY "Founders and admins read crm_hardening_test_runs"
  ON public.crm_hardening_test_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));

DROP POLICY IF EXISTS "Founders and admins insert crm_hardening_test_runs" ON public.crm_hardening_test_runs;
CREATE POLICY "Founders and admins insert crm_hardening_test_runs"
  ON public.crm_hardening_test_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));

CREATE INDEX IF NOT EXISTS crm_hardening_test_runs_created_at_idx ON public.crm_hardening_test_runs (created_at DESC);