CREATE TABLE IF NOT EXISTS public.crm_integrity_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  related_table text,
  related_id uuid,
  finding_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  recommended_fix text,
  auto_fix_available boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cif_severity ON public.crm_integrity_findings(severity);
CREATE INDEX IF NOT EXISTS idx_cif_status ON public.crm_integrity_findings(status);
CREATE INDEX IF NOT EXISTS idx_cif_finding_type ON public.crm_integrity_findings(finding_type);
CREATE INDEX IF NOT EXISTS idx_cif_contact ON public.crm_integrity_findings(contact_id);
CREATE INDEX IF NOT EXISTS idx_cif_business ON public.crm_integrity_findings(business_id);

ALTER TABLE public.crm_integrity_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read integrity findings" ON public.crm_integrity_findings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Founders manage integrity findings" ON public.crm_integrity_findings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_cif_updated BEFORE UPDATE ON public.crm_integrity_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();