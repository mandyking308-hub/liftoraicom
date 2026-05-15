-- ============================================================
-- AUTONOMY LEVELS
-- ============================================================
CREATE TABLE public.autonomy_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_key text NOT NULL UNIQUE,
  level_number integer NOT NULL UNIQUE,
  level_label text NOT NULL,
  description text,
  internal_record_creation_allowed boolean NOT NULL DEFAULT false,
  ai_draft_creation_allowed boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  external_send_allowed boolean NOT NULL DEFAULT false,
  provider_mutation_allowed boolean NOT NULL DEFAULT false,
  credit_spend_allowed boolean NOT NULL DEFAULT false,
  money_movement_allowed boolean NOT NULL DEFAULT false,
  compliance_mutation_allowed boolean NOT NULL DEFAULT false,
  max_risk_level text NOT NULL DEFAULT 'low',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.autonomy_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins can view autonomy levels"
  ON public.autonomy_levels FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders/admins can manage autonomy levels"
  ON public.autonomy_levels FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_autonomy_levels_updated_at
  BEFORE UPDATE ON public.autonomy_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.autonomy_levels
  (level_key, level_number, level_label, description,
   internal_record_creation_allowed, ai_draft_creation_allowed, founder_approval_required,
   external_send_allowed, provider_mutation_allowed, credit_spend_allowed,
   money_movement_allowed, compliance_mutation_allowed, max_risk_level)
VALUES
  ('observe_only', 0, 'Observe Only',
    'Read and report only. No drafts, no internal records, no external actions.',
    false, false, true, false, false, false, false, false, 'low'),
  ('draft_only', 1, 'Draft Only',
    'AI may produce drafts and recommendations only. No records created.',
    false, true, true, false, false, false, false, false, 'low'),
  ('internal_execution', 2, 'Internal Execution',
    'AI may create internal records, tasks, approvals and reviews. No external action.',
    true, true, false, false, false, false, false, false, 'low'),
  ('founder_approved_external', 3, 'Founder Approved External',
    'External actions only after explicit founder approval per item.',
    true, true, true, false, false, false, false, false, 'medium'),
  ('policy_approved_automation', 4, 'Policy Approved Automation',
    'Low-risk external actions allowed under explicit policy limits and gates.',
    true, true, false, true, true, true, false, false, 'medium'),
  ('full_autopilot_restricted', 5, 'Full Autopilot (Restricted)',
    'Highly restricted mature workflows only. Never the global default.',
    true, true, false, true, true, true, true, true, 'high');

-- ============================================================
-- AUTONOMY POLICIES
-- ============================================================
CREATE TABLE public.autonomy_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  agent_key text,
  channel_key text,
  action_type text NOT NULL,
  jurisdiction_code text,
  autonomy_level integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  max_batch_size integer NOT NULL DEFAULT 1,
  max_daily_actions integer NOT NULL DEFAULT 0,
  max_monthly_actions integer NOT NULL DEFAULT 0,
  requires_founder_approval boolean NOT NULL DEFAULT true,
  requires_compliance_pass boolean NOT NULL DEFAULT true,
  requires_business_hours boolean NOT NULL DEFAULT true,
  requires_human_review_for_high_risk boolean NOT NULL DEFAULT true,
  allowed_languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocked_countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level text NOT NULL DEFAULT 'medium',
  policy_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_autonomy_policies_lookup
  ON public.autonomy_policies (action_type, business_id, agent_key, channel_key);

ALTER TABLE public.autonomy_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins can view autonomy policies"
  ON public.autonomy_policies FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders/admins can manage autonomy policies"
  ON public.autonomy_policies FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_autonomy_policies_updated_at
  BEFORE UPDATE ON public.autonomy_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default global policies (business_id NULL = applies to all)
INSERT INTO public.autonomy_policies
  (action_type, autonomy_level, requires_founder_approval, requires_compliance_pass,
   requires_business_hours, risk_level, policy_notes, metadata)
VALUES
  ('internal_agent_task_create', 2, false, false, false, 'low',
    'Internal agent tasks can be created without founder approval.',
    jsonb_build_object('external_send_allowed', false)),
  ('ai_draft_create', 2, false, false, false, 'low',
    'AI drafts can be created internally; sending requires separate approval.',
    jsonb_build_object('external_send_allowed', false)),
  ('founder_approval_item_create', 2, false, false, false, 'low',
    'System may queue founder approval items autonomously.',
    '{}'::jsonb),
  ('crm_interaction_capture', 2, false, false, false, 'low',
    'CRM captures allowed when matched/idempotent; no founder approval required.',
    jsonb_build_object('idempotent_required', true)),
  ('reply_draft_prepare', 2, true, true, false, 'medium',
    'Reply drafts prepared internally; founder approval required before send.',
    jsonb_build_object('external_send_allowed', false)),
  ('proposal_draft_create', 2, true, true, false, 'medium',
    'Proposal drafts internal; founder approval required before send.',
    jsonb_build_object('external_send_allowed', false)),
  ('commercial_handoff_review_create', 2, false, false, false, 'low',
    'Commercial handoff review entries may be created autonomously.',
    '{}'::jsonb),
  ('finance_review_create', 2, false, false, false, 'low',
    'Finance review tasks may be created autonomously for human review.',
    '{}'::jsonb),
  ('supplier_review_create', 2, false, false, false, 'low',
    'Supplier review tasks may be created autonomously for human review.',
    '{}'::jsonb),
  ('native_email_send', 3, true, true, true, 'high',
    'Native email send requires founder approval and explicit external gate.',
    jsonb_build_object('external_send_allowed', false, 'requires_explicit_gate', true)),
  ('smartlead_lead_push', 3, true, true, true, 'high',
    'Smartlead lead push requires founder approval and explicit provider gate.',
    jsonb_build_object('provider_mutation_allowed', false, 'requires_explicit_gate', true)),
  ('apollo_reveal', 3, true, true, true, 'high',
    'Apollo reveal requires founder approval and explicit credit-spend gate.',
    jsonb_build_object('credit_spend_allowed', false, 'requires_explicit_gate', true)),
  ('campaign_start', 3, true, true, true, 'high',
    'Campaign start requires founder approval and explicit provider gate.',
    jsonb_build_object('provider_mutation_allowed', false, 'requires_explicit_gate', true)),
  ('compliance_approval', 3, true, true, false, 'high',
    'Compliance approvals require explicit founder approval.',
    '{}'::jsonb),
  ('invoice_send', 3, true, true, true, 'high',
    'Invoice send requires founder approval before any external delivery.',
    jsonb_build_object('external_send_allowed', false));

-- ============================================================
-- AUTONOMY ACTION AUDIT
-- ============================================================
CREATE TABLE public.autonomy_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  agent_key text,
  action_type text NOT NULL,
  channel_key text,
  jurisdiction_code text,
  language_code text,
  requested_autonomy_level integer,
  resolved_autonomy_level integer,
  allowed boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  blocked_reason text,
  policy_id uuid,
  source_table text,
  source_id uuid,
  target_table text,
  target_id uuid,
  external_action boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  provider_mutation boolean NOT NULL DEFAULT false,
  credit_spend boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_autonomy_audit_recent
  ON public.autonomy_action_audit (created_at DESC);
CREATE INDEX idx_autonomy_audit_action
  ON public.autonomy_action_audit (action_type, created_at DESC);

ALTER TABLE public.autonomy_action_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins can view autonomy audit"
  ON public.autonomy_action_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders/admins can insert autonomy audit"
  ON public.autonomy_action_audit FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));