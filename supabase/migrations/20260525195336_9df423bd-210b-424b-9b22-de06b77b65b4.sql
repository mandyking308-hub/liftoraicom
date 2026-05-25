
CREATE TABLE public.adviser_handoff_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pack_status TEXT NOT NULL DEFAULT 'draft',
  prepared_by TEXT,
  reviewed_by TEXT,
  approved_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.adviser_pack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.adviser_handoff_packs(id) ON DELETE CASCADE,
  business_id UUID,
  item_type TEXT NOT NULL DEFAULT 'other',
  item_summary TEXT NOT NULL,
  amount NUMERIC(18,2),
  currency TEXT DEFAULT 'GBP',
  source_table TEXT,
  source_record_id UUID,
  needs_adviser_review BOOLEAN NOT NULL DEFAULT false,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.entity_structure_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name TEXT NOT NULL,
  entity_type TEXT,
  jurisdiction TEXT,
  registration_number_summary TEXT,
  ownership_summary TEXT,
  financial_year_end TEXT,
  accountant_contact TEXT,
  legal_contact TEXT,
  tax_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.adviser_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID REFERENCES public.adviser_handoff_packs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft',
  answer_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.adviser_handoff_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adviser_pack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_structure_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adviser_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage adviser packs" ON public.adviser_handoff_packs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage adviser pack items" ON public.adviser_pack_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage entity structure" ON public.entity_structure_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage adviser questions" ON public.adviser_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_adviser_handoff_packs_updated_at
  BEFORE UPDATE ON public.adviser_handoff_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_entity_structure_records_updated_at
  BEFORE UPDATE ON public.entity_structure_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_adviser_questions_updated_at
  BEFORE UPDATE ON public.adviser_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_adviser_packs_status ON public.adviser_handoff_packs(pack_status);
CREATE INDEX idx_adviser_packs_period ON public.adviser_handoff_packs(period_end DESC);
CREATE INDEX idx_adviser_pack_items_pack ON public.adviser_pack_items(pack_id, item_type);
CREATE INDEX idx_entity_structure_active ON public.entity_structure_records(active);
CREATE INDEX idx_adviser_questions_pack ON public.adviser_questions(pack_id, status);
