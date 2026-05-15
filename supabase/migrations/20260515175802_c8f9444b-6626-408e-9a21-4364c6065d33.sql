
ALTER TABLE public.crm_interaction_ledger
  ADD COLUMN IF NOT EXISTS organisation_id uuid,
  ADD COLUMN IF NOT EXISTS channel_key text,
  ADD COLUMN IF NOT EXISTS raw_text text,
  ADD COLUMN IF NOT EXISTS sentiment text,
  ADD COLUMN IF NOT EXISTS detected_intent text,
  ADD COLUMN IF NOT EXISTS customer_need text,
  ADD COLUMN IF NOT EXISTS customer_pain_point text,
  ADD COLUMN IF NOT EXISTS objection text,
  ADD COLUMN IF NOT EXISTS complaint_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispute_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS upsell_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS churn_risk_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS winback_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS support_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS satisfaction_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS competitor_signal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_level text DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS source_table text,
  ADD COLUMN IF NOT EXISTS source_id uuid;

CREATE INDEX IF NOT EXISTS idx_cil_complaint_signal ON public.crm_interaction_ledger(complaint_signal) WHERE complaint_signal = true;
CREATE INDEX IF NOT EXISTS idx_cil_churn_signal ON public.crm_interaction_ledger(churn_risk_signal) WHERE churn_risk_signal = true;
CREATE INDEX IF NOT EXISTS idx_cil_winback_signal ON public.crm_interaction_ledger(winback_signal) WHERE winback_signal = true;
CREATE INDEX IF NOT EXISTS idx_cil_source_combo ON public.crm_interaction_ledger(source_system, source_table, source_id);

CREATE OR REPLACE VIEW public.crm_universal_interaction_log AS
SELECT
  id, business_id, contact_id, organisation_id, conversation_id,
  source_system, source_table, source_id,
  interaction_type, direction AS interaction_direction,
  COALESCE(channel_key, source_channel) AS channel_key,
  occurred_at, subject, summary, raw_text, sentiment, detected_intent,
  customer_need, customer_pain_point, objection,
  complaint_signal, dispute_signal, upsell_signal, churn_risk_signal,
  winback_signal, support_signal, satisfaction_signal, competitor_signal,
  ai_relevant, founder_review_required, privacy_level, metadata, created_at
FROM public.crm_interaction_ledger;

CREATE TABLE IF NOT EXISTS public.customer_winback_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  organisation_id uuid,
  plan_status text DEFAULT 'draft',
  winback_reason text,
  customer_history_summary text,
  last_positive_interaction_at timestamptz,
  last_negative_interaction_at timestamptz,
  inactivity_days integer,
  churn_risk_level text,
  root_cause_summary text,
  recommended_recovery_angle text,
  recommended_human_touch text,
  proposed_next_action text,
  proposed_message_subject text,
  proposed_message_body text,
  goodwill_options jsonb DEFAULT '[]'::jsonb,
  offer_or_package_recommendation jsonb DEFAULT '[]'::jsonb,
  founder_review_required boolean DEFAULT true,
  send_allowed boolean DEFAULT false,
  approved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.customer_winback_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage winback plans" ON public.customer_winback_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE INDEX IF NOT EXISTS idx_cwp_contact ON public.customer_winback_plans(contact_id);
CREATE INDEX IF NOT EXISTS idx_cwp_status ON public.customer_winback_plans(plan_status);
CREATE TRIGGER trg_cwp_updated BEFORE UPDATE ON public.customer_winback_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_agent_roles
  (agent_key, agent_name, agent_category, description, primary_module, default_status,
   can_read_crm, can_read_conversations, can_read_finance, can_read_suppliers,
   can_call_external_providers, can_mutate_operational_data, can_send_email,
   can_create_proposals, can_create_deals, can_create_invoices,
   founder_approval_required, auto_action_allowed, risk_level, guardrails)
VALUES (
  'winback_agent','Win-Back Agent','customer_success',
  'Monitors inactive, unhappy, lost and churn-risk customers. Reads full CRM history before recommending recovery. Drafts win-back plans for founder approval. Never sends external messages.',
  'customer_success','preview',
  true,true,true,false,false,false,false,false,false,false,
  true,false,'high',
  '{"never_send_external":true,"never_admit_liability":true,"never_mutate_finance":true,"requires_founder_approval":true}'::jsonb
)
ON CONFLICT (agent_key) DO UPDATE SET description = EXCLUDED.description, guardrails = EXCLUDED.guardrails;

INSERT INTO public.agent_handover_rules (rule_key, from_agent_key, to_agent_key, trigger_event, handover_type, required_context, founder_review_required, priority_level)
VALUES
 ('survey_unhappy_to_customer_success','customer_success_agent','customer_success_agent','survey_response_unhappy','escalation','["survey_id","contact_id"]'::jsonb,true,'high'),
 ('survey_complaint_to_customer_recovery','customer_success_agent','customer_recovery_agent','survey_response_complaint','escalation','["survey_id","contact_id"]'::jsonb,true,'high'),
 ('complaint_to_customer_recovery','customer_success_agent','customer_recovery_agent','complaint_logged','assignment','["complaint_id","contact_id"]'::jsonb,true,'high'),
 ('dispute_to_finance_and_recovery','customer_success_agent','customer_recovery_agent','dispute_opened','escalation','["dispute_id","invoice_id","contact_id"]'::jsonb,true,'high'),
 ('unresolved_support_to_support','customer_success_agent','support_agent','support_unresolved','escalation','["support_id","contact_id"]'::jsonb,true,'high'),
 ('repeated_issue_to_founder_copilot','support_agent','founder_copilot_agent','repeated_support_issue','escalation','["contact_id","issue_history"]'::jsonb,true,'high'),
 ('low_satisfaction_to_winback','customer_success_agent','winback_agent','low_satisfaction_detected','assignment','["contact_id","csat","memory"]'::jsonb,true,'high'),
 ('inactive_customer_to_winback','customer_success_agent','winback_agent','customer_inactive','assignment','["contact_id","last_interaction_at"]'::jsonb,true,'normal'),
 ('upsell_interest_to_customer_success','winback_agent','customer_success_agent','upsell_interest_detected','assignment','["contact_id","upsell_signal"]'::jsonb,true,'normal'),
 ('competitor_mention_to_competitor_learning','customer_success_agent','competitor_learning_agent','competitor_mentioned','notification','["contact_id","mention_text"]'::jsonb,true,'normal'),
 ('testimonial_permission_to_marketing','customer_success_agent','marketing_agent','testimonial_opportunity','assignment','["contact_id","quote"]'::jsonb,true,'normal')
ON CONFLICT (rule_key) DO NOTHING;

INSERT INTO public.command_centre_customer_journey_steps
  (step_key, step_label, step_order, journey_stage_group, description, primary_route, command_centre_anchor, owner_agent_key, external_action_risk, founder_approval_required, enabled)
VALUES
 ('survey_response_received','Survey response received',41,'retention','Customer feedback captured','/founder/command-centre','sec-customer-feedback','customer_success_agent',false,true,true),
 ('survey_outcome_action','Survey outcome action drafted',42,'retention','Internal action drafted from survey outcome','/founder/command-centre','sec-crm-total-memory','customer_success_agent',false,true,true),
 ('complaint_received','Complaint received',43,'retention','Customer complaint logged','/founder/command-centre','sec-complaints-disputes','customer_recovery_agent',false,true,true),
 ('dispute_opened','Dispute opened',44,'retention','Customer dispute opened','/founder/command-centre','sec-complaints-disputes','customer_recovery_agent',false,true,true),
 ('recovery_plan_created','Recovery plan created',45,'retention','Recovery plan drafted for founder','/founder/command-centre','sec-crm-total-memory','customer_recovery_agent',false,true,true),
 ('recovery_followup_due','Recovery follow-up due',46,'retention','Recovery follow-up due for human action','/founder/command-centre','sec-crm-total-memory','customer_recovery_agent',false,true,true),
 ('winback_needed','Win-back needed',47,'retention','Customer flagged for win-back','/founder/command-centre','sec-human-layer-memory','winback_agent',false,true,true),
 ('winback_plan_created','Win-back plan created',48,'retention','Win-back plan drafted for founder','/founder/command-centre','sec-human-layer-memory','winback_agent',false,true,true),
 ('customer_returned','Customer returned',49,'retention','Customer re-engaged after win-back','/founder/command-centre','sec-human-layer-memory','customer_success_agent',false,true,true),
 ('customer_retained','Customer retained',50,'retention','Customer renewed or retained','/founder/command-centre','sec-retention-recurring','customer_success_agent',false,true,true),
 ('upsell_opportunity_created','Upsell opportunity created',51,'retention','Upsell opportunity logged for founder','/founder/command-centre','sec-customer-success-upsell','customer_success_agent',false,true,true)
ON CONFLICT (step_key) DO NOTHING;

INSERT INTO public.external_action_gates (gate_key, gate_label, action_type, enabled, confirmation_phrase, max_batch_size, risk_level)
VALUES ('winback_message_send_gate','Win-back message send','external_message_send', false, 'SEND WIN-BACK MESSAGE', 1, 'high')
ON CONFLICT (gate_key) DO NOTHING;
