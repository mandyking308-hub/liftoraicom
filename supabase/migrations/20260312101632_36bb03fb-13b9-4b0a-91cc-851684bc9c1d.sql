
CREATE TABLE public.platform_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name text NOT NULL DEFAULT 'Full Platform Validation',
  status text NOT NULL DEFAULT 'running',
  total_tests integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  warnings integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.platform_test_runs(id) ON DELETE CASCADE NOT NULL,
  module text NOT NULL DEFAULT 'general',
  test_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  details text,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage test runs" ON public.platform_test_runs
  FOR ALL TO public USING (has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "Founders can manage test results" ON public.platform_test_results
  FOR ALL TO public USING (has_role(auth.uid(), 'founder'::app_role));
