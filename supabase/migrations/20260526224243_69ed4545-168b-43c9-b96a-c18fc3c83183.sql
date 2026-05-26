
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.global_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NULL,
  source_module TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'other' CHECK (record_type IN (
    'business','contact','customer','seller','partner','product','offer','invoice','payment','contract',
    'document','ticket','complaint','incident','decision','approval','communication','transcript','audit','other'
  )),
  title TEXT NOT NULL,
  summary TEXT NULL,
  searchable_text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  sensitivity_level TEXT NOT NULL DEFAULT 'internal' CHECK (sensitivity_level IN (
    'public','internal','confidential','restricted','legal_sensitive','financial_sensitive'
  )),
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  last_indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_module, source_table, source_record_id)
);
GRANT SELECT, INSERT, UPDATE ON public.global_search_index TO authenticated;
GRANT ALL ON public.global_search_index TO service_role;
ALTER TABLE public.global_search_index ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_gsi_business        ON public.global_search_index (business_id);
CREATE INDEX idx_gsi_module          ON public.global_search_index (source_module);
CREATE INDEX idx_gsi_type            ON public.global_search_index (record_type);
CREATE INDEX idx_gsi_sensitivity     ON public.global_search_index (sensitivity_level);
CREATE INDEX idx_gsi_last_indexed    ON public.global_search_index (last_indexed_at DESC);
CREATE INDEX idx_gsi_active          ON public.global_search_index (active);
CREATE INDEX idx_gsi_tags_gin        ON public.global_search_index USING gin (tags);
CREATE INDEX idx_gsi_searchable_trgm ON public.global_search_index USING gin (searchable_text gin_trgm_ops);
CREATE INDEX idx_gsi_title_trgm      ON public.global_search_index USING gin (title gin_trgm_ops);

CREATE POLICY "founders read all search index"
  ON public.global_search_index FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "users read low-sensitivity active search index"
  ON public.global_search_index FOR SELECT TO authenticated
  USING (active = true AND is_test_data = false AND sensitivity_level IN ('public','internal'));
CREATE POLICY "founders insert search index"
  ON public.global_search_index FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "founders update search index"
  ON public.global_search_index FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

CREATE TRIGGER trg_gsi_updated_at
BEFORE UPDATE ON public.global_search_index
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.global_search_index IS 'Append/update-only knowledge index. Stores safe summaries only; no raw secrets, no full sensitive content.';


CREATE TABLE public.search_index_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  source_module TEXT NOT NULL,
  job_status TEXT NOT NULL DEFAULT 'queued' CHECK (job_status IN ('queued','running','completed','failed','cancelled')),
  records_indexed INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.search_index_jobs TO authenticated;
GRANT ALL ON public.search_index_jobs TO service_role;
ALTER TABLE public.search_index_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sij_status ON public.search_index_jobs (job_status, created_at DESC);
CREATE INDEX idx_sij_module ON public.search_index_jobs (source_module, created_at DESC);

CREATE POLICY "founders read all index jobs"
  ON public.search_index_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "founders insert index jobs"
  ON public.search_index_jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "founders update index jobs"
  ON public.search_index_jobs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));


CREATE TABLE public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  search_name TEXT NOT NULL,
  query_text TEXT NOT NULL DEFAULT '',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ss_user ON public.saved_searches (user_id, updated_at DESC);

CREATE POLICY "saved searches select"
  ON public.saved_searches FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "saved searches insert"
  ON public.saved_searches FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "saved searches update"
  ON public.saved_searches FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "saved searches delete"
  ON public.saved_searches FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

CREATE TRIGGER trg_ss_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
