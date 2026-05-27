
CREATE TABLE public.agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  business_scope TEXT NOT NULL DEFAULT 'all',
  module_scope TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  max_ai_cost_usd NUMERIC NOT NULL DEFAULT 0.50,
  allowed_model_tier TEXT NOT NULL DEFAULT 'flash',
  required_context_fields TEXT[] NOT NULL DEFAULT '{}',
  human_handoff_rule TEXT,
  failure_behaviour TEXT NOT NULL DEFAULT 'pause_and_escalate',
  owner_role TEXT NOT NULL DEFAULT 'founder',
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_registry TO authenticated;
GRANT ALL ON public.agent_registry TO service_role;
ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent_registry" ON public.agent_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agent_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agent_registry(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'recommend',
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_capabilities TO authenticated;
GRANT ALL ON public.agent_capabilities TO service_role;
ALTER TABLE public.agent_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent_capabilities" ON public.agent_capabilities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agent_prohibited_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agent_registry(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  severity TEXT NOT NULL DEFAULT 'high',
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_prohibited_actions TO authenticated;
GRANT ALL ON public.agent_prohibited_actions TO service_role;
ALTER TABLE public.agent_prohibited_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent_prohibited_actions" ON public.agent_prohibited_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agent_approval_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agent_registry(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  required_approver TEXT NOT NULL DEFAULT 'founder',
  rule_summary TEXT,
  is_pre_approved BOOLEAN NOT NULL DEFAULT false,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_approval_requirements TO authenticated;
GRANT ALL ON public.agent_approval_requirements TO service_role;
ALTER TABLE public.agent_approval_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent_approval_requirements" ON public.agent_approval_requirements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agent_escalation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agent_registry(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  threshold TEXT,
  escalate_to TEXT NOT NULL DEFAULT 'founder',
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_escalation_triggers TO authenticated;
GRANT ALL ON public.agent_escalation_triggers TO service_role;
ALTER TABLE public.agent_escalation_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent_escalation_triggers" ON public.agent_escalation_triggers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agent_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agent_registry(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  permission TEXT NOT NULL DEFAULT 'read',
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_module_permissions TO authenticated;
GRANT ALL ON public.agent_module_permissions TO service_role;
ALTER TABLE public.agent_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent_module_permissions" ON public.agent_module_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.agent_boundary_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agent_registry(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  attempted_action TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  status TEXT NOT NULL DEFAULT 'open',
  detail TEXT,
  resolution TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_boundary_violations TO authenticated;
GRANT ALL ON public.agent_boundary_violations TO service_role;
ALTER TABLE public.agent_boundary_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agent_boundary_violations" ON public.agent_boundary_violations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
