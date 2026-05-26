
CREATE TABLE public.liftor_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'other'
    CHECK (event_category IN ('sales','payment','delivery','support','marketplace','finance','compliance','privacy','incident','ai','system','manual','other')),
  source_module TEXT NOT NULL,
  source_table TEXT,
  source_record_id UUID,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_status TEXT NOT NULL DEFAULT 'new'
    CHECK (event_status IN ('new','processing','processed','failed','ignored','cancelled')),
  idempotency_key TEXT UNIQUE,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX liftor_events_type_idx ON public.liftor_events(event_type, created_at DESC);
CREATE INDEX liftor_events_status_idx ON public.liftor_events(event_status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liftor_events TO authenticated;
GRANT ALL ON public.liftor_events TO service_role;
ALTER TABLE public.liftor_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "liftor_events founder all" ON public.liftor_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.workflow_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  workflow_code TEXT NOT NULL UNIQUE,
  trigger_event_type TEXT NOT NULL,
  workflow_category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  external_action_possible BOOLEAN NOT NULL DEFAULT false,
  requires_founder_approval_for_external BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX workflow_definitions_trigger_idx ON public.workflow_definitions(trigger_event_type) WHERE active = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_definitions TO authenticated;
GRANT ALL ON public.workflow_definitions TO service_role;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_definitions founder all" ON public.workflow_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_definition_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  triggering_event_id UUID REFERENCES public.liftor_events(id) ON DELETE SET NULL,
  business_id UUID,
  run_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (run_status IN ('queued','running','completed','failed','cancelled','waiting_approval')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX workflow_runs_status_idx ON public.workflow_runs(run_status, created_at DESC);
CREATE INDEX workflow_runs_event_idx ON public.workflow_runs(triggering_event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_runs TO authenticated;
GRANT ALL ON public.workflow_runs TO service_role;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_runs founder all" ON public.workflow_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.workflow_step_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  step_status TEXT NOT NULL DEFAULT 'queued'
    CHECK (step_status IN ('queued','running','completed','failed','skipped','waiting_approval')),
  source_module TEXT,
  target_module TEXT,
  output_summary TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX workflow_step_runs_run_idx ON public.workflow_step_runs(workflow_run_id, step_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_step_runs TO authenticated;
GRANT ALL ON public.workflow_step_runs TO service_role;
ALTER TABLE public.workflow_step_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_step_runs founder all" ON public.workflow_step_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.workflow_failure_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  workflow_step_run_id UUID REFERENCES public.workflow_step_runs(id) ON DELETE SET NULL,
  failure_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (failure_type IN ('validation','missing_data','permission','provider','schema','duplicate','timeout','unknown')),
  failure_summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','acknowledged','resolved','ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX workflow_failure_events_status_idx ON public.workflow_failure_events(status, severity, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_failure_events TO authenticated;
GRANT ALL ON public.workflow_failure_events TO service_role;
ALTER TABLE public.workflow_failure_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_failure_events founder all" ON public.workflow_failure_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER trg_workflow_definitions_updated_at BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workflow_runs_updated_at BEFORE UPDATE ON public.workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workflow_step_runs_updated_at BEFORE UPDATE ON public.workflow_step_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workflow_failure_events_updated_at BEFORE UPDATE ON public.workflow_failure_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
