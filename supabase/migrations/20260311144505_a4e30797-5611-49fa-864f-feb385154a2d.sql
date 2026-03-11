
-- Monitored systems (one per client project)
CREATE TABLE public.monitored_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  system_name text NOT NULL,
  status text NOT NULL DEFAULT 'operational',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.monitored_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own monitored systems" ON public.monitored_systems FOR SELECT USING (client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can manage monitored systems" ON public.monitored_systems FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Automation workflows
CREATE TABLE public.automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.monitored_systems(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  last_execution timestamptz,
  last_result text DEFAULT 'success',
  execution_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own workflows" ON public.automation_workflows FOR SELECT USING (system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can manage workflows" ON public.automation_workflows FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- AI agents
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.monitored_systems(id) ON DELETE CASCADE,
  name text NOT NULL,
  agent_function text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  last_activity timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own agents" ON public.ai_agents FOR SELECT USING (system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can manage agents" ON public.ai_agents FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- System alerts
CREATE TABLE public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid NOT NULL REFERENCES public.monitored_systems(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text,
  affected_system text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own alerts" ON public.system_alerts FOR SELECT USING (system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can manage alerts" ON public.system_alerts FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Triggers
CREATE TRIGGER update_monitored_systems_updated_at BEFORE UPDATE ON public.monitored_systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON public.automation_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
