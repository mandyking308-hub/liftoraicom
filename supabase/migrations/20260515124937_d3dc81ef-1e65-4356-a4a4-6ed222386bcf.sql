-- Lifecycle stages
CREATE TABLE IF NOT EXISTS public.crm_lifecycle_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key text NOT NULL UNIQUE,
  stage_label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'contact',
  founder_review_required boolean NOT NULL DEFAULT true,
  ai_draft_allowed boolean NOT NULL DEFAULT false,
  auto_send_allowed boolean NOT NULL DEFAULT false,
  proposal_allowed boolean NOT NULL DEFAULT false,
  demo_allowed boolean NOT NULL DEFAULT false,
  deal_allowed boolean NOT NULL DEFAULT false,
  suppression_stage boolean NOT NULL DEFAULT false,
  closed_stage boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_lifecycle_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read lifecycle stages" ON public.crm_lifecycle_stages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Founders manage lifecycle stages" ON public.crm_lifecycle_stages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_cls_updated BEFORE UPDATE ON public.crm_lifecycle_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_lifecycle_stages
(stage_key, stage_label, sort_order, ai_draft_allowed, proposal_allowed, demo_allowed, deal_allowed, suppression_stage, closed_stage, founder_review_required) VALUES
('raw_lead','Raw Lead',10,false,false,false,false,false,false,true),
('crm_contact','CRM Contact',20,false,false,false,false,false,false,true),
('compliance_pending','Compliance Pending',30,false,false,false,false,false,false,true),
('outreach_allowed','Outreach Allowed',40,true,false,false,false,false,false,true),
('cold_outreach_active','Cold Outreach Active',50,true,false,false,false,false,false,true),
('reply_received','Reply Received',60,true,false,false,false,false,false,true),
('needs_founder_review','Needs Founder Review',70,false,false,false,false,false,false,true),
('ai_draft_ready','AI Draft Ready',80,true,false,false,false,false,false,true),
('waiting_on_customer','Waiting on Customer',90,false,false,false,false,false,false,true),
('engaged','Engaged',100,true,true,true,false,false,false,true),
('qualified','Qualified',110,true,true,true,true,false,false,true),
('proposal_ready','Proposal Ready',120,true,true,true,true,false,false,true),
('proposal_sent','Proposal Sent',130,true,true,true,true,false,false,true),
('demo_ready','Demo Ready',140,true,true,true,true,false,false,true),
('demo_viewed','Demo Viewed',150,true,true,true,true,false,false,true),
('deal_ready','Deal Ready',160,true,true,true,true,false,false,true),
('deal_open','Deal Open',170,true,true,true,true,false,false,true),
('client','Client',180,true,true,true,true,false,false,true),
('closed_lost','Closed Lost',190,false,false,false,false,false,true,false),
('do_not_contact','Do Not Contact',200,false,false,false,false,true,true,false),
('unsubscribed','Unsubscribed',210,false,false,false,false,true,true,false),
('bounced','Bounced',220,false,false,false,false,true,true,false),
('wrong_person','Wrong Person',230,false,false,false,false,false,false,true)
ON CONFLICT (stage_key) DO NOTHING;

-- Next action rules
CREATE TABLE IF NOT EXISTS public.crm_next_action_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  source_stage text,
  interaction_type text,
  detected_intent text,
  recommended_stage text,
  recommended_action text NOT NULL,
  priority_level text NOT NULL DEFAULT 'normal',
  founder_review_required boolean NOT NULL DEFAULT true,
  ai_draft_allowed boolean NOT NULL DEFAULT false,
  proposal_trigger_allowed boolean NOT NULL DEFAULT false,
  demo_trigger_allowed boolean NOT NULL DEFAULT false,
  deal_trigger_allowed boolean NOT NULL DEFAULT false,
  suppression_trigger_allowed boolean NOT NULL DEFAULT false,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_next_action_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read next-action rules" ON public.crm_next_action_rules
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Founders manage next-action rules" ON public.crm_next_action_rules
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_cnar_updated BEFORE UPDATE ON public.crm_next_action_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_next_action_rules
(rule_key, interaction_type, detected_intent, recommended_stage, recommended_action, priority_level, ai_draft_allowed, proposal_trigger_allowed, demo_trigger_allowed, deal_trigger_allowed, suppression_trigger_allowed, founder_review_required, notes) VALUES
('reply_interested','smartlead_reply_received','interested','needs_founder_review','draft_response','high',true,false,false,false,false,true,'Founder reviews AI draft before sending.'),
('reply_send_more','smartlead_reply_received','send_more','ai_draft_ready','prepare_more_info','normal',true,false,false,false,false,true,null),
('reply_not_relevant','smartlead_reply_received','not_relevant','closed_lost','no_further_action','low',false,false,false,false,true,true,null),
('reply_wrong_person','smartlead_reply_received','wrong_person','needs_founder_review','verify_contact','normal',false,false,false,false,false,true,null),
('reply_unsubscribe','smartlead_reply_received','unsubscribe','unsubscribed','suppress_contact','high',false,false,false,false,true,true,'Suppression executed via existing compliance flow when enabled.'),
('bounce','email_bounced',null,'bounced','suppress_contact','high',false,false,false,false,true,true,null),
('proposal_accepted','proposal_accepted','proposal_interest','deal_ready','create_deal_review','high',false,false,false,true,false,true,null),
('demo_completed_high_intent','demo_completed','demo_interest','deal_ready','founder_review','high',false,false,true,true,false,true,null),
('payment_received','payment_received',null,'client','update_finance','normal',false,false,false,false,false,true,'Finance reconciliation only.'),
('high_value_signal',null,'deal_signal','needs_founder_review','escalate_to_founder','urgent',false,false,false,false,false,true,null)
ON CONFLICT (rule_key) DO NOTHING;

-- Founder review queue
CREATE TABLE IF NOT EXISTS public.crm_founder_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  interaction_id uuid,
  conversation_id uuid,
  review_type text NOT NULL,
  priority_level text NOT NULL DEFAULT 'normal',
  current_stage text,
  recommended_stage text,
  recommended_action text,
  summary text,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  founder_decision text,
  decided_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cfrq_status ON public.crm_founder_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_cfrq_priority ON public.crm_founder_review_queue(priority_level);
CREATE INDEX IF NOT EXISTS idx_cfrq_contact ON public.crm_founder_review_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_cfrq_business ON public.crm_founder_review_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_cfrq_interaction ON public.crm_founder_review_queue(interaction_id);
ALTER TABLE public.crm_founder_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read review queue" ON public.crm_founder_review_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Founders manage review queue" ON public.crm_founder_review_queue
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_cfrq_updated BEFORE UPDATE ON public.crm_founder_review_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();