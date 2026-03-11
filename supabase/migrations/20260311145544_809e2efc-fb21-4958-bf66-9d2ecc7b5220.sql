
-- Workflow executions
CREATE TABLE public.workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  system_id uuid NOT NULL REFERENCES public.monitored_systems(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  priority text NOT NULL DEFAULT 'normal',
  result text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage executions" ON public.workflow_executions FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own executions" ON public.workflow_executions FOR SELECT USING (system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON public.workflow_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Execution steps
CREATE TABLE public.execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
  step_name text NOT NULL,
  order_index integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  agent_name text,
  result text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.execution_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage execution steps" ON public.execution_steps FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own execution steps" ON public.execution_steps FOR SELECT USING (execution_id IN (SELECT id FROM public.workflow_executions WHERE system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));

-- Execution logs
CREATE TABLE public.execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_name text,
  event text NOT NULL,
  details text,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage execution logs" ON public.execution_logs FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own execution logs" ON public.execution_logs FOR SELECT USING (execution_id IN (SELECT id FROM public.workflow_executions WHERE system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));
