
-- Reuse existing updated_at trigger function if present, else create
CREATE OR REPLACE FUNCTION public.social_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. social_provider_adapters
CREATE TABLE IF NOT EXISTS public.social_provider_adapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  display_name text NOT NULL,
  adapter_status text DEFAULT 'not_connected',
  can_publish_posts boolean DEFAULT false,
  can_publish_reels boolean DEFAULT false,
  can_publish_stories boolean DEFAULT false,
  can_publish_shorts boolean DEFAULT false,
  can_publish_carousels boolean DEFAULT false,
  can_schedule boolean DEFAULT false,
  can_read_comments boolean DEFAULT false,
  can_reply_to_comments boolean DEFAULT false,
  can_read_dms boolean DEFAULT false,
  can_send_dms boolean DEFAULT false,
  can_receive_webhooks boolean DEFAULT false,
  can_sync_analytics boolean DEFAULT false,
  requires_oauth boolean DEFAULT true,
  requires_app_review boolean DEFAULT false,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_provider_adapters ENABLE ROW LEVEL SECURITY;

-- 2. social_accounts
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  handle text,
  profile_url text,
  account_external_id text,
  connection_status text DEFAULT 'not_connected',
  capabilities_json jsonb DEFAULT '{}'::jsonb,
  token_reference text,
  last_sync_at timestamptz,
  connection_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- 3. social_assets
CREATE TABLE IF NOT EXISTS public.social_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_id uuid,
  title text NOT NULL,
  description text,
  asset_type text NOT NULL,
  file_url text,
  storage_path text,
  thumbnail_url text,
  platform_fit text[] DEFAULT '{}',
  duration_seconds integer,
  format_notes text,
  source_notes text,
  rights_status text DEFAULT 'unknown',
  usage_status text DEFAULT 'raw',
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  approved_for_social boolean DEFAULT false,
  approved_for_ads boolean DEFAULT false,
  approved_for_proposals boolean DEFAULT false,
  rights_expiry_date date,
  ai_notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_assets ENABLE ROW LEVEL SECURITY;

-- 4. social_content_items
CREATE TABLE IF NOT EXISTS public.social_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  campaign_id uuid,
  asset_id uuid REFERENCES public.social_assets(id) ON DELETE SET NULL,
  platform text NOT NULL,
  provider text,
  content_type text NOT NULL,
  title text,
  caption text,
  hashtags text,
  cta text,
  link_url text,
  scheduled_date date,
  scheduled_time time,
  timezone text DEFAULT 'Europe/London',
  content_pillar text,
  funnel_stage text,
  offer_angle text,
  approval_status text DEFAULT 'draft',
  automation_status text DEFAULT 'not_queued',
  generated_by_ai boolean DEFAULT false,
  ai_prompt_source text,
  founder_notes text,
  operator_notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_content_items ENABLE ROW LEVEL SECURITY;

-- 5. social_publish_jobs
CREATE TABLE IF NOT EXISTS public.social_publish_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  content_item_id uuid REFERENCES public.social_content_items(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  job_type text NOT NULL,
  scheduled_for timestamptz,
  status text DEFAULT 'pending_review',
  block_reason text,
  provider_external_id text,
  idempotency_key text UNIQUE,
  retry_count integer DEFAULT 0,
  last_attempt_at timestamptz,
  error_message text,
  response_json jsonb DEFAULT '{}'::jsonb,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_publish_jobs ENABLE ROW LEVEL SECURITY;

-- 6. social_inbox_messages
CREATE TABLE IF NOT EXISTS public.social_inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  external_message_id text,
  external_thread_id text,
  sender_handle text,
  sender_name text,
  sender_profile_url text,
  message_type text DEFAULT 'comment',
  incoming_text text,
  received_at timestamptz,
  status text DEFAULT 'new',
  sentiment text,
  lead_score numeric,
  crm_contact_id uuid,
  escalation_required boolean DEFAULT false,
  escalation_reason text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_inbox_messages ENABLE ROW LEVEL SECURITY;

-- 7. social_reply_jobs
CREATE TABLE IF NOT EXISTS public.social_reply_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  inbox_message_id uuid REFERENCES public.social_inbox_messages(id) ON DELETE SET NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  reply_text text NOT NULL,
  reply_type text NOT NULL,
  approval_status text DEFAULT 'draft',
  send_status text DEFAULT 'not_queued',
  block_reason text,
  provider_external_id text,
  idempotency_key text UNIQUE,
  retry_count integer DEFAULT 0,
  error_message text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_reply_jobs ENABLE ROW LEVEL SECURITY;

-- 8. social_performance_logs
CREATE TABLE IF NOT EXISTS public.social_performance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  content_item_id uuid REFERENCES public.social_content_items(id) ON DELETE SET NULL,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  provider text,
  platform text,
  posted_at timestamptz,
  views integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  clicks integer,
  follows integer,
  replies integer,
  leads_created integer,
  revenue_attributed numeric,
  source text DEFAULT 'manual',
  notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_performance_logs ENABLE ROW LEVEL SECURITY;

-- 9. social_automation_settings
CREATE TABLE IF NOT EXISTS public.social_automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  social_automation_mode text DEFAULT 'approval_required',
  brand_voice text,
  core_cta text,
  default_links_json jsonb DEFAULT '{}'::jsonb,
  forbidden_phrases text[] DEFAULT '{}',
  escalation_rules jsonb DEFAULT '{}'::jsonb,
  platform_rules_json jsonb DEFAULT '{}'::jsonb,
  posting_cadence_json jsonb DEFAULT '{}'::jsonb,
  approval_rules_json jsonb DEFAULT '{}'::jsonb,
  dm_rules_json jsonb DEFAULT '{}'::jsonb,
  cold_dm_allowed boolean DEFAULT false,
  auto_publish_allowed boolean DEFAULT false,
  auto_reply_allowed boolean DEFAULT false,
  rehearsal_mode_enabled boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_automation_settings ENABLE ROW LEVEL SECURITY;

-- Triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_provider_adapters','social_accounts','social_assets',
    'social_content_items','social_publish_jobs','social_inbox_messages',
    'social_reply_jobs','social_performance_logs','social_automation_settings'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.social_set_updated_at();', t, t);
  END LOOP;
END $$;

-- RLS policies — founder/admin full access via has_role
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_provider_adapters','social_accounts','social_assets',
    'social_content_items','social_publish_jobs','social_inbox_messages',
    'social_reply_jobs','social_performance_logs','social_automation_settings'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Founders manage %I" ON public.%I;', t, t);
    EXECUTE format($pol$
      CREATE POLICY "Founders manage %I" ON public.%I
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
    $pol$, t, t);
  END LOOP;
END $$;

-- Seed providers
INSERT INTO public.social_provider_adapters (provider, display_name, adapter_status, requires_oauth, requires_app_review, notes)
VALUES
  ('instagram','Instagram','not_connected',true,true,'Meta Graph API; publishing/DM/comment send locked.'),
  ('facebook','Facebook','not_connected',true,true,'Meta Graph API; publishing/DM/comment send locked.'),
  ('tiktok','TikTok','not_connected',true,true,'TikTok Content Posting API; locked.'),
  ('youtube','YouTube','not_connected',true,true,'YouTube Data API; Shorts upload locked.'),
  ('linkedin','LinkedIn','not_connected',true,true,'LinkedIn Marketing API; locked.'),
  ('x_twitter','X (Twitter)','not_connected',true,false,'X API v2; locked.'),
  ('metricool','Metricool','not_connected',true,false,'Scheduler aggregator; locked.'),
  ('buffer','Buffer','not_connected',true,false,'Scheduler aggregator; locked.'),
  ('hootsuite','Hootsuite','not_connected',true,false,'Scheduler aggregator; locked.'),
  ('manychat','ManyChat','not_connected',true,false,'DM/comment automation; locked.'),
  ('custom_webhook','Custom Webhook','not_connected',false,false,'Generic outbound webhook; locked.'),
  ('future_provider','Reserved / Future Provider','not_connected',true,false,'Placeholder; locked.')
ON CONFLICT (provider) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_business ON public.social_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_social_assets_business ON public.social_assets(business_id);
CREATE INDEX IF NOT EXISTS idx_social_content_business ON public.social_content_items(business_id);
CREATE INDEX IF NOT EXISTS idx_social_publish_business ON public.social_publish_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_social_inbox_business ON public.social_inbox_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_social_reply_business ON public.social_reply_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_social_perf_business ON public.social_performance_logs(business_id);
