CREATE TABLE public.funding_exit_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  readiness_type text NOT NULL,
  readiness_status text NOT NULL DEFAULT 'draft',
  traction_summary text,
  revenue_summary text,
  margin_summary text,
  customer_summary text,
  ip_summary text,
  legal_summary text,
  risk_summary text,
  data_room_status text,
  readiness_score numeric,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_review_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funding_exit_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/founder full access funding_exit_readiness"
ON public.funding_exit_readiness FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX idx_funding_exit_readiness_business ON public.funding_exit_readiness(business_id);
CREATE INDEX idx_funding_exit_readiness_type ON public.funding_exit_readiness(readiness_type);

CREATE TRIGGER trg_funding_exit_readiness_updated_at
BEFORE UPDATE ON public.funding_exit_readiness
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.investor_buyer_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  target_name text NOT NULL,
  target_type text NOT NULL,
  website_url text,
  contact_name text,
  contact_email text,
  fit_score numeric,
  strategic_reason text,
  outreach_status text NOT NULL DEFAULT 'not_started',
  founder_approval_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_buyer_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/founder full access investor_buyer_targets"
ON public.investor_buyer_targets FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX idx_investor_buyer_targets_business ON public.investor_buyer_targets(business_id);
CREATE INDEX idx_investor_buyer_targets_type ON public.investor_buyer_targets(target_type);

CREATE TRIGGER trg_investor_buyer_targets_updated_at
BEFORE UPDATE ON public.investor_buyer_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();