
-- SOP / Playbook Version Control Engine

CREATE TABLE public.sop_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  sop_name TEXT NOT NULL,
  sop_type TEXT NOT NULL DEFAULT 'other',
  current_version_id UUID,
  sop_status TEXT NOT NULL DEFAULT 'draft',
  owner TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_documents TO authenticated;
GRANT ALL ON public.sop_documents TO service_role;
ALTER TABLE public.sop_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sop_documents founder all" ON public.sop_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TABLE public.sop_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id UUID NOT NULL REFERENCES public.sop_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  version_status TEXT NOT NULL DEFAULT 'draft',
  content_summary TEXT,
  content_body TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  effective_from TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_versions TO authenticated;
GRANT ALL ON public.sop_versions TO service_role;
ALTER TABLE public.sop_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sop_versions founder all" ON public.sop_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TABLE public.sop_agent_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id UUID NOT NULL REFERENCES public.sop_documents(id) ON DELETE CASCADE,
  agent_key TEXT NOT NULL,
  business_id UUID,
  usage_type TEXT NOT NULL DEFAULT 'prompt_context',
  active BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_agent_usage TO authenticated;
GRANT ALL ON public.sop_agent_usage TO service_role;
ALTER TABLE public.sop_agent_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sop_agent_usage founder all" ON public.sop_agent_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TABLE public.sop_review_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sop_id UUID NOT NULL REFERENCES public.sop_documents(id) ON DELETE CASCADE,
  review_reason TEXT NOT NULL DEFAULT 'scheduled',
  review_status TEXT NOT NULL DEFAULT 'pending',
  due_at TIMESTAMPTZ,
  assigned_to TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_review_tasks TO authenticated;
GRANT ALL ON public.sop_review_tasks TO service_role;
ALTER TABLE public.sop_review_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sop_review_tasks founder all" ON public.sop_review_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TABLE public.sop_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  sop_a_id UUID NOT NULL REFERENCES public.sop_documents(id) ON DELETE CASCADE,
  sop_b_id UUID NOT NULL REFERENCES public.sop_documents(id) ON DELETE CASCADE,
  conflict_summary TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  resolution_status TEXT NOT NULL DEFAULT 'open',
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sop_conflicts TO authenticated;
GRANT ALL ON public.sop_conflicts TO service_role;
ALTER TABLE public.sop_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sop_conflicts founder all" ON public.sop_conflicts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_sop_documents_updated_at BEFORE UPDATE ON public.sop_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sop_versions_updated_at BEFORE UPDATE ON public.sop_versions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sop_agent_usage_updated_at BEFORE UPDATE ON public.sop_agent_usage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sop_review_tasks_updated_at BEFORE UPDATE ON public.sop_review_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sop_conflicts_updated_at BEFORE UPDATE ON public.sop_conflicts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_sop_versions_sop ON public.sop_versions(sop_id);
CREATE INDEX idx_sop_agent_usage_sop ON public.sop_agent_usage(sop_id);
CREATE INDEX idx_sop_agent_usage_agent ON public.sop_agent_usage(agent_key);
CREATE INDEX idx_sop_review_tasks_sop ON public.sop_review_tasks(sop_id);
CREATE INDEX idx_sop_conflicts_a ON public.sop_conflicts(sop_a_id);
CREATE INDEX idx_sop_conflicts_b ON public.sop_conflicts(sop_b_id);
