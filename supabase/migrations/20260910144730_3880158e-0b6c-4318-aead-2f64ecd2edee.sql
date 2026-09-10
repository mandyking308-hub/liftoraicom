-- ============================================================
-- Smartlead / outbound sending infrastructure hardening
-- Additive only. No drops, no data destruction.
-- ============================================================

-- ---------- 1. CAMPAIGN MAPPINGS ----------
ALTER TABLE public.outbound_provider_campaign_mappings
  ADD COLUMN IF NOT EXISTS idempotency_token text,
  ADD COLUMN IF NOT EXISTS provider_campaign_created_by_liftor boolean NOT NULL DEFAULT false;

-- Exactly ONE mapping per (provider, liftor campaign). Retry is idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_campaign_mappings_liftor_uniq
  ON public.outbound_provider_campaign_mappings (provider_id, liftor_campaign_id)
  WHERE liftor_campaign_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_campaign_mappings_idem_uniq
  ON public.outbound_provider_campaign_mappings (provider_id, idempotency_token)
  WHERE idempotency_token IS NOT NULL;

-- ---------- 2. LEAD MAPPINGS ----------
ALTER TABLE public.outbound_provider_lead_mappings
  ADD COLUMN IF NOT EXISTS provider_lead_identity text,
  ADD COLUMN IF NOT EXISTS sendability_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sendability_status text,
  ADD COLUMN IF NOT EXISTS block_reason text,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS snapshot_taken_at timestamptz,
  ADD COLUMN IF NOT EXISTS inbox_id uuid;

-- One Liftor contact may appear at most once per Liftor campaign.
CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_lead_mappings_contact_campaign_uniq
  ON public.outbound_provider_lead_mappings (liftor_campaign_id, liftor_contact_id)
  WHERE liftor_campaign_id IS NOT NULL AND liftor_contact_id IS NOT NULL;

-- Provider lead identity may not be reused inside the same provider campaign.
CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_lead_mappings_provider_identity_uniq
  ON public.outbound_provider_lead_mappings (provider_type, provider_campaign_id, provider_lead_id)
  WHERE provider_campaign_id IS NOT NULL AND provider_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oplm_campaign_mapping ON public.outbound_provider_lead_mappings (campaign_mapping_id);

-- ---------- 3. PROVIDER EVENTS ----------
ALTER TABLE public.outbound_provider_events
  ADD COLUMN IF NOT EXISTS liftor_campaign_id uuid,
  ADD COLUMN IF NOT EXISTS lead_mapping_id uuid,
  ADD COLUMN IF NOT EXISTS provider_mailbox_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_occurred_at timestamptz;

-- Same provider event can never be stored (or replayed) twice.
CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_events_idempotency_uniq
  ON public.outbound_provider_events (provider_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ope_processing_status ON public.outbound_provider_events (processing_status);
CREATE INDEX IF NOT EXISTS idx_ope_contact ON public.outbound_provider_events (contact_id);

-- ---------- 4. ACTIVATION CHECKLIST (existing table only) ----------
CREATE UNIQUE INDEX IF NOT EXISTS smartlead_activation_checklist_scope_uniq
  ON public.smartlead_activation_checklist (
    COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(liftor_campaign_id, '00000000-0000-0000-0000-000000000000'::uuid),
    checklist_key
  );

-- ---------- 5. MAILBOX / SENDING ESTATE (extend existing public.inboxes) ----------
ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS provider_mailbox_id text,
  ADD COLUMN IF NOT EXISTS provider_account_id text,
  ADD COLUMN IF NOT EXISTS estate_key text NOT NULL DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS estate_provider text NOT NULL DEFAULT 'smartlead',
  ADD COLUMN IF NOT EXISTS allowed_business_names text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS segregation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smtp_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS imap_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warmup_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ramp_daily_cap integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS last_provider_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS mailbox_owner text,
  ADD COLUMN IF NOT EXISTS domain_health_score integer,
  ADD COLUMN IF NOT EXISTS sending_load_7d integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS excluded_from_allocation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclusion_reason text,
  ADD COLUMN IF NOT EXISTS registration_batch_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS inboxes_provider_mailbox_uniq
  ON public.inboxes (estate_provider, provider_mailbox_id)
  WHERE provider_mailbox_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inboxes_estate_key ON public.inboxes (estate_key);
CREATE INDEX IF NOT EXISTS idx_inboxes_allocatable ON public.inboxes (active, excluded_from_allocation, provider_ready);

-- ---------- 6. MAILBOX ALLOCATION AUDIT ----------
CREATE TABLE IF NOT EXISTS public.mailbox_allocation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_run_key text,
  business_name text,
  estate_key text,
  liftor_campaign_id uuid,
  liftor_contact_id uuid,
  requested_count integer NOT NULL DEFAULT 0,
  selected_inbox_id uuid,
  selected_email text,
  considered_count integer NOT NULL DEFAULT 0,
  eligible_count integer NOT NULL DEFAULT 0,
  rejected jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision text NOT NULL DEFAULT 'unresolved',
  decision_reason text,
  allocator_version text NOT NULL DEFAULT 'mailbox-allocator-1.0.0',
  dry_run boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailbox_allocation_audit TO authenticated;
GRANT ALL ON public.mailbox_allocation_audit TO service_role;
ALTER TABLE public.mailbox_allocation_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders and admins manage mailbox allocation audit"
  ON public.mailbox_allocation_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_mba_created_at ON public.mailbox_allocation_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mba_business ON public.mailbox_allocation_audit (business_name);

-- ---------- 7. MAILBOX REGISTRATION BATCHES ----------
CREATE TABLE IF NOT EXISTS public.mailbox_registration_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_key text NOT NULL,
  estate_key text NOT NULL DEFAULT 'unassigned',
  source text NOT NULL DEFAULT 'csv_paste',
  mode text NOT NULL DEFAULT 'preview',
  submitted_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  updated_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview jsonb NOT NULL DEFAULT '[]'::jsonb,
  applied_at timestamptz,
  applied_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mailbox_registration_batches_key_uniq
  ON public.mailbox_registration_batches (batch_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailbox_registration_batches TO authenticated;
GRANT ALL ON public.mailbox_registration_batches TO service_role;
ALTER TABLE public.mailbox_registration_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders and admins manage mailbox registration batches"
  ON public.mailbox_registration_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mailbox_registration_batches_updated_at
  BEFORE UPDATE ON public.mailbox_registration_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();