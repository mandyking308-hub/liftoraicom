CREATE TABLE public.ip_asset_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  asset_name text NOT NULL,
  asset_type text NOT NULL,
  ownership_status text NOT NULL DEFAULT 'unknown',
  creator_name text,
  creation_date date,
  source_tool text,
  registration_status text NOT NULL DEFAULT 'not_registered',
  registration_reference text,
  usage_rights text,
  commercial_use_allowed boolean NOT NULL DEFAULT false,
  licensing_allowed boolean NOT NULL DEFAULT false,
  public_use_allowed boolean NOT NULL DEFAULT false,
  rights_risk_level text NOT NULL DEFAULT 'medium',
  document_id uuid,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_asset_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ip assets"
ON public.ip_asset_register
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_ip_asset_register_updated_at
BEFORE UPDATE ON public.ip_asset_register
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ip_rights_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  asset_id uuid REFERENCES public.ip_asset_register(id) ON DELETE CASCADE,
  checklist_type text NOT NULL,
  checklist_status text NOT NULL DEFAULT 'draft',
  required_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_review_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_rights_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ip rights checklists"
ON public.ip_rights_checklists
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_ip_rights_checklists_updated_at
BEFORE UPDATE ON public.ip_rights_checklists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ip_asset_business ON public.ip_asset_register(business_id);
CREATE INDEX idx_ip_asset_type ON public.ip_asset_register(asset_type);
CREATE INDEX idx_ip_checklist_asset ON public.ip_rights_checklists(asset_id);
CREATE INDEX idx_ip_checklist_status ON public.ip_rights_checklists(checklist_status);