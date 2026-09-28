-- Worker 2: standard, business-scoped customer revenue activation.
-- Additive only. Stripe remains test-mode-only until a separate live-readiness change.

ALTER TABLE public.customer_sales_products
  ADD COLUMN IF NOT EXISTS requires_customer_account boolean NOT NULL DEFAULT false;

ALTER TABLE public.customer_sales_offers
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_price_amount numeric,
  ADD COLUMN IF NOT EXISTS approved_currency text,
  ADD COLUMN IF NOT EXISTS max_discount_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_segment_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS standard_checkout_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.customer_sales_offers
  ADD CONSTRAINT customer_sales_offers_approval_status_check
    CHECK (approval_status IN ('draft','approved','paused','retired')),
  ADD CONSTRAINT customer_sales_offers_max_discount_check
    CHECK (max_discount_percent >= 0 AND max_discount_percent <= 100),
  ADD CONSTRAINT customer_sales_offers_approved_price_check
    CHECK (approved_price_amount IS NULL OR approved_price_amount > 0),
  ADD CONSTRAINT customer_sales_offers_approved_currency_check
    CHECK (approved_currency IS NULL OR approved_currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT customer_sales_offers_approved_envelope_check
    CHECK (approval_status <> 'approved' OR (
      approved_at IS NOT NULL AND approved_by IS NOT NULL AND
      approved_price_amount IS NOT NULL AND approved_currency IS NOT NULL AND
      stripe_price_id IS NOT NULL AND stripe_product_id IS NOT NULL
    ));

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.customer_sales_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.customer_sales_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid;

ALTER TABLE public.qtc_payments
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid;

ALTER TABLE public.qtc_revenue_confirmations
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid;

ALTER TABLE public.customer_success_profiles
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid;

ALTER TABLE public.customer_onboarding_plans
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid;

ALTER TABLE public.customer_memory_profiles
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

ALTER TABLE public.customer_success_plans
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

ALTER TABLE public.customer_quarterly_reports
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

ALTER TABLE public.customer_usage_snapshots
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

ALTER TABLE public.customer_account_reviews
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

ALTER TABLE public.customer_retention_scores
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

ALTER TABLE public.retention_risk_recommendations
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

ALTER TABLE public.customer_welcome_packs
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid;

ALTER TABLE public.customer_onboarding_tasks
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.onboarding_email_drafts
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.customer_success_checkins
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.customer_satisfaction_surveys
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.customer_renewal_reviews
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.customer_retention_risk_reviews
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.customer_upsell_opportunities
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.support_reply_drafts
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.customer_winback_plans
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_sales_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE public.customer_stewardship_assignments
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS deals_customer_sales_checkout_uniq
  ON public.deals (customer_sales_checkout_id);
CREATE UNIQUE INDEX IF NOT EXISTS qtc_payments_customer_sales_checkout_uniq
  ON public.qtc_payments (customer_sales_checkout_id);
CREATE UNIQUE INDEX IF NOT EXISTS qtc_revenue_customer_sales_checkout_uniq
  ON public.qtc_revenue_confirmations (customer_sales_checkout_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_success_profiles_checkout_uniq
  ON public.customer_success_profiles (customer_sales_checkout_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_onboarding_plans_checkout_uniq
  ON public.customer_onboarding_plans (customer_sales_checkout_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_welcome_packs_checkout_uniq
  ON public.customer_welcome_packs (customer_sales_checkout_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_onboarding_tasks_idempotency_uniq
  ON public.customer_onboarding_tasks (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_email_drafts_idempotency_uniq
  ON public.onboarding_email_drafts (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS customer_success_checkins_idempotency_uniq
  ON public.customer_success_checkins (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS customer_satisfaction_surveys_idempotency_uniq
  ON public.customer_satisfaction_surveys (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS customer_renewal_reviews_idempotency_uniq
  ON public.customer_renewal_reviews (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS customer_retention_reviews_idempotency_uniq
  ON public.customer_retention_risk_reviews (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS customer_upsell_opportunities_idempotency_uniq
  ON public.customer_upsell_opportunities (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS customer_winback_plans_idempotency_uniq
  ON public.customer_winback_plans (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS support_reply_drafts_idempotency_uniq
  ON public.support_reply_drafts (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS customer_stewardship_assignments_idempotency_uniq
  ON public.customer_stewardship_assignments (idempotency_key);

CREATE TABLE IF NOT EXISTS public.customer_sales_billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, contact_id),
  UNIQUE (stripe_customer_id)
);

CREATE TABLE IF NOT EXISTS public.customer_sales_checkout_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  business_contact_relationship_id uuid NOT NULL REFERENCES public.business_contact_relationships(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.customer_sales_products(id) ON DELETE RESTRICT,
  offer_id uuid NOT NULL REFERENCES public.customer_sales_offers(id) ON DELETE RESTRICT,
  customer_email text NOT NULL,
  customer_name text,
  discount_percent numeric NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  approved_price_amount numeric NOT NULL CHECK (approved_price_amount > 0),
  checkout_amount numeric NOT NULL CHECK (checkout_amount > 0),
  checkout_amount_minor_units bigint NOT NULL CHECK (checkout_amount_minor_units > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  stripe_price_id text NOT NULL,
  stripe_customer_id text,
  stripe_checkout_session_id text UNIQUE,
  qtc_payment_id uuid REFERENCES public.qtc_payments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','pending','paid','payment_discrepancy','cancelled','failed')),
  test_mode boolean NOT NULL DEFAULT true CHECK (test_mode = true),
  request_fingerprint jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_sales_checkout_business_created_idx
  ON public.customer_sales_checkout_intents (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_product_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  business_contact_relationship_id uuid NOT NULL REFERENCES public.business_contact_relationships(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.customer_sales_products(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.customer_sales_offers(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.qtc_payments(id) ON DELETE RESTRICT,
  checkout_id uuid NOT NULL REFERENCES public.customer_sales_checkout_intents(id) ON DELETE RESTRICT,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  account_scope text NOT NULL DEFAULT 'customer_product' CHECK (account_scope = 'customer_product'),
  account_role text NOT NULL DEFAULT 'product_customer' CHECK (account_role = 'product_customer'),
  access_status text NOT NULL DEFAULT 'active' CHECK (access_status IN ('active','pending_user','suspended','revoked')),
  provisioned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (payment_id, product_id),
  UNIQUE (checkout_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.customer_success_execution_policies (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  allow_customer_product_activation boolean NOT NULL DEFAULT true,
  policy_currency text NOT NULL DEFAULT 'USD' CHECK (policy_currency ~ '^[A-Z]{3}$'),
  minimum_ai_confidence numeric NOT NULL DEFAULT 0.85 CHECK (minimum_ai_confidence >= 0 AND minimum_ai_confidence <= 1),
  maximum_standard_refund_amount numeric NOT NULL DEFAULT 0 CHECK (maximum_standard_refund_amount >= 0),
  maximum_standard_upsell_amount numeric NOT NULL DEFAULT 0 CHECK (maximum_standard_upsell_amount >= 0),
  strategic_value_threshold numeric NOT NULL DEFAULT 5000 CHECK (strategic_value_threshold >= 0),
  allow_standard_checkins boolean NOT NULL DEFAULT false,
  allow_approved_support_responses boolean NOT NULL DEFAULT false,
  allow_approved_surveys boolean NOT NULL DEFAULT false,
  allow_standard_renewals boolean NOT NULL DEFAULT false,
  allow_approved_upsell_cross_sell boolean NOT NULL DEFAULT false,
  allow_standard_retention boolean NOT NULL DEFAULT false,
  allow_standard_winback boolean NOT NULL DEFAULT false,
  allow_standard_refunds boolean NOT NULL DEFAULT false,
  policy_version integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_success_automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  business_contact_relationship_id uuid NOT NULL REFERENCES public.business_contact_relationships(id) ON DELETE RESTRICT,
  success_profile_id uuid REFERENCES public.customer_success_profiles(id) ON DELETE SET NULL,
  onboarding_plan_id uuid REFERENCES public.customer_onboarding_plans(id) ON DELETE SET NULL,
  checkout_id uuid REFERENCES public.customer_sales_checkout_intents(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'onboarding_welcome','onboarding_start','product_account_activation','ordinary_checkin','approved_support_response',
    'approved_survey','renewal_workflow','approved_upsell_cross_sell','retention','winback','refund'
  )),
  execution_status text NOT NULL DEFAULT 'queued' CHECK (execution_status IN ('queued','scheduled','monitoring','processing','completed','escalated','failed','cancelled')),
  execution_mode text NOT NULL DEFAULT 'standard_auto' CHECK (execution_mode IN ('standard_auto','human_review')),
  approval_required boolean NOT NULL DEFAULT false,
  escalation_reason text,
  confidence_score numeric,
  risk_flags text[] NOT NULL DEFAULT '{}',
  scheduled_at timestamptz,
  execution_attempts integer NOT NULL DEFAULT 0 CHECK (execution_attempts >= 0),
  last_error text,
  execution_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_success_queue_due_idx
  ON public.customer_success_automation_queue (execution_status, created_at);

CREATE TABLE IF NOT EXISTS public.customer_commercial_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  checkout_id uuid REFERENCES public.customer_sales_checkout_intents(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.qtc_payments(id) ON DELETE SET NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_commercial_audit_business_time_idx
  ON public.customer_commercial_audit_events (business_id, created_at DESC);

-- Offer-envelope and standard Customer Success policy edits change commercial
-- behavior. Capture each distinct persisted state in the audit ledger.
CREATE SCHEMA IF NOT EXISTS worker2_crm_internal;
REVOKE ALL ON SCHEMA worker2_crm_internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION worker2_crm_internal.audit_customer_sales_offer_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_state jsonb;
  v_fingerprint text;
BEGIN
  v_state := to_jsonb(NEW) - 'updated_at';
  v_fingerprint := md5(v_state::text);
  IF TG_OP = 'UPDATE' AND v_state IS NOT DISTINCT FROM (to_jsonb(OLD) - 'updated_at') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.customer_commercial_audit_events (
    idempotency_key, event_type, business_id, event_payload
  ) VALUES (
    'offer:' || NEW.id::text || ':state:' || v_fingerprint,
    CASE WHEN TG_OP = 'INSERT' THEN 'commercial_offer_created' ELSE 'commercial_offer_updated' END,
    NEW.business_id,
    jsonb_build_object(
      'offer_id', NEW.id,
      'product_id', NEW.product_id,
      'offer_stage', NEW.offer_stage,
      'approval_status', NEW.approval_status,
      'active', NEW.active,
      'approved_price_amount', NEW.approved_price_amount,
      'approved_currency', NEW.approved_currency,
      'max_discount_percent', NEW.max_discount_percent,
      'standard_checkout_enabled', NEW.standard_checkout_enabled
    )
  ) ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION worker2_crm_internal.audit_customer_sales_offer_transition() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER customer_sales_offers_commercial_audit
  AFTER INSERT OR UPDATE ON public.customer_sales_offers
  FOR EACH ROW EXECUTE FUNCTION worker2_crm_internal.audit_customer_sales_offer_transition();

CREATE OR REPLACE FUNCTION worker2_crm_internal.audit_customer_success_policy_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_state jsonb;
  v_fingerprint text;
BEGIN
  v_state := to_jsonb(NEW) - 'updated_at';
  v_fingerprint := md5(v_state::text);
  IF TG_OP = 'UPDATE' AND v_state IS NOT DISTINCT FROM (to_jsonb(OLD) - 'updated_at') THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.customer_commercial_audit_events (
    idempotency_key, event_type, business_id, event_payload
  ) VALUES (
    'customer-success-policy:' || NEW.business_id::text || ':state:' || v_fingerprint,
    CASE WHEN TG_OP = 'INSERT' THEN 'customer_success_policy_created' ELSE 'customer_success_policy_updated' END,
    NEW.business_id,
    jsonb_build_object(
      'enabled', NEW.enabled,
      'policy_currency', NEW.policy_currency,
      'minimum_ai_confidence', NEW.minimum_ai_confidence,
      'maximum_standard_refund_amount', NEW.maximum_standard_refund_amount,
      'maximum_standard_upsell_amount', NEW.maximum_standard_upsell_amount,
      'strategic_value_threshold', NEW.strategic_value_threshold,
      'allow_standard_checkins', NEW.allow_standard_checkins,
      'allow_approved_support_responses', NEW.allow_approved_support_responses,
      'allow_approved_surveys', NEW.allow_approved_surveys,
      'allow_standard_renewals', NEW.allow_standard_renewals,
      'allow_approved_upsell_cross_sell', NEW.allow_approved_upsell_cross_sell,
      'allow_standard_retention', NEW.allow_standard_retention,
      'allow_standard_winback', NEW.allow_standard_winback,
      'allow_standard_refunds', NEW.allow_standard_refunds,
      'policy_version', NEW.policy_version
    )
  ) ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION worker2_crm_internal.audit_customer_success_policy_transition() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER customer_success_policies_commercial_audit
  AFTER INSERT OR UPDATE ON public.customer_success_execution_policies
  FOR EACH ROW EXECUTE FUNCTION worker2_crm_internal.audit_customer_success_policy_transition();

CREATE TABLE IF NOT EXISTS public.customer_success_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  business_contact_relationship_id uuid NOT NULL REFERENCES public.business_contact_relationships(id) ON DELETE RESTRICT,
  checkout_id uuid NOT NULL REFERENCES public.customer_sales_checkout_intents(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.qtc_payments(id) ON DELETE RESTRICT,
  requested_amount numeric NOT NULL CHECK (requested_amount > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','succeeded','failed')),
  stripe_refund_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_success_one_inflight_refund_per_payment
  ON public.customer_success_refund_requests (payment_id) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS customer_success_refunds_business_created_idx
  ON public.customer_success_refund_requests (business_id, created_at DESC);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'customer_sales_billing_customers', 'customer_sales_checkout_intents', 'customer_product_accounts',
    'customer_success_execution_policies', 'customer_success_automation_queue', 'customer_commercial_audit_events',
    'customer_success_refund_requests'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);
  END LOOP;
END $$;

GRANT SELECT ON public.customer_sales_checkout_intents, public.customer_success_automation_queue, public.customer_commercial_audit_events, public.customer_product_accounts, public.customer_success_execution_policies, public.customer_success_refund_requests TO authenticated;
GRANT INSERT, UPDATE ON public.customer_success_execution_policies TO authenticated;

CREATE POLICY customer_sales_checkout_founder_read ON public.customer_sales_checkout_intents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY customer_product_accounts_customer_read ON public.customer_product_accounts
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() AND access_status = 'active');
CREATE POLICY customer_product_accounts_founder_read ON public.customer_product_accounts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY customer_success_policy_founder_manage ON public.customer_success_execution_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY customer_success_queue_founder_read ON public.customer_success_automation_queue
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY customer_commercial_audit_founder_read ON public.customer_commercial_audit_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY customer_success_refunds_founder_read ON public.customer_success_refund_requests
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER customer_sales_checkout_intents_updated_at
  BEFORE UPDATE ON public.customer_sales_checkout_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER customer_success_queue_updated_at
  BEFORE UPDATE ON public.customer_success_automation_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER customer_success_policy_updated_at
  BEFORE UPDATE ON public.customer_success_execution_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- The business-level standard policy enables routine, bounded CS work once per business.
-- High-risk actions still escalate in the server-side policy evaluator; routine refunds are capped at 50 currency units.
INSERT INTO public.customer_success_execution_policies (
  business_id, enabled, policy_currency, minimum_ai_confidence, allow_customer_product_activation,
  maximum_standard_refund_amount, maximum_standard_upsell_amount,
  strategic_value_threshold, allow_standard_checkins,
  allow_approved_support_responses, allow_approved_surveys,
  allow_standard_renewals, allow_approved_upsell_cross_sell,
  allow_standard_retention, allow_standard_winback, allow_standard_refunds
)
SELECT b.id, true,
       COALESCE((SELECT upper(COALESCE(o.approved_currency, o.price_currency))
                   FROM public.customer_sales_offers o
                  WHERE o.business_id = b.id
                    AND COALESCE(o.approved_currency, o.price_currency) ~ '^[A-Za-z]{3}$'
                  ORDER BY o.created_at DESC LIMIT 1), 'USD'),
       0.85, true, 50, 5000, 5000, true, true, true, true, true, true, true, true
  FROM public.businesses b
ON CONFLICT (business_id) DO NOTHING;

-- Businesses created after this migration receive the same bounded standard
-- Customer Success policy without requiring a founder to approve each action.
CREATE OR REPLACE FUNCTION public.initialize_customer_success_execution_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.customer_success_execution_policies (
    business_id, enabled, policy_currency, minimum_ai_confidence, allow_customer_product_activation,
    maximum_standard_refund_amount, maximum_standard_upsell_amount, strategic_value_threshold,
    allow_standard_checkins, allow_approved_support_responses, allow_approved_surveys,
    allow_standard_renewals, allow_approved_upsell_cross_sell, allow_standard_retention,
    allow_standard_winback, allow_standard_refunds
  ) VALUES (
    NEW.id, true, 'USD', 0.85, true, 50, 5000, 5000,
    true, true, true, true, true, true, true, true
  ) ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;
-- Trigger-only policy initializer. The trigger owns invocation; expose direct
-- execution only to the server-side privileged role used by trusted migrations
-- and service operations.
REVOKE EXECUTE ON FUNCTION public.initialize_customer_success_execution_policy() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_customer_success_execution_policy() TO service_role;

CREATE TRIGGER businesses_initialize_customer_success_policy
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.initialize_customer_success_execution_policy();
