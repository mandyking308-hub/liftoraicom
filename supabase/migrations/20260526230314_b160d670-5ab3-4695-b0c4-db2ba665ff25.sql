
CREATE TABLE public.relationship_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  identity_profile_id uuid,
  contact_id uuid,
  customer_id uuid,
  seller_id uuid,
  partner_id uuid,
  relationship_type text NOT NULL CHECK (relationship_type IN ('customer','seller','partner','vendor','adviser','prospect','other')),
  health_score numeric NOT NULL DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  value_score numeric NOT NULL DEFAULT 50,
  risk_score numeric NOT NULL DEFAULT 50,
  sentiment_score numeric NOT NULL DEFAULT 50,
  engagement_score numeric NOT NULL DEFAULT 50,
  trust_score numeric NOT NULL DEFAULT 50,
  relationship_status text NOT NULL DEFAULT 'unknown' CHECK (relationship_status IN ('excellent','healthy','watch','at_risk','critical','unknown')),
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.relationship_health_scores TO authenticated;
GRANT ALL ON public.relationship_health_scores TO service_role;
ALTER TABLE public.relationship_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rh_scores_select" ON public.relationship_health_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "rh_scores_insert" ON public.relationship_health_scores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "rh_scores_update" ON public.relationship_health_scores FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_rh_scores_type ON public.relationship_health_scores(relationship_type);
CREATE INDEX idx_rh_scores_status ON public.relationship_health_scores(relationship_status);
CREATE INDEX idx_rh_scores_business ON public.relationship_health_scores(business_id);

CREATE TABLE public.relationship_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_score_id uuid NOT NULL REFERENCES public.relationship_health_scores(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('positive_signal','complaint','missed_response','payment_issue','support_issue','upgrade_signal','churn_signal','seller_quality_issue','partner_signal','other')),
  event_summary text,
  score_impact numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.relationship_health_events TO authenticated;
GRANT ALL ON public.relationship_health_events TO service_role;
ALTER TABLE public.relationship_health_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rh_events_select" ON public.relationship_health_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "rh_events_insert" ON public.relationship_health_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_rh_events_score ON public.relationship_health_events(health_score_id);

CREATE TABLE public.relationship_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  identity_profile_id uuid,
  opportunity_type text NOT NULL CHECK (opportunity_type IN ('upgrade','renewal','retention','referral','seller_growth','partner_growth','recovery','human_callback','other')),
  opportunity_summary text,
  estimated_value numeric,
  currency text DEFAULT 'USD',
  probability_score numeric DEFAULT 50,
  approval_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','watch','approval_required','approved','actioned','won','lost','parked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.relationship_opportunities TO authenticated;
GRANT ALL ON public.relationship_opportunities TO service_role;
ALTER TABLE public.relationship_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rh_opps_select" ON public.relationship_opportunities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "rh_opps_insert" ON public.relationship_opportunities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "rh_opps_update" ON public.relationship_opportunities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_rh_opps_status ON public.relationship_opportunities(status);
CREATE INDEX idx_rh_opps_type ON public.relationship_opportunities(opportunity_type);

CREATE TRIGGER trg_rh_scores_updated BEFORE UPDATE ON public.relationship_health_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rh_opps_updated BEFORE UPDATE ON public.relationship_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
