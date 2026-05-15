
CREATE TABLE IF NOT EXISTS public.social_source_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_title text NOT NULL,
  asset_url text,
  asset_notes text,
  transcript text,
  source_platform text,
  release_date date,
  campaign_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_source_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_source_assets" ON public.social_source_assets FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_source_assets" ON public.social_source_assets FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_social_source_assets_business ON public.social_source_assets(business_id);
CREATE TRIGGER trg_social_source_assets_updated_at BEFORE UPDATE ON public.social_source_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.social_repurposing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source_asset_id uuid NOT NULL REFERENCES public.social_source_assets(id) ON DELETE CASCADE,
  job_name text NOT NULL,
  target_platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  job_status text NOT NULL DEFAULT 'draft',
  outputs_created integer NOT NULL DEFAULT 0,
  founder_review_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_repurposing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_repurposing_jobs" ON public.social_repurposing_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_repurposing_jobs" ON public.social_repurposing_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_social_repurposing_jobs_business ON public.social_repurposing_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_social_repurposing_jobs_asset ON public.social_repurposing_jobs(source_asset_id);
CREATE TRIGGER trg_social_repurposing_jobs_updated_at BEFORE UPDATE ON public.social_repurposing_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
