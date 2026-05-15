
CREATE TABLE IF NOT EXISTS public.social_content_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  calendar_name text NOT NULL,
  calendar_period_start date,
  calendar_period_end date,
  calendar_status text NOT NULL DEFAULT 'draft',
  strategy_summary text,
  content_pillars jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  posting_frequency jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_status text NOT NULL DEFAULT 'draft',
  approved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_content_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_content_calendars" ON public.social_content_calendars FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_content_calendars" ON public.social_content_calendars FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_social_content_calendars_business ON public.social_content_calendars(business_id);
CREATE TRIGGER trg_social_content_calendars_updated_at BEFORE UPDATE ON public.social_content_calendars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.social_post_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  calendar_id uuid REFERENCES public.social_content_calendars(id) ON DELETE SET NULL,
  platform_key text NOT NULL,
  post_type text NOT NULL,
  post_date date,
  suggested_time time,
  content_pillar text,
  hook text,
  caption text,
  cta text,
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  visual_direction text,
  video_script text,
  carousel_slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  asset_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_asset_id uuid,
  repurposed_from_post_id uuid,
  approval_status text NOT NULL DEFAULT 'draft',
  founder_review_required boolean NOT NULL DEFAULT true,
  publish_allowed boolean NOT NULL DEFAULT false,
  scheduled_externally boolean NOT NULL DEFAULT false,
  external_scheduler text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_post_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_post_drafts" ON public.social_post_drafts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_post_drafts" ON public.social_post_drafts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_social_post_drafts_business ON public.social_post_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_social_post_drafts_calendar ON public.social_post_drafts(calendar_id);
CREATE INDEX IF NOT EXISTS idx_social_post_drafts_date ON public.social_post_drafts(post_date);
CREATE TRIGGER trg_social_post_drafts_updated_at BEFORE UPDATE ON public.social_post_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
