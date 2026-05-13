
CREATE TABLE IF NOT EXISTS public.email_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NULL,
  contact_id uuid NULL,
  campaign_id uuid NULL,
  business_name text NULL,
  event_type text NOT NULL CHECK (event_type IN ('open','click','reply','bounce','unsubscribe')),
  event_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text NULL,
  user_agent_hash text NULL,
  link_url text NULL,
  source text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ete_queue ON public.email_tracking_events(queue_id);
CREATE INDEX IF NOT EXISTS idx_ete_contact ON public.email_tracking_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_ete_campaign ON public.email_tracking_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ete_type_at ON public.email_tracking_events(event_type, event_at DESC);

ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders read tracking events" ON public.email_tracking_events;
CREATE POLICY "founders read tracking events"
ON public.email_tracking_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "service inserts tracking events" ON public.email_tracking_events;
CREATE POLICY "service inserts tracking events"
ON public.email_tracking_events FOR INSERT
TO service_role
WITH CHECK (true);

INSERT INTO public.system_settings (key, value)
VALUES ('tracking_secret', to_jsonb(encode(gen_random_bytes(32), 'hex')))
ON CONFLICT (key) DO NOTHING;
