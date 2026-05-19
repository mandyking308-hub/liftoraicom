
-- Prompt 19A: Customer Success / Client Portal backend foundation
-- All tables founder/admin-protected, RLS enabled, internal-only.

-- 1. customer_success_profiles
CREATE TABLE IF NOT EXISTS public.customer_success_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  crm_contact_id uuid,
  organisation_id uuid,
  conversation_id uuid,
  account_name text,
  customer_name text,
  customer_email text,
  customer_type text DEFAULT 'customer',
  lifecycle_stage text DEFAULT 'new_customer',
  success_status text DEFAULT 'draft',
  assigned_account_manager text,
  customer_goal text,
  purchased_offer text,
  start_date date,
  onboarding_due_date date,
  renewal_date date,
  subscription_status text,
  health_score integer DEFAULT 0,
  satisfaction_score integer,
  retention_risk_level text DEFAULT 'unknown',
  upsell_potential text DEFAULT 'unknown',
  support_risk_status text DEFAULT 'not_reviewed',
  last_contact_at timestamptz,
  next_check_in_at timestamptz,
  founder_notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Extend existing customer_onboarding_plans safely
ALTER TABLE public.customer_onboarding_plans
  ADD COLUMN IF NOT EXISTS success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS crm_contact_id uuid,
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS welcome_message_draft text,
  ADD COLUMN IF NOT EXISTS onboarding_steps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_assets text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_customer_inputs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS internal_owner text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS target_completion_date date,
  ADD COLUMN IF NOT EXISTS completion_date date,
  ADD COLUMN IF NOT EXISTS risk_flags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS missing_information text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS founder_approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS external_share_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_test_data boolean DEFAULT false;

-- 3. customer_welcome_packs
CREATE TABLE IF NOT EXISTS public.customer_welcome_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  onboarding_plan_id uuid REFERENCES public.customer_onboarding_plans(id) ON DELETE CASCADE,
  pack_name text NOT NULL,
  pack_type text NOT NULL,
  pack_status text DEFAULT 'draft',
  welcome_copy text,
  getting_started_steps jsonb DEFAULT '[]'::jsonb,
  useful_links jsonb DEFAULT '[]'::jsonb,
  support_routes jsonb DEFAULT '[]'::jsonb,
  expectations text[] DEFAULT '{}',
  customer_actions_required text[] DEFAULT '{}',
  internal_actions_required text[] DEFAULT '{}',
  risk_warnings text[] DEFAULT '{}',
  founder_approval_review_id uuid,
  approval_status text DEFAULT 'draft',
  manual_export_status text DEFAULT 'not_exported',
  external_share_allowed boolean DEFAULT false,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. client_portal_blueprints
CREATE TABLE IF NOT EXISTS public.client_portal_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  blueprint_name text NOT NULL,
  portal_type text NOT NULL,
  blueprint_status text DEFAULT 'draft',
  target_customer_type text,
  portal_goal text,
  proposed_sections jsonb DEFAULT '[]'::jsonb,
  required_pages text[] DEFAULT '{}',
  required_features text[] DEFAULT '{}',
  required_documents text[] DEFAULT '{}',
  required_permissions text[] DEFAULT '{}',
  customer_data_to_show text[] DEFAULT '{}',
  customer_data_to_hide text[] DEFAULT '{}',
  privacy_warnings text[] DEFAULT '{}',
  security_warnings text[] DEFAULT '{}',
  build_notes text,
  founder_approval_review_id uuid,
  approval_status text DEFAULT 'draft',
  external_portal_status text DEFAULT 'not_built',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. client_portal_content_packs
CREATE TABLE IF NOT EXISTS public.client_portal_content_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  blueprint_id uuid REFERENCES public.client_portal_blueprints(id) ON DELETE CASCADE,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE SET NULL,
  pack_name text NOT NULL,
  pack_status text DEFAULT 'draft',
  portal_sections jsonb DEFAULT '[]'::jsonb,
  page_copy jsonb DEFAULT '[]'::jsonb,
  document_requirements text[] DEFAULT '{}',
  asset_requirements text[] DEFAULT '{}',
  permissions_notes text[] DEFAULT '{}',
  privacy_warnings text[] DEFAULT '{}',
  security_warnings text[] DEFAULT '{}',
  operator_instructions text,
  founder_approval_review_id uuid,
  approval_status text DEFAULT 'draft',
  manual_export_status text DEFAULT 'not_exported',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. customer_bedding_in_reviews
CREATE TABLE IF NOT EXISTS public.customer_bedding_in_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  onboarding_plan_id uuid REFERENCES public.customer_onboarding_plans(id) ON DELETE SET NULL,
  review_name text NOT NULL,
  review_status text DEFAULT 'draft',
  bedding_in_day integer,
  scheduled_for date,
  completed_at timestamptz,
  customer_sentiment text DEFAULT 'unknown',
  progress_status text DEFAULT 'unknown',
  issues_found text[] DEFAULT '{}',
  support_needed text[] DEFAULT '{}',
  founder_attention_needed boolean DEFAULT false,
  recommended_next_actions text[] DEFAULT '{}',
  customer_message_draft text,
  external_send_allowed boolean DEFAULT false,
  founder_approval_review_id uuid,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. customer_success_checkins
CREATE TABLE IF NOT EXISTS public.customer_success_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  checkin_name text NOT NULL,
  checkin_type text NOT NULL,
  checkin_status text DEFAULT 'draft',
  scheduled_for date,
  completed_at timestamptz,
  checkin_goal text,
  question_prompts jsonb DEFAULT '[]'::jsonb,
  internal_notes text,
  customer_message_draft text,
  outcome_summary text,
  next_actions text[] DEFAULT '{}',
  risk_flags text[] DEFAULT '{}',
  founder_attention_needed boolean DEFAULT false,
  external_send_allowed boolean DEFAULT false,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. customer_satisfaction_surveys
CREATE TABLE IF NOT EXISTS public.customer_satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  survey_name text NOT NULL,
  survey_type text NOT NULL,
  survey_status text DEFAULT 'draft',
  questions jsonb DEFAULT '[]'::jsonb,
  message_draft text,
  scheduled_for date,
  sent_manually_external_at timestamptz,
  response_received_at timestamptz,
  csat_score integer,
  nps_score integer,
  sentiment text DEFAULT 'unknown',
  response_summary text,
  improvement_requests text[] DEFAULT '{}',
  complaint_signals text[] DEFAULT '{}',
  upsell_signals text[] DEFAULT '{}',
  retention_risk_signals text[] DEFAULT '{}',
  follow_up_actions text[] DEFAULT '{}',
  external_send_allowed boolean DEFAULT false,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Extend existing customer_quarterly_reports
ALTER TABLE public.customer_quarterly_reports
  ADD COLUMN IF NOT EXISTS success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS report_name text,
  ADD COLUMN IF NOT EXISTS executive_summary text,
  ADD COLUMN IF NOT EXISTS work_completed jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outcomes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metrics jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS open_items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS renewal_notes text,
  ADD COLUMN IF NOT EXISTS missing_evidence text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS unsupported_claims text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS customer_message_draft text,
  ADD COLUMN IF NOT EXISTS external_share_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS manual_export_status text DEFAULT 'not_exported',
  ADD COLUMN IF NOT EXISTS is_test_data boolean DEFAULT false;

-- 10. customer_renewal_reviews
CREATE TABLE IF NOT EXISTS public.customer_renewal_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  renewal_name text NOT NULL,
  renewal_status text DEFAULT 'draft',
  renewal_date date,
  current_value numeric,
  currency text DEFAULT 'GBP',
  renewal_probability text DEFAULT 'unknown',
  retention_risk_level text DEFAULT 'unknown',
  reasons_to_renew text[] DEFAULT '{}',
  risks_to_renewal text[] DEFAULT '{}',
  missing_success_evidence text[] DEFAULT '{}',
  recommended_actions text[] DEFAULT '{}',
  renewal_message_draft text,
  external_send_allowed boolean DEFAULT false,
  founder_approval_review_id uuid,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. customer_retention_risk_reviews
CREATE TABLE IF NOT EXISTS public.customer_retention_risk_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  review_name text NOT NULL,
  review_status text DEFAULT 'draft',
  risk_level text DEFAULT 'unknown',
  risk_reasons text[] DEFAULT '{}',
  support_signals text[] DEFAULT '{}',
  complaint_signals text[] DEFAULT '{}',
  finance_signals text[] DEFAULT '{}',
  engagement_signals text[] DEFAULT '{}',
  recommended_recovery_actions text[] DEFAULT '{}',
  founder_attention_needed boolean DEFAULT false,
  recovery_message_draft text,
  external_send_allowed boolean DEFAULT false,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. customer_upsell_opportunities
CREATE TABLE IF NOT EXISTS public.customer_upsell_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  opportunity_name text NOT NULL,
  opportunity_status text DEFAULT 'draft',
  opportunity_type text NOT NULL,
  current_offer text,
  suggested_offer text,
  rationale text,
  evidence_summary text,
  confidence_score integer DEFAULT 0,
  estimated_value numeric,
  currency text DEFAULT 'GBP',
  risk_warnings text[] DEFAULT '{}',
  recommended_next_actions text[] DEFAULT '{}',
  customer_message_draft text,
  external_send_allowed boolean DEFAULT false,
  founder_approval_review_id uuid,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 13. Extend existing customer_winback_plans
ALTER TABLE public.customer_winback_plans
  ADD COLUMN IF NOT EXISTS success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS churn_reason text,
  ADD COLUMN IF NOT EXISTS proposed_offer text,
  ADD COLUMN IF NOT EXISTS proposed_message_draft text,
  ADD COLUMN IF NOT EXISTS recommended_timing text,
  ADD COLUMN IF NOT EXISTS risk_warnings text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS founder_attention_needed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS external_send_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS is_test_data boolean DEFAULT false;

-- 14. customer_success_manual_export_packs
CREATE TABLE IF NOT EXISTS public.customer_success_manual_export_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE SET NULL,
  export_name text NOT NULL,
  export_type text NOT NULL,
  export_status text DEFAULT 'draft',
  onboarding_plan_id uuid REFERENCES public.customer_onboarding_plans(id) ON DELETE SET NULL,
  welcome_pack_id uuid REFERENCES public.customer_welcome_packs(id) ON DELETE SET NULL,
  portal_blueprint_id uuid REFERENCES public.client_portal_blueprints(id) ON DELETE SET NULL,
  quarterly_report_id uuid REFERENCES public.customer_quarterly_reports(id) ON DELETE SET NULL,
  survey_id uuid REFERENCES public.customer_satisfaction_surveys(id) ON DELETE SET NULL,
  renewal_review_id uuid REFERENCES public.customer_renewal_reviews(id) ON DELETE SET NULL,
  export_payload jsonb DEFAULT '{}'::jsonb,
  operator_instructions text,
  validation_status text DEFAULT 'not_checked',
  validation_errors text[] DEFAULT '{}',
  validation_warnings text[] DEFAULT '{}',
  confirmed_external_at timestamptz,
  confirmed_external_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 15. customer_success_audit
CREATE TABLE IF NOT EXISTS public.customer_success_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE SET NULL,
  onboarding_plan_id uuid REFERENCES public.customer_onboarding_plans(id) ON DELETE SET NULL,
  welcome_pack_id uuid REFERENCES public.customer_welcome_packs(id) ON DELETE SET NULL,
  portal_blueprint_id uuid REFERENCES public.client_portal_blueprints(id) ON DELETE SET NULL,
  portal_content_pack_id uuid REFERENCES public.client_portal_content_packs(id) ON DELETE SET NULL,
  bedding_review_id uuid REFERENCES public.customer_bedding_in_reviews(id) ON DELETE SET NULL,
  checkin_id uuid REFERENCES public.customer_success_checkins(id) ON DELETE SET NULL,
  survey_id uuid REFERENCES public.customer_satisfaction_surveys(id) ON DELETE SET NULL,
  quarterly_report_id uuid REFERENCES public.customer_quarterly_reports(id) ON DELETE SET NULL,
  renewal_review_id uuid REFERENCES public.customer_renewal_reviews(id) ON DELETE SET NULL,
  retention_review_id uuid REFERENCES public.customer_retention_risk_reviews(id) ON DELETE SET NULL,
  upsell_opportunity_id uuid REFERENCES public.customer_upsell_opportunities(id) ON DELETE SET NULL,
  winback_plan_id uuid REFERENCES public.customer_winback_plans(id) ON DELETE SET NULL,
  export_pack_id uuid REFERENCES public.customer_success_manual_export_packs(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text DEFAULT 'recorded',
  before_json jsonb DEFAULT '{}'::jsonb,
  after_json jsonb DEFAULT '{}'::jsonb,
  result_json jsonb DEFAULT '{}'::jsonb,
  external_api_calls integer DEFAULT 0,
  customer_messages_sent integer DEFAULT 0,
  portal_accounts_created integer DEFAULT 0,
  portal_invites_sent integer DEFAULT 0,
  surveys_sent integer DEFAULT 0,
  reports_shared integer DEFAULT 0,
  payments_created integer DEFAULT 0,
  subscriptions_changed integer DEFAULT 0,
  fake_customer_data_created integer DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Extend other existing tables (only if columns missing)
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS customer_success_profile_id uuid,
  ADD COLUMN IF NOT EXISTS customer_success_status text DEFAULT 'not_configured';

ALTER TABLE public.customer_retention_scores
  ADD COLUMN IF NOT EXISTS customer_success_profile_id uuid,
  ADD COLUMN IF NOT EXISTS latest_success_checkin_id uuid,
  ADD COLUMN IF NOT EXISTS latest_renewal_review_id uuid,
  ADD COLUMN IF NOT EXISTS latest_retention_risk_review_id uuid;

ALTER TABLE public.support_question_intake
  ADD COLUMN IF NOT EXISTS customer_success_profile_id uuid,
  ADD COLUMN IF NOT EXISTS customer_success_handoff_status text DEFAULT 'not_handed_off';

ALTER TABLE public.support_escalations
  ADD COLUMN IF NOT EXISTS customer_success_profile_id uuid,
  ADD COLUMN IF NOT EXISTS customer_success_handoff_status text DEFAULT 'not_handed_off';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_success_profile_id uuid,
  ADD COLUMN IF NOT EXISTS renewal_review_id uuid;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS customer_success_profile_id uuid;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS customer_success_profile_id uuid,
  ADD COLUMN IF NOT EXISTS onboarding_plan_id uuid;

ALTER TABLE public.internal_proposals
  ADD COLUMN IF NOT EXISTS onboarding_plan_id uuid,
  ADD COLUMN IF NOT EXISTS customer_success_profile_id uuid;

-- Enable RLS on all new tables
ALTER TABLE public.customer_success_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_welcome_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_bedding_in_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_success_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_renewal_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_retention_risk_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_upsell_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_success_manual_export_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_success_audit ENABLE ROW LEVEL SECURITY;

-- Founder/admin policies
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customer_success_profiles','customer_welcome_packs','client_portal_blueprints',
    'client_portal_content_packs','customer_bedding_in_reviews','customer_success_checkins',
    'customer_satisfaction_surveys','customer_renewal_reviews','customer_retention_risk_reviews',
    'customer_upsell_opportunities','customer_success_manual_export_packs','customer_success_audit'
  ]) LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "founders_admins_all_%1$s" ON public.%1$I;
      CREATE POLICY "founders_admins_all_%1$s" ON public.%1$I
        FOR ALL TO authenticated
        USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role))
        WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
    $f$, t);
  END LOOP;
END $$;

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customer_success_profiles','customer_welcome_packs','client_portal_blueprints',
    'client_portal_content_packs','customer_bedding_in_reviews','customer_success_checkins',
    'customer_satisfaction_surveys','customer_renewal_reviews','customer_retention_risk_reviews',
    'customer_upsell_opportunities','customer_success_manual_export_packs'
  ]) LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$I;
      CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$I
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    $f$, t);
  END LOOP;
END $$;
