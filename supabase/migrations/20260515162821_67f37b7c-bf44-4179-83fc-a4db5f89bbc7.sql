
CREATE TABLE public.marketing_content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_title text NOT NULL,
  asset_status text NOT NULL DEFAULT 'draft',
  target_audience text,
  goal text,
  content_body text,
  outline jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta text,
  approval_status text NOT NULL DEFAULT 'draft',
  publish_allowed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.marketing_campaign_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  campaign_type text NOT NULL,
  campaign_goal text,
  target_audience text,
  offer text,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  funnel_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  creative_angles jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget_notes text,
  approval_status text NOT NULL DEFAULT 'draft',
  launch_allowed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mca_business ON public.marketing_content_assets(business_id);
CREATE INDEX idx_mca_type ON public.marketing_content_assets(asset_type);
CREATE INDEX idx_mcb_business ON public.marketing_campaign_briefs(business_id);
CREATE INDEX idx_mcb_type ON public.marketing_campaign_briefs(campaign_type);

ALTER TABLE public.marketing_content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders manage marketing_content_assets"
  ON public.marketing_content_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "founders manage marketing_campaign_briefs"
  ON public.marketing_campaign_briefs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_mca_updated_at
  BEFORE UPDATE ON public.marketing_content_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_mcb_updated_at
  BEFORE UPDATE ON public.marketing_campaign_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
