
-- Extend existing import_batches
ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS business_id UUID,
  ADD COLUMN IF NOT EXISTS import_name TEXT,
  ADD COLUMN IF NOT EXISTS import_type TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS source_filename TEXT,
  ADD COLUMN IF NOT EXISTS source_format TEXT NOT NULL DEFAULT 'csv',
  ADD COLUMN IF NOT EXISTS import_status TEXT NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS is_test_import BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rows_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_valid INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_warning INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_error INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_imp_batches_status ON public.import_batches(import_status);
CREATE INDEX IF NOT EXISTS idx_imp_batches_business ON public.import_batches(business_id);
CREATE INDEX IF NOT EXISTS idx_imp_batches_created ON public.import_batches(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='import_batches' AND policyname='Founders read imports v2') THEN
    EXECUTE $p$CREATE POLICY "Founders read imports v2" ON public.import_batches FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='import_batches' AND policyname='Authenticated insert imports v2') THEN
    EXECUTE $p$CREATE POLICY "Authenticated insert imports v2" ON public.import_batches FOR INSERT TO authenticated WITH CHECK (true)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='import_batches' AND policyname='Founders update imports v2') THEN
    EXECUTE $p$CREATE POLICY "Founders update imports v2" ON public.import_batches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))$p$;
  END IF;
END $$;

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- import_mappings
CREATE TABLE IF NOT EXISTS public.import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  target_table TEXT,
  target_field TEXT,
  transformation_rule TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  mapping_status TEXT NOT NULL DEFAULT 'unmapped',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imp_mappings_batch ON public.import_mappings(import_batch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_mappings TO authenticated;
GRANT ALL ON public.import_mappings TO service_role;
ALTER TABLE public.import_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read mappings" ON public.import_mappings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Authenticated write mappings" ON public.import_mappings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- import_preview_rows
CREATE TABLE IF NOT EXISTS public.import_preview_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_row JSONB NOT NULL DEFAULT '{}'::jsonb,
  mapped_row JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status TEXT NOT NULL DEFAULT 'valid',
  validation_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicate_match_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_imp_preview_batch ON public.import_preview_rows(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_imp_preview_status ON public.import_preview_rows(validation_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_preview_rows TO authenticated;
GRANT ALL ON public.import_preview_rows TO service_role;
ALTER TABLE public.import_preview_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read preview" ON public.import_preview_rows FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Authenticated write preview" ON public.import_preview_rows FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- import_applied_records (append-only)
CREATE TABLE IF NOT EXISTS public.import_applied_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  target_table TEXT NOT NULL,
  target_record_id UUID,
  action_taken TEXT NOT NULL DEFAULT 'created',
  rollback_possible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_imp_applied_batch ON public.import_applied_records(import_batch_id);
GRANT SELECT, INSERT ON public.import_applied_records TO authenticated;
GRANT ALL ON public.import_applied_records TO service_role;
ALTER TABLE public.import_applied_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read applied" ON public.import_applied_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Authenticated insert applied" ON public.import_applied_records FOR INSERT TO authenticated WITH CHECK (true);

-- import_rollback_events
CREATE TABLE IF NOT EXISTS public.import_rollback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  rollback_status TEXT NOT NULL DEFAULT 'draft',
  rollback_summary TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_imp_rb_batch ON public.import_rollback_events(import_batch_id);
GRANT SELECT, INSERT, UPDATE ON public.import_rollback_events TO authenticated;
GRANT ALL ON public.import_rollback_events TO service_role;
ALTER TABLE public.import_rollback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read rollbacks" ON public.import_rollback_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Authenticated insert rollbacks" ON public.import_rollback_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Founders update rollbacks" ON public.import_rollback_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_imp_batches_updated') THEN
    EXECUTE 'CREATE TRIGGER trg_imp_batches_updated BEFORE UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_imp_mappings_updated') THEN
    EXECUTE 'CREATE TRIGGER trg_imp_mappings_updated BEFORE UPDATE ON public.import_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END $$;
