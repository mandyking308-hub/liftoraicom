
CREATE TABLE IF NOT EXISTS public.business_launch_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  template_name text NOT NULL,
  business_category text,
  description text,
  default_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_provider_lanes jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_compliance_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_crm_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_campaign_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_proposal_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_finance_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_launch_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins manage launch templates" ON public.business_launch_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_business_launch_templates_updated_at
  BEFORE UPDATE ON public.business_launch_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.business_launch_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.business_launch_templates(id) ON DELETE SET NULL,
  launch_name text NOT NULL,
  launch_status text NOT NULL DEFAULT 'draft',
  founder_brief text,
  selected_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_agents jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_integrations jsonb NOT NULL DEFAULT '[]'::jsonb,
  setup_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  readiness_score numeric,
  founder_approval_required boolean NOT NULL DEFAULT true,
  approved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_launch_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins manage launch plans" ON public.business_launch_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_business_launch_plans_updated_at
  BEFORE UPDATE ON public.business_launch_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed templates
INSERT INTO public.business_launch_templates (template_key, template_name, business_category, description, default_modules, default_agents, default_provider_lanes, default_compliance_profile, default_crm_profile, default_campaign_structure, default_proposal_structure, default_finance_structure)
VALUES
  ('ai_saas_business','AI SaaS Business','saas','B2B AI software with outbound sales, demos, proposals',
    '["crm","compliance","outbound_native","outbound_smartlead","apollo_sourcing","ai_engagement","founder_approval","proposals","demos","deals","finance","reporting","monitoring","knowledge","manual","testing"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","proposal_agent","commercial_agent","finance_agent","compliance_agent","ops_agent","founder_copilot_agent","priority_agent"]'::jsonb,
    '{"native_email":true,"smartlead":true,"apollo":true}'::jsonb,
    '{"unsubscribe_required":true,"founder_approval_required":true}'::jsonb,
    '{"contact_model":"company_contact","stages":["new","engaged","qualified","demo","proposal","won","lost"]}'::jsonb,
    '{"first_campaign":"founder_voice_intro","followups":3,"channels":["email"]}'::jsonb,
    '{"sections":["context","problem","solution","architecture","timeline","investment"]}'::jsonb,
    '{"invoice_model":"milestone","retainer_supported":true}'::jsonb),
  ('music_media_brand','Music / Media Brand','media','Artist/label/playlist outreach, PR & licensing',
    '["crm","compliance","outbound_native","ai_engagement","founder_approval","proposals","reporting","monitoring","knowledge","manual"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","proposal_agent","commercial_agent","compliance_agent","founder_copilot_agent","priority_agent"]'::jsonb,
    '{"native_email":true,"smartlead":true,"apollo":true}'::jsonb,
    '{"unsubscribe_required":true,"founder_approval_required":true}'::jsonb,
    '{"contact_model":"creator","stages":["new","engaged","interested","placed","press","won"]}'::jsonb,
    '{"first_campaign":"creator_intro","followups":2,"channels":["email"]}'::jsonb,
    '{"sections":["story","catalogue","numbers","ask"]}'::jsonb,
    '{"invoice_model":"deal","retainer_supported":false}'::jsonb),
  ('ecommerce_brand','E-commerce Brand','ecommerce','DTC product brand: retention, partner, wholesale outreach',
    '["crm","compliance","outbound_native","ai_engagement","founder_approval","proposals","finance","reporting","monitoring","knowledge","manual"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","commercial_agent","finance_agent","compliance_agent","ops_agent","founder_copilot_agent"]'::jsonb,
    '{"native_email":true,"smartlead":false,"apollo":false}'::jsonb,
    '{"unsubscribe_required":true}'::jsonb,
    '{"contact_model":"customer","stages":["lead","customer","repeat","wholesale"]}'::jsonb,
    '{"first_campaign":"wholesale_intro","followups":2}'::jsonb,
    '{"sections":["brand","catalog","margins","terms"]}'::jsonb,
    '{"invoice_model":"po","retainer_supported":false}'::jsonb),
  ('consultancy_service','Consultancy / Service','services','Senior consulting/agency: proposals + retainers',
    '["crm","compliance","outbound_native","outbound_smartlead","ai_engagement","founder_approval","proposals","demos","deals","finance","reporting","monitoring","knowledge","manual","testing"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","proposal_agent","commercial_agent","finance_agent","compliance_agent","founder_copilot_agent","priority_agent"]'::jsonb,
    '{"native_email":true,"smartlead":true,"apollo":true}'::jsonb,
    '{"unsubscribe_required":true,"founder_approval_required":true}'::jsonb,
    '{"contact_model":"company_contact","stages":["new","qualified","scoping","proposal","won","retained"]}'::jsonb,
    '{"first_campaign":"founder_voice_intro","followups":3}'::jsonb,
    '{"sections":["context","scope","approach","team","timeline","investment"]}'::jsonb,
    '{"invoice_model":"retainer","retainer_supported":true}'::jsonb),
  ('property_project','Property / Project','property','Property development & investor relations',
    '["crm","compliance","outbound_native","ai_engagement","founder_approval","proposals","finance","suppliers","reporting","monitoring","knowledge","manual"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","proposal_agent","commercial_agent","finance_agent","supplier_agent","compliance_agent","ops_agent","founder_copilot_agent"]'::jsonb,
    '{"native_email":true,"smartlead":false,"apollo":false}'::jsonb,
    '{"unsubscribe_required":true,"founder_approval_required":true}'::jsonb,
    '{"contact_model":"investor_contact","stages":["intro","interested","DD","term_sheet","committed"]}'::jsonb,
    '{"first_campaign":"investor_brief","followups":2}'::jsonb,
    '{"sections":["thesis","asset","numbers","team","terms"]}'::jsonb,
    '{"invoice_model":"capital_call","retainer_supported":false}'::jsonb),
  ('charity_donor_portal','Charity / Donor Portal','nonprofit','Donor outreach, grant pipeline, supporter portal',
    '["crm","compliance","outbound_native","ai_engagement","founder_approval","proposals","reporting","monitoring","knowledge","manual"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","proposal_agent","commercial_agent","compliance_agent","founder_copilot_agent"]'::jsonb,
    '{"native_email":true,"smartlead":false,"apollo":false}'::jsonb,
    '{"unsubscribe_required":true,"founder_approval_required":true}'::jsonb,
    '{"contact_model":"donor","stages":["intro","engaged","donor","major_donor","grant"]}'::jsonb,
    '{"first_campaign":"impact_intro","followups":2}'::jsonb,
    '{"sections":["mission","impact","ask","stewardship"]}'::jsonb,
    '{"invoice_model":"donation","retainer_supported":false}'::jsonb),
  ('supplier_marketplace','Supplier Marketplace','marketplace','Two-sided marketplace with supplier ops',
    '["crm","compliance","outbound_native","ai_engagement","founder_approval","proposals","finance","suppliers","reporting","monitoring","knowledge","manual","testing"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","commercial_agent","finance_agent","supplier_agent","compliance_agent","ops_agent","founder_copilot_agent","priority_agent"]'::jsonb,
    '{"native_email":true,"smartlead":true,"apollo":true}'::jsonb,
    '{"unsubscribe_required":true,"founder_approval_required":true}'::jsonb,
    '{"contact_model":"supplier_buyer","stages":["intro","onboarding","active","top_supplier"]}'::jsonb,
    '{"first_campaign":"supplier_intro","followups":3}'::jsonb,
    '{"sections":["category","fit","terms","onboarding"]}'::jsonb,
    '{"invoice_model":"commission","retainer_supported":false}'::jsonb),
  ('local_service_business','Local Service Business','local','Local trades/service: bookings, retention, referrals',
    '["crm","compliance","outbound_native","ai_engagement","founder_approval","proposals","finance","reporting","monitoring","knowledge","manual"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","commercial_agent","finance_agent","compliance_agent","founder_copilot_agent"]'::jsonb,
    '{"native_email":true,"smartlead":false,"apollo":false}'::jsonb,
    '{"unsubscribe_required":true}'::jsonb,
    '{"contact_model":"customer","stages":["enquiry","quoted","booked","completed","repeat"]}'::jsonb,
    '{"first_campaign":"local_intro","followups":1}'::jsonb,
    '{"sections":["service","price","timeline","terms"]}'::jsonb,
    '{"invoice_model":"job","retainer_supported":false}'::jsonb),
  ('education_support','Education / Support','education','School, course or coaching support pipeline',
    '["crm","compliance","outbound_native","ai_engagement","founder_approval","proposals","reporting","monitoring","knowledge","manual"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","proposal_agent","commercial_agent","compliance_agent","founder_copilot_agent"]'::jsonb,
    '{"native_email":true,"smartlead":false,"apollo":false}'::jsonb,
    '{"unsubscribe_required":true,"founder_approval_required":true}'::jsonb,
    '{"contact_model":"student_parent","stages":["enquiry","trial","enrolled","completed"]}'::jsonb,
    '{"first_campaign":"prospectus","followups":2}'::jsonb,
    '{"sections":["programme","outcome","price","terms"]}'::jsonb,
    '{"invoice_model":"tuition","retainer_supported":true}'::jsonb),
  ('digital_product','Digital Product','digital','Course, info-product, community',
    '["crm","compliance","outbound_native","ai_engagement","founder_approval","proposals","finance","reporting","monitoring","knowledge","manual"]'::jsonb,
    '["outreach_agent","inbox_agent","ai_engagement_agent","commercial_agent","finance_agent","compliance_agent","founder_copilot_agent"]'::jsonb,
    '{"native_email":true,"smartlead":false,"apollo":false}'::jsonb,
    '{"unsubscribe_required":true}'::jsonb,
    '{"contact_model":"audience","stages":["lead","trial","customer","repeat"]}'::jsonb,
    '{"first_campaign":"founder_voice_intro","followups":3}'::jsonb,
    '{"sections":["promise","modules","price","guarantee"]}'::jsonb,
    '{"invoice_model":"checkout","retainer_supported":true}'::jsonb)
ON CONFLICT (template_key) DO NOTHING;
