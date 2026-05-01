
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_response   TEXT,
  ADD COLUMN IF NOT EXISTS smtp_accepted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS saved_to_sent_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS send_error          TEXT,
  ADD COLUMN IF NOT EXISTS delivery_kind       TEXT; -- 'smtp_real' | 'simulated' | null

CREATE INDEX IF NOT EXISTS idx_email_queue_smtp_accepted_at ON public.email_queue (smtp_accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_saved_to_sent_at ON public.email_queue (saved_to_sent_at DESC);
