
CREATE TABLE public.document_vault_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  legal_entity_id UUID,
  document_title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other',
  file_reference TEXT,
  storage_location_summary TEXT,
  sensitivity_level TEXT NOT NULL DEFAULT 'internal',
  owner TEXT,
  source_module TEXT,
  source_record_id UUID,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_vault_items TO authenticated;
GRANT ALL ON public.document_vault_items TO service_role;
ALTER TABLE public.document_vault_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage document vault items" ON public.document_vault_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_document_vault_items_updated BEFORE UPDATE ON public.document_vault_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.document_access_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.document_vault_items(id) ON DELETE CASCADE,
  access_scope TEXT NOT NULL DEFAULT 'founder_only',
  allowed_role_id UUID,
  external_access_allowed BOOLEAN NOT NULL DEFAULT false,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_access_rules TO authenticated;
GRANT ALL ON public.document_access_rules TO service_role;
ALTER TABLE public.document_access_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage document access rules" ON public.document_access_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_document_access_rules_updated BEFORE UPDATE ON public.document_access_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.data_room_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  data_room_name TEXT NOT NULL,
  data_room_type TEXT NOT NULL DEFAULT 'internal',
  data_room_status TEXT NOT NULL DEFAULT 'draft',
  access_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_room_profiles TO authenticated;
GRANT ALL ON public.data_room_profiles TO service_role;
ALTER TABLE public.data_room_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage data room profiles" ON public.data_room_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_data_room_profiles_updated BEFORE UPDATE ON public.data_room_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.data_room_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_room_id UUID NOT NULL REFERENCES public.data_room_profiles(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.document_vault_items(id) ON DELETE CASCADE,
  item_status TEXT NOT NULL DEFAULT 'draft',
  share_allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_room_items TO authenticated;
GRANT ALL ON public.data_room_items TO service_role;
ALTER TABLE public.data_room_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage data room items" ON public.data_room_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_data_room_items_updated BEFORE UPDATE ON public.data_room_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.evidence_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  source_module TEXT,
  source_record_id UUID,
  evidence_type TEXT NOT NULL DEFAULT 'other',
  document_id UUID REFERENCES public.document_vault_items(id) ON DELETE SET NULL,
  evidence_summary TEXT,
  evidence_status TEXT NOT NULL DEFAULT 'collected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_records TO authenticated;
GRANT ALL ON public.evidence_records TO service_role;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage evidence records" ON public.evidence_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_evidence_records_updated BEFORE UPDATE ON public.evidence_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
