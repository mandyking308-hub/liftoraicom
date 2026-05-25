
ALTER TABLE public.customer_sales_provider_settings
  ADD COLUMN IF NOT EXISTS batch_calls_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS transcription_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_notice_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_notice_text text,
  ADD COLUMN IF NOT EXISTS last_test_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_result text,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS next_setup_action text,
  ADD COLUMN IF NOT EXISTS default_voice_name text,
  ADD COLUMN IF NOT EXISTS default_agent_name text;

CREATE TABLE IF NOT EXISTS public.customer_sales_voice_runtime_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  provider_type text NOT NULL,
  event_type text NOT NULL,
  event_status text NOT NULL DEFAULT 'logged',
  conversation_id uuid,
  call_log_id uuid,
  external_action_attempted boolean NOT NULL DEFAULT false,
  internal_test boolean NOT NULL DEFAULT false,
  test_label text,
  payload jsonb DEFAULT '{}'::jsonb,
  result jsonb DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_voice_events_provider ON public.customer_sales_voice_runtime_events(provider_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cs_voice_events_conv ON public.customer_sales_voice_runtime_events(conversation_id);

ALTER TABLE public.customer_sales_voice_runtime_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "voice events founder admin select"
    ON public.customer_sales_voice_runtime_events FOR SELECT
    USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "voice events founder admin insert"
    ON public.customer_sales_voice_runtime_events FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
