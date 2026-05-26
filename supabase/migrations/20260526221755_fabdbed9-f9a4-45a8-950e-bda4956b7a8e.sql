
-- 1. connector_registry
CREATE TABLE public.connector_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_key TEXT NOT NULL UNIQUE,
  connector_name TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('ai','voice','payment','calendar','email','social','crm','marketplace','document','hosting','analytics','ecommerce','legal','other')),
  description TEXT,
  external_action_risk_level TEXT NOT NULL DEFAULT 'low' CHECK (external_action_risk_level IN ('low','medium','high','critical')),
  paid_api_possible BOOLEAN NOT NULL DEFAULT false,
  supports_webhooks BOOLEAN NOT NULL DEFAULT false,
  supports_sandbox BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_registry TO authenticated;
GRANT ALL ON public.connector_registry TO service_role;
ALTER TABLE public.connector_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders view connectors" ON public.connector_registry FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founders manage connectors" ON public.connector_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE TRIGGER trg_connector_registry_updated BEFORE UPDATE ON public.connector_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. business_connector_assignments
CREATE TABLE public.business_connector_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  connector_id UUID NOT NULL REFERENCES public.connector_registry(id) ON DELETE CASCADE,
  connector_status TEXT NOT NULL DEFAULT 'not_connected' CHECK (connector_status IN ('not_needed','needed','not_connected','configured','live','paused','error')),
  secret_configured BOOLEAN NOT NULL DEFAULT false,
  webhook_configured BOOLEAN NOT NULL DEFAULT false,
  external_action_enabled BOOLEAN NOT NULL DEFAULT false,
  last_health_status TEXT,
  last_health_checked_at TIMESTAMPTZ,
  last_error TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bca_business ON public.business_connector_assignments(business_id);
CREATE INDEX idx_bca_connector ON public.business_connector_assignments(connector_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_connector_assignments TO authenticated;
GRANT ALL ON public.business_connector_assignments TO service_role;
ALTER TABLE public.business_connector_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders view bca" ON public.business_connector_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founders manage bca" ON public.business_connector_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE TRIGGER trg_bca_updated BEFORE UPDATE ON public.business_connector_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. connector_health_checks
CREATE TABLE public.connector_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES public.connector_registry(id) ON DELETE CASCADE,
  business_id UUID,
  health_status TEXT NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('unknown','healthy','warning','failed','paused','not_configured')),
  check_type TEXT NOT NULL CHECK (check_type IN ('internal_config','provider_ping','webhook','credential','dry_run','manual')),
  check_summary TEXT,
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_chc_connector ON public.connector_health_checks(connector_id);
CREATE INDEX idx_chc_checked_at ON public.connector_health_checks(checked_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_health_checks TO authenticated;
GRANT ALL ON public.connector_health_checks TO service_role;
ALTER TABLE public.connector_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders view chc" ON public.connector_health_checks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founders manage chc" ON public.connector_health_checks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

-- 4. connector_webhook_endpoints
CREATE TABLE public.connector_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES public.connector_registry(id) ON DELETE CASCADE,
  business_id UUID,
  endpoint_name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  webhook_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (webhook_status IN ('not_configured','configured','live','paused','error')),
  signature_verification_required BOOLEAN NOT NULL DEFAULT true,
  last_event_at TIMESTAMPTZ,
  last_error TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cwe_connector ON public.connector_webhook_endpoints(connector_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_webhook_endpoints TO authenticated;
GRANT ALL ON public.connector_webhook_endpoints TO service_role;
ALTER TABLE public.connector_webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders view cwe" ON public.connector_webhook_endpoints FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "founders manage cwe" ON public.connector_webhook_endpoints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE TRIGGER trg_cwe_updated BEFORE UPDATE ON public.connector_webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed canonical connectors
INSERT INTO public.connector_registry (connector_key, connector_name, provider_type, description, external_action_risk_level, paid_api_possible, supports_webhooks, supports_sandbox) VALUES
  ('lovable_ai_gateway','Lovable AI Gateway','ai','Default AI gateway for all Liftor AI features.','medium',true,false,true),
  ('supabase','Supabase','hosting','Database, auth, edge functions, storage.','high',true,true,true),
  ('github','GitHub','hosting','Source control and CI/CD integration.','medium',false,true,false),
  ('smartlead','Smartlead','email','Cold email sending and inbox warm-up.','critical',true,true,true),
  ('apollo','Apollo','crm','Lead enrichment and outbound contact discovery.','high',true,false,true),
  ('ionos_smtp_imap','IONOS SMTP/IMAP','email','SMTP/IMAP for outbound and inbound mail.','critical',true,false,false),
  ('metricool','Metricool','social','Social media scheduling and analytics.','high',true,true,false),
  ('manychat','ManyChat','social','Chat automation for social DMs.','high',true,true,true),
  ('retell','Retell','voice','AI voice agent platform.','critical',true,true,true),
  ('vapi','Vapi','voice','AI voice agent platform.','critical',true,true,true),
  ('twilio','Twilio','voice','SMS, voice and messaging.','critical',true,true,true),
  ('elevenlabs','ElevenLabs','voice','AI voice generation and TTS.','medium',true,false,true),
  ('stripe','Stripe','payment','Payments and subscriptions.','critical',true,true,true),
  ('stripe_connect','Stripe Connect','payment','Platform payouts to connected accounts.','critical',true,true,true),
  ('paypal','PayPal','payment','Payments and payouts.','critical',true,true,true),
  ('google_calendar','Google Calendar','calendar','Calendar read/write and event automation.','high',false,true,false),
  ('calendly','Calendly','calendar','Scheduling links and bookings.','medium',true,true,false),
  ('docusign','DocuSign','legal','eSignature and contract execution.','critical',true,true,true),
  ('dropbox_sign','Dropbox Sign','legal','eSignature platform.','critical',true,true,true),
  ('shopify','Shopify','ecommerce','Storefront, orders and products.','high',true,true,true),
  ('distrokid','DistroKid','marketplace','Music distribution.','medium',true,false,false),
  ('youtube','YouTube','social','Video hosting and channel management.','high',false,true,false),
  ('analytics_placeholder','Analytics Placeholder','analytics','Placeholder for GA4 / Plausible / etc.','low',false,false,false)
ON CONFLICT (connector_key) DO NOTHING;
