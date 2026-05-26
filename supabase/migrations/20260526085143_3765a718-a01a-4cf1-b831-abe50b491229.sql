CREATE TABLE IF NOT EXISTS public.digital_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'other',
  asset_url TEXT,
  storage_location_summary TEXT,
  owner_entity_id UUID,
  creator_summary TEXT,
  commercial_use_allowed BOOLEAN,
  rights_status TEXT NOT NULL DEFAULT 'unknown',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_rights_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.digital_assets(id) ON DELETE CASCADE,
  rights_type TEXT NOT NULL DEFAULT 'usage',
  rights_summary TEXT,
  start_date DATE,
  end_date DATE,
  restrictions TEXT,
  evidence_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.licensing_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  asset_id UUID REFERENCES public.digital_assets(id) ON DELETE SET NULL,
  opportunity_type TEXT NOT NULL DEFAULT 'custom',
  opportunity_status TEXT NOT NULL DEFAULT 'draft',
  expected_value NUMERIC,
  currency TEXT DEFAULT 'GBP',
  risk_flags TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_rights_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensing_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders manage digital_assets" ON public.digital_assets;
CREATE POLICY "Founders manage digital_assets" ON public.digital_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Founders manage asset_rights_records" ON public.asset_rights_records;
CREATE POLICY "Founders manage asset_rights_records" ON public.asset_rights_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Founders manage licensing_opportunities" ON public.licensing_opportunities;
CREATE POLICY "Founders manage licensing_opportunities" ON public.licensing_opportunities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP TRIGGER IF EXISTS trg_digital_assets_updated ON public.digital_assets;
CREATE TRIGGER trg_digital_assets_updated BEFORE UPDATE ON public.digital_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_asset_rights_records_updated ON public.asset_rights_records;
CREATE TRIGGER trg_asset_rights_records_updated BEFORE UPDATE ON public.asset_rights_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_licensing_opportunities_updated ON public.licensing_opportunities;
CREATE TRIGGER trg_licensing_opportunities_updated BEFORE UPDATE ON public.licensing_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_digital_assets_business ON public.digital_assets(business_id);
CREATE INDEX IF NOT EXISTS idx_asset_rights_asset ON public.asset_rights_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_licensing_opps_business ON public.licensing_opportunities(business_id);
CREATE INDEX IF NOT EXISTS idx_licensing_opps_asset ON public.licensing_opportunities(asset_id);