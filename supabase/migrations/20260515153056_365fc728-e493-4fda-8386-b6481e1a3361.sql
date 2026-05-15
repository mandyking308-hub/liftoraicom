CREATE TABLE public.autopilot_activation_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  gate_key text NOT NULL,
  gate_label text NOT NULL,
  workflow_key text NULL,
  agent_key text NULL,
  action_type text NOT NULL,
  current_state text NOT NULL DEFAULT 'locked',
  requested_autonomy_level integer NOT NULL DEFAULT 2,
  max_allowed_autonomy_level integer NOT NULL DEFAULT 3,
  required_readiness_score numeric NOT NULL DEFAULT 90,
  requires_founder_final_approval boolean NOT NULL DEFAULT true,
  requires_successful_test_runs integer NOT NULL DEFAULT 3,
  requires_no_critical_findings boolean NOT NULL DEFAULT true,
  requires_compliance_pass boolean NOT NULL DEFAULT true,
  external_action boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, gate_key)
);

CREATE INDEX idx_autopilot_gates_business ON public.autopilot_activation_gates(business_id);
CREATE INDEX idx_autopilot_gates_state ON public.autopilot_activation_gates(current_state);

ALTER TABLE public.autopilot_activation_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders and admins can view autopilot gates"
ON public.autopilot_activation_gates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders and admins can insert autopilot gates"
ON public.autopilot_activation_gates FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders and admins can update autopilot gates"
ON public.autopilot_activation_gates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders and admins can delete autopilot gates"
ON public.autopilot_activation_gates FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_autopilot_gates_updated_at
BEFORE UPDATE ON public.autopilot_activation_gates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.autopilot_activation_gates
(gate_key, gate_label, action_type, external_action, max_allowed_autonomy_level, required_readiness_score, requires_successful_test_runs, metadata)
VALUES
('internal_agent_task_autopilot', 'Internal Agent Task Autopilot', 'internal_task', false, 4, 80, 3, '{"risk":"low"}'::jsonb),
('crm_capture_autopilot', 'CRM Capture Autopilot', 'crm_write', false, 4, 80, 3, '{"risk":"low"}'::jsonb),
('ai_draft_autopilot', 'AI Draft Generation Autopilot', 'ai_draft', false, 3, 85, 3, '{"risk":"low"}'::jsonb),
('founder_brief_autopilot', 'Founder Brief Autopilot', 'briefing', false, 4, 80, 3, '{"risk":"low"}'::jsonb),
('proposal_draft_autopilot', 'Proposal Draft Autopilot', 'proposal_draft', false, 3, 90, 3, '{"risk":"medium"}'::jsonb),
('finance_review_autopilot', 'Finance Review Autopilot', 'finance_review', false, 2, 90, 5, '{"risk":"medium"}'::jsonb),
('supplier_review_autopilot', 'Supplier Review Autopilot', 'supplier_review', false, 2, 90, 5, '{"risk":"medium"}'::jsonb),
('native_email_send_autopilot_locked', 'Native Email Send Autopilot (LOCKED)', 'external_email_send', true, 1, 99, 10, '{"risk":"high","permanently_locked_default":true}'::jsonb),
('smartlead_lead_push_autopilot_locked', 'Smartlead Lead Push Autopilot (LOCKED)', 'external_provider_push', true, 1, 99, 10, '{"risk":"high","permanently_locked_default":true}'::jsonb),
('apollo_reveal_autopilot_locked', 'Apollo Reveal Autopilot (LOCKED)', 'external_credit_spend', true, 1, 99, 10, '{"risk":"high","permanently_locked_default":true}'::jsonb),
('campaign_start_autopilot_locked', 'Campaign Start Autopilot (LOCKED)', 'campaign_start', true, 1, 99, 10, '{"risk":"high","permanently_locked_default":true}'::jsonb);