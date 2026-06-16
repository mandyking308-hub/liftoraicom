
-- Add timestamp-range and segment columns + completion tracking to assignments
ALTER TABLE public.video_library_training_assignments
  ADD COLUMN IF NOT EXISTS start_seconds NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS end_seconds NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.video_transcript_segments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_vid_assign_segment ON public.video_library_training_assignments(segment_id);

-- Helper to recompute buyer_handover_ready from current criteria
CREATE OR REPLACE FUNCTION public.recompute_video_buyer_handover_ready(_video_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  seg_count INT;
  ready BOOLEAN := false;
BEGIN
  SELECT id, external_url, privacy_status, approval_status, module_coverage, dashboard_area, video_type
    INTO v FROM public.video_library_items WHERE id = _video_id;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT COUNT(*) INTO seg_count FROM public.video_transcript_segments WHERE video_id = _video_id;

  ready := seg_count > 0
       AND v.external_url IS NOT NULL
       AND v.privacy_status IN ('approved_internal','approved_customer','approved_buyer')
       AND v.approval_status = 'approved'
       AND ( (v.module_coverage IS NOT NULL AND array_length(v.module_coverage,1) > 0)
             OR v.dashboard_area IS NOT NULL );

  UPDATE public.video_library_items SET buyer_handover_ready = ready WHERE id = _video_id;
  RETURN ready;
END $$;

REVOKE ALL ON FUNCTION public.recompute_video_buyer_handover_ready(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_video_buyer_handover_ready(UUID) TO authenticated, service_role;
