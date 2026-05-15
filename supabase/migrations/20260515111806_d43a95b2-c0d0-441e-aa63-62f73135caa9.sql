UPDATE public.outbound_providers
SET
  provider_name = 'Smartlead',
  provider_type = 'smartlead',
  mode = 'scale',
  status = 'not_configured',
  credentials_present = false,
  webhook_configured = false,
  provider_health = 'unknown',
  warmup_status = 'not_configured',
  daily_send_cap = NULL,
  hourly_send_cap = NULL,
  mailbox_send_cap = NULL,
  notes = 'Smartlead scale-provider candidate. Cold outreach orchestration (campaigns, mailboxes, warmup, webhooks). Adapter v1 — no sends. Configure SMARTLEAD_API_KEY secret to enable connection test.',
  updated_at = now()
WHERE id = '72e05077-f093-4689-b222-5a966139c8eb';

INSERT INTO public.outbound_providers (provider_name, provider_type, mode, status, provider_health, warmup_status, notes)
SELECT 'Smartlead', 'smartlead', 'scale', 'not_configured', 'unknown', 'not_configured',
       'Smartlead scale-provider candidate. Adapter v1 — no sends.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.outbound_providers WHERE provider_type = 'smartlead'
);