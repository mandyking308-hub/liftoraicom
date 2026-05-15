
CREATE TABLE IF NOT EXISTS public.customer_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  organisation_id uuid,
  conversation_id uuid,
  support_request_id uuid,
  invoice_id uuid,
  payment_id uuid,
  assignment_id uuid,
  complaint_reference text NOT NULL UNIQUE DEFAULT 'CMP-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  complaint_status text NOT NULL DEFAULT 'open',
  complaint_category text,
  severity text NOT NULL DEFAULT 'medium',
  customer_summary text,
  internal_summary text,
  customer_requested_resolution text,
  root_cause text,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  response_due_at timestamptz,
  resolved_at timestamptz,
  founder_review_required boolean NOT NULL DEFAULT true,
  owner_agent_key text NOT NULL DEFAULT 'customer_success_agent',
  compliance_review_required boolean NOT NULL DEFAULT false,
  legal_review_recommended boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_complaints" ON public.customer_complaints
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER trg_complaints_updated_at BEFORE UPDATE ON public.customer_complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.customer_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  complaint_id uuid REFERENCES public.customer_complaints(id) ON DELETE SET NULL,
  invoice_id uuid,
  payment_id uuid,
  deal_id uuid,
  assignment_id uuid,
  dispute_reference text NOT NULL UNIQUE DEFAULT 'DSP-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  dispute_type text,
  dispute_status text NOT NULL DEFAULT 'open',
  disputed_amount numeric,
  currency text NOT NULL DEFAULT 'GBP',
  customer_position text,
  internal_position text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_resolution text,
  financial_action_recommended text,
  founder_approval_required boolean NOT NULL DEFAULT true,
  finance_review_required boolean NOT NULL DEFAULT false,
  compliance_review_required boolean NOT NULL DEFAULT false,
  legal_review_recommended boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_disputes" ON public.customer_disputes
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON public.customer_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.complaint_resolution_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  complaint_id uuid REFERENCES public.customer_complaints(id) ON DELETE CASCADE,
  dispute_id uuid REFERENCES public.customer_disputes(id) ON DELETE CASCADE,
  plan_status text NOT NULL DEFAULT 'draft',
  resolution_summary text,
  internal_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_facing_response text,
  goodwill_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  retention_risk text,
  recommended_human_touch text,
  founder_review_required boolean NOT NULL DEFAULT true,
  approved_at timestamptz,
  response_sent_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.complaint_resolution_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_resolution_plans" ON public.complaint_resolution_plans
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER trg_resolution_plans_updated_at BEFORE UPDATE ON public.complaint_resolution_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.external_action_gates (gate_key, gate_label, action_type, provider_type, enabled, requires_founder_confirmation, confirmation_phrase, max_batch_size, risk_level, metadata)
VALUES
  ('complaint_response_send_gate', 'Complaint Response Send', 'complaint_response_send', 'internal', false, true, 'SEND COMPLAINT RESPONSE', 1, 'high', '{"description":"Send approved customer-facing complaint response"}'::jsonb),
  ('dispute_response_send_gate', 'Dispute Response Send', 'dispute_response_send', 'internal', false, true, 'SEND DISPUTE RESPONSE', 1, 'high', '{"description":"Send approved customer-facing dispute response"}'::jsonb)
ON CONFLICT (gate_key) DO NOTHING;

INSERT INTO public.ai_agent_roles (agent_key, agent_name, agent_category, description, primary_module, default_status, can_read_crm, can_read_conversations, can_read_finance, can_read_suppliers, can_call_external_providers, can_mutate_operational_data, can_send_email, founder_approval_required, auto_action_allowed, risk_level, guardrails, metadata)
VALUES (
  'customer_recovery_agent',
  'Customer Recovery Agent',
  'customer_success',
  'Handles complaints, disputes and retention recovery. Checks CRM history before drafting. Coordinates Support, Finance, Supplier, Compliance and Founder Co-Pilot. Never admits liability or sends externally without founder approval.',
  'complaints_disputes',
  'preview',
  true, true, true, true,
  false, false, false,
  true, false,
  'high',
  '{"never_admit_liability": true, "never_send_external_without_approval": true, "never_mutate_invoices_payments": true, "founder_approval_required_for_customer_response": true}'::jsonb,
  '{"coordinates": ["support_agent","finance_agent","supplier_agent","compliance_agent","founder_copilot_agent","customer_success_agent"]}'::jsonb
)
ON CONFLICT (agent_key) DO NOTHING;
