-- Performance metrics
CREATE TABLE IF NOT EXISTS public.social_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  post_draft_id uuid REFERENCES public.social_post_drafts(id) ON DELETE SET NULL,
  platform_key text NOT NULL,
  external_post_id text,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  impressions integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  follows integer NOT NULL DEFAULT 0,
  engagement_rate numeric,
  watch_time_seconds numeric,
  completion_rate numeric,
  source_system text NOT NULL DEFAULT 'manual_or_metricool',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_performance_metrics" ON public.social_performance_metrics
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_performance_metrics" ON public.social_performance_metrics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_spm_business ON public.social_performance_metrics(business_id);
CREATE INDEX IF NOT EXISTS idx_spm_platform ON public.social_performance_metrics(platform_key);
CREATE INDEX IF NOT EXISTS idx_spm_date ON public.social_performance_metrics(metric_date DESC);

-- Competitor profiles
CREATE TABLE IF NOT EXISTS public.social_competitor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  platform_key text,
  handle text,
  profile_url text,
  notes text,
  observed_content_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  strong_hooks jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_pillars jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'watching',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_competitor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_competitor_profiles" ON public.social_competitor_profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_competitor_profiles" ON public.social_competitor_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_scp_business ON public.social_competitor_profiles(business_id);
CREATE TRIGGER trg_scp_updated_at BEFORE UPDATE ON public.social_competitor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trend watch items
CREATE TABLE IF NOT EXISTS public.social_trend_watch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  trend_key text,
  trend_title text NOT NULL,
  platform_key text,
  trend_type text,
  relevance_score numeric,
  suggested_content_angle text,
  source_notes text,
  status text NOT NULL DEFAULT 'watching',
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_trend_watch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_trend_watch_items" ON public.social_trend_watch_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_trend_watch_items" ON public.social_trend_watch_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_stwi_business ON public.social_trend_watch_items(business_id);
CREATE TRIGGER trg_stwi_updated_at BEFORE UPDATE ON public.social_trend_watch_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();