-- Sales Coaching + Conversion Learning Loop tables

CREATE TABLE public.sales_conversion_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  contact_id uuid,
  conversation_id uuid,
  product_id uuid,
  offer_id uuid,
  event_type text not null check (event_type in ('lead_created','call_booked','call_completed','proposal_sent','follow_up_sent','close_attempted','closed_won','closed_lost','upgraded','churned')),
  event_value numeric default 0,
  currency text default 'USD',
  source_agent text,
  channel text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_sce_business_type ON public.sales_conversion_events(business_id, event_type, created_at desc);

CREATE TABLE public.sales_win_loss_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  contact_id uuid,
  conversation_id uuid,
  product_id uuid,
  offer_id uuid,
  outcome text not null check (outcome in ('won','lost','delayed','no_decision','escalated')),
  reason text,
  objections jsonb default '[]'::jsonb,
  winning_factors jsonb default '[]'::jsonb,
  losing_factors jsonb default '[]'::jsonb,
  price_issue boolean default false,
  trust_issue boolean default false,
  timing_issue boolean default false,
  product_fit_issue boolean default false,
  competitor_issue boolean default false,
  recommended_change text,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_swlr_business ON public.sales_win_loss_reviews(business_id, outcome, created_at desc);

CREATE TABLE public.sales_script_performance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  playbook_id uuid,
  script_section text not null,
  usage_count integer default 0,
  conversion_rate numeric default 0,
  objection_rate numeric default 0,
  approval_rate numeric default 0,
  close_rate numeric default 0,
  average_sentiment numeric default 0,
  recommended_status text default 'keep' check (recommended_status in ('keep','improve','retire','test_new')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_ssp_business ON public.sales_script_performance(business_id, recommended_status);

CREATE TABLE public.sales_coaching_recommendations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  category text not null,
  title text not null,
  detail text,
  target_ref jsonb default '{}'::jsonb,
  priority text default 'medium' check (priority in ('low','medium','high','critical')),
  status text default 'open' check (status in ('open','applied','dismissed','in_review')),
  evidence jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_scr_business ON public.sales_coaching_recommendations(business_id, status, priority);

ALTER TABLE public.sales_conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_win_loss_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_script_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_coaching_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "founders manage sce" ON public.sales_conversion_events FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "founders manage swlr" ON public.sales_win_loss_reviews FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "founders manage ssp" ON public.sales_script_performance FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "founders manage scr" ON public.sales_coaching_recommendations FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_ssp_updated BEFORE UPDATE ON public.sales_script_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scr_updated BEFORE UPDATE ON public.sales_coaching_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();