
-- Agent-system assignments (many-to-many)
CREATE TABLE public.agent_system_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  system_id uuid NOT NULL REFERENCES public.monitored_systems(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, system_id)
);
ALTER TABLE public.agent_system_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage agent assignments" ON public.agent_system_assignments FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own agent assignments" ON public.agent_system_assignments FOR SELECT USING (system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- Agent activity logs
CREATE TABLE public.agent_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  action text NOT NULL,
  system_name text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage agent logs" ON public.agent_activity_logs FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own agent logs" ON public.agent_activity_logs FOR SELECT USING (agent_id IN (SELECT agent_id FROM public.agent_system_assignments WHERE system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));

-- Agent task stats
CREATE TABLE public.agent_task_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed integer NOT NULL DEFAULT 0,
  tasks_pending integer NOT NULL DEFAULT 0,
  tasks_failed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, date)
);
ALTER TABLE public.agent_task_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage task stats" ON public.agent_task_stats FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own agent task stats" ON public.agent_task_stats FOR SELECT USING (agent_id IN (SELECT agent_id FROM public.agent_system_assignments WHERE system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));

-- Agent alerts
CREATE TABLE public.agent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text,
  affected_system text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage agent alerts" ON public.agent_alerts FOR ALL USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Clients can view own agent alerts" ON public.agent_alerts FOR SELECT USING (agent_id IN (SELECT agent_id FROM public.agent_system_assignments WHERE system_id IN (SELECT id FROM public.monitored_systems WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))));

-- Add task stats columns to ai_agents for quick access
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS tasks_completed_total integer NOT NULL DEFAULT 0;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS tasks_pending integer NOT NULL DEFAULT 0;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS purpose text;
