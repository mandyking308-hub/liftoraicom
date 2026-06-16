-- Extend video_library_items
ALTER TABLE public.video_library_items
  ADD COLUMN IF NOT EXISTS video_type text NOT NULL DEFAULT 'sop',
  ADD COLUMN IF NOT EXISTS audience_type text NOT NULL DEFAULT 'founder',
  ADD COLUMN IF NOT EXISTS dashboard_area text,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.video_sop_assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS transcript_status text NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS privacy_status text NOT NULL DEFAULT 'unchecked',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_handover_ready boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_video_library_items_video_type ON public.video_library_items(video_type);
CREATE INDEX IF NOT EXISTS idx_video_library_items_audience_type ON public.video_library_items(audience_type);
CREATE INDEX IF NOT EXISTS idx_video_library_items_dashboard_area ON public.video_library_items(dashboard_area);
CREATE INDEX IF NOT EXISTS idx_video_library_items_approval_status ON public.video_library_items(approval_status);
CREATE INDEX IF NOT EXISTS idx_video_library_items_privacy_status ON public.video_library_items(privacy_status);

-- Extend transcript segments with privacy flags + keywords
ALTER TABLE public.video_transcript_segments
  ADD COLUMN IF NOT EXISTS privacy_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Audit events table (founder/admin only)
CREATE TABLE IF NOT EXISTS public.video_library_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES public.video_library_items(id) ON DELETE CASCADE,
  business_id uuid,
  actor_id uuid,
  action text NOT NULL,
  event_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.video_library_audit_events TO authenticated;
GRANT ALL ON public.video_library_audit_events TO service_role;

ALTER TABLE public.video_library_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read video audit"
  ON public.video_library_audit_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins insert video audit"
  ON public.video_library_audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_video_library_audit_video ON public.video_library_audit_events(video_id);
CREATE INDEX IF NOT EXISTS idx_video_library_audit_created ON public.video_library_audit_events(created_at DESC);