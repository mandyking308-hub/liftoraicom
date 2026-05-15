CREATE TABLE IF NOT EXISTS public.external_action_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_key text NOT NULL UNIQUE,
  gate_label text NOT NULL,
  action_type text NOT NULL,
  provider_type text,
  enabled boolean NOT NULL DEFAULT false,
  requires_founder_confirmation boolean NOT NULL DEFAULT true,
  confirmation_phrase text NOT NULL,
  max_batch_size integer NOT NULL DEFAULT 1,
  risk_level text NOT NULL DEFAULT 'high',
  last_used_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.external_action_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_admins_all_eag"
ON public.external_action_gates
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER trg_eag_updated_at BEFORE UPDATE ON public.external_action_gates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.external_action_gates (gate_key, gate_label, action_type, provider_type, confirmation_phrase, risk_level, max_batch_size) VALUES
  ('native_email_send_gate', 'Native Email Send', 'native_email_send', 'native_email', 'EXECUTE NATIVE EMAIL SEND', 'high', 1),
  ('smartlead_lead_push_gate', 'Smartlead Lead Push', 'smartlead_lead_push', 'smartlead', 'EXECUTE SMARTLEAD LEAD PUSH', 'high', 25),
  ('smartlead_campaign_start_gate', 'Smartlead Campaign Start', 'smartlead_campaign_start', 'smartlead', 'EXECUTE SMARTLEAD CAMPAIGN START', 'critical', 1),
  ('smartlead_webhook_create_gate', 'Smartlead Webhook Create', 'smartlead_webhook_create', 'smartlead', 'EXECUTE SMARTLEAD WEBHOOK CREATE', 'high', 1),
  ('apollo_reveal_gate', 'Apollo Reveal', 'apollo_reveal', 'apollo', 'EXECUTE APOLLO REVEAL', 'high', 10),
  ('apollo_candidate_pull_gate', 'Apollo Candidate Pull', 'apollo_candidate_pull', 'apollo', 'EXECUTE APOLLO CANDIDATE PULL', 'high', 50),
  ('compliance_approval_gate', 'Compliance Approval', 'compliance_action', 'compliance', 'EXECUTE COMPLIANCE APPROVAL', 'high', 10),
  ('compliance_suppression_gate', 'Compliance Suppression', 'compliance_suppression', 'compliance', 'EXECUTE COMPLIANCE SUPPRESSION', 'high', 50),
  ('invoice_send_gate', 'Invoice Send', 'invoice_send', 'finance', 'EXECUTE INVOICE SEND', 'critical', 1),
  ('proposal_send_gate', 'Proposal Send', 'proposal_send', 'commercial', 'EXECUTE PROPOSAL SEND', 'high', 1)
ON CONFLICT (gate_key) DO NOTHING;