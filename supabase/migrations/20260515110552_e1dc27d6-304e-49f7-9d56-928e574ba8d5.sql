CREATE TABLE IF NOT EXISTS public.outbound_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'disabled' CHECK (mode IN ('proof','scale','disabled')),
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN ('not_configured','configured','connected','error','disabled')),
  from_email TEXT,
  from_name TEXT,
  sending_domain TEXT,
  reply_to TEXT,
  daily_send_cap INTEGER,
  hourly_send_cap INTEGER,
  mailbox_send_cap INTEGER,
  warmup_status TEXT,
  provider_health TEXT NOT NULL DEFAULT 'unknown',
  credentials_present BOOLEAN NOT NULL DEFAULT false,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  inbox_id UUID,
  notes TEXT,
  last_test_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS outbound_providers_name_type_uniq
  ON public.outbound_providers (provider_name, provider_type);

ALTER TABLE public.outbound_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins can read outbound providers"
  ON public.outbound_providers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins can insert outbound providers"
  ON public.outbound_providers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins can update outbound providers"
  ON public.outbound_providers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_outbound_providers_updated_at
  BEFORE UPDATE ON public.outbound_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the existing IONOS proof inbox as the current proof provider (metadata only).
INSERT INTO public.outbound_providers
  (provider_name, provider_type, mode, status, from_email, from_name, sending_domain, reply_to,
   daily_send_cap, hourly_send_cap, mailbox_send_cap, warmup_status, provider_health,
   credentials_present, webhook_configured, inbox_id, notes)
SELECT
  'IONOS (Neon Candy)',
  'ionos_smtp',
  'proof',
  'connected',
  i.email_address,
  COALESCE(i.from_name, 'Neon Candy'),
  split_part(i.email_address,'@',2),
  COALESCE(i.reply_to_email, i.email_address),
  50, 10, 50,
  'manual',
  'ok',
  true,
  false,
  i.id,
  'Proof / low-volume sending only. Not the scale provider. Manual Send Apply path only.'
FROM public.inboxes i
WHERE i.id = '0a7096d1-8160-4243-97bc-c1615b6673b3'
ON CONFLICT (provider_name, provider_type) DO NOTHING;

-- Seed a placeholder scale provider row (not configured).
INSERT INTO public.outbound_providers
  (provider_name, provider_type, mode, status, provider_health, credentials_present, webhook_configured, notes)
VALUES
  ('Scale Provider (TBD)', 'external_scale', 'scale', 'not_configured', 'unknown', false, false,
   'Placeholder for the future bulk/outbound scale provider. Not configured.')
ON CONFLICT (provider_name, provider_type) DO NOTHING;