
CREATE TABLE public.channel_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('outbound','seo','social','paid_ads','partnerships','referral','affiliate','marketplace','events','influencer','content','email','community','pr','other')),
  suitable_archetypes TEXT[] NOT NULL DEFAULT '{}',
  setup_requirements TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.business_channel_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  channel_status TEXT NOT NULL DEFAULT 'recommended' CHECK (channel_status IN ('recommended','testing','active_internal','active_external','paused','retired')),
  reason TEXT,
  target_audience TEXT,
  expected_cost NUMERIC,
  expected_return NUMERIC,
  approval_required_for_external BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.channel_campaign_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_status TEXT NOT NULL DEFAULT 'draft' CHECK (campaign_status IN ('draft','approval_required','approved','active','paused','completed','cancelled')),
  campaign_goal TEXT,
  budget_estimate NUMERIC,
  expected_outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.channel_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_channel_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_campaign_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage channel catalog" ON public.channel_catalog
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage channel strategies" ON public.business_channel_strategies
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage campaign plans" ON public.channel_campaign_plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_channel_catalog_updated BEFORE UPDATE ON public.channel_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_channel_strategies_updated BEFORE UPDATE ON public.business_channel_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_campaign_plans_updated BEFORE UPDATE ON public.channel_campaign_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_channel_strategies_business ON public.business_channel_strategies(business_id);
CREATE INDEX idx_campaign_plans_business ON public.channel_campaign_plans(business_id);

INSERT INTO public.channel_catalog (channel_name, channel_type, suitable_archetypes, setup_requirements, risk_level) VALUES
  ('Cold outbound (email + LinkedIn)', 'outbound', ARRAY['b2b_services','agency','consulting','saas'], 'ICP list, sender domains, sequences', 'medium'),
  ('SEO / content', 'seo', ARRAY['saas','marketplace','content','ecommerce'], 'Site, content engine, keyword map', 'low'),
  ('Organic social', 'social', ARRAY['creator','dtc','community','agency'], 'Brand voice, posting cadence', 'low'),
  ('Paid ads', 'paid_ads', ARRAY['dtc','ecommerce','saas','marketplace'], 'Tracking, creative, budget', 'high'),
  ('Partnerships', 'partnerships', ARRAY['b2b_services','saas','marketplace'], 'Partner list, value exchange', 'medium'),
  ('Referral program', 'referral', ARRAY['saas','dtc','community'], 'Reward structure, tracking', 'low'),
  ('Affiliate', 'affiliate', ARRAY['ecommerce','saas','content'], 'Affiliate platform, payouts', 'medium'),
  ('Marketplace listing', 'marketplace', ARRAY['ecommerce','saas','services'], 'Listing assets, reviews', 'low'),
  ('Events / webinars', 'events', ARRAY['b2b_services','saas','community'], 'Speaker, registration, follow-up', 'medium'),
  ('Influencer', 'influencer', ARRAY['dtc','content','community'], 'Creator list, briefs, contracts', 'high'),
  ('Content / thought leadership', 'content', ARRAY['b2b_services','saas','consulting'], 'Editorial calendar, distribution', 'low'),
  ('Lifecycle email', 'email', ARRAY['saas','ecommerce','content'], 'List, ESP, segmentation', 'low'),
  ('Community', 'community', ARRAY['creator','saas','content'], 'Platform, moderation, rituals', 'low'),
  ('PR', 'pr', ARRAY['b2b_services','saas','dtc'], 'Story, press list, embargo plan', 'medium');
