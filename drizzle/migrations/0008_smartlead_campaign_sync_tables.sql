CREATE TABLE public.smartlead_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider_campaign_id text NOT NULL,
  trigger text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'running',
  error_code text, error_detail text,
  http_status int, latency_ms int, attempts int NOT NULL DEFAULT 1,
  leads_seen int, messages_seen int, new_messages int,
  started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  triggered_by uuid
);
CREATE TABLE public.smartlead_campaign_snapshots (
  business_id uuid NOT NULL,
  provider_campaign_id text NOT NULL,
  campaign_name text, campaign_status text, track_settings text[],
  max_leads_per_day int,
  total_leads int, not_started int, in_progress int, completed int, blocked int, stopped int, interested int,
  sent_count int, unique_sent_count int, open_count int, unique_open_count int, click_count int, unique_click_count int,
  reply_count int, bounce_count int, unsubscribed_count int,
  senders jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_success_at timestamptz, last_attempt_at timestamptz, last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, provider_campaign_id)
);
CREATE TABLE public.smartlead_lead_snapshots (
  business_id uuid NOT NULL,
  provider_campaign_id text NOT NULL,
  provider_lead_id text NOT NULL,
  campaign_lead_map_id text,
  liftor_contact_id uuid,
  first_name text, last_name text, email text, company_name text,
  lead_status text, lead_category_id text, is_unsubscribed boolean NOT NULL DEFAULT false,
  sent_count int NOT NULL DEFAULT 0, open_count int, click_count int, reply_count int NOT NULL DEFAULT 0,
  first_sent_at timestamptz, last_sent_at timestamptz, last_reply_at timestamptz, last_reply_preview text,
  last_event_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, provider_campaign_id, provider_lead_id)
);
CREATE TABLE public.smartlead_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider_campaign_id text NOT NULL,
  provider_lead_id text NOT NULL,
  dedupe_key text NOT NULL,
  provider_message_id text, provider_stats_id text,
  direction text NOT NULL, -- SENT | REPLY
  from_email text, to_email text, subject text, body_html text,
  sequence_number int, sent_at timestamptz,
  open_count int, click_count int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider_campaign_id, dedupe_key)
);
CREATE TABLE public.smartlead_reply_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider_campaign_id text NOT NULL,
  provider_lead_id text NOT NULL,
  reply_to_message_id text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid, sent_by uuid, sent_at timestamptz, provider_response text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.smartlead_sync_runs, public.smartlead_campaign_snapshots, public.smartlead_lead_snapshots, public.smartlead_thread_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smartlead_reply_drafts TO authenticated;
GRANT ALL ON public.smartlead_sync_runs, public.smartlead_campaign_snapshots, public.smartlead_lead_snapshots, public.smartlead_thread_messages, public.smartlead_reply_drafts TO service_role;
ALTER TABLE public.smartlead_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartlead_campaign_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartlead_lead_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartlead_thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartlead_reply_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder admin read" ON public.smartlead_sync_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder admin read" ON public.smartlead_campaign_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder admin read" ON public.smartlead_lead_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder admin read" ON public.smartlead_thread_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder admin drafts" ON public.smartlead_reply_drafts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin')) WITH CHECK ((public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin')) AND status = 'draft');
CREATE INDEX ON public.smartlead_sync_runs (business_id, provider_campaign_id, started_at DESC);