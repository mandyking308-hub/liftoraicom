
CREATE TABLE IF NOT EXISTS public.customer_retention_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  score_date date DEFAULT current_date,
  onboarding_score numeric,
  satisfaction_score numeric,
  engagement_score numeric,
  support_score numeric,
  payment_score numeric,
  complaint_risk_score numeric,
  upsell_fit_score numeric,
  renewal_risk_score numeric,
  overall_health_score numeric,
  health_status text,
  recommended_action text,
  evidence jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.customer_retention_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage retention scores" ON public.customer_retention_scores
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE INDEX IF NOT EXISTS idx_crs_contact ON public.customer_retention_scores(contact_id);
CREATE INDEX IF NOT EXISTS idx_crs_business ON public.customer_retention_scores(business_id);
CREATE INDEX IF NOT EXISTS idx_crs_date ON public.customer_retention_scores(score_date DESC);

CREATE TABLE IF NOT EXISTS public.retention_risk_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  priority_level text DEFAULT 'normal',
  title text NOT NULL,
  summary text,
  recommended_action text,
  owner_agent_key text DEFAULT 'customer_success_agent',
  founder_review_required boolean DEFAULT true,
  status text DEFAULT 'pending',
  evidence jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.retention_risk_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage retention recs" ON public.retention_risk_recommendations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE INDEX IF NOT EXISTS idx_rrr_contact ON public.retention_risk_recommendations(contact_id);
CREATE INDEX IF NOT EXISTS idx_rrr_status ON public.retention_risk_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_rrr_type ON public.retention_risk_recommendations(recommendation_type);

CREATE TRIGGER trg_rrr_updated BEFORE UPDATE ON public.retention_risk_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.command_centre_customer_journey_steps
  (step_key, step_label, step_order, journey_stage_group, description, primary_route, command_centre_anchor, owner_agent_key, external_action_risk, founder_approval_required, enabled)
VALUES
  ('onboarding_started','Onboarding started',32,'retention','New customer onboarding plan drafted','/founder/command-centre','sec-customer-onboarding','customer_success_agent',false,true,true),
  ('onboarding_bedding_in','Onboarding bedding in',33,'retention','Customer working through bedding-in tasks','/founder/command-centre','sec-customer-onboarding','customer_success_agent',false,true,true),
  ('customer_success_checkin','Customer success check-in',34,'retention','Scheduled human check-in with customer','/founder/command-centre','sec-customer-success-upsell','customer_success_agent',false,true,true),
  ('survey_feedback','Survey & feedback received',35,'retention','CSAT/NPS or qualitative feedback captured','/founder/command-centre','sec-customer-feedback','customer_success_agent',false,true,true),
  ('complaint_or_dispute','Complaint or dispute logged',36,'retention','Complaint, dispute or service-failure recorded','/founder/command-centre','sec-complaints-disputes','customer_recovery_agent',false,true,true),
  ('recovery_plan','Recovery plan drafted',37,'retention','Internal recovery plan ready for founder approval','/founder/command-centre','sec-complaints-disputes','customer_recovery_agent',false,true,true),
  ('quarterly_report','Quarterly report due',38,'retention','Customer quarterly report draft ready','/founder/command-centre','sec-human-account-manager','customer_success_agent',false,true,true),
  ('renewal_or_upsell','Renewal or upsell opportunity',39,'retention','Renewal window or upsell signal identified','/founder/command-centre','sec-customer-success-upsell','customer_success_agent',false,true,true),
  ('retention_review','Retention review',40,'retention','Customer retention health reviewed for next action','/founder/command-centre','sec-retention-recurring','customer_success_agent',false,true,true)
ON CONFLICT (step_key) DO NOTHING;
