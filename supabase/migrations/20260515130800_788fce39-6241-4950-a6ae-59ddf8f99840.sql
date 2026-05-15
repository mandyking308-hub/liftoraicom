-- ai_agent_task_queue
CREATE TABLE IF NOT EXISTS public.ai_agent_task_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  agent_key text NOT NULL,
  task_type text NOT NULL,
  task_title text NOT NULL,
  task_summary text,
  source_system text,
  source_table text,
  source_id uuid,
  contact_id uuid,
  conversation_id uuid,
  interaction_id uuid,
  proposal_id uuid,
  deal_id uuid,
  invoice_id uuid,
  supplier_id uuid,
  priority_level text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'queued',
  founder_approval_required boolean NOT NULL DEFAULT true,
  auto_execute_allowed boolean NOT NULL DEFAULT false,
  execution_enabled boolean NOT NULL DEFAULT false,
  dry_run_only boolean NOT NULL DEFAULT true,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_action text,
  agent_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_agent_task_queue_agent_key_idx ON public.ai_agent_task_queue (agent_key);
CREATE INDEX IF NOT EXISTS ai_agent_task_queue_status_idx ON public.ai_agent_task_queue (status);
CREATE INDEX IF NOT EXISTS ai_agent_task_queue_business_id_idx ON public.ai_agent_task_queue (business_id);
CREATE INDEX IF NOT EXISTS ai_agent_task_queue_contact_id_idx ON public.ai_agent_task_queue (contact_id);
CREATE INDEX IF NOT EXISTS ai_agent_task_queue_conversation_id_idx ON public.ai_agent_task_queue (conversation_id);
CREATE INDEX IF NOT EXISTS ai_agent_task_queue_priority_idx ON public.ai_agent_task_queue (priority_level);
CREATE INDEX IF NOT EXISTS ai_agent_task_queue_due_at_idx ON public.ai_agent_task_queue (due_at);
ALTER TABLE public.ai_agent_task_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders/admins read ai_agent_task_queue" ON public.ai_agent_task_queue;
CREATE POLICY "Founders/admins read ai_agent_task_queue" ON public.ai_agent_task_queue FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
DROP POLICY IF EXISTS "Founders/admins write ai_agent_task_queue" ON public.ai_agent_task_queue;
CREATE POLICY "Founders/admins write ai_agent_task_queue" ON public.ai_agent_task_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

-- ai_agent_task_types
CREATE TABLE IF NOT EXISTS public.ai_agent_task_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  default_agent_key text NOT NULL,
  founder_approval_required boolean NOT NULL DEFAULT true,
  auto_execute_allowed boolean NOT NULL DEFAULT false,
  dry_run_only boolean NOT NULL DEFAULT true,
  creates_operational_record boolean NOT NULL DEFAULT false,
  sends_email boolean NOT NULL DEFAULT false,
  external_provider_call boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_task_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders/admins read ai_agent_task_types" ON public.ai_agent_task_types;
CREATE POLICY "Founders/admins read ai_agent_task_types" ON public.ai_agent_task_types FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
DROP POLICY IF EXISTS "Founders/admins write ai_agent_task_types" ON public.ai_agent_task_types;
CREATE POLICY "Founders/admins write ai_agent_task_types" ON public.ai_agent_task_types FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

INSERT INTO public.ai_agent_task_types (task_type, label, description, default_agent_key) VALUES
 ('classify_inbound_reply','Classify inbound reply','Classify intent/urgency for a new inbound reply.','inbox_agent'),
 ('draft_reply','Draft reply','Draft a reply for founder approval.','inbox_agent'),
 ('summarise_conversation','Summarise conversation','Summarise an existing conversation thread.','ai_engagement_agent'),
 ('recommend_next_action','Recommend next action','Recommend the next CRM action for a contact.','ai_engagement_agent'),
 ('score_lead_priority','Score lead priority','Score and rank a lead.','priority_agent'),
 ('prepare_proposal_preview','Prepare proposal preview','Generate a proposal draft preview.','proposal_agent'),
 ('prepare_demo_preview','Prepare demo preview','Prepare demo readiness preview.','demo_agent'),
 ('prepare_deal_preview','Prepare deal preview','Recommend a deal/stage move.','deal_agent'),
 ('prepare_invoice_preview','Prepare invoice preview','Recommend an invoice action.','finance_agent'),
 ('recommend_supplier_assignment','Recommend supplier assignment','Recommend a supplier assignment.','supplier_agent'),
 ('compliance_review_preview','Compliance review preview','Review compliance state and recommend.','compliance_agent'),
 ('system_warning_triage','System warning triage','Triage a system warning and recommend a fix.','ops_agent'),
 ('founder_daily_brief','Founder daily brief','Compile a founder daily brief.','founder_copilot_agent'),
 ('smartlead_event_review','Smartlead event review','Review provider events and recommend.','outreach_agent'),
 ('crm_timeline_review','CRM timeline review','Review a contact timeline and recommend.','ai_engagement_agent')
ON CONFLICT (task_type) DO NOTHING;