
CREATE TABLE public.data_quality_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  finding_type TEXT NOT NULL DEFAULT 'suspicious',
  severity TEXT NOT NULL DEFAULT 'medium',
  source_table TEXT,
  source_record_id TEXT,
  finding_summary TEXT NOT NULL,
  recommended_fix TEXT,
  fix_status TEXT NOT NULL DEFAULT 'open',
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.data_repair_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finding_id UUID REFERENCES public.data_quality_findings(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'manual_review',
  action_status TEXT NOT NULL DEFAULT 'draft',
  irreversible BOOLEAN NOT NULL DEFAULT false,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.data_quality_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_repair_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage data quality findings" ON public.data_quality_findings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage data repair actions" ON public.data_repair_actions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_data_quality_findings_updated_at
  BEFORE UPDATE ON public.data_quality_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_repair_actions_updated_at
  BEFORE UPDATE ON public.data_repair_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dq_findings_type ON public.data_quality_findings(finding_type);
CREATE INDEX idx_dq_findings_status ON public.data_quality_findings(fix_status);
CREATE INDEX idx_dq_findings_severity ON public.data_quality_findings(severity);
CREATE INDEX idx_dq_repair_finding ON public.data_repair_actions(finding_id);
CREATE INDEX idx_dq_repair_status ON public.data_repair_actions(action_status);
