
CREATE TABLE public.agent_handover_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  from_agent_key text NOT NULL,
  to_agent_key text NOT NULL,
  trigger_event text NOT NULL,
  handover_type text NOT NULL,
  required_context jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_review_required boolean NOT NULL DEFAULT true,
  auto_create_task boolean NOT NULL DEFAULT true,
  priority_level text NOT NULL DEFAULT 'normal',
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_handover_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder/admin read handover rules" ON public.agent_handover_rules
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Founder/admin manage handover rules" ON public.agent_handover_rules
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_agent_handover_rules_updated_at
BEFORE UPDATE ON public.agent_handover_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agent_handover_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  from_agent_key text NOT NULL,
  to_agent_key text NOT NULL,
  trigger_event text NOT NULL,
  source_table text,
  source_id uuid,
  contact_id uuid,
  conversation_id uuid,
  summary text,
  context_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority_level text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'created',
  task_id uuid,
  founder_review_required boolean NOT NULL DEFAULT true,
  rule_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_handover_log_recent ON public.agent_handover_log(created_at DESC);
CREATE INDEX idx_handover_log_status ON public.agent_handover_log(status);
CREATE INDEX idx_handover_log_to_agent ON public.agent_handover_log(to_agent_key);
CREATE UNIQUE INDEX uq_handover_idem ON public.agent_handover_log(rule_key, source_table, source_id)
WHERE source_id IS NOT NULL AND rule_key IS NOT NULL;

ALTER TABLE public.agent_handover_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder/admin read handover log" ON public.agent_handover_log
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Founder/admin manage handover log" ON public.agent_handover_log
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'founder'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_agent_handover_log_updated_at
BEFORE UPDATE ON public.agent_handover_log
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.agent_handover_rules
(rule_key, from_agent_key, to_agent_key, trigger_event, handover_type, required_context, priority_level, founder_review_required)
VALUES
('outreach_reply_to_inbox_agent','outreach_agent','inbox_agent','reply_received','reply_routing',
 '["contact_id","conversation_id","message_text"]'::jsonb,'normal',true),
('inbox_reply_to_engagement_agent','inbox_agent','engagement_agent','classified_inbound','engagement_continuation',
 '["contact_id","conversation_id","intent","language"]'::jsonb,'normal',true),
('engagement_interested_to_proposal_agent','engagement_agent','proposal_agent','interest_detected','proposal_request',
 '["contact_id","business_id","summary","scope"]'::jsonb,'high',true),
('engagement_high_value_to_founder_copilot','engagement_agent','founder_copilot','high_value_detected','founder_escalation',
 '["contact_id","business_id","value_estimate","reasoning"]'::jsonb,'high',true),
('proposal_ready_to_commercial_agent','proposal_agent','commercial_agent','proposal_ready','commercial_handoff',
 '["proposal_id","contact_id","business_id"]'::jsonb,'high',true),
('commercial_deal_ready_to_finance_agent','commercial_agent','finance_agent','deal_won','finance_handoff',
 '["deal_id","contact_id","amount"]'::jsonb,'high',true),
('deal_delivery_needed_to_supplier_agent','commercial_agent','supplier_agent','delivery_required','supplier_handoff',
 '["deal_id","supplier_id","scope_of_work"]'::jsonb,'normal',true),
('compliance_issue_to_compliance_agent','any','compliance_agent','compliance_flag','compliance_review',
 '["entity_type","entity_id","flag_type","jurisdiction"]'::jsonb,'high',true),
('system_error_to_ops_agent','any','ops_agent','system_error','ops_review',
 '["error_message","function_name","severity"]'::jsonb,'high',true),
('portfolio_priority_to_priority_agent','any','priority_agent','priority_signal','priority_routing',
 '["business_id","signal_type","reason"]'::jsonb,'normal',true);
