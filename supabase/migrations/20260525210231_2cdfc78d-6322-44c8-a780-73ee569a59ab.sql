
-- 1. business_launch_profiles
CREATE TABLE public.business_launch_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  brand_name text,
  public_brand_name text,
  domain_name text,
  website_url text,
  support_email text,
  sales_email text,
  legal_footer_entity_id uuid,
  launch_status text NOT NULL DEFAULT 'draft'
    CHECK (launch_status IN ('draft','setup_needed','internal_ready','approval_required','live','paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (business_id)
);

-- 2. business_channel_accounts
CREATE TABLE public.business_channel_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  channel_type text NOT NULL
    CHECK (channel_type IN ('domain','website','email','instagram','tiktok','youtube','facebook','linkedin','x','metricool','manychat','analytics','other')),
  account_name text NOT NULL,
  account_url text,
  login_method_summary text,
  connected boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_channel_accounts_business ON public.business_channel_accounts(business_id);
CREATE INDEX idx_channel_accounts_type ON public.business_channel_accounts(channel_type);

-- 3. business_launch_checklist_items
CREATE TABLE public.business_launch_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  item_name text NOT NULL,
  item_category text NOT NULL
    CHECK (item_category IN ('brand','domain','email','website','legal','tracking','social','crm','offer','campaign')),
  item_status text NOT NULL DEFAULT 'missing'
    CHECK (item_status IN ('missing','draft','configured','approval_required','complete','not_needed')),
  required boolean NOT NULL DEFAULT true,
  link_to_fix text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_checklist_business ON public.business_launch_checklist_items(business_id);
CREATE INDEX idx_launch_checklist_category ON public.business_launch_checklist_items(item_category);

-- Timestamps
CREATE TRIGGER trg_launch_profiles_updated_at BEFORE UPDATE ON public.business_launch_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_channel_accounts_updated_at BEFORE UPDATE ON public.business_channel_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_launch_checklist_updated_at BEFORE UPDATE ON public.business_launch_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.business_launch_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_channel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_launch_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage launch profiles" ON public.business_launch_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage channel accounts" ON public.business_channel_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage launch checklist" ON public.business_launch_checklist_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
