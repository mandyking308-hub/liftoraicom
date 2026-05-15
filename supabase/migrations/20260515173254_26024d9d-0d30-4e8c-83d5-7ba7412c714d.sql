
CREATE TABLE IF NOT EXISTS public.customer_onboarding_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  organisation_id uuid,
  deal_id uuid,
  proposal_id uuid,
  onboarding_status text NOT NULL DEFAULT 'draft',
  onboarding_type text,
  customer_goal text,
  success_definition text,
  welcome_summary text,
  internal_notes text,
  customer_facing_instructions text,
  key_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_customer_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_company_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  check_in_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  support_route text,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_agent_key text NOT NULL DEFAULT 'customer_success_agent',
  founder_review_required boolean NOT NULL DEFAULT true,
  customer_share_allowed boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  onboarding_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_onboarding_business_contact_deal
  ON public.customer_onboarding_plans (business_id, contact_id, COALESCE(deal_id, '00000000-0000-0000-0000-000000000000'::uuid));
ALTER TABLE public.customer_onboarding_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_onboarding_plans" ON public.customer_onboarding_plans
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER trg_cop_updated_at BEFORE UPDATE ON public.customer_onboarding_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.customer_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_plan_id uuid REFERENCES public.customer_onboarding_plans(id) ON DELETE CASCADE,
  business_id uuid,
  contact_id uuid,
  task_owner text NOT NULL DEFAULT 'company',
  owner_agent_key text,
  task_title text NOT NULL,
  task_description text,
  due_at timestamptz,
  task_status text NOT NULL DEFAULT 'pending',
  priority_level text NOT NULL DEFAULT 'normal',
  customer_visible boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_onboarding_tasks" ON public.customer_onboarding_tasks
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER trg_cot_updated_at BEFORE UPDATE ON public.customer_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.onboarding_email_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  onboarding_plan_id uuid REFERENCES public.customer_onboarding_plans(id) ON DELETE CASCADE,
  draft_type text NOT NULL,
  draft_subject text,
  draft_body text,
  customer_facing boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'draft',
  send_allowed boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_email_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_onboarding_emails" ON public.onboarding_email_drafts
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER trg_oed_updated_at BEFORE UPDATE ON public.onboarding_email_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.external_action_gates (gate_key, gate_label, action_type, provider_type, enabled, requires_founder_confirmation, confirmation_phrase, max_batch_size, risk_level, metadata)
VALUES ('customer_onboarding_share_gate', 'Customer Onboarding Share', 'customer_onboarding_share', 'internal', false, true, 'SHARE CUSTOMER ONBOARDING', 1, 'high', '{"description":"Share approved onboarding plan with customer via portal link or email"}'::jsonb)
ON CONFLICT (gate_key) DO NOTHING;
