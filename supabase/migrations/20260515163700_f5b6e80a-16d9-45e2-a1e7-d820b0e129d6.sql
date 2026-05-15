
CREATE TABLE public.creative_asset_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_name text NOT NULL,
  asset_status text NOT NULL DEFAULT 'draft',
  storage_url text,
  external_url text,
  thumbnail_url text,
  description text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_rights text,
  approved_for_social boolean NOT NULL DEFAULT false,
  approved_for_ads boolean NOT NULL DEFAULT false,
  approved_for_proposals boolean NOT NULL DEFAULT false,
  approved_for_website boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.creative_asset_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.creative_asset_library(id) ON DELETE CASCADE,
  business_id uuid,
  used_in_table text,
  used_in_id uuid,
  usage_type text,
  platform_key text,
  used_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_cal_business ON public.creative_asset_library(business_id);
CREATE INDEX idx_cal_type ON public.creative_asset_library(asset_type);
CREATE INDEX idx_cau_asset ON public.creative_asset_usage(asset_id);
CREATE INDEX idx_cau_business ON public.creative_asset_usage(business_id);

ALTER TABLE public.creative_asset_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_asset_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders manage creative_asset_library"
  ON public.creative_asset_library FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "founders manage creative_asset_usage"
  ON public.creative_asset_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_cal_updated_at
  BEFORE UPDATE ON public.creative_asset_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
