
CREATE TABLE public.integration_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL UNIQUE,
  provider_type text NOT NULL
    CHECK (provider_type IN ('payment','email','voice','calendar','social','crm','marketplace','analytics','hosting','ai','fulfilment','legal','ecommerce','other')),
  description text,
  supported_archetypes text[] NOT NULL DEFAULT '{}',
  external_action_risk_level text NOT NULL DEFAULT 'medium'
    CHECK (external_action_risk_level IN ('low','medium','high','critical')),
  paid_api_risk boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_integration_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  integration_id uuid NOT NULL REFERENCES public.integration_catalog(id) ON DELETE CASCADE,
  requirement_status text NOT NULL DEFAULT 'needed'
    CHECK (requirement_status IN ('needed','optional','not_needed','connected','missing','blocked','approval_required')),
  reason text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  required_before_external_live boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, integration_id)
);
CREATE INDEX idx_biz_int_req_business ON public.business_integration_requirements(business_id);

CREATE TABLE public.integration_connection_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  integration_id uuid NOT NULL REFERENCES public.integration_catalog(id) ON DELETE CASCADE,
  provider_status text NOT NULL DEFAULT 'not_connected'
    CHECK (provider_status IN ('not_connected','configured','live','paused','error')),
  secret_configured boolean NOT NULL DEFAULT false,
  webhook_configured boolean NOT NULL DEFAULT false,
  last_test_status text,
  last_test_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, integration_id)
);
CREATE INDEX idx_int_conn_business ON public.integration_connection_status(business_id);

CREATE TRIGGER trg_integration_catalog_updated_at BEFORE UPDATE ON public.integration_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_biz_int_req_updated_at BEFORE UPDATE ON public.business_integration_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_int_conn_updated_at BEFORE UPDATE ON public.integration_connection_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.integration_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_integration_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_connection_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage integration catalog" ON public.integration_catalog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage integration requirements" ON public.business_integration_requirements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage integration connection status" ON public.integration_connection_status
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.integration_catalog (provider_name, provider_type, description, supported_archetypes, external_action_risk_level, paid_api_risk) VALUES
  ('Stripe',              'payment',     'Card payments, subscriptions, invoicing',                 ARRAY['saas','ecommerce','marketplace','agency','content'], 'high',     true),
  ('Stripe Connect',      'payment',     'Marketplace payouts to sellers',                          ARRAY['marketplace'],                                       'critical', true),
  ('PayPal',              'payment',     'PayPal checkout & payouts',                               ARRAY['ecommerce','marketplace','content'],                 'high',     true),
  ('Retell',              'voice',       'Voice AI agent platform',                                 ARRAY['saas','agency','marketplace'],                       'high',     true),
  ('Vapi',                'voice',       'Voice AI agent platform',                                 ARRAY['saas','agency','marketplace'],                       'high',     true),
  ('Twilio',              'voice',       'SMS, voice, WhatsApp messaging',                          ARRAY['saas','ecommerce','marketplace','agency'],           'high',     true),
  ('ElevenLabs',          'voice',       'AI voice synthesis',                                      ARRAY['content','saas','agency'],                           'medium',   true),
  ('Smartlead',           'email',       'Cold email outreach platform',                            ARRAY['saas','agency'],                                     'high',     true),
  ('Apollo',              'crm',         'Prospecting & enrichment',                                ARRAY['saas','agency'],                                     'medium',   true),
  ('Metricool',           'social',      'Social media scheduling & analytics',                     ARRAY['content','ecommerce','agency'],                      'medium',   true),
  ('ManyChat',            'social',      'Chat automation (Instagram, FB, WhatsApp)',               ARRAY['ecommerce','content','marketplace'],                 'medium',   true),
  ('Shopify',             'ecommerce',   'eCommerce storefront & orders',                           ARRAY['ecommerce'],                                         'high',     true),
  ('Google Calendar',     'calendar',    'Calendar scheduling',                                     ARRAY['saas','agency','marketplace','ecommerce','content'], 'low',      false),
  ('Calendly',            'calendar',    'Meeting scheduling',                                      ARRAY['saas','agency'],                                     'low',      true),
  ('DocuSign',            'legal',       'E-signature for contracts',                               ARRAY['agency','saas','marketplace'],                       'high',     true),
  ('Dropbox Sign',        'legal',       'E-signature for contracts',                               ARRAY['agency','saas','marketplace'],                       'high',     true),
  ('Supabase',            'hosting',     'Database, auth, storage, edge functions',                 ARRAY['saas','marketplace','ecommerce','agency','content'], 'low',      false),
  ('GitHub',              'hosting',     'Source control & deployments',                            ARRAY['saas','marketplace','ecommerce','agency','content'], 'low',      false),
  ('Lovable AI Gateway',  'ai',          'Managed AI gateway for all agents',                       ARRAY['saas','marketplace','ecommerce','agency','content'], 'low',      true),
  ('DistroKid',           'fulfilment',  'Music distribution',                                      ARRAY['content'],                                           'medium',   true),
  ('YouTube',             'social',      'Video hosting & analytics',                               ARRAY['content','ecommerce','agency'],                      'medium',   false),
  ('Analytics Provider',  'analytics',   'Web analytics placeholder (GA4 / Plausible / PostHog)',   ARRAY['saas','marketplace','ecommerce','agency','content'], 'low',      false)
ON CONFLICT (provider_name) DO NOTHING;
