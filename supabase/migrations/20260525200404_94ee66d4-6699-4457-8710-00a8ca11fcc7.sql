
CREATE TABLE public.product_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  feature_name TEXT NOT NULL,
  feature_summary TEXT,
  feature_status TEXT NOT NULL DEFAULT 'idea',
  priority TEXT NOT NULL DEFAULT 'medium',
  owner TEXT,
  target_release_date DATE,
  source_ref TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.product_bugs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  bug_title TEXT NOT NULL,
  bug_description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  bug_status TEXT NOT NULL DEFAULT 'new',
  affected_area TEXT,
  user_impact TEXT,
  workaround TEXT,
  linked_incident_id UUID,
  source_ref TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.release_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  release_name TEXT NOT NULL,
  release_status TEXT NOT NULL DEFAULT 'draft',
  release_notes TEXT,
  features_included JSONB NOT NULL DEFAULT '[]'::jsonb,
  bugs_fixed JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_summary TEXT,
  rollback_plan TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.qa_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  release_id UUID REFERENCES public.release_records(id) ON DELETE CASCADE,
  checklist_name TEXT NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  qa_status TEXT NOT NULL DEFAULT 'pending',
  tested_by TEXT,
  tested_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage product features" ON public.product_features
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage product bugs" ON public.product_bugs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage releases" ON public.release_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage qa checklists" ON public.qa_checklists
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_product_features_updated_at
  BEFORE UPDATE ON public.product_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_bugs_updated_at
  BEFORE UPDATE ON public.product_bugs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_release_records_updated_at
  BEFORE UPDATE ON public.release_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qa_checklists_updated_at
  BEFORE UPDATE ON public.qa_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_features_status ON public.product_features(feature_status);
CREATE INDEX idx_product_bugs_status ON public.product_bugs(bug_status);
CREATE INDEX idx_product_bugs_severity ON public.product_bugs(severity);
CREATE INDEX idx_product_bugs_incident ON public.product_bugs(linked_incident_id);
CREATE INDEX idx_release_records_status ON public.release_records(release_status);
CREATE INDEX idx_qa_checklists_release ON public.qa_checklists(release_id);
