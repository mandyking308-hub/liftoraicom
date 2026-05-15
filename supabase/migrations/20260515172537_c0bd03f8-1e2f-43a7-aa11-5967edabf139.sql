
CREATE TABLE public.customer_quarterly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  organisation_id uuid,
  deal_id uuid,
  reporting_period_start date NOT NULL,
  reporting_period_end date NOT NULL,
  report_quarter text,
  report_year integer,
  report_status text NOT NULL DEFAULT 'draft',
  internal_summary text,
  customer_facing_summary text,
  usage_summary text,
  engagement_summary text,
  value_summary text,
  support_summary text,
  feedback_summary text,
  satisfaction_summary text,
  open_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_quarter_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  upsell_opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  renewal_risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_review_required boolean NOT NULL DEFAULT true,
  customer_share_allowed boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  shared_at timestamptz,
  report_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_usage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  snapshot_period_start date NOT NULL,
  snapshot_period_end date NOT NULL,
  usage_source text,
  interactions_count integer NOT NULL DEFAULT 0,
  conversations_count integer NOT NULL DEFAULT 0,
  proposals_count integer NOT NULL DEFAULT 0,
  demos_count integer NOT NULL DEFAULT 0,
  support_requests_count integer NOT NULL DEFAULT 0,
  invoices_count integer NOT NULL DEFAULT 0,
  payments_count integer NOT NULL DEFAULT 0,
  assignments_count integer NOT NULL DEFAULT 0,
  portal_visits_count integer NOT NULL DEFAULT 0,
  content_engagement_count integer NOT NULL DEFAULT 0,
  key_activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_score numeric,
  engagement_score numeric,
  satisfaction_score numeric,
  health_score numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_account_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  quarterly_report_id uuid REFERENCES public.customer_quarterly_reports(id) ON DELETE SET NULL,
  review_type text NOT NULL DEFAULT 'quarterly',
  review_status text NOT NULL DEFAULT 'draft',
  account_health text,
  customer_goal text,
  current_needs jsonb NOT NULL DEFAULT '[]'::jsonb,
  recent_feedback jsonb NOT NULL DEFAULT '[]'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_human_touch text,
  recommended_next_action text,
  owner_agent_key text NOT NULL DEFAULT 'customer_success_agent',
  founder_review_required boolean NOT NULL DEFAULT true,
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_quarterly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_account_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage quarterly reports"
  ON public.customer_quarterly_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE POLICY "Founders manage usage snapshots"
  ON public.customer_usage_snapshots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE POLICY "Founders manage account reviews"
  ON public.customer_account_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER update_customer_quarterly_reports_updated_at
  BEFORE UPDATE ON public.customer_quarterly_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_account_reviews_updated_at
  BEFORE UPDATE ON public.customer_account_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cqr_business ON public.customer_quarterly_reports(business_id);
CREATE INDEX idx_cqr_contact ON public.customer_quarterly_reports(contact_id);
CREATE INDEX idx_cqr_status ON public.customer_quarterly_reports(report_status);
CREATE INDEX idx_cus_contact ON public.customer_usage_snapshots(contact_id);
CREATE INDEX idx_car_contact ON public.customer_account_reviews(contact_id);
CREATE INDEX idx_car_report ON public.customer_account_reviews(quarterly_report_id);

-- Public read of approved share-allowed reports by token only (limited to one row scope).
-- The app must select only customer-safe fields; this policy simply allows public lookup by token.
CREATE POLICY "Public can read approved shared reports by token"
  ON public.customer_quarterly_reports FOR SELECT TO anon
  USING (customer_share_allowed = true AND approved_at IS NOT NULL);

-- Register share gate in external_action_gates (idempotent).
INSERT INTO public.external_action_gates (gate_key, gate_label, action_type, provider_type, enabled, requires_founder_confirmation, confirmation_phrase, max_batch_size, risk_level, metadata)
VALUES ('customer_report_share_gate','Customer Quarterly Report Share','customer_report_share','internal', false, true, 'SHARE CUSTOMER QUARTERLY REPORT', 1, 'medium', '{"description":"Gate for sharing approved customer quarterly reports. No automatic send."}'::jsonb)
ON CONFLICT (gate_key) DO NOTHING;

-- Ensure customer_success_agent role exists with report responsibilities.
INSERT INTO public.ai_agent_roles (agent_key, agent_name, agent_category, description, primary_module, default_status, can_read_crm, can_read_conversations, can_read_finance, can_read_suppliers, can_call_external_providers, can_mutate_operational_data, can_send_email, can_create_proposals, can_create_deals, can_create_invoices, founder_approval_required, auto_action_allowed, risk_level, guardrails, metadata)
VALUES ('customer_success_agent','Customer Success Agent','customer_success','Monitors customer health, generates quarterly report drafts, flags unhappy customers, recommends human check-ins, hands off to Proposal/Finance/Support/Founder Co-Pilot.','customer_success','active',true,true,true,false,false,false,false,false,false,false,true,false,'medium',
'{"may":["draft_quarterly_report","draft_account_review","flag_unhappy_customer","recommend_upsell_internal","recommend_human_check_in","handoff_to_proposal_agent","handoff_to_finance_agent","handoff_to_support_agent","handoff_to_founder"], "must_not":["send_external_email","send_external_message","publish_report","share_report_without_approval","create_invoice"]}'::jsonb,
'{"responsibilities":["customer_quarterly_reports","customer_account_reviews","customer_success_plans","customer_upsell_recommendations"]}'::jsonb)
ON CONFLICT (agent_key) DO UPDATE SET
  description = EXCLUDED.description,
  guardrails = EXCLUDED.guardrails,
  metadata = EXCLUDED.metadata,
  updated_at = now();
