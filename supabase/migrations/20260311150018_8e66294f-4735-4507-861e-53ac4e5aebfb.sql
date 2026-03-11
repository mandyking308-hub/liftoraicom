
-- Processes table
CREATE TABLE public.processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_organisation TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  automation_status TEXT NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage processes" ON public.processes FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Process steps table
CREATE TABLE public.process_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  responsible_role TEXT DEFAULT '',
  classification TEXT NOT NULL DEFAULT 'manual',
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage process steps" ON public.process_steps FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Process documents table
CREATE TABLE public.process_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  file_path TEXT NOT NULL,
  file_size BIGINT DEFAULT NULL,
  uploaded_by TEXT NOT NULL DEFAULT 'Liftor AI',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage process documents" ON public.process_documents FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_process_steps_updated_at BEFORE UPDATE ON public.process_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
