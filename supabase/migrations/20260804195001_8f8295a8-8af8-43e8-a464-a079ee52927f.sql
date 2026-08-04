-- 1. Connection: organisation + safety mode
ALTER TABLE public.social_provider_connections
  ADD COLUMN IF NOT EXISTS provider_organization_id text,
  ADD COLUMN IF NOT EXISTS provider_organization_name text,
  ADD COLUMN IF NOT EXISTS connection_mode text NOT NULL DEFAULT 'test',
  ADD COLUMN IF NOT EXISTS last_channel_sync_at timestamptz;

-- 2. Provider channels
CREATE TABLE IF NOT EXISTS public.social_provider_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'buffer',
  provider_connection_id uuid REFERENCES public.social_provider_connections(id) ON DELETE SET NULL,
  provider_organization_id text NOT NULL,
  external_channel_id text NOT NULL,
  name text,
  display_name text,
  service text,
  avatar_url text,
  external_link text,
  is_queue_paused boolean NOT NULL DEFAULT false,
  is_disconnected boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  raw_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_provider_channels_unique UNIQUE (provider, provider_organization_id, external_channel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_provider_channels TO authenticated;
GRANT ALL ON public.social_provider_channels TO service_role;
ALTER TABLE public.social_provider_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_social_provider_channels" ON public.social_provider_channels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 3. Business -> channel mapping
CREATE TABLE IF NOT EXISTS public.social_business_channel_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  channel_id uuid NOT NULL REFERENCES public.social_provider_channels(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'buffer',
  platform text,
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  mapped_by text,
  notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_business_channel_map_unique UNIQUE (business_id, channel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_business_channel_map TO authenticated;
GRANT ALL ON public.social_business_channel_map TO service_role;
ALTER TABLE public.social_business_channel_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_social_business_channel_map" ON public.social_business_channel_map
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 4. Distribution policy per business/provider
CREATE TABLE IF NOT EXISTS public.social_distribution_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'buffer',
  policy_mode text NOT NULL DEFAULT 'test',
  max_batch_size integer NOT NULL DEFAULT 25,
  allow_share_now boolean NOT NULL DEFAULT false,
  notes text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_distribution_policies_unique UNIQUE (business_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_distribution_policies TO authenticated;
GRANT ALL ON public.social_distribution_policies TO service_role;
ALTER TABLE public.social_distribution_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_social_distribution_policies" ON public.social_distribution_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 5. Emergency pause (global / business / provider)
CREATE TABLE IF NOT EXISTS public.social_distribution_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  scope_key text NOT NULL DEFAULT 'global',
  paused boolean NOT NULL DEFAULT true,
  reason text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_distribution_pauses_unique UNIQUE (scope, scope_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_distribution_pauses TO authenticated;
GRANT ALL ON public.social_distribution_pauses TO service_role;
ALTER TABLE public.social_distribution_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_social_distribution_pauses" ON public.social_distribution_pauses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 6. Publish job distribution tracking
ALTER TABLE public.social_publish_jobs
  ADD COLUMN IF NOT EXISTS distribution_status text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS distribution_idempotency_key text,
  ADD COLUMN IF NOT EXISTS mapped_channel_id uuid REFERENCES public.social_provider_channels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_post_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS dead_letter_reason text,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS social_publish_jobs_distribution_idem_uidx
  ON public.social_publish_jobs (distribution_idempotency_key)
  WHERE distribution_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS social_publish_jobs_distribution_status_idx
  ON public.social_publish_jobs (business_id, distribution_status);

-- 7. updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_social_provider_channels_updated ON public.social_provider_channels;
CREATE TRIGGER trg_social_provider_channels_updated BEFORE UPDATE ON public.social_provider_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_social_business_channel_map_updated ON public.social_business_channel_map;
CREATE TRIGGER trg_social_business_channel_map_updated BEFORE UPDATE ON public.social_business_channel_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_social_distribution_policies_updated ON public.social_distribution_policies;
CREATE TRIGGER trg_social_distribution_policies_updated BEFORE UPDATE ON public.social_distribution_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_social_distribution_pauses_updated ON public.social_distribution_pauses;
CREATE TRIGGER trg_social_distribution_pauses_updated BEFORE UPDATE ON public.social_distribution_pauses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
