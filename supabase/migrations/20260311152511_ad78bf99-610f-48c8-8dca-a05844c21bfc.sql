
-- System templates table
CREATE TABLE public.system_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL DEFAULT 'platform',
  description text DEFAULT '',
  architecture_id uuid REFERENCES public.architectures(id) ON DELETE SET NULL,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.system_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage system templates" ON public.system_templates FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER update_system_templates_updated_at BEFORE UPDATE ON public.system_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Template components table
CREATE TABLE public.template_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.system_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  component_type text NOT NULL DEFAULT 'custom',
  description text DEFAULT '',
  workflow_id uuid REFERENCES public.automation_workflows(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.template_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage template components" ON public.template_components FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
