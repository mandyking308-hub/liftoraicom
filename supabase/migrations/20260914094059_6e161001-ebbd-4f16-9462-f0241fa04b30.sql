ALTER TABLE public.gsm_sending_domains
  ADD COLUMN IF NOT EXISTS estate_classification text NOT NULL DEFAULT 'gsm';

CREATE INDEX IF NOT EXISTS ix_gsm_sending_domains_estate
  ON public.gsm_sending_domains (estate_classification);

CREATE INDEX IF NOT EXISTS ix_gsm_mailboxes_estate
  ON public.gsm_mailboxes (estate_classification);