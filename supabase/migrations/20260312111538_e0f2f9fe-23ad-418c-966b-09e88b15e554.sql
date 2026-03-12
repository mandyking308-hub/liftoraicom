CREATE TABLE public.platform_diagnostic_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  systems_checked INTEGER NOT NULL DEFAULT 0,
  failures_detected INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_diagnostic_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage diagnostic runs"
  ON public.platform_diagnostic_runs FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role));