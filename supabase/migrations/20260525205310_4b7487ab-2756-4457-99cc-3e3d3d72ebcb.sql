
CREATE TABLE public.business_operating_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  archetype_code TEXT NOT NULL,
  description TEXT,
  required_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_kpis JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_integrations JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_workflows JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_approval_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_op_templates_archetype ON public.business_operating_templates(archetype_code);

CREATE TABLE public.business_template_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  template_id UUID REFERENCES public.business_operating_templates(id) ON DELETE SET NULL,
  application_status TEXT NOT NULL DEFAULT 'draft' CHECK (application_status IN ('draft','applied','partially_applied','needs_review','retired')),
  modules_enabled JSONB NOT NULL DEFAULT '[]'::jsonb,
  agents_enabled JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  setup_tasks_created INTEGER NOT NULL DEFAULT 0,
  founder_confirmed BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_template_apps_business ON public.business_template_applications(business_id);

CREATE TABLE public.business_setup_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  template_application_id UUID REFERENCES public.business_template_applications(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_category TEXT,
  task_status TEXT NOT NULL DEFAULT 'pending' CHECK (task_status IN ('pending','in_progress','blocked','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal',
  due_at TIMESTAMPTZ,
  assigned_agent TEXT,
  founder_action_required BOOLEAN NOT NULL DEFAULT false,
  module_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_setup_tasks_business ON public.business_setup_tasks(business_id);
CREATE INDEX idx_setup_tasks_app ON public.business_setup_tasks(template_application_id);

ALTER TABLE public.business_operating_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_template_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_setup_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_admin_all_op_templates" ON public.business_operating_templates
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder_admin_all_template_apps" ON public.business_template_applications
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder_admin_all_setup_tasks" ON public.business_setup_tasks
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_op_templates_updated BEFORE UPDATE ON public.business_operating_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_template_apps_updated BEFORE UPDATE ON public.business_template_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_setup_tasks_updated BEFORE UPDATE ON public.business_setup_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.business_operating_templates
(template_name, archetype_code, description, required_modules, recommended_modules, required_agents, recommended_agents, required_kpis, recommended_integrations, required_documents, default_workflows, default_approval_rules, default_risk_flags) VALUES
('SaaS Operating Template','saas','Operating model for recurring software products.',
 '["onboarding","subscription_billing","churn_tracking","support_sla","product_roadmap","usage_metrics"]',
 '["referrals","upsell","status_page"]',
 '["customer_sales_agent","revenue_autopilot_agent","support_sla_agent","product_qa_agent"]',
 '["churn_alert_agent","upsell_agent"]',
 '["mrr","arr","churn","activation_rate","nps"]',
 '["stripe","email","analytics","auth"]',
 '["dpa","tos","privacy_policy","subprocessor_list"]',
 '["trial_to_paid","renewal","cancellation_save"]',
 '["price_change_requires_founder","mass_email_requires_founder"]',
 '["billing_failure","high_churn","security_incident"]'),
('Marketplace Operating Template','marketplace','Two-sided platform operating model.',
 '["seller_recruitment","listings","supply_demand_liquidity","seller_onboarding","payouts","disputes"]',
 '["reviews","seller_quality","fraud"]',
 '["marketplace_recruitment_agent","seller_operations_agent","supply_demand_agent","seller_payout_agent"]',
 '["marketplace_growth_agent","supply_quality_agent"]',
 '["gmv","take_rate","liquidity","seller_active","listing_fill"]',
 '["stripe_connect","kyc","email","analytics"]',
 '["seller_terms","buyer_terms","payout_terms","dispute_policy"]',
 '["seller_onboarding","listing_review","payout_release","dispute_resolution"]',
 '["payout_release_requires_founder","listing_publish_requires_founder","seller_invite_requires_founder"]',
 '["liquidity_collapse","seller_fraud","payout_anomaly"]'),
('eCommerce Operating Template','ecommerce','Direct-to-consumer or B2B goods.',
 '["product_catalogue","stock_inventory_placeholder","fulfilment","returns_refunds","reviews","abandoned_cart"]',
 '["loyalty","subscriptions"]',
 '["customer_sales_agent","fulfilment_agent","support_sla_agent"]',
 '["revenue_integrity_agent","review_agent"]',
 '["revenue","aov","cr","repeat_rate","gross_margin"]',
 '["shopify","stripe","shipping","email"]',
 '["returns_policy","privacy_policy","tos"]',
 '["order_to_fulfilment","return_to_refund","abandoned_cart_recovery"]',
 '["refund_requires_founder","mass_email_requires_founder"]',
 '["stockout","fraud_chargeback","fulfilment_delay"]'),
('Service / Agency Operating Template','agency_service','Done-for-you services.',
 '["lead_qualification","proposal","quote_to_cash","delivery_capacity","retainer_renewal","human_handoff"]',
 '["case_studies","upsell"]',
 '["customer_sales_agent","delivery_engine_agent","capacity_agent","contracts_agent"]',
 '["renewal_agent"]',
 '["bookings","utilisation","gross_margin","retainer_arr","csat"]',
 '["crm","contracts","time_tracking","invoicing"]',
 '["msa","sow","dpa"]',
 '["lead_to_proposal","proposal_to_contract","delivery_kickoff","retainer_renewal"]',
 '["proposal_send_requires_founder","contract_send_requires_founder"]',
 '["capacity_overload","client_concentration","delivery_slip"]'),
('Media / Content Operating Template','media_music_content','Owned content / music / publishing.',
 '["content_calendar","rights_ip","distribution","licensing","social_growth","audience_analytics"]',
 '["sponsorships","newsletter"]',
 '["content_ops_agent","ip_licensing_agent","royalty_audit_agent"]',
 '["distribution_agent"]',
 '["audience","watch_time","royalty_income","rpm","catalog_revenue"]',
 '["youtube","spotify","dsp","email"]',
 '["rights_chain","license_terms","copyright_register"]',
 '["content_publish","license_grant","royalty_collection"]',
 '["publish_requires_founder","license_grant_requires_founder"]',
 '["copyright_strike","royalty_anomaly","rights_dispute"]'),
('Course / Education Template','course_education','Cohort or self-paced learning.',
 '["curriculum","enrolments","learner_progress","support","certificates","community"]',
 '["alumni","upsell_to_cohort"]',
 '["customer_sales_agent","support_sla_agent","content_ops_agent"]',
 '["community_agent"]',
 '["enrolments","completion","nps","refund_rate","ltv"]',
 '["lms","stripe","email","video_host"]',
 '["refund_policy","tos","certificate_template"]',
 '["enrolment","cohort_run","certificate_issue"]',
 '["refund_requires_founder","mass_email_requires_founder"]',
 '["completion_drop","refund_spike"]'),
('Lead-Gen Operating Template','lead_generation','Capture and sell qualified leads.',
 '["lead_sourcing","compliance","buyer_handoff","lead_quality","revenue_per_lead"]',
 '["enrichment","scoring"]',
 '["customer_sales_agent","outreach_agent","data_quality_agent"]',
 '["compliance_agent"]',
 '["lead_volume","cpl","conversion","payout_per_lead","margin"]',
 '["crm","analytics","email","stripe"]',
 '["consent_log","privacy_policy","buyer_agreement"]',
 '["lead_capture","qualification","handoff_to_buyer"]',
 '["outreach_requires_founder","buyer_contract_requires_founder"]',
 '["consent_violation","do_not_contact_breach","quality_drop"]'),
('Membership / Community Template','membership_community','Recurring access to community / perks.',
 '["member_onboarding","engagement","moderation","renewal","churn"]',
 '["events","ambassadors"]',
 '["customer_sales_agent","support_sla_agent","content_ops_agent"]',
 '["moderation_agent","renewal_agent"]',
 '["members","mrr","retention","engagement","churn"]',
 '["community_platform","stripe","email"]',
 '["community_guidelines","tos","privacy_policy"]',
 '["member_onboarding","engagement_loop","renewal","cancellation_save"]',
 '["mass_email_requires_founder","ban_requires_founder"]',
 '["toxicity_spike","churn_spike","engagement_collapse"]');
