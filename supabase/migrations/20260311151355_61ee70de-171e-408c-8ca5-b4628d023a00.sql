
-- Knowledge entries table
CREATE TABLE public.knowledge_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  related_system_id UUID REFERENCES public.monitored_systems(id) ON DELETE SET NULL,
  related_system_name TEXT DEFAULT '',
  linked_workflow_ids UUID[] DEFAULT '{}',
  linked_agent_ids UUID[] DEFAULT '{}',
  entry_type TEXT NOT NULL DEFAULT 'knowledge',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage knowledge entries"
  ON public.knowledge_entries FOR ALL TO public
  USING (public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_knowledge_entries_updated_at
  BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Knowledge documents table
CREATE TABLE public.knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_entry_id UUID NOT NULL REFERENCES public.knowledge_entries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by TEXT NOT NULL DEFAULT 'Liftor AI',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage knowledge documents"
  ON public.knowledge_documents FOR ALL TO public
  USING (public.has_role(auth.uid(), 'founder'));

-- Storage bucket for knowledge documents
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-documents', 'knowledge-documents', false);

CREATE POLICY "Founders can upload knowledge docs"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can view knowledge docs"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can delete knowledge docs"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'knowledge-documents' AND public.has_role(auth.uid(), 'founder'));
