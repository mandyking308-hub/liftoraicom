ALTER TABLE public.agent_handover_rules ADD COLUMN IF NOT EXISTS from_customer_stage text;
ALTER TABLE public.agent_handover_rules ADD COLUMN IF NOT EXISTS to_customer_stage text;

CREATE INDEX IF NOT EXISTS idx_csa_stage ON public.customer_stewardship_assignments(customer_stage);
CREATE INDEX IF NOT EXISTS idx_csa_due ON public.customer_stewardship_assignments(next_due_at);

INSERT INTO public.agent_handover_rules (rule_key, from_agent_key, to_agent_key, trigger_event, handover_type, founder_review_required, auto_create_task, priority_level, enabled)
VALUES
  ('engagement_compliance_issue_to_compliance_agent', 'ai_engagement_agent', 'compliance_agent', 'compliance_flag_detected', 'interrupt', true, true, 'high', true),
  ('finance_payment_issue_to_founder_copilot', 'finance_agent', 'founder_co_pilot', 'payment_issue', 'escalate', true, true, 'high', true)
ON CONFLICT (rule_key) DO NOTHING;