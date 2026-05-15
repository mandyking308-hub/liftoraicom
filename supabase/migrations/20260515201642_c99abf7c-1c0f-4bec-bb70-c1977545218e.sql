
-- Business Activation Layer (Prompt 99)

CREATE TABLE public.business_activation_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  activation_status text not null default 'draft',
  operating_mode text not null default 'sandbox',
  legal_entity_status text default 'not_checked',
  brand_profile_status text default 'not_checked',
  offer_catalog_status text default 'not_checked',
  pricing_status text default 'not_checked',
  crm_status text default 'not_checked',
  customer_memory_status text default 'not_checked',
  outreach_status text default 'not_checked',
  smartlead_status text default 'not_checked',
  apollo_status text default 'not_checked',
  native_email_status text default 'not_checked',
  social_status text default 'not_checked',
  content_status text default 'not_checked',
  marketing_status text default 'not_checked',
  proposal_status text default 'not_checked',
  demo_status text default 'not_checked',
  invoice_payment_status text default 'not_checked',
  onboarding_status text default 'not_checked',
  support_status text default 'not_checked',
  complaints_status text default 'not_checked',
  survey_status text default 'not_checked',
  retention_status text default 'not_checked',
  winback_status text default 'not_checked',
  supplier_status text default 'not_checked',
  compliance_status text default 'not_checked',
  privacy_status text default 'not_checked',
  security_status text default 'not_checked',
  readiness_score numeric not null default 0,
  go_live_allowed boolean not null default false,
  founder_approval_required boolean not null default true,
  activated_at timestamptz,
  paused_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE UNIQUE INDEX idx_bap_business ON public.business_activation_profiles(business_id);
ALTER TABLE public.business_activation_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all bap" ON public.business_activation_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_bap_updated BEFORE UPDATE ON public.business_activation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.business_activation_checklist_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  activation_profile_id uuid references public.business_activation_profiles(id) on delete cascade,
  checklist_area text not null,
  checklist_item text not null,
  item_status text not null default 'pending',
  required_for_go_live boolean not null default true,
  external_action_risk boolean not null default false,
  founder_approval_required boolean not null default true,
  owner_agent_key text,
  blocker text,
  next_action text,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_baci_business ON public.business_activation_checklist_items(business_id);
CREATE UNIQUE INDEX idx_baci_unique ON public.business_activation_checklist_items(business_id, checklist_area, checklist_item);
ALTER TABLE public.business_activation_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all baci" ON public.business_activation_checklist_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_baci_updated BEFORE UPDATE ON public.business_activation_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.integration_activation_status (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  integration_key text not null,
  integration_name text not null,
  integration_status text not null default 'not_connected',
  credentials_present boolean not null default false,
  connection_tested boolean not null default false,
  live_action_enabled boolean not null default false,
  external_mutation_allowed boolean not null default false,
  last_test_at timestamptz,
  last_error text,
  next_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE UNIQUE INDEX idx_ias_unique ON public.integration_activation_status(business_id, integration_key);
ALTER TABLE public.integration_activation_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all ias" ON public.integration_activation_status FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_ias_updated BEFORE UPDATE ON public.integration_activation_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.customer_data_import_readiness (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  source_name text not null,
  data_type text not null,
  import_status text not null default 'not_started',
  records_expected integer,
  records_imported integer not null default 0,
  records_matched integer not null default 0,
  records_unmatched integer not null default 0,
  data_quality_score numeric,
  privacy_review_required boolean not null default true,
  founder_review_required boolean not null default true,
  next_action text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_cdir_business ON public.customer_data_import_readiness(business_id);
ALTER TABLE public.customer_data_import_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all cdir" ON public.customer_data_import_readiness FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_cdir_updated BEFORE UPDATE ON public.customer_data_import_readiness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.approved_template_library (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  template_key text not null,
  template_name text not null,
  template_type text not null,
  template_subject text,
  template_body text,
  approval_status text not null default 'draft',
  approved_for_external_use boolean not null default false,
  requires_context_guard boolean not null default true,
  requires_founder_approval boolean not null default true,
  risk_level text not null default 'medium',
  last_reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_atl_business ON public.approved_template_library(business_id);
ALTER TABLE public.approved_template_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all atl" ON public.approved_template_library FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_atl_updated BEFORE UPDATE ON public.approved_template_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
