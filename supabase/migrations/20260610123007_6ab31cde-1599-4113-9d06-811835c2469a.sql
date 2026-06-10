
-- Video SOP Factory tables

CREATE TABLE public.video_sop_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  business_name_snapshot TEXT,
  brand_name TEXT,
  website_url TEXT,
  asset_title TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'sop_video',
  audience_type TEXT NOT NULL DEFAULT 'operator',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_reference_id TEXT,
  source_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'normal',
  saleability_evidence BOOLEAN NOT NULL DEFAULT false,
  compliance_evidence BOOLEAN NOT NULL DEFAULT false,
  external_visibility TEXT NOT NULL DEFAULT 'internal_only',
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_sop_assets TO authenticated;
GRANT ALL ON public.video_sop_assets TO service_role;
ALTER TABLE public.video_sop_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins manage video_sop_assets" ON public.video_sop_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.video_sop_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.video_sop_assets(id) ON DELETE CASCADE,
  business_id UUID,
  script_title TEXT,
  short_description TEXT,
  learning_objective TEXT,
  video_length_target TEXT,
  voiceover_script TEXT,
  scene_outline TEXT,
  screen_recording_steps TEXT,
  on_screen_text TEXT,
  callouts TEXT,
  warnings TEXT,
  customer_friendly_version TEXT,
  operator_version TEXT,
  founder_notes TEXT,
  generated_by_ai BOOLEAN NOT NULL DEFAULT false,
  ai_prompt_used TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_sop_scripts TO authenticated;
GRANT ALL ON public.video_sop_scripts TO service_role;
ALTER TABLE public.video_sop_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins manage video_sop_scripts" ON public.video_sop_scripts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.video_sop_training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.video_sop_assets(id) ON DELETE CASCADE,
  business_id UUID,
  assigned_to_type TEXT NOT NULL DEFAULT 'operator',
  assigned_to_name TEXT,
  assigned_to_email TEXT,
  completion_required BOOLEAN NOT NULL DEFAULT true,
  completion_status TEXT NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  evidence_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_sop_training_assignments TO authenticated;
GRANT ALL ON public.video_sop_training_assignments TO service_role;
ALTER TABLE public.video_sop_training_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins manage video_sop_training_assignments" ON public.video_sop_training_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.video_sop_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.video_sop_assets(id) ON DELETE CASCADE,
  business_id UUID,
  external_tool TEXT NOT NULL DEFAULT 'manual_upload',
  video_url TEXT,
  embed_url TEXT,
  transcript_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  access_notes TEXT,
  privacy_status TEXT NOT NULL DEFAULT 'private',
  approved_for_customer_use BOOLEAN NOT NULL DEFAULT false,
  approved_for_saleability_pack BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_sop_links TO authenticated;
GRANT ALL ON public.video_sop_links TO service_role;
ALTER TABLE public.video_sop_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins manage video_sop_links" ON public.video_sop_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.video_sop_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.video_sop_assets(id) ON DELETE CASCADE,
  business_id UUID,
  event_type TEXT NOT NULL,
  event_summary TEXT,
  actor_user_id UUID,
  actor_role TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.video_sop_audit_events TO authenticated;
GRANT ALL ON public.video_sop_audit_events TO service_role;
ALTER TABLE public.video_sop_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read video_sop_audit_events" ON public.video_sop_audit_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Founders/admins insert video_sop_audit_events" ON public.video_sop_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_video_sop_assets_updated BEFORE UPDATE ON public.video_sop_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_video_sop_scripts_updated BEFORE UPDATE ON public.video_sop_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_video_sop_training_assignments_updated BEFORE UPDATE ON public.video_sop_training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_video_sop_links_updated BEFORE UPDATE ON public.video_sop_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_video_sop_assets_business ON public.video_sop_assets(business_id);
CREATE INDEX idx_video_sop_assets_status ON public.video_sop_assets(status);
CREATE INDEX idx_video_sop_scripts_asset ON public.video_sop_scripts(asset_id);
CREATE INDEX idx_video_sop_links_asset ON public.video_sop_links(asset_id);
CREATE INDEX idx_video_sop_assignments_asset ON public.video_sop_training_assignments(asset_id);
CREATE INDEX idx_video_sop_audit_asset ON public.video_sop_audit_events(asset_id);
