
CREATE TABLE IF NOT EXISTS public.cleanup_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_batch_id uuid NOT NULL,
  source_table text NOT NULL,
  source_row_id text,
  business_name text,
  archived_at timestamptz NOT NULL DEFAULT now(),
  cleanup_reason text NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cleanup_archive_batch ON public.cleanup_archive(cleanup_batch_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_archive_source ON public.cleanup_archive(source_table);
ALTER TABLE public.cleanup_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_full_access_cleanup_archive" ON public.cleanup_archive;
CREATE POLICY "founder_full_access_cleanup_archive" ON public.cleanup_archive FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.cleanup_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_batch_id uuid NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  per_table_counts jsonb NOT NULL,
  preserved_summary jsonb NOT NULL,
  notes text
);
ALTER TABLE public.cleanup_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_full_access_cleanup_audit_log" ON public.cleanup_audit_log;
CREATE POLICY "founder_full_access_cleanup_audit_log" ON public.cleanup_audit_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
