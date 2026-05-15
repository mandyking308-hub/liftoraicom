CREATE TABLE public.brand_reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  source_channel text,
  source_url text,
  event_title text NOT NULL,
  event_summary text,
  sentiment text,
  severity text NOT NULL DEFAULT 'medium',
  customer_related boolean NOT NULL DEFAULT false,
  public_response_needed boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/founder full access brand_reputation_events"
ON public.brand_reputation_events FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE INDEX idx_brand_reputation_events_business ON public.brand_reputation_events(business_id);
CREATE INDEX idx_brand_reputation_events_type ON public.brand_reputation_events(event_type);
CREATE INDEX idx_brand_reputation_events_status ON public.brand_reputation_events(status);
CREATE TRIGGER trg_brand_reputation_events_updated_at
BEFORE UPDATE ON public.brand_reputation_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crisis_response_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  reputation_event_id uuid REFERENCES public.brand_reputation_events(id) ON DELETE SET NULL,
  plan_status text NOT NULL DEFAULT 'draft',
  internal_summary text,
  public_response_draft text,
  holding_statement text,
  key_messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_required boolean NOT NULL DEFAULT true,
  legal_review_recommended boolean NOT NULL DEFAULT true,
  founder_review_required boolean NOT NULL DEFAULT true,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crisis_response_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/founder full access crisis_response_plans"
ON public.crisis_response_plans FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE INDEX idx_crisis_response_plans_event ON public.crisis_response_plans(reputation_event_id);
CREATE INDEX idx_crisis_response_plans_business ON public.crisis_response_plans(business_id);
CREATE TRIGGER trg_crisis_response_plans_updated_at
BEFORE UPDATE ON public.crisis_response_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();