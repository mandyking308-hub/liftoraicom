-- Worker 3: business-owned provider connections and tenant-scoped mappings.
-- Existing rows remain intact and unbound until explicitly reconciled.

CREATE TABLE IF NOT EXISTS public.outbound_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('apollo','smartlead','winnr')),
  display_name TEXT NOT NULL,
  external_account_id TEXT,
  credential_secret_ref TEXT,
  webhook_secret_ref TEXT,
  connection_status TEXT NOT NULL DEFAULT 'unconfigured'
    CHECK (connection_status IN ('unconfigured','configured','verified','disabled')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  inbound_receiver_enabled BOOLEAN NOT NULL DEFAULT false,
  mutations_enabled BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outbound_provider_connections_enabled_requires_credential
    CHECK (NOT is_enabled OR credential_secret_ref IS NOT NULL),
  CONSTRAINT outbound_provider_connections_credential_ref_is_namespaced
    CHECK (credential_secret_ref IS NULL OR credential_secret_ref =
      'LIFTOR_OUTREACH_' || upper(provider_type) || '_' || replace(id::TEXT, '-', '') || '_CREDENTIAL'),
  CONSTRAINT outbound_provider_connections_webhook_ref_is_namespaced
    CHECK (webhook_secret_ref IS NULL OR webhook_secret_ref =
      'LIFTOR_OUTREACH_' || upper(provider_type) || '_' || replace(id::TEXT, '-', '') || '_WEBHOOK_SECRET'),
  CONSTRAINT outbound_provider_connections_scope_key
    UNIQUE (id, business_id, provider_type),
  CONSTRAINT outbound_provider_connections_name_key
    UNIQUE (business_id, provider_type, display_name)
);

ALTER TABLE public.outbound_provider_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.outbound_provider_connections FROM anon, authenticated;
GRANT ALL ON TABLE public.outbound_provider_connections TO service_role;

CREATE INDEX IF NOT EXISTS idx_outbound_provider_connections_business
  ON public.outbound_provider_connections (business_id, provider_type, is_enabled);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_outbound_provider_connections_updated_at'
      AND tgrelid = 'public.outbound_provider_connections'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_outbound_provider_connections_updated_at
      BEFORE UPDATE ON public.outbound_provider_connections
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Legacy inbox rows stay unbound; new provider mailbox bindings require an
-- explicit stable business ID and cannot infer ownership from an email address.
ALTER TABLE public.inboxes ADD COLUMN IF NOT EXISTS business_id UUID;
DO $$ BEGIN
  ALTER TABLE public.inboxes
    ADD CONSTRAINT inboxes_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS inboxes_id_business_id_scope_key
  ON public.inboxes (id, business_id);

ALTER TABLE public.outbound_provider_campaign_mappings
  ADD COLUMN IF NOT EXISTS provider_connection_id UUID,
  ADD COLUMN IF NOT EXISTS workspace_external_id TEXT;

ALTER TABLE public.outbound_provider_lead_mappings
  ADD COLUMN IF NOT EXISTS provider_connection_id UUID,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id UUID;

ALTER TABLE public.outbound_provider_events
  ADD COLUMN IF NOT EXISTS event_occurred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS liftor_campaign_id UUID,
  ADD COLUMN IF NOT EXISTS provider_connection_id UUID,
  ADD COLUMN IF NOT EXISTS business_id UUID,
  ADD COLUMN IF NOT EXISTS campaign_mapping_id UUID,
  ADD COLUMN IF NOT EXISTS lead_mapping_id UUID,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id UUID,
  ADD COLUMN IF NOT EXISTS provider_mailbox_id TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.outbound_provider_mailbox_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  provider_connection_id UUID NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('smartlead','winnr')),
  provider_mailbox_id TEXT NOT NULL,
  inbox_id UUID,
  estate_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outbound_provider_mailbox_mappings_external_key
    UNIQUE (provider_connection_id, provider_mailbox_id),
  CONSTRAINT outbound_provider_mailbox_mappings_scope_key
    UNIQUE (id, business_id, provider_connection_id, provider_type),
  CONSTRAINT outbound_provider_mailbox_mappings_connection_fkey
    FOREIGN KEY (provider_connection_id, business_id, provider_type)
    REFERENCES public.outbound_provider_connections(id, business_id, provider_type),
  CONSTRAINT outbound_provider_mailbox_mappings_inbox_fkey
    FOREIGN KEY (inbox_id, business_id)
    REFERENCES public.inboxes(id, business_id)
);

ALTER TABLE public.outbound_provider_mailbox_mappings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.outbound_provider_mailbox_mappings FROM anon, authenticated;
GRANT ALL ON TABLE public.outbound_provider_mailbox_mappings TO service_role;
CREATE INDEX IF NOT EXISTS idx_outbound_provider_mailbox_mappings_scope
  ON public.outbound_provider_mailbox_mappings (business_id, provider_connection_id, provider_type, is_active);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_outbound_provider_mailbox_mappings_updated_at'
      AND tgrelid = 'public.outbound_provider_mailbox_mappings'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_outbound_provider_mailbox_mappings_updated_at
      BEFORE UPDATE ON public.outbound_provider_mailbox_mappings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Composite references keep new mappings and events within the owning
-- business/provider connection. NOT VALID preserves historic unscoped rows;
-- Postgres still checks every new or updated row.
CREATE UNIQUE INDEX IF NOT EXISTS bcr_id_business_contact_scope_key
  ON public.business_contact_relationships (id, business_id, contact_id);
CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_campaign_mappings_scope_key
  ON public.outbound_provider_campaign_mappings (id, business_id, provider_connection_id, provider_type);
CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_lead_mappings_scope_key
  ON public.outbound_provider_lead_mappings (id, business_id, provider_connection_id, provider_type);

DO $$ BEGIN
  ALTER TABLE public.outbound_provider_campaign_mappings
    ADD CONSTRAINT outbound_provider_campaign_mappings_connection_fkey
    FOREIGN KEY (provider_connection_id, business_id, provider_type)
    REFERENCES public.outbound_provider_connections(id, business_id, provider_type) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_campaign_mappings
    ADD CONSTRAINT outbound_provider_campaign_mappings_business_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_lead_mappings
    ADD CONSTRAINT outbound_provider_lead_mappings_connection_fkey
    FOREIGN KEY (provider_connection_id, business_id, provider_type)
    REFERENCES public.outbound_provider_connections(id, business_id, provider_type) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_lead_mappings
    ADD CONSTRAINT outbound_provider_lead_mappings_business_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_lead_mappings
    ADD CONSTRAINT outbound_provider_lead_mappings_bcr_scope_fkey
    FOREIGN KEY (business_contact_relationship_id, business_id, liftor_contact_id)
    REFERENCES public.business_contact_relationships(id, business_id, contact_id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_events
    ADD CONSTRAINT outbound_provider_events_connection_fkey
    FOREIGN KEY (provider_connection_id, business_id, provider_type)
    REFERENCES public.outbound_provider_connections(id, business_id, provider_type) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_events
    ADD CONSTRAINT outbound_provider_events_business_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_events
    ADD CONSTRAINT outbound_provider_events_campaign_scope_fkey
    FOREIGN KEY (campaign_mapping_id, business_id, provider_connection_id, provider_type)
    REFERENCES public.outbound_provider_campaign_mappings(id, business_id, provider_connection_id, provider_type) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_events
    ADD CONSTRAINT outbound_provider_events_lead_scope_fkey
    FOREIGN KEY (lead_mapping_id, business_id, provider_connection_id, provider_type)
    REFERENCES public.outbound_provider_lead_mappings(id, business_id, provider_connection_id, provider_type) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.outbound_provider_events
    ADD CONSTRAINT outbound_provider_events_bcr_scope_fkey
    FOREIGN KEY (business_contact_relationship_id, business_id, contact_id)
    REFERENCES public.business_contact_relationships(id, business_id, contact_id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_events_connection_idempotency_key
  ON public.outbound_provider_events (provider_connection_id, idempotency_key)
  WHERE provider_connection_id IS NOT NULL AND idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS outbound_provider_campaign_connection_external_key
  ON public.outbound_provider_campaign_mappings (provider_connection_id, provider_campaign_id)
  WHERE provider_connection_id IS NOT NULL AND provider_campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS outbound_provider_lead_connection_external_key
  ON public.outbound_provider_lead_mappings (provider_connection_id, provider_campaign_id, provider_lead_id)
  WHERE provider_connection_id IS NOT NULL;
