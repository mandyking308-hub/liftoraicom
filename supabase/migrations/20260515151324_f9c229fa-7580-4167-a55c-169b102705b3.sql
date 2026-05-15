
CREATE TABLE public.communication_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key text NOT NULL UNIQUE,
  channel_label text NOT NULL,
  channel_type text NOT NULL,
  provider_type text,
  inbound_supported boolean NOT NULL DEFAULT true,
  outbound_supported boolean NOT NULL DEFAULT false,
  live_connected boolean NOT NULL DEFAULT false,
  requires_credentials boolean NOT NULL DEFAULT true,
  credentials_present boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  auto_reply_allowed boolean NOT NULL DEFAULT false,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder/admin read channels" ON public.communication_channels
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Founder/admin manage channels" ON public.communication_channels
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_communication_channels_updated_at
BEFORE UPDATE ON public.communication_channels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.multi_channel_inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  channel_key text NOT NULL,
  provider_type text,
  external_event_id text,
  external_thread_id text,
  contact_email text,
  contact_name text,
  contact_handle text,
  subject text,
  message_text text,
  message_language text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_status text NOT NULL DEFAULT 'received',
  matched_contact_id uuid,
  matched_conversation_id uuid,
  crm_interaction_id uuid,
  founder_review_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_mcie_channel_external
ON public.multi_channel_inbound_events(channel_key, external_event_id)
WHERE external_event_id IS NOT NULL;

CREATE INDEX idx_mcie_recent ON public.multi_channel_inbound_events(received_at DESC);

ALTER TABLE public.multi_channel_inbound_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder/admin read inbound events" ON public.multi_channel_inbound_events
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Founder/admin manage inbound events" ON public.multi_channel_inbound_events
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.communication_channels
(channel_key, channel_label, channel_type, provider_type, inbound_supported, outbound_supported, requires_credentials, notes)
VALUES
('native_email','Native Email','email','smtp_imap', true, true, true,'Native email channel; outbound gated.'),
('smartlead','Smartlead','email','smartlead', true, true, true,'Cold outreach platform; activation gated.'),
('website_form','Website Form','web','internal', true, false, false,'Inbound forms from website.'),
('client_portal','Client Portal','portal','internal', true, true, false,'Internal client portal messages.'),
('supplier_portal','Supplier Portal','portal','internal', true, true, false,'Supplier portal messages.'),
('instagram_dm','Instagram DM','social','meta', true, true, true,'Requires Meta credentials.'),
('facebook_dm','Facebook DM','social','meta', true, true, true,'Requires Meta credentials.'),
('whatsapp','WhatsApp','messaging','meta_whatsapp', true, true, true,'Requires WhatsApp Business API.'),
('linkedin','LinkedIn','social','linkedin', true, true, true,'Requires LinkedIn integration.'),
('youtube_comments','YouTube Comments','social','google', true, false, true,'Inbound comments only.'),
('tiktok_comments','TikTok Comments','social','tiktok', true, false, true,'Inbound comments only.'),
('phone_call_note','Phone Call Note','voice','manual', true, false, false,'Manual or transcribed call notes.'),
('meeting_transcript','Meeting Transcript','voice','manual', true, false, false,'Meeting transcripts (manual or via integration).'),
('manual_founder_note','Manual Founder Note','manual','manual', true, false, false,'Founder-entered context.');
