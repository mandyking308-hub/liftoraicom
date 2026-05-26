
CREATE TABLE public.attribution_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('organic','outbound','social','referral','paid','partner','marketplace','direct','email','call','event','unknown')),
  channel_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.attribution_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  contact_id UUID,
  deal_id UUID,
  revenue_record_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit','lead','call','email_reply','proposal','sale','upgrade','renewal','referral')),
  source_id UUID,
  campaign_id UUID,
  touchpoint_order INTEGER,
  value_amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  audit_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.attribution_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('first_touch','last_touch','linear','manual','ai_assisted')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attribution_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attribution sources" ON public.attribution_sources
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage attribution events" ON public.attribution_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage attribution models" ON public.attribution_models
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_attr_sources_updated BEFORE UPDATE ON public.attribution_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_attr_models_updated BEFORE UPDATE ON public.attribution_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_attr_sources_business ON public.attribution_sources(business_id);
CREATE INDEX idx_attr_events_business ON public.attribution_events(business_id);
CREATE INDEX idx_attr_events_source ON public.attribution_events(source_id);
CREATE INDEX idx_attr_events_campaign ON public.attribution_events(campaign_id);
CREATE INDEX idx_attr_models_business ON public.attribution_models(business_id);
