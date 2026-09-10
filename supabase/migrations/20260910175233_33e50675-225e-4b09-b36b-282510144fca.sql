ALTER TABLE public.gsm_mailboxes
  ADD COLUMN IF NOT EXISTS health_score integer NOT NULL DEFAULT 0;

ALTER TABLE public.gsm_mailbox_allocations
  ADD COLUMN IF NOT EXISTS thread_sticky boolean NOT NULL DEFAULT true;

ALTER TABLE public.gsm_sender_pools
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100;

ALTER TABLE public.gsm_sender_pools
  ADD COLUMN IF NOT EXISTS desired_capacity integer
  GENERATED ALWAYS AS (target_capacity) STORED;

CREATE OR REPLACE FUNCTION public.gsm_mailbox_is_campaign_ready(
  _readiness_state text,
  _smtp_status text,
  _imap_status text,
  _smartlead_status text,
  _smartlead_email_account_id text,
  _warmup_status text,
  _health_score integer,
  _configured_daily_limit integer,
  _retired boolean,
  _active boolean,
  _quarantined_reason text,
  _estate_classification text,
  _email text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    coalesce(_retired, false) = false
    AND coalesce(_active, true) = true
    AND _quarantined_reason IS NULL
    AND coalesce(lower(_estate_classification), 'gsm') = 'gsm'
    AND lower(coalesce(_email, '')) <> 'hello@neoncandy.online'
    AND lower(coalesce(_email, '')) NOT LIKE '%@neoncandy.online'
    AND lower(coalesce(_readiness_state, '')) IN ('campaign_ready', 'ready')
    AND lower(coalesce(_smtp_status, '')) IN ('ok', 'success', 'passed', 'connected', 'true', 'verified')
    AND lower(coalesce(_imap_status, '')) IN ('ok', 'success', 'passed', 'connected', 'true', 'verified')
    AND lower(coalesce(_smartlead_status, '')) IN ('connected', 'active', 'ok', 'linked')
    AND _smartlead_email_account_id IS NOT NULL
    AND lower(coalesce(_warmup_status, '')) IN ('completed', 'complete', 'warm', 'ready', 'finished', 'not_required')
    AND coalesce(_health_score, 0) >= 70
    AND coalesce(_configured_daily_limit, 0) > 0
$$;

CREATE OR REPLACE VIEW public.gsm_mailbox_readiness
WITH (security_invoker = true) AS
SELECT
  m.id AS mailbox_id,
  m.email,
  m.sending_domain_id,
  m.provider,
  m.provider_mailbox_id,
  m.smartlead_email_account_id,
  m.readiness_state,
  m.smtp_status,
  m.imap_status,
  m.smartlead_status,
  m.warmup_status,
  m.health_score,
  m.configured_daily_limit,
  m.quarantined_reason,
  m.retired,
  m.active,
  m.estate_classification,
  public.gsm_mailbox_is_campaign_ready(
    m.readiness_state, m.smtp_status, m.imap_status, m.smartlead_status,
    m.smartlead_email_account_id, m.warmup_status, m.health_score,
    m.configured_daily_limit, m.retired, m.active, m.quarantined_reason,
    m.estate_classification, m.email
  ) AS campaign_ready
FROM public.gsm_mailboxes m;

GRANT SELECT ON public.gsm_mailbox_readiness TO authenticated;
GRANT ALL ON public.gsm_mailbox_readiness TO service_role;