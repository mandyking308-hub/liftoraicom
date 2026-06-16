
CREATE TABLE public.founder_led_sale_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  business_name TEXT NOT NULL,
  launch_date DATE,
  operating_start_date DATE,
  review_due_date DATE,
  sale_review_status TEXT NOT NULL DEFAULT 'not_due'
    CHECK (sale_review_status IN ('not_due','due','in_review','hold','prepare_for_sale','actively_marketing','sold','parked')),
  founder_decision TEXT,
  target_sale_value_cents BIGINT,
  target_sale_value_currency TEXT DEFAULT 'GBP',
  target_buyer_category TEXT,
  readiness_blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_action TEXT,
  notes TEXT,
  founder_acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_led_sale_reviews TO authenticated;
GRANT ALL ON public.founder_led_sale_reviews TO service_role;
ALTER TABLE public.founder_led_sale_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_led_sale_reviews_founder_only"
  ON public.founder_led_sale_reviews FOR ALL
  TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());

CREATE TRIGGER trg_founder_led_sale_reviews_updated_at
  BEFORE UPDATE ON public.founder_led_sale_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.founder_led_buyer_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  business_name TEXT,
  buyer_name TEXT NOT NULL,
  sector TEXT,
  why_they_might_buy TEXT,
  prior_acquisitions TEXT,
  strategic_fit TEXT,
  likely_valuation_logic TEXT,
  relationship_status TEXT DEFAULT 'cold'
    CHECK (relationship_status IN ('cold','warm_intro_available','known_to_founder','prior_conversation','active_relationship')),
  outreach_status TEXT NOT NULL DEFAULT 'not_contacted'
    CHECK (outreach_status IN ('not_contacted','warm_path_identified','founder_approved_to_contact','contacted','replied','meeting','diligence','offer','closed','parked')),
  founder_approved_to_contact BOOLEAN NOT NULL DEFAULT false,
  founder_approved_at TIMESTAMPTZ,
  founder_approved_by UUID,
  notes TEXT,
  evidence_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_led_buyer_targets TO authenticated;
GRANT ALL ON public.founder_led_buyer_targets TO service_role;
ALTER TABLE public.founder_led_buyer_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_led_buyer_targets_founder_only"
  ON public.founder_led_buyer_targets FOR ALL
  TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());

CREATE TRIGGER trg_founder_led_buyer_targets_updated_at
  BEFORE UPDATE ON public.founder_led_buyer_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_founder_approval_for_buyer_outreach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.outreach_status IN ('founder_approved_to_contact','contacted','replied','meeting','diligence','offer','closed')
     AND NEW.founder_approved_to_contact = false THEN
    RAISE EXCEPTION 'Founder approval required before advancing buyer outreach status to %', NEW.outreach_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_founder_approval_for_buyer_outreach
  BEFORE INSERT OR UPDATE ON public.founder_led_buyer_targets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_founder_approval_for_buyer_outreach();

CREATE TABLE public.founder_led_sale_readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  business_name TEXT NOT NULL,
  revenue_quality_score INTEGER CHECK (revenue_quality_score BETWEEN 0 AND 10),
  margin_score INTEGER CHECK (margin_score BETWEEN 0 AND 10),
  customer_concentration_score INTEGER CHECK (customer_concentration_score BETWEEN 0 AND 10),
  sop_training_evidence_score INTEGER CHECK (sop_training_evidence_score BETWEEN 0 AND 10),
  contracts_ip_evidence_score INTEGER CHECK (contracts_ip_evidence_score BETWEEN 0 AND 10),
  finance_records_score INTEGER CHECK (finance_records_score BETWEEN 0 AND 10),
  compliance_risk_score INTEGER CHECK (compliance_risk_score BETWEEN 0 AND 10),
  data_room_readiness_score INTEGER CHECK (data_room_readiness_score BETWEEN 0 AND 10),
  buyer_fit_score INTEGER CHECK (buyer_fit_score BETWEEN 0 AND 10),
  valuation_confidence_score INTEGER CHECK (valuation_confidence_score BETWEEN 0 AND 10),
  overall_recommendation TEXT
    CHECK (overall_recommendation IN ('sell_now','hold_and_improve','scale_for_higher_value','park','not_saleable_yet')),
  founder_notes TEXT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_led_sale_readiness_scores TO authenticated;
GRANT ALL ON public.founder_led_sale_readiness_scores TO service_role;
ALTER TABLE public.founder_led_sale_readiness_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_led_sale_readiness_scores_founder_only"
  ON public.founder_led_sale_readiness_scores FOR ALL
  TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());

CREATE TRIGGER trg_founder_led_sale_readiness_scores_updated_at
  BEFORE UPDATE ON public.founder_led_sale_readiness_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
