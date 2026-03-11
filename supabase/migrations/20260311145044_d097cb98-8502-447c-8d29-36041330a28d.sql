
-- Extend automation_workflows with more fields
ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.automation_workflows ADD COLUMN IF NOT EXISTS automation_type text NOT NULL DEFAULT 'operational';

-- Workflow steps
CREATE TABLE public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  name text NOT NULL,
  description text,
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage workflow steps" ON public.workflow_steps FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own workflow steps" ON public.workflow_steps FOR SELECT USING (workflow_id IN (SELECT id FROM public.automation_workflows WHERE system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));

-- Workflow activity logs
CREATE TABLE public.workflow_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage workflow logs" ON public.workflow_activity_logs FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own workflow logs" ON public.workflow_activity_logs FOR SELECT USING (workflow_id IN (SELECT id FROM public.automation_workflows WHERE system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));

-- Workflow alerts
CREATE TABLE public.workflow_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage workflow alerts" ON public.workflow_alerts FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own workflow alerts" ON public.workflow_alerts FOR SELECT USING (workflow_id IN (SELECT id FROM public.automation_workflows WHERE system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));

-- Triggers
CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON public.workflow_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
