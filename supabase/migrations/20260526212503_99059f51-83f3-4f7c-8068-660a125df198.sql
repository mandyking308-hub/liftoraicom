
CREATE TABLE public.ai_eval_test_suites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suite_name TEXT NOT NULL,
  suite_type TEXT NOT NULL DEFAULT 'agent_quality',
  business_id UUID,
  agent_key TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_eval_test_suites TO authenticated;
GRANT ALL ON public.ai_eval_test_suites TO service_role;
ALTER TABLE public.ai_eval_test_suites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai eval suites" ON public.ai_eval_test_suites
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_eval_suites_updated BEFORE UPDATE ON public.ai_eval_test_suites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_eval_test_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suite_id UUID NOT NULL REFERENCES public.ai_eval_test_suites(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_prompt TEXT NOT NULL,
  expected_behaviour TEXT,
  prohibited_behaviour TEXT,
  business_id UUID,
  agent_key TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_eval_test_cases TO authenticated;
GRANT ALL ON public.ai_eval_test_cases TO service_role;
ALTER TABLE public.ai_eval_test_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai eval cases" ON public.ai_eval_test_cases
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_ai_eval_cases_updated BEFORE UPDATE ON public.ai_eval_test_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_eval_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suite_id UUID NOT NULL REFERENCES public.ai_eval_test_suites(id) ON DELETE CASCADE,
  run_status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  warning_tests INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_eval_runs TO authenticated;
GRANT ALL ON public.ai_eval_runs TO service_role;
ALTER TABLE public.ai_eval_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai eval runs" ON public.ai_eval_runs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ai_eval_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.ai_eval_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.ai_eval_test_cases(id) ON DELETE CASCADE,
  result_status TEXT NOT NULL DEFAULT 'pass',
  output_summary TEXT,
  failure_reason TEXT,
  quality_score NUMERIC,
  safety_score NUMERIC,
  cost_estimate NUMERIC,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_eval_results TO authenticated;
GRANT ALL ON public.ai_eval_results TO service_role;
ALTER TABLE public.ai_eval_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai eval results" ON public.ai_eval_results
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
