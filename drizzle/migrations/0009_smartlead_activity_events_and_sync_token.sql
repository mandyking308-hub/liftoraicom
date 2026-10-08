CREATE TABLE public.smartlead_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider_campaign_id text NOT NULL,
  provider_lead_id text,
  liftor_contact_id uuid,
  business_contact_relationship_id uuid,
  event_type text NOT NULL,
  dedupe_key text NOT NULL,
  provider_message_id text,
  occurred_at timestamptz,
  source text NOT NULL DEFAULT 'rest_poll',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  liftor_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider_campaign_id, dedupe_key)
);
GRANT SELECT ON public.smartlead_activity_events TO authenticated;
GRANT ALL ON public.smartlead_activity_events TO service_role;
ALTER TABLE public.smartlead_activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder admin read" ON public.smartlead_activity_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX smartlead_activity_events_biz_idx ON public.smartlead_activity_events (business_id, provider_campaign_id, occurred_at DESC);

-- Scheduler credential: random token, readable only by service_role and the cron owner. No client access.
CREATE TABLE public.smartlead_sync_schedule (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  business_id uuid NOT NULL,
  provider_campaign_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.smartlead_sync_schedule FROM anon, authenticated;
GRANT ALL ON public.smartlead_sync_schedule TO service_role;
ALTER TABLE public.smartlead_sync_schedule ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.smartlead_sync_schedule IS 'Single-row scheduler token for smartlead-campaign-sync REST polling; no client policies by design.';