
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. video_library_items
-- ============================================================
CREATE TABLE public.video_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'internal'
    CHECK (source_type IN ('internal','customer','operator','buyer','adviser','training','sop','dashboard_walkthrough','marketing')),
  external_provider TEXT
    CHECK (external_provider IS NULL OR external_provider IN (
      'loom','zoom','panopto','vimeo','youtube_unlisted','guidde','heygen','synthesia','elai','upload','other'
    )),
  external_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  language TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','processing','ready','needs_redaction','redacted','archived')),
  visibility TEXT NOT NULL DEFAULT 'founder_only'
    CHECK (visibility IN ('founder_only','internal','customer','buyer','adviser','operator','partner')),
  module_coverage TEXT[] DEFAULT '{}'::text[],
  tags TEXT[] DEFAULT '{}'::text[],
  contains_sensitive_info BOOLEAN NOT NULL DEFAULT false,
  redaction_required BOOLEAN NOT NULL DEFAULT false,
  redaction_status TEXT NOT NULL DEFAULT 'not_reviewed'
    CHECK (redaction_status IN ('not_reviewed','pending','approved','needs_redaction')),
  embedding_model TEXT,
  transcript_segment_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_library_items TO authenticated;
GRANT ALL ON public.video_library_items TO service_role;
ALTER TABLE public.video_library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_admin_all_videos" ON public.video_library_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE INDEX video_library_items_business_idx ON public.video_library_items(business_id);
CREATE INDEX video_library_items_status_idx ON public.video_library_items(status);
CREATE INDEX video_library_items_visibility_idx ON public.video_library_items(visibility);
CREATE INDEX video_library_items_tags_gin ON public.video_library_items USING gin(tags);
CREATE INDEX video_library_items_module_gin ON public.video_library_items USING gin(module_coverage);

-- ============================================================
-- 2. video_transcript_segments
-- ============================================================
CREATE TABLE public.video_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_library_items(id) ON DELETE CASCADE,
  business_id UUID NULL,
  segment_index INTEGER NOT NULL,
  start_seconds NUMERIC(10,3) NOT NULL,
  end_seconds NUMERIC(10,3) NOT NULL,
  speaker TEXT,
  text TEXT NOT NULL,
  text_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', coalesce(text,''))) STORED,
  embedding vector(1536),
  embedding_model TEXT,
  embedded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (video_id, segment_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_transcript_segments TO authenticated;
GRANT ALL ON public.video_transcript_segments TO service_role;
ALTER TABLE public.video_transcript_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_admin_all_segments" ON public.video_transcript_segments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE INDEX video_segments_video_idx ON public.video_transcript_segments(video_id, segment_index);
CREATE INDEX video_segments_tsv_idx ON public.video_transcript_segments USING gin(text_tsv);
CREATE INDEX video_segments_embedding_idx ON public.video_transcript_segments
  USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 3. video_library_chapters
-- ============================================================
CREATE TABLE public.video_library_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_library_items(id) ON DELETE CASCADE,
  start_seconds NUMERIC(10,3) NOT NULL,
  end_seconds NUMERIC(10,3),
  title TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_library_chapters TO authenticated;
GRANT ALL ON public.video_library_chapters TO service_role;
ALTER TABLE public.video_library_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_chapters" ON public.video_library_chapters FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX video_chapters_video_idx ON public.video_library_chapters(video_id, start_seconds);

-- ============================================================
-- 4. video_library_access_grants
-- ============================================================
CREATE TABLE public.video_library_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_library_items(id) ON DELETE CASCADE,
  grantee_role TEXT
    CHECK (grantee_role IS NULL OR grantee_role IN ('operator','customer','buyer','adviser','partner','internal')),
  grantee_user_id UUID,
  grantee_business_id UUID,
  scope TEXT NOT NULL DEFAULT 'view'
    CHECK (scope IN ('view','search','ask','download','export')),
  expires_at TIMESTAMPTZ,
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_library_access_grants TO authenticated;
GRANT ALL ON public.video_library_access_grants TO service_role;
ALTER TABLE public.video_library_access_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_access_grants" ON public.video_library_access_grants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX video_access_video_idx ON public.video_library_access_grants(video_id);
CREATE INDEX video_access_user_idx ON public.video_library_access_grants(grantee_user_id);

-- ============================================================
-- 5. video_library_training_assignments
-- ============================================================
CREATE TABLE public.video_library_training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_library_items(id) ON DELETE CASCADE,
  assigned_to_user_id UUID,
  assigned_to_role TEXT,
  business_id UUID,
  required_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','in_progress','completed','overdue','cancelled')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_library_training_assignments TO authenticated;
GRANT ALL ON public.video_library_training_assignments TO service_role;
ALTER TABLE public.video_library_training_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_training" ON public.video_library_training_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX video_training_video_idx ON public.video_library_training_assignments(video_id);
CREATE INDEX video_training_user_idx ON public.video_library_training_assignments(assigned_to_user_id);

-- ============================================================
-- 6. video_library_qa_log
-- ============================================================
CREATE TABLE public.video_library_qa_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_library_items(id) ON DELETE CASCADE,
  asked_by UUID,
  question TEXT NOT NULL,
  answer TEXT,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_library_qa_log TO authenticated;
GRANT ALL ON public.video_library_qa_log TO service_role;
ALTER TABLE public.video_library_qa_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_qa" ON public.video_library_qa_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX video_qa_video_idx ON public.video_library_qa_log(video_id, created_at DESC);

-- ============================================================
-- 7. video_library_redaction_reviews
-- ============================================================
CREATE TABLE public.video_library_redaction_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.video_library_items(id) ON DELETE CASCADE,
  reviewed_by UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','needs_redaction','rejected')),
  notes TEXT,
  flagged_segment_ids UUID[] DEFAULT '{}'::uuid[],
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_library_redaction_reviews TO authenticated;
GRANT ALL ON public.video_library_redaction_reviews TO service_role;
ALTER TABLE public.video_library_redaction_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_redaction" ON public.video_library_redaction_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 8. video_library_search_audit
-- ============================================================
CREATE TABLE public.video_library_search_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  query TEXT NOT NULL,
  search_mode TEXT NOT NULL DEFAULT 'hybrid'
    CHECK (search_mode IN ('keyword','semantic','hybrid','ask')),
  results_count INTEGER,
  video_filter UUID,
  business_filter UUID,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_library_search_audit TO authenticated;
GRANT ALL ON public.video_library_search_audit TO service_role;
ALTER TABLE public.video_library_search_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_search_audit" ON public.video_library_search_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX video_search_audit_created_idx ON public.video_library_search_audit(created_at DESC);

-- ============================================================
-- 9. video_library_export_packs
-- ============================================================
CREATE TABLE public.video_library_export_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  audience TEXT NOT NULL DEFAULT 'buyer'
    CHECK (audience IN ('buyer','adviser','customer','operator','internal')),
  title TEXT NOT NULL,
  description TEXT,
  video_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  include_transcripts BOOLEAN NOT NULL DEFAULT true,
  include_chapters BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready','delivered','archived')),
  delivered_at TIMESTAMPTZ,
  delivered_to TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_library_export_packs TO authenticated;
GRANT ALL ON public.video_library_export_packs TO service_role;
ALTER TABLE public.video_library_export_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_export_packs" ON public.video_library_export_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.video_library_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_video_library_items_touch BEFORE UPDATE ON public.video_library_items
  FOR EACH ROW EXECUTE FUNCTION public.video_library_touch_updated_at();
CREATE TRIGGER trg_video_training_touch BEFORE UPDATE ON public.video_library_training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.video_library_touch_updated_at();
CREATE TRIGGER trg_video_export_touch BEFORE UPDATE ON public.video_library_export_packs
  FOR EACH ROW EXECUTE FUNCTION public.video_library_touch_updated_at();

-- ============================================================
-- Hybrid search function
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_video_segments(
  query_text TEXT,
  query_embedding vector(1536),
  match_count INT DEFAULT 20,
  video_filter UUID DEFAULT NULL,
  business_filter UUID DEFAULT NULL,
  semantic_weight NUMERIC DEFAULT 0.6
)
RETURNS TABLE (
  segment_id UUID,
  video_id UUID,
  segment_index INT,
  start_seconds NUMERIC,
  end_seconds NUMERIC,
  speaker TEXT,
  text TEXT,
  semantic_score NUMERIC,
  keyword_score NUMERIC,
  combined_score NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH sem AS (
    SELECT s.id, s.video_id, s.segment_index, s.start_seconds, s.end_seconds, s.speaker, s.text,
           CASE WHEN query_embedding IS NULL OR s.embedding IS NULL THEN 0
                ELSE 1 - (s.embedding <=> query_embedding) END AS sim
    FROM public.video_transcript_segments s
    JOIN public.video_library_items v ON v.id = s.video_id
    WHERE (video_filter IS NULL OR s.video_id = video_filter)
      AND (business_filter IS NULL OR v.business_id = business_filter)
      AND s.embedding IS NOT NULL
    ORDER BY s.embedding <=> query_embedding NULLS LAST
    LIMIT GREATEST(match_count * 3, 30)
  ),
  kw AS (
    SELECT s.id, s.video_id, s.segment_index, s.start_seconds, s.end_seconds, s.speaker, s.text,
           ts_rank_cd(s.text_tsv, plainto_tsquery('english', coalesce(query_text,''))) AS rnk
    FROM public.video_transcript_segments s
    JOIN public.video_library_items v ON v.id = s.video_id
    WHERE (video_filter IS NULL OR s.video_id = video_filter)
      AND (business_filter IS NULL OR v.business_id = business_filter)
      AND s.text_tsv @@ plainto_tsquery('english', coalesce(query_text,''))
    ORDER BY rnk DESC
    LIMIT GREATEST(match_count * 3, 30)
  ),
  unioned AS (
    SELECT id, video_id, segment_index, start_seconds, end_seconds, speaker, text, sim AS semantic_score, 0::numeric AS keyword_score FROM sem
    UNION
    SELECT id, video_id, segment_index, start_seconds, end_seconds, speaker, text, 0::numeric, rnk FROM kw
  ),
  agg AS (
    SELECT id, video_id, segment_index, start_seconds, end_seconds, speaker, text,
           MAX(semantic_score) AS semantic_score,
           MAX(keyword_score)  AS keyword_score
    FROM unioned
    GROUP BY id, video_id, segment_index, start_seconds, end_seconds, speaker, text
  )
  SELECT id, video_id, segment_index, start_seconds, end_seconds, speaker, text,
         semantic_score, keyword_score,
         (semantic_weight * semantic_score + (1 - semantic_weight) * LEAST(keyword_score, 1)) AS combined_score
  FROM agg
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_video_segments(TEXT, vector, INT, UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_video_segments(TEXT, vector, INT, UUID, UUID, NUMERIC) TO authenticated, service_role;
