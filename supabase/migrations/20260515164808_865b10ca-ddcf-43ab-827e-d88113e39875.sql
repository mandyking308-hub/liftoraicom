
-- 1. Manual registry
CREATE TABLE IF NOT EXISTS public.command_centre_manual_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_source text NOT NULL,
  object_kind text NOT NULL,
  object_name text NOT NULL,
  schema_name text,
  route_path text,
  module_area text,
  purpose text,
  command_centre_section text,
  business_scoped boolean NOT NULL DEFAULT false,
  global_object boolean NOT NULL DEFAULT false,
  external_action_risk boolean NOT NULL DEFAULT false,
  requires_founder_approval boolean NOT NULL DEFAULT true,
  owner_agent_key text,
  workflow_key text,
  data_flow_key text,
  readiness_status text NOT NULL DEFAULT 'not_checked',
  visibility_status text NOT NULL DEFAULT 'not_checked',
  route_status text NOT NULL DEFAULT 'not_checked',
  rls_status text NOT NULL DEFAULT 'not_checked',
  next_action text,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ccmr_object
  ON public.command_centre_manual_registry (object_kind, object_name, COALESCE(route_path,''), COALESCE(schema_name,''));
CREATE INDEX IF NOT EXISTS idx_ccmr_section ON public.command_centre_manual_registry (command_centre_section);
CREATE INDEX IF NOT EXISTS idx_ccmr_kind ON public.command_centre_manual_registry (object_kind);

ALTER TABLE public.command_centre_manual_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccmr_founder_admin_all"
  ON public.command_centre_manual_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

-- 2. Workflow registry
CREATE TABLE IF NOT EXISTS public.command_centre_workflow_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_key text NOT NULL UNIQUE,
  workflow_name text NOT NULL,
  source_object text,
  target_object text,
  workflow_summary text,
  command_centre_section text,
  owner_agent_key text,
  business_scoped boolean NOT NULL DEFAULT true,
  readiness_status text NOT NULL DEFAULT 'not_checked',
  test_status text NOT NULL DEFAULT 'not_checked',
  external_action_risk boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.command_centre_workflow_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccwr_founder_admin_all"
  ON public.command_centre_workflow_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

-- 3. Data flow registry
CREATE TABLE IF NOT EXISTS public.command_centre_data_flow_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_key text NOT NULL UNIQUE,
  source_object text NOT NULL,
  target_object text NOT NULL,
  flow_description text,
  command_centre_section text,
  workflow_key text,
  owner_agent_key text,
  readiness_status text NOT NULL DEFAULT 'not_checked',
  test_status text NOT NULL DEFAULT 'not_checked',
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.command_centre_data_flow_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccdfr_founder_admin_all"
  ON public.command_centre_data_flow_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_ccmr_touch ON public.command_centre_manual_registry;
CREATE TRIGGER trg_ccmr_touch BEFORE UPDATE ON public.command_centre_manual_registry
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_ccwr_touch ON public.command_centre_workflow_registry;
CREATE TRIGGER trg_ccwr_touch BEFORE UPDATE ON public.command_centre_workflow_registry
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_ccdfr_touch ON public.command_centre_data_flow_registry
  ;
CREATE TRIGGER trg_ccdfr_touch BEFORE UPDATE ON public.command_centre_data_flow_registry
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- SEED: 10 core workflows
-- ============================================================
INSERT INTO public.command_centre_workflow_registry (workflow_key, workflow_name, source_object, target_object, workflow_summary, command_centre_section, owner_agent_key, business_scoped, external_action_risk, founder_approval_required, next_action) VALUES
('lead_to_payment','Lead to Payment','imported_leads','payments','End-to-end revenue: import → contact → outreach → reply → proposal → demo → deal → invoice → payment.','commercial','commercial_agent',true,true,true,'Run master dry-run before flipping outreach gates.'),
('reply_to_proposal','Reply to Proposal','communications','internal_proposals','Inbound reply triggers AI draft → founder approval → proposal generation.','commercial','proposal_agent',true,false,true,'Review pending AI drafts in approvals queue.'),
('proposal_to_demo','Proposal to Demo','internal_proposals','demo_access','Accepted proposal generates demo access token + tracking.','commercial','proposal_agent',true,false,true,'Verify demo expiry rules per business.'),
('demo_to_deal','Demo to Deal','demo_events','deals','Demo engagement scoring promotes to deal creation guard.','commercial','commercial_agent',true,false,true,'Approve high-engagement demos awaiting deal creation.'),
('deal_to_invoice','Deal to Invoice','deals','invoices','Won deal triggers invoice number generation + amount.','finance','finance_agent',true,true,true,'Confirm invoice send gate per business.'),
('deal_to_assignment','Deal to Assignment','deals','assignments','Won deal picks eligible supplier + creates assignment with SLA.','suppliers','supplier_agent',true,false,true,'Verify supplier availability before auto-assign.'),
('assignment_to_completion','Assignment to Completion','assignments','payments','Supplier confirmation → completion → payment release.','suppliers','supplier_agent',true,true,true,'Enable supplier confirmation gate per business.'),
('compliance_oversight','Compliance Oversight','compliance_rules','compliance_events','Continuous compliance checks across contacts, proposals, invoices, assignments.','compliance','compliance_agent',true,false,true,'Review open compliance events.'),
('priority_engine','Priority Engine','contacts','priority_scores','Recalculates priority across contacts, deals, assignments, invoices.','operations','priority_agent',true,false,false,'Schedule priority recompute window.'),
('oversight_recovery','Oversight & Recovery','system_events','retry_queue','Self-healing diagnostics, retry queue, anomaly detection, auto-resolve.','system','self_healing_agent',false,false,false,'Run platform-diagnostics self-test.')
ON CONFLICT (workflow_key) DO NOTHING;

-- ============================================================
-- SEED: 23 critical data flows
-- ============================================================
INSERT INTO public.command_centre_data_flow_registry (flow_key, source_object, target_object, flow_description, command_centre_section, workflow_key, owner_agent_key) VALUES
('imported_leads_to_contacts','imported_leads','contacts','Validated leads become CRM contacts.','crm','lead_to_payment','crm_agent'),
('contacts_to_email_queue','contacts','email_queue','Contacts scheduled into outreach queue (gated).','outbound','lead_to_payment','outreach_agent'),
('email_queue_to_communications','email_queue','communications','Sent items recorded as communications.','outbound','lead_to_payment','outreach_agent'),
('communications_to_conversations','communications','conversations','Communications threaded into conversations.','crm','reply_to_proposal','crm_agent'),
('conversations_to_ai_actions','conversations','ai_actions','Inbound replies trigger AI action proposals.','agents','reply_to_proposal','engagement_agent'),
('ai_actions_to_communications','ai_actions','communications','Approved AI actions become outbound drafts (gated).','outbound','reply_to_proposal','engagement_agent'),
('contacts_to_internal_proposals','contacts','internal_proposals','Qualified contacts generate proposal drafts.','commercial','proposal_to_demo','proposal_agent'),
('internal_proposals_to_demo_access','internal_proposals','demo_access','Accepted proposal mints demo access token.','commercial','proposal_to_demo','proposal_agent'),
('demo_access_to_demo_events','demo_access','demo_events','Demo views/clicks logged as events.','commercial','demo_to_deal','proposal_agent'),
('contacts_to_deals','contacts','deals','Qualified relationship promotes to deal.','commercial','demo_to_deal','commercial_agent'),
('deals_to_invoices','deals','invoices','Won deal generates invoice with number.','finance','deal_to_invoice','finance_agent'),
('deals_to_assignments','deals','assignments','Won deal creates supplier assignment.','suppliers','deal_to_assignment','supplier_agent'),
('suppliers_to_assignments','suppliers','assignments','Eligible supplier matched to assignment.','suppliers','deal_to_assignment','supplier_agent'),
('assignments_to_payments','assignments','payments','Confirmed completion triggers supplier payment.','finance','assignment_to_completion','finance_agent'),
('invoices_to_payments','invoices','payments','Customer payment marks invoice paid.','finance','assignment_to_completion','finance_agent'),
('contacts_to_priority_scores','contacts','priority_scores','Contact-level priority recompute.','operations','priority_engine','priority_agent'),
('deals_to_priority_scores','deals','priority_scores','Deal-level priority recompute.','operations','priority_engine','priority_agent'),
('assignments_to_priority_scores','assignments','priority_scores','Assignment-level priority recompute.','operations','priority_engine','priority_agent'),
('invoices_to_priority_scores','invoices','priority_scores','Invoice/finance priority recompute.','operations','priority_engine','priority_agent'),
('compliance_rules_to_compliance_events','compliance_rules','compliance_events','Rule evaluations create compliance events.','compliance','compliance_oversight','compliance_agent'),
('compliance_events_to_system_events','compliance_events','system_events','Critical compliance events escalate to system events.','system','compliance_oversight','self_healing_agent'),
('email_queue_to_retry_queue','email_queue','retry_queue','Failed sends move to retry queue.','outbound','oversight_recovery','self_healing_agent'),
('retry_queue_to_system_events','retry_queue','system_events','Exhausted retries escalate to system events.','system','oversight_recovery','self_healing_agent')
ON CONFLICT (flow_key) DO NOTHING;

-- ============================================================
-- SEED: manual routes (public, portal, founder, public-exec, supplier, partner)
-- ============================================================
INSERT INTO public.command_centre_manual_registry (manual_source, object_kind, object_name, route_path, module_area, command_centre_section, business_scoped, global_object, external_action_risk, requires_founder_approval, owner_agent_key, readiness_status, visibility_status)
SELECT 'manual','route', name, path, area, section, biz, glob, ext, approval, owner, 'registered','registered' FROM (VALUES
  ('public_home','/','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_what_we_build','/what-we-build','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_industries','/industries','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_method','/method','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_case_studies','/case-studies','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_partners','/partners','public','public_marketing',false,true,false,false,'partner_agent'),
  ('public_project_discovery','/project-discovery','public','public_intake',false,true,false,true,'proposal_agent'),
  ('public_about','/about','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_ai_proposal','/ai-proposal','public','public_intake',false,true,false,true,'proposal_agent'),
  ('public_platform','/platform','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_systems','/systems','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_architecture','/architecture','public','public_marketing',false,true,false,false,'marketing_agent'),
  ('public_legal','/legal','public','public_legal',false,true,false,false,'legal_agent'),
  ('portal_login','/portal/login','portal','portal',false,true,false,false,null),
  ('portal_signup','/portal/signup','portal','portal',false,true,false,false,null),
  ('portal_forgot','/portal/forgot-password','portal','portal',false,true,false,false,null),
  ('portal_reset','/portal/reset-password','portal','portal',false,true,false,false,null),
  ('portal_dashboard','/portal/dashboard','portal','portal',true,false,false,false,'client_agent'),
  ('portal_projects','/portal/projects','portal','portal',true,false,false,false,'client_agent'),
  ('portal_documents','/portal/documents','portal','portal',true,false,false,false,'client_agent'),
  ('portal_messages','/portal/messages','portal','portal',true,false,false,true,'client_agent'),
  ('portal_support','/portal/support','portal','portal',true,false,false,true,'support_agent'),
  ('portal_systems','/portal/systems','portal','portal',true,false,false,false,'client_agent'),
  ('portal_analytics','/portal/analytics','portal','portal',true,false,false,false,'client_agent'),
  ('portal_optimisation','/portal/optimisation','portal','portal',true,false,false,false,'client_agent'),
  ('portal_maintenance','/portal/maintenance','portal','portal',true,false,false,false,'client_agent'),
  ('portal_monitoring','/portal/monitoring','portal','portal',true,false,false,false,'client_agent'),
  ('founder_root','/founder','founder','founder',false,true,false,true,null),
  ('founder_command_centre','/founder/command-centre','founder','founder',false,true,false,true,null),
  ('founder_revenue','/founder/revenue','founder','commercial',true,false,false,true,'finance_agent'),
  ('founder_brain','/founder/brain','founder','founder',false,true,false,true,null),
  ('founder_decisions','/founder/decisions','founder','founder',false,true,false,true,null),
  ('founder_strategy','/founder/strategy','founder','founder',false,true,false,true,null),
  ('founder_copilot','/founder/copilot','founder','founder',false,true,false,true,null),
  ('founder_testing','/founder/testing','founder','testing',false,true,false,true,null),
  ('founder_legal','/founder/legal','founder','compliance',false,true,false,true,'legal_agent'),
  ('founder_compliance','/founder/compliance','founder','compliance',true,false,false,true,'compliance_agent'),
  ('founder_compliance_events','/founder/compliance/events','founder','compliance',true,false,false,true,'compliance_agent'),
  ('founder_compliance_rules','/founder/compliance/rules','founder','compliance',false,true,false,true,'compliance_agent'),
  ('founder_crm','/founder/crm','founder','crm',true,false,false,true,'crm_agent'),
  ('founder_crm_contacts','/founder/crm/contacts','founder','crm',true,false,false,true,'crm_agent'),
  ('founder_crm_inboxes','/founder/crm/inboxes','founder','crm',true,false,false,true,'crm_agent'),
  ('founder_finance','/founder/finance','founder','finance',true,false,true,true,'finance_agent'),
  ('founder_finance_targets','/founder/finance/targets','founder','finance',true,false,false,true,'finance_agent'),
  ('founder_finance_deals','/founder/finance/deals','founder','commercial',true,false,false,true,'commercial_agent'),
  ('founder_finance_invoices','/founder/finance/invoices','founder','finance',true,false,true,true,'finance_agent'),
  ('founder_finance_payments','/founder/finance/payments','founder','finance',true,false,false,true,'finance_agent'),
  ('founder_outreach','/founder/outreach','founder','outbound',true,false,true,true,'outreach_agent'),
  ('founder_outreach_imports','/founder/outreach/imports','founder','outbound',true,false,false,true,'outreach_agent'),
  ('founder_outreach_campaigns','/founder/outreach/campaigns','founder','outbound',true,false,true,true,'outreach_agent'),
  ('founder_outreach_queue','/founder/outreach/queue','founder','outbound',true,false,true,true,'outreach_agent'),
  ('founder_conversations','/founder/conversations','founder','crm',true,false,true,true,'crm_agent'),
  ('founder_internal_proposals','/founder/internal-proposals','founder','commercial',true,false,true,true,'proposal_agent'),
  ('founder_demos','/founder/demos','founder','commercial',true,false,false,true,'proposal_agent'),
  ('founder_suppliers','/founder/suppliers','founder','suppliers',true,false,false,true,'supplier_agent'),
  ('founder_assignments','/founder/assignments','founder','suppliers',true,false,false,true,'supplier_agent'),
  ('founder_priority','/founder/priority','founder','operations',true,false,false,false,'priority_agent'),
  ('founder_sending','/founder/sending','founder','outbound',true,false,true,true,'outreach_agent'),
  ('founder_system','/founder/system','founder','system',false,true,false,true,'self_healing_agent'),
  ('founder_system_events','/founder/system/events','founder','system',false,true,false,true,'self_healing_agent'),
  ('founder_system_health','/founder/system/health','founder','system',false,true,false,true,'self_healing_agent'),
  ('founder_proposals','/founder/proposals','founder','commercial',true,false,true,true,'proposal_agent'),
  ('founder_pipeline','/founder/pipeline','founder','commercial',true,false,false,true,'commercial_agent'),
  ('founder_projects','/founder/projects','founder','operations',true,false,false,true,'project_agent'),
  ('founder_activity','/founder/activity','founder','system',false,true,false,false,null),
  ('founder_documents','/founder/documents','founder','operations',true,false,false,true,null),
  ('founder_monitoring','/founder/monitoring','founder','system',false,true,false,true,'self_healing_agent'),
  ('founder_agents','/founder/agents','founder','agents',false,true,false,true,null),
  ('founder_workflows','/founder/workflows','founder','operations',false,true,false,true,null),
  ('founder_integrations','/founder/integrations','founder','integrations',false,true,true,true,null),
  ('founder_executions','/founder/executions','founder','operations',false,true,false,false,null),
  ('founder_processes','/founder/processes','founder','operations',false,true,false,false,null),
  ('founder_architectures','/founder/architectures','founder','operations',false,true,false,false,null),
  ('founder_deployments','/founder/deployments','founder','operations',false,true,false,true,null),
  ('founder_analytics','/founder/analytics','founder','analytics',true,false,false,false,null),
  ('founder_optimisation','/founder/optimisation','founder','analytics',true,false,false,false,null),
  ('founder_knowledge','/founder/knowledge','founder','knowledge',true,false,false,false,null),
  ('founder_operations','/founder/operations','founder','operations',true,false,false,true,null),
  ('founder_organisations','/founder/organisations','founder','operations',true,false,false,true,null),
  ('founder_access_control','/founder/access-control','founder','security',false,true,false,true,null),
  ('founder_security','/founder/security','founder','security',false,true,false,true,null),
  ('founder_templates','/founder/templates','founder','operations',false,true,false,true,null),
  ('founder_expansion','/founder/expansion','founder','operations',true,false,false,true,null),
  ('founder_manual','/founder/manual','founder','knowledge',false,true,false,false,null),
  ('founder_manual_full','/founder/manual/full','founder','knowledge',false,true,false,false,null),
  ('founder_build_log','/founder/build-log','founder','knowledge',false,true,false,false,null),
  ('public_proposal_view','/proposals/view/:token','public_exec','commercial',true,false,true,true,'proposal_agent'),
  ('public_proposal_accept','/proposals/accept/:token','public_exec','commercial',true,false,true,true,'proposal_agent'),
  ('public_demo','/demo/:token','public_exec','commercial',true,false,true,true,'proposal_agent'),
  ('supplier_login','/supplier/login','supplier','suppliers',true,false,false,false,null),
  ('supplier_dashboard','/supplier/dashboard','supplier','suppliers',true,false,false,false,'supplier_agent'),
  ('supplier_assignments','/supplier/assignments','supplier','suppliers',true,false,true,true,'supplier_agent'),
  ('partner_root','/partner','partner','partners',false,true,false,false,'partner_agent'),
  ('partner_opportunities','/partner/opportunities','partner','partners',false,true,false,true,'partner_agent'),
  ('partner_projects','/partner/projects','partner','partners',true,false,false,true,'partner_agent'),
  ('partner_documents','/partner/documents','partner','partners',true,false,false,true,'partner_agent'),
  ('partner_messages','/partner/messages','partner','partners',true,false,true,true,'partner_agent')
) AS r(name,path,area,section,biz,glob,ext,approval,owner)
ON CONFLICT (object_kind, object_name, COALESCE(route_path,''), COALESCE(schema_name,'')) DO NOTHING;
