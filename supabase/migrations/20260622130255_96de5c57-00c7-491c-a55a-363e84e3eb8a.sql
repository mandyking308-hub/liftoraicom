
CREATE TABLE public.relationship_intelligence_import_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_name TEXT NOT NULL,
  source_pack TEXT,
  contact_name TEXT,
  organisation TEXT,
  preferred_email TEXT,
  phone TEXT,
  website TEXT,
  reason TEXT NOT NULL DEFAULT 'REVIEW_HOLD_NO_UNIQUE_EMAIL',
  raw_row JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_contact_id UUID REFERENCES public.relationship_intelligence_contacts(id) ON DELETE SET NULL,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationship_intelligence_import_holds TO authenticated;
GRANT ALL ON public.relationship_intelligence_import_holds TO service_role;
ALTER TABLE public.relationship_intelligence_import_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins manage RI import holds"
  ON public.relationship_intelligence_import_holds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER trg_ri_import_holds_updated BEFORE UPDATE ON public.relationship_intelligence_import_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.relationship_intelligence_import_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_name TEXT NOT NULL,
  source_pack TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  created_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  held_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  blocked_duplicates INT NOT NULL DEFAULT 0,
  missing_email INT NOT NULL DEFAULT 0,
  missing_phone INT NOT NULL DEFAULT 0,
  missing_website INT NOT NULL DEFAULT 0,
  control_totals_match BOOLEAN NOT NULL DEFAULT false,
  expected_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual_totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  committed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.relationship_intelligence_import_audit TO authenticated;
GRANT ALL ON public.relationship_intelligence_import_audit TO service_role;
ALTER TABLE public.relationship_intelligence_import_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read RI import audit"
  ON public.relationship_intelligence_import_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "Founders/admins insert RI import audit"
  ON public.relationship_intelligence_import_audit FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));
