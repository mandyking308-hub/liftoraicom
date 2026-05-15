CREATE TABLE IF NOT EXISTS public.outbound_provider_lead_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  liftor_contact_id UUID NOT NULL,
  liftor_campaign_id UUID NOT NULL,
  campaign_mapping_id UUID REFERENCES public.outbound_provider_campaign_mappings(id) ON DELETE SET NULL,
  provider_type TEXT NOT NULL DEFAULT 'smartlead',
  provider_campaign_id TEXT,
  provider_lead_id TEXT,
  contact_email TEXT NOT NULL,
  push_status TEXT NOT NULL DEFAULT 'not_pushed'
    CHECK (push_status IN ('not_pushed','previewed','pushing','pushed','failed','skipped')),
  last_previewed_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  provider_response JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_lead_mappings_uniq
  ON public.outbound_provider_lead_mappings (provider_type, provider_campaign_id, lower(contact_email))
  WHERE provider_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oplm_contact ON public.outbound_provider_lead_mappings (liftor_contact_id);
CREATE INDEX IF NOT EXISTS idx_oplm_campaign ON public.outbound_provider_lead_mappings (liftor_campaign_id);
CREATE INDEX IF NOT EXISTS idx_oplm_status ON public.outbound_provider_lead_mappings (push_status);

ALTER TABLE public.outbound_provider_lead_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read provider lead mappings"
  ON public.outbound_provider_lead_mappings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins insert provider lead mappings"
  ON public.outbound_provider_lead_mappings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins update provider lead mappings"
  ON public.outbound_provider_lead_mappings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins delete provider lead mappings"
  ON public.outbound_provider_lead_mappings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_oplm_updated_at
  BEFORE UPDATE ON public.outbound_provider_lead_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();