
CREATE TABLE public.backup_status_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_name TEXT NOT NULL,
  business_id UUID,
  backup_type TEXT NOT NULL DEFAULT 'other',
  backup_status TEXT NOT NULL DEFAULT 'unknown',
  last_backup_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  storage_location_summary TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_status_records TO authenticated;
GRANT ALL ON public.backup_status_records TO service_role;
ALTER TABLE public.backup_status_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backup_status founder all" ON public.backup_status_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.export_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  export_type TEXT NOT NULL DEFAULT 'other',
  export_status TEXT NOT NULL DEFAULT 'draft',
  requested_by TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  generated_file_reference TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_requests TO authenticated;
GRANT ALL ON public.export_requests TO service_role;
ALTER TABLE public.export_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "export_requests founder all" ON public.export_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.recovery_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  recovery_scenario TEXT NOT NULL DEFAULT 'other',
  checklist_name TEXT NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_tested_at TIMESTAMPTZ,
  recovery_status TEXT NOT NULL DEFAULT 'draft',
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recovery_checklists TO authenticated;
GRANT ALL ON public.recovery_checklists TO service_role;
ALTER TABLE public.recovery_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recovery_checklists founder all" ON public.recovery_checklists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.emergency_operating_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  pack_name TEXT NOT NULL,
  pack_status TEXT NOT NULL DEFAULT 'draft',
  pack_summary TEXT,
  included_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_file_reference TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_operating_packs TO authenticated;
GRANT ALL ON public.emergency_operating_packs TO service_role;
ALTER TABLE public.emergency_operating_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency_packs founder all" ON public.emergency_operating_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER trg_backup_status_updated_at BEFORE UPDATE ON public.backup_status_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_export_requests_updated_at BEFORE UPDATE ON public.export_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recovery_checklists_updated_at BEFORE UPDATE ON public.recovery_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_emergency_packs_updated_at BEFORE UPDATE ON public.emergency_operating_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_backup_status_system ON public.backup_status_records(system_name);
CREATE INDEX idx_export_requests_status ON public.export_requests(export_status);
CREATE INDEX idx_recovery_checklists_scenario ON public.recovery_checklists(recovery_scenario);
