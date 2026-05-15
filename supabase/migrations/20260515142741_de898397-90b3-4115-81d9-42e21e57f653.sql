
-- provider_secret_registry: tracks which provider secrets exist (NEVER stores values)
CREATE TABLE IF NOT EXISTS public.provider_secret_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL,
  business_id uuid NULL,
  secret_name text NOT NULL,
  secret_present boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz NULL,
  usage_scope text NULL,
  display_label text NULL,
  never_display_value boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_secret_registry_unique
  ON public.provider_secret_registry (provider_key, secret_name, COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.provider_secret_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders read provider_secret_registry" ON public.provider_secret_registry;
CREATE POLICY "Founders read provider_secret_registry"
  ON public.provider_secret_registry FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Founders manage provider_secret_registry" ON public.provider_secret_registry;
CREATE POLICY "Founders manage provider_secret_registry"
  ON public.provider_secret_registry FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_provider_secret_registry_updated_at
  BEFORE UPDATE ON public.provider_secret_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed (idempotent) — secret VALUES are never stored, only presence flag.
INSERT INTO public.provider_secret_registry (provider_key, secret_name, display_label, usage_scope, secret_present)
VALUES
  ('smartlead', 'SMARTLEAD_API_KEY', 'Smartlead API Key', 'outbound_send', false),
  ('smartlead', 'SMARTLEAD_WEBHOOK_SECRET', 'Smartlead Webhook Secret', 'inbound_webhook', false),
  ('apollo', 'APOLLO_API_KEY', 'Apollo Search/Enrich Key', 'lead_sourcing', false),
  ('inbox', 'INBOX_CREDENTIALS_KEY', 'Inbox Credentials Encryption Key', 'inbox_capture', false),
  ('lovable_ai', 'LOVABLE_API_KEY', 'Lovable AI Gateway', 'agent_inference', false)
ON CONFLICT (provider_key, secret_name, COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
