
CREATE TABLE public.environment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_name TEXT NOT NULL CHECK (environment_name IN ('production','staging','test','development','other')),
  environment_status TEXT NOT NULL DEFAULT 'unknown' CHECK (environment_status IN ('unknown','healthy','warning','error','paused')),
  app_url TEXT,
  supabase_project_summary TEXT,
  branch_summary TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.environment_records TO authenticated;
GRANT ALL ON public.environment_records TO service_role;
ALTER TABLE public.environment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "envr admin select" ON public.environment_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "envr admin insert" ON public.environment_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "envr admin update" ON public.environment_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_envr_updated BEFORE UPDATE ON public.environment_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.deployment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID REFERENCES public.environment_records(id) ON DELETE CASCADE,
  commit_hash TEXT,
  release_name TEXT,
  deployment_status TEXT NOT NULL DEFAULT 'pending' CHECK (deployment_status IN ('pending','deployed','failed','rolled_back','cancelled')),
  deployed_at TIMESTAMPTZ,
  deployed_by TEXT,
  build_status TEXT,
  test_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.deployment_records TO authenticated;
GRANT ALL ON public.deployment_records TO service_role;
ALTER TABLE public.deployment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "depr admin select" ON public.deployment_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "depr admin insert" ON public.deployment_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "depr admin update" ON public.deployment_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_depr_env ON public.deployment_records(environment_id);
CREATE INDEX idx_depr_status ON public.deployment_records(deployment_status);

CREATE TABLE public.migration_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID REFERENCES public.environment_records(id) ON DELETE CASCADE,
  migration_name TEXT NOT NULL,
  migration_status TEXT NOT NULL DEFAULT 'unknown' CHECK (migration_status IN ('pending','applied','failed','rolled_back','unknown')),
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.migration_records TO authenticated;
GRANT ALL ON public.migration_records TO service_role;
ALTER TABLE public.migration_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "migr admin select" ON public.migration_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "migr admin insert" ON public.migration_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "migr admin update" ON public.migration_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_migr_updated BEFORE UPDATE ON public.migration_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.edge_function_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID REFERENCES public.environment_records(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  deployed_status TEXT NOT NULL DEFAULT 'unknown' CHECK (deployed_status IN ('unknown','deployed','failed','deprecated','no_op')),
  last_deployed_at TIMESTAMPTZ,
  last_error TEXT,
  external_action_possible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.edge_function_records TO authenticated;
GRANT ALL ON public.edge_function_records TO service_role;
ALTER TABLE public.edge_function_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "efr admin select" ON public.edge_function_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "efr admin insert" ON public.edge_function_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "efr admin update" ON public.edge_function_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_efr_updated BEFORE UPDATE ON public.edge_function_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.environment_variable_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id UUID REFERENCES public.environment_records(id) ON DELETE CASCADE,
  variable_name TEXT NOT NULL,
  configured BOOLEAN NOT NULL DEFAULT FALSE,
  sensitivity_level TEXT NOT NULL DEFAULT 'medium' CHECK (sensitivity_level IN ('low','medium','high','critical')),
  last_verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.environment_variable_records TO authenticated;
GRANT ALL ON public.environment_variable_records TO service_role;
ALTER TABLE public.environment_variable_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evr admin select" ON public.environment_variable_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "evr admin insert" ON public.environment_variable_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "evr admin update" ON public.environment_variable_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_evr_updated BEFORE UPDATE ON public.environment_variable_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
