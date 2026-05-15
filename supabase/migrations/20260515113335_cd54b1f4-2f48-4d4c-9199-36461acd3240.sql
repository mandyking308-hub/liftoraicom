
-- =======================================================================
-- Smartlead Scale Engine — provider campaign mappings + provider event log
-- Founder/admin only. No operational data is mutated by these tables.
-- =======================================================================

-- ---- outbound_provider_campaign_mappings ----
CREATE TABLE IF NOT EXISTS public.outbound_provider_campaign_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  liftor_campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.outbound_providers(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL DEFAULT 'smartlead',
  provider_campaign_id TEXT,
  provider_campaign_name TEXT,
  provider_campaign_status TEXT,
  mapping_status TEXT NOT NULL DEFAULT 'unmapped'
    CHECK (mapping_status IN ('unmapped','mapped','needs_review','disabled')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_campaign_mappings_provider_campaign_uniq
  ON public.outbound_provider_campaign_mappings (provider_id, provider_campaign_id)
  WHERE provider_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opcm_liftor_campaign
  ON public.outbound_provider_campaign_mappings (liftor_campaign_id);

ALTER TABLE public.outbound_provider_campaign_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins can read provider campaign mappings"
  ON public.outbound_provider_campaign_mappings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins can insert provider campaign mappings"
  ON public.outbound_provider_campaign_mappings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins can update provider campaign mappings"
  ON public.outbound_provider_campaign_mappings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins can delete provider campaign mappings"
  ON public.outbound_provider_campaign_mappings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_opcm_updated_at
  BEFORE UPDATE ON public.outbound_provider_campaign_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- outbound_provider_events ----
CREATE TABLE IF NOT EXISTS public.outbound_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL DEFAULT 'smartlead',
  provider_id UUID REFERENCES public.outbound_providers(id) ON DELETE SET NULL,
  provider_event_type TEXT NOT NULL,
  provider_event_id TEXT,
  provider_campaign_id TEXT,
  provider_lead_id TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','mapped','ignored','error')),
  operational_mutation_applied BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ope_received_at
  ON public.outbound_provider_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_ope_provider_event
  ON public.outbound_provider_events (provider_type, provider_event_type);
CREATE INDEX IF NOT EXISTS idx_ope_provider_campaign
  ON public.outbound_provider_events (provider_campaign_id);

ALTER TABLE public.outbound_provider_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins can read provider events"
  ON public.outbound_provider_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins can insert provider events"
  ON public.outbound_provider_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
