
-- 1. social_business_profiles
CREATE TABLE IF NOT EXISTS public.social_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  social_status text NOT NULL DEFAULT 'setup',
  primary_platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  secondary_platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  brand_voice text,
  audience_profile text,
  content_pillars jsonb NOT NULL DEFAULT '[]'::jsonb,
  offer_focus text,
  primary_cta text,
  posting_frequency text,
  approval_required boolean NOT NULL DEFAULT true,
  auto_publish_allowed boolean NOT NULL DEFAULT false,
  metricool_enabled boolean NOT NULL DEFAULT false,
  manychat_enabled boolean NOT NULL DEFAULT false,
  social_inbox_enabled boolean NOT NULL DEFAULT false,
  influencer_outreach_enabled boolean NOT NULL DEFAULT false,
  multilingual_social_enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);
ALTER TABLE public.social_business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_business_profiles" ON public.social_business_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_business_profiles" ON public.social_business_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

-- 2. social_platform_accounts
CREATE TABLE IF NOT EXISTS public.social_platform_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  platform_key text NOT NULL,
  platform_label text NOT NULL,
  handle text,
  profile_url text,
  account_status text NOT NULL DEFAULT 'not_connected',
  connected_via text,
  external_account_id text,
  posting_enabled boolean NOT NULL DEFAULT false,
  inbox_enabled boolean NOT NULL DEFAULT false,
  analytics_enabled boolean NOT NULL DEFAULT false,
  auto_reply_allowed boolean NOT NULL DEFAULT false,
  approval_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, platform_key)
);
ALTER TABLE public.social_platform_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_platform_accounts" ON public.social_platform_accounts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_platform_accounts" ON public.social_platform_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

CREATE INDEX IF NOT EXISTS idx_social_platform_accounts_business ON public.social_platform_accounts(business_id);

-- 3. Seed Neon Candy social profile
INSERT INTO public.social_business_profiles (
  business_id, social_status, primary_platforms, secondary_platforms,
  brand_voice, audience_profile, content_pillars, offer_focus, primary_cta,
  posting_frequency, approval_required, auto_publish_allowed,
  metricool_enabled, manychat_enabled, social_inbox_enabled,
  influencer_outreach_enabled, multilingual_social_enabled, metadata
) VALUES (
  'b47c4b11-9a96-4af9-9aec-2f5218de9182'::uuid,
  'configured',
  '["instagram","tiktok","youtube_shorts","facebook"]'::jsonb,
  '["linkedin","website_blog"]'::jsonb,
  'colourful, confident, playful, music/media focused, not needy, not corporate',
  'Music fans, Gen Z + millennials, playlist curators, DJs, AI-music-curious creators',
  '["music drops","artist/persona story","visual AI music videos","behind the scenes","creator collaboration","playlists/DJ/media outreach","fan/community prompts","seasonal releases"]'::jsonb,
  'NeonCandy music releases and AI-driven visual content',
  'Follow / Subscribe to NeonCandy 🍭 Comment CANDY for fresh drops. neoncandy.net/music',
  'daily',
  true, false, true, true, false, false, false,
  '{"seeded_by":"social-brain-foundation"}'::jsonb
) ON CONFLICT (business_id) DO NOTHING;

-- 4. Seed Neon Candy platform account stubs
INSERT INTO public.social_platform_accounts (business_id, platform_key, platform_label, account_status, posting_enabled, inbox_enabled, analytics_enabled)
SELECT 'b47c4b11-9a96-4af9-9aec-2f5218de9182'::uuid, k, l, 'not_connected', false, false, false
FROM (VALUES
  ('instagram','Instagram'),
  ('tiktok','TikTok'),
  ('youtube_shorts','YouTube Shorts'),
  ('facebook','Facebook'),
  ('linkedin','LinkedIn'),
  ('website_blog','Website Blog')
) AS t(k,l)
ON CONFLICT (business_id, platform_key) DO NOTHING;

-- 5. Seed social agent roles into ai_agent_roles
INSERT INTO public.ai_agent_roles (agent_key, agent_name, agent_category, description, primary_module, can_read_finance, can_read_suppliers, risk_level, guardrails) VALUES
  ('social_media_manager_agent','Social Media Manager Agent','social','Owns per-business social strategy, calendar and approvals. Internal drafts only.','social',false,false,'medium','{"no_send":true,"no_post":true,"no_dm":true}'::jsonb),
  ('content_strategy_agent','Content Strategy Agent','social','Builds content pillars, calendars and pack briefs. Internal drafts only.','social',false,false,'low','{"no_post":true}'::jsonb),
  ('reel_script_agent','Reel Script Agent','social','Drafts reel/short scripts. No posting.','social',false,false,'low','{"no_post":true}'::jsonb),
  ('caption_hook_agent','Caption & Hook Agent','social','Drafts captions, hooks, hashtags. No posting.','social',false,false,'low','{"no_post":true}'::jsonb),
  ('community_engagement_agent','Community Engagement Agent','social','Drafts replies and community interactions. No DM/comment send.','social',false,false,'medium','{"no_send":true,"no_dm":true,"no_comment":true}'::jsonb),
  ('influencer_creator_agent','Influencer & Creator Agent','social','Plans creator outreach and collab packs. No outbound send.','social',false,false,'medium','{"no_send":true}'::jsonb),
  ('social_analytics_agent','Social Analytics Agent','social','Reads social performance data and recommends. No mutation.','social',false,false,'low','{"no_mutation":true}'::jsonb),
  ('trend_watch_agent','Trend Watch Agent','social','Monitors trends and suggests content ideas. Read-only.','social',false,false,'low','{"no_mutation":true}'::jsonb),
  ('repurposing_agent','Repurposing Agent','social','Repurposes existing content into new formats. Internal drafts only.','social',false,false,'low','{"no_post":true}'::jsonb)
ON CONFLICT (agent_key) DO NOTHING;

-- 6. Seed operating status for social agents
INSERT INTO public.ai_agent_operating_status (agent_key, status, health, no_send_status, auto_action_status)
SELECT agent_key, 'preview', 'unknown', true, false FROM public.ai_agent_roles
WHERE agent_category='social'
ON CONFLICT (agent_key) DO NOTHING;

-- 7. updated_at trigger
CREATE TRIGGER trg_social_business_profiles_updated_at BEFORE UPDATE ON public.social_business_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_social_platform_accounts_updated_at BEFORE UPDATE ON public.social_platform_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
