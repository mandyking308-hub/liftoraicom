-- Social engagement events
CREATE TABLE IF NOT EXISTS public.social_engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  platform_key text NOT NULL,
  event_type text NOT NULL,
  external_event_id text,
  contact_handle text,
  contact_name text,
  contact_email text,
  message_text text,
  keyword_detected text,
  detected_intent text,
  sentiment text,
  creator_signal boolean NOT NULL DEFAULT false,
  customer_signal boolean NOT NULL DEFAULT false,
  fan_signal boolean NOT NULL DEFAULT false,
  spam_signal boolean NOT NULL DEFAULT false,
  requires_response boolean NOT NULL DEFAULT true,
  founder_review_required boolean NOT NULL DEFAULT true,
  crm_contact_id uuid,
  conversation_id uuid,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_engagement_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_engagement_events" ON public.social_engagement_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_engagement_events" ON public.social_engagement_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_see_business ON public.social_engagement_events(business_id);
CREATE INDEX IF NOT EXISTS idx_see_event_type ON public.social_engagement_events(event_type);
CREATE INDEX IF NOT EXISTS idx_see_received ON public.social_engagement_events(received_at DESC);

-- ManyChat flow blueprints
CREATE TABLE IF NOT EXISTS public.manychat_flow_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  flow_key text NOT NULL,
  flow_name text NOT NULL,
  platform_key text NOT NULL DEFAULT 'instagram',
  trigger_keyword text,
  public_reply text,
  dm_opening text,
  button_text text,
  button_url text,
  followup_question text,
  qualification_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_review_required boolean NOT NULL DEFAULT true,
  live_in_manychat boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, flow_key)
);
ALTER TABLE public.manychat_flow_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read manychat_flow_blueprints" ON public.manychat_flow_blueprints
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write manychat_flow_blueprints" ON public.manychat_flow_blueprints
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_mfb_business ON public.manychat_flow_blueprints(business_id);
CREATE TRIGGER trg_mfb_updated_at BEFORE UPDATE ON public.manychat_flow_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Neon Candy CANDY keyword flow
INSERT INTO public.manychat_flow_blueprints
  (business_id, flow_key, flow_name, platform_key, trigger_keyword, public_reply, dm_opening, button_text, button_url, followup_question, qualification_tags, metadata)
VALUES
  ('b47c4b11-9a96-4af9-9aec-2f5218de9182',
   'candy_keyword',
   'Neon Candy — CANDY keyword flow',
   'instagram',
   'CANDY',
   'Nice — sent you the NeonCandy link 🍭',
   'Follow / Subscribe to NeonCandy 🍭 fresh drops here: neoncandy.net/music',
   'Send me the link',
   'https://neoncandy.net/music',
   'Which drop are you feeling most?',
   '["creator_interest","fan","subscriber"]'::jsonb,
   '{"source":"seed","notes":"Internal blueprint — not live in ManyChat until founder enables."}'::jsonb)
ON CONFLICT (business_id, flow_key) DO NOTHING;

-- External gate (disabled) for future ManyChat API
INSERT INTO public.external_action_gates
  (gate_key, gate_label, action_type, provider_type, enabled, requires_founder_confirmation, confirmation_phrase, risk_level, max_batch_size)
VALUES
  ('manychat_dm_send_gate', 'ManyChat DM Send', 'social_dm_send', 'manychat', false, true, 'SEND MANYCHAT DM', 'critical', 1)
ON CONFLICT (gate_key) DO NOTHING;