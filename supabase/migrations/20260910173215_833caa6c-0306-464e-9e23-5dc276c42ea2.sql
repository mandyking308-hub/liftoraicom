-- GSM Outbound Infrastructure — one shared portfolio sending estate
-- Additive only. No secrets are stored in any of these tables.

CREATE TABLE IF NOT EXISTS public.gsm_sending_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  provider text NOT NULL DEFAULT 'winnr',
  provider_domain_id text,
  owner_legal_entity text NOT NULL DEFAULT 'Global Solutions Management LLC',
  provisioning_status text NOT NULL DEFAULT 'pending',
  dns_status text NOT NULL DEFAULT 'unknown',
  spf_ok boolean NOT NULL DEFAULT false,
  dkim_ok boolean NOT NULL DEFAULT false,
  dmarc_ok boolean NOT NULL DEFAULT false,
  warmup_eligible boolean NOT NULL DEFAULT false,
  warmup_status text NOT NULL DEFAULT 'not_started',
  health jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gsm_sending_domains_domain
  ON public.gsm_sending_domains (lower(domain));
CREATE UNIQUE INDEX IF NOT EXISTS ux_gsm_sending_domains_provider_id
  ON public.gsm_sending_domains (provider, provider_domain_id)
  WHERE provider_domain_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gsm_sending_domains TO authenticated;
GRANT ALL ON public.gsm_sending_domains TO service_role;
ALTER TABLE public.gsm_sending_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage gsm sending domains"
  ON public.gsm_sending_domains FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.gsm_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  local_part text,
  sending_domain_id uuid REFERENCES public.gsm_sending_domains(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'winnr',
  provider_mailbox_id text,
  smartlead_email_account_id text,
  sender_name text,
  reply_owner text,
  smtp_status text NOT NULL DEFAULT 'unknown',
  imap_status text NOT NULL DEFAULT 'unknown',
  smartlead_status text NOT NULL DEFAULT 'not_connected',
  warmup_status text NOT NULL DEFAULT 'not_started',
  warmup_started_at timestamptz,
  configured_daily_limit integer NOT NULL DEFAULT 0,
  provider_health text NOT NULL DEFAULT 'unknown',
  readiness_state text NOT NULL DEFAULT 'provisioned_pending',
  quarantined_reason text,
  retired boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  estate_classification text NOT NULL DEFAULT 'gsm',
  last_provider_check_at timestamptz,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gsm_mailboxes_email
  ON public.gsm_mailboxes (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS ux_gsm_mailboxes_provider_id
  ON public.gsm_mailboxes (provider, provider_mailbox_id)
  WHERE provider_mailbox_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_gsm_mailboxes_smartlead_id
  ON public.gsm_mailboxes (smartlead_email_account_id)
  WHERE smartlead_email_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_gsm_mailboxes_readiness
  ON public.gsm_mailboxes (readiness_state);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gsm_mailboxes TO authenticated;
GRANT ALL ON public.gsm_mailboxes TO service_role;
ALTER TABLE public.gsm_mailboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage gsm mailboxes"
  ON public.gsm_mailboxes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.gsm_sender_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_key text NOT NULL UNIQUE,
  pool_name text NOT NULL,
  pool_type text NOT NULL,
  target_capacity integer NOT NULL DEFAULT 0,
  current_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  state text NOT NULL DEFAULT 'active',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gsm_sender_pools TO authenticated;
GRANT ALL ON public.gsm_sender_pools TO service_role;
ALTER TABLE public.gsm_sender_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage gsm sender pools"
  ON public.gsm_sender_pools FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.gsm_mailbox_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES public.gsm_mailboxes(id) ON DELETE CASCADE,
  pool_id uuid NOT NULL REFERENCES public.gsm_sender_pools(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  liftor_campaign_id uuid,
  provider_campaign_id text,
  allocation_status text NOT NULL DEFAULT 'active',
  in_flight boolean NOT NULL DEFAULT false,
  sticky_until timestamptz,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  released_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gsm_alloc_one_active_per_mailbox
  ON public.gsm_mailbox_allocations (mailbox_id)
  WHERE allocation_status = 'active';
CREATE INDEX IF NOT EXISTS ix_gsm_alloc_pool ON public.gsm_mailbox_allocations (pool_id);
CREATE INDEX IF NOT EXISTS ix_gsm_alloc_business ON public.gsm_mailbox_allocations (business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gsm_mailbox_allocations TO authenticated;
GRANT ALL ON public.gsm_mailbox_allocations TO service_role;
ALTER TABLE public.gsm_mailbox_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage gsm mailbox allocations"
  ON public.gsm_mailbox_allocations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.gsm_provider_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  run_mode text NOT NULL DEFAULT 'preview',
  status text NOT NULL DEFAULT 'pending',
  http_status integer,
  domains_seen integer NOT NULL DEFAULT 0,
  mailboxes_seen integer NOT NULL DEFAULT 0,
  domains_upserted integer NOT NULL DEFAULT 0,
  mailboxes_upserted integer NOT NULL DEFAULT 0,
  excluded_non_gsm integer NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.gsm_provider_sync_runs TO authenticated;
GRANT ALL ON public.gsm_provider_sync_runs TO service_role;
ALTER TABLE public.gsm_provider_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read gsm provider sync runs"
  ON public.gsm_provider_sync_runs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.gsm_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gsm_sending_domains_updated ON public.gsm_sending_domains;
CREATE TRIGGER trg_gsm_sending_domains_updated BEFORE UPDATE ON public.gsm_sending_domains
  FOR EACH ROW EXECUTE FUNCTION public.gsm_touch_updated_at();
DROP TRIGGER IF EXISTS trg_gsm_mailboxes_updated ON public.gsm_mailboxes;
CREATE TRIGGER trg_gsm_mailboxes_updated BEFORE UPDATE ON public.gsm_mailboxes
  FOR EACH ROW EXECUTE FUNCTION public.gsm_touch_updated_at();
DROP TRIGGER IF EXISTS trg_gsm_sender_pools_updated ON public.gsm_sender_pools;
CREATE TRIGGER trg_gsm_sender_pools_updated BEFORE UPDATE ON public.gsm_sender_pools
  FOR EACH ROW EXECUTE FUNCTION public.gsm_touch_updated_at();
DROP TRIGGER IF EXISTS trg_gsm_mailbox_allocations_updated ON public.gsm_mailbox_allocations;
CREATE TRIGGER trg_gsm_mailbox_allocations_updated BEFORE UPDATE ON public.gsm_mailbox_allocations
  FOR EACH ROW EXECUTE FUNCTION public.gsm_touch_updated_at();

-- Logical pool templates only. No mailbox or domain rows are created.
INSERT INTO public.gsm_sender_pools (pool_key, pool_name, pool_type, target_capacity, notes)
VALUES
  ('gsm_launch_lane', 'GSM Launch Lane', 'launch', 30,
   'Temporary high-capacity lane lent to the portfolio business currently being launched.'),
  ('gsm_evergreen_lane', 'GSM Evergreen Lane', 'evergreen', 20,
   'Persistent smaller allocations for graduated portfolio businesses (initially 5 each).'),
  ('gsm_quarantine', 'GSM Quarantine', 'quarantine', 0,
   'Holding lane for unhealthy or suspended GSM mailboxes. Never campaign-ready.')
ON CONFLICT (pool_key) DO NOTHING;