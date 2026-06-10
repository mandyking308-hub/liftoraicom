
ALTER TABLE public.video_sop_scripts
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS use_case TEXT,
  ADD COLUMN IF NOT EXISTS recommended_video_length TEXT,
  ADD COLUMN IF NOT EXISTS scenes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS screen_recording_checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quiz_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS buyer_handover_version TEXT,
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_script_id UUID REFERENCES public.video_sop_scripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_text_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS privacy_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_video_sop_scripts_parent ON public.video_sop_scripts(parent_script_id);
CREATE INDEX IF NOT EXISTS idx_video_sop_scripts_status ON public.video_sop_scripts(status);
