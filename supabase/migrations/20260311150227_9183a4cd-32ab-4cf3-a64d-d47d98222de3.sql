
-- Architectures table
CREATE TABLE public.architectures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_organisation TEXT NOT NULL DEFAULT '',
  system_type TEXT NOT NULL DEFAULT 'platform',
  system_purpose TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.architectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage architectures" ON public.architectures FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Architecture components
CREATE TABLE public.architecture_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  architecture_id UUID NOT NULL REFERENCES public.architectures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_type TEXT NOT NULL DEFAULT 'custom',
  description TEXT DEFAULT '',
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage architecture components" ON public.architecture_components FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Component relationships
CREATE TABLE public.architecture_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  architecture_id UUID NOT NULL REFERENCES public.architectures(id) ON DELETE CASCADE,
  source_component_id UUID NOT NULL REFERENCES public.architecture_components(id) ON DELETE CASCADE,
  target_component_id UUID NOT NULL REFERENCES public.architecture_components(id) ON DELETE CASCADE,
  relationship_label TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage architecture relationships" ON public.architecture_relationships FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER update_architectures_updated_at BEFORE UPDATE ON public.architectures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
