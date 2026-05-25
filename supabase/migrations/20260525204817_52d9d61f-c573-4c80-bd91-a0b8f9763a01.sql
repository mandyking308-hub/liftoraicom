
CREATE TABLE public.business_archetypes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  archetype_name TEXT NOT NULL,
  archetype_code TEXT NOT NULL UNIQUE,
  description TEXT,
  default_operating_model JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_kpis JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_integrations JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_compliance_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_exit_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.business_archetype_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  primary_archetype_id UUID REFERENCES public.business_archetypes(id) ON DELETE SET NULL,
  secondary_archetype_ids UUID[] NOT NULL DEFAULT '{}',
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  reason_summary TEXT,
  founder_confirmed BOOLEAN NOT NULL DEFAULT false,
  founder_confirmed_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_archetype_assignments_business ON public.business_archetype_assignments(business_id);

CREATE TABLE public.business_archetype_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answer_source TEXT NOT NULL DEFAULT 'founder' CHECK (answer_source IN ('founder','manual','website','ai_inferred','uploaded_doc')),
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_archetype_questions_business ON public.business_archetype_questions(business_id);

ALTER TABLE public.business_archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_archetype_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_archetype_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_admin_all_archetypes" ON public.business_archetypes
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "founder_admin_all_assignments" ON public.business_archetype_assignments
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "founder_admin_all_questions" ON public.business_archetype_questions
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_archetypes_updated BEFORE UPDATE ON public.business_archetypes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_archetype_assignments_updated BEFORE UPDATE ON public.business_archetype_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_archetype_questions_updated BEFORE UPDATE ON public.business_archetype_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.business_archetypes (archetype_name, archetype_code, description, default_operating_model, default_kpis, default_agents, default_integrations, default_compliance_flags, default_exit_metrics) VALUES
('SaaS','saas','Recurring software product sold to businesses or consumers.', '{"revenue":"subscription","delivery":"self_serve_product","sales":"plg_or_sales_assisted"}','["mrr","arr","churn","nps","activation_rate","cac_payback"]','["customer_sales_agent","revenue_autopilot_agent","product_qa_agent","support_sla_agent"]','["stripe","analytics","auth","email"]','["dpa","gdpr","subprocessor_list"]','["arr","ndr","rule_of_40","ltv_cac"]'),
('Marketplace','marketplace','Two-sided platform connecting buyers and sellers.','{"revenue":"take_rate","delivery":"third_party_supply","supply_side":true}','["gmv","take_rate","liquidity","seller_active","listing_fill"]','["marketplace_recruitment_agent","seller_operations_agent","supply_demand_agent","marketplace_growth_agent","supply_quality_agent"]','["stripe_connect","kyc","email","analytics"]','["kyc","aml","marketplace_tos","seller_terms","payouts_compliance"]','["gmv","take_rate","liquidity_score","retention_cohorts"]'),
('Ecommerce','ecommerce','Direct-to-consumer or B2B physical/digital goods.','{"revenue":"order","delivery":"fulfilment","sales":"d2c_or_b2b"}','["revenue","aov","cr","repeat_rate","cac","gross_margin"]','["customer_sales_agent","fulfilment_agent","support_sla_agent","revenue_integrity_agent"]','["shopify","stripe","shipping","email"]','["consumer_rights","returns_policy","gdpr","product_safety"]','["revenue","gross_margin","ebitda","repeat_rate"]'),
('Agency / Service','agency_service','Done-for-you services delivered by humans + AI.','{"revenue":"project_or_retainer","delivery":"team_delivery","sales":"consultative"}','["bookings","utilisation","gross_margin","csat","retainer_arr"]','["customer_sales_agent","delivery_engine_agent","capacity_agent","contracts_agent"]','["crm","contracts","time_tracking","invoicing"]','["msa","sow","dpa","ip_assignment"]','["retainer_arr","client_concentration","ebitda","delivery_margin"]'),
('Consultancy','consultancy','Expert advisory engagements; often deliverable-light.','{"revenue":"engagement","delivery":"expert_led","sales":"relationship"}','["billable_days","day_rate","pipeline","csat","repeat_clients"]','["customer_sales_agent","delivery_engine_agent","knowledge_governance_agent"]','["crm","contracts","invoicing"]','["msa","nda","conflict_of_interest"]','["recurring_revenue_share","client_concentration","ebitda"]'),
('Media / Music / Content','media_music_content','Owned content, music or media monetised via ads, licensing, royalties.','{"revenue":"ads_licensing_royalty","delivery":"content_publish","ip_heavy":true}','["audience","watch_time","royalty_income","rpm","catalog_revenue"]','["content_ops_agent","ip_licensing_agent","royalty_audit_agent"]','["youtube","spotify","dsp","stripe"]','["copyright","licensing","royalty_accounting","rights_chain"]','["catalog_value","royalty_run_rate","audience_growth"]'),
('Course / Education','course_education','Cohort or self-paced learning products.','{"revenue":"course_or_subscription","delivery":"lms","sales":"funnel"}','["enrolments","completion","nps","refund_rate","ltv"]','["customer_sales_agent","support_sla_agent","content_ops_agent"]','["lms","stripe","email","video_host"]','["consumer_rights","refund_policy","gdpr"]','["arr","completion_rate","ebitda"]'),
('Directory / Listing','directory_listing','Curated directory of providers/places/listings.','{"revenue":"listing_fee_or_lead","delivery":"directory_publish"}','["listings","traffic","lead_volume","conversion","listing_revenue"]','["data_quality_agent","listing_review_agent","seo_agent"]','["analytics","stripe","email"]','["data_accuracy","takedown_process","gdpr"]','["traffic","listing_arr","seo_authority"]'),
('Lead Generation','lead_generation','Capturing leads and selling them to buyers.','{"revenue":"per_lead_or_subscription","delivery":"lead_routing"}','["lead_volume","cpl","conversion","payout_per_lead","margin"]','["customer_sales_agent","outreach_agent","data_quality_agent"]','["crm","analytics","email","stripe"]','["tcpa_gdpr_consent","data_retention","do_not_contact"]','["lead_run_rate","ebitda","client_concentration"]'),
('Membership / Community','membership_community','Recurring access to a community, content or perks.','{"revenue":"subscription","delivery":"community_platform"}','["members","mrr","retention","engagement","churn"]','["customer_sales_agent","support_sla_agent","content_ops_agent"]','["community_platform","stripe","email"]','["moderation","gdpr","payment_compliance"]','["arr","ndr","engagement_index"]'),
('Property / Rental','property_rental','Short or long term rental of physical assets/property.','{"revenue":"rental","delivery":"asset_operations"}','["occupancy","adr","revpar","maintenance_cost","nps"]','["fulfilment_agent","support_sla_agent","compliance_agent"]','["pms","stripe","payments","calendar"]','["short_let_rules","tax","local_licensing","insurance"]','["noi","occupancy","cap_rate"]'),
('AI Tool / Product','ai_tool_product','AI-native product (chatbot, generator, agent, copilot).','{"revenue":"subscription_or_usage","delivery":"product","sales":"plg"}','["mrr","activation","tokens_per_user","gross_margin","churn"]','["product_qa_agent","ai_cost_agent","support_sla_agent","customer_sales_agent"]','["ai_gateway","stripe","analytics","auth"]','["ai_governance","privacy","model_risk","dpa"]','["arr","ai_margin","ndr"]'),
('Regulated / Sensitive','regulated_sensitive','Operates in regulated industries (finance, health, legal, gambling).','{"revenue":"varied","delivery":"compliance_heavy","approval_gates":"strict"}','["compliance_score","incident_rate","sar_count","csat","revenue"]','["compliance_agent","privacy_ops_agent","incident_continuity_agent","contracts_agent"]','["audit_log","secure_storage","kyc"]','["regulator_specific","kyc","aml","data_residency","clinical_safety","legal_advice_rules"]','["regulatory_clean_record","arr","ebitda","license_value"]'),
('Subscription Service','subscription_service','Recurring physical/service delivery (box, maintenance, retainer).','{"revenue":"subscription","delivery":"recurring_fulfilment"}','["mrr","churn","arpu","cogs","retention"]','["customer_sales_agent","fulfilment_agent","support_sla_agent","revenue_autopilot_agent"]','["stripe","shipping","crm"]','["consumer_rights","cancellation_policy","gdpr"]','["arr","ndr","ebitda"]'),
('Digital Product','digital_product','One-off digital purchase (template, asset, plugin).','{"revenue":"one_off","delivery":"download"}','["units_sold","revenue","refund_rate","conversion","aov"]','["customer_sales_agent","support_sla_agent","content_ops_agent"]','["stripe","email","cdn"]','["consumer_rights","refund_policy","licensing"]','["revenue_run_rate","catalog_value","ebitda"]'),
('Local Service','local_service','Geographically bound service (trades, hospitality, on-site).','{"revenue":"job_or_membership","delivery":"on_site"}','["jobs","avg_ticket","repeat_rate","margin","reviews"]','["customer_sales_agent","fulfilment_agent","support_sla_agent"]','["crm","stripe","scheduling"]','["local_licensing","insurance","health_safety"]','["ebitda","sde","route_density"]'),
('Creator / Brand','creator_brand','Personal brand monetised via products, sponsorships, IP.','{"revenue":"mixed","delivery":"personal_brand","ip_heavy":true}','["audience","engagement","sponsorship_revenue","product_revenue"]','["content_ops_agent","customer_sales_agent","ip_licensing_agent"]','["social","email","stripe","newsletter"]','["disclosure_rules","ftc_asa","ip_rights"]','["catalog_value","arr","brand_equity"]'),
('Licensing / IP Business','licensing_ip_business','Owns IP, licenses to third parties.','{"revenue":"licensing","delivery":"contracts","ip_heavy":true}','["license_revenue","active_licensees","renewals","royalty_audit_score"]','["ip_licensing_agent","contracts_agent","royalty_audit_agent"]','["contracts","accounting","escrow"]','["ip_chain_of_title","license_compliance","royalty_accounting"]','["royalty_run_rate","portfolio_ip_value","ebitda"]'),
('Advisory Business','advisory_business','Senior advisory, fractional roles, board seats.','{"revenue":"retainer_or_equity","delivery":"advisory"}','["active_engagements","retainer_arr","equity_value","csat"]','["customer_sales_agent","contracts_agent","knowledge_governance_agent"]','["crm","contracts","calendar"]','["conflict_of_interest","nda","regulator_specific"]','["retainer_arr","equity_portfolio_value","ebitda"]'),
('Hybrid / Other','hybrid_other','Mixed model — combine multiple archetypes.','{"revenue":"mixed","delivery":"mixed"}','["composite_kpis"]','["business_archetype_agent"]','["varied"]','["varied"]','["composite"]');
