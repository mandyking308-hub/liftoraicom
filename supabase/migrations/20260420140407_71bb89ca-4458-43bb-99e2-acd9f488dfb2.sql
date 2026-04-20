-- =========================================================
-- FULL SYSTEM MIRROR & DEEP AUDIT LAYER
-- =========================================================

-- 1. system_content : every visible text fragment
CREATE TABLE IF NOT EXISTS public.system_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  content_type text NOT NULL DEFAULT 'body',
  text_value text NOT NULL,
  linked_feature text DEFAULT '',
  source_path text DEFAULT '',
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_content" ON public.system_content;
CREATE POLICY "Founders manage system_content" ON public.system_content
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_system_content_page ON public.system_content(page);
CREATE INDEX IF NOT EXISTS idx_system_content_type ON public.system_content(content_type);

-- 2. system_pages_index : registry of every route
CREATE TABLE IF NOT EXISTS public.system_pages_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path text NOT NULL UNIQUE,
  page_name text NOT NULL,
  area text NOT NULL DEFAULT 'public',
  purpose text DEFAULT '',
  ui_elements text DEFAULT '',
  actions text DEFAULT '',
  linked_backend text DEFAULT '',
  data_sources text DEFAULT '',
  documented boolean NOT NULL DEFAULT true,
  manual_page_id uuid REFERENCES public.manual_pages(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_pages_index ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_pages_index" ON public.system_pages_index;
CREATE POLICY "Founders manage system_pages_index" ON public.system_pages_index
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- 3. system_backend_objects : tables, functions, triggers, edge functions
CREATE TABLE IF NOT EXISTS public.system_backend_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_kind text NOT NULL,        -- 'table' | 'function' | 'trigger' | 'rpc' | 'edge_function'
  object_name text NOT NULL,
  schema_name text NOT NULL DEFAULT 'public',
  purpose text DEFAULT '',
  inputs text DEFAULT '',
  outputs text DEFAULT '',
  dependencies text DEFAULT '',
  documented boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (object_kind, schema_name, object_name)
);
ALTER TABLE public.system_backend_objects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_backend_objects" ON public.system_backend_objects;
CREATE POLICY "Founders manage system_backend_objects" ON public.system_backend_objects
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_backend_kind ON public.system_backend_objects(object_kind);

-- 4. system_workflows_full : top-level flows
CREATE TABLE IF NOT EXISTS public.system_workflows_full (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_key text NOT NULL UNIQUE,
  workflow_name text NOT NULL,
  description text DEFAULT '',
  start_module text DEFAULT '',
  end_module text DEFAULT '',
  step_count integer NOT NULL DEFAULT 0,
  documented boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_workflows_full ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_workflows_full" ON public.system_workflows_full;
CREATE POLICY "Founders manage system_workflows_full" ON public.system_workflows_full
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- 5. system_workflow_steps : ordered steps
CREATE TABLE IF NOT EXISTS public.system_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.system_workflows_full(id) ON DELETE CASCADE,
  step_index integer NOT NULL,
  step_name text NOT NULL,
  trigger_source text DEFAULT '',
  data_input text DEFAULT '',
  data_output text DEFAULT '',
  linked_tables text DEFAULT '',
  failure_points text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_workflow_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_workflow_steps" ON public.system_workflow_steps;
CREATE POLICY "Founders manage system_workflow_steps" ON public.system_workflow_steps
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_workflow_steps_wf ON public.system_workflow_steps(workflow_id, step_index);

-- 6. system_rules : compliance, priority, throttling, oversight
CREATE TABLE IF NOT EXISTS public.system_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_name text NOT NULL,
  module text NOT NULL,                         -- compliance | priority | timing | oversight
  condition_text text NOT NULL DEFAULT '',
  action_text text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',      -- low | medium | high | critical
  source_function text DEFAULT '',
  documented boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_rules" ON public.system_rules;
CREATE POLICY "Founders manage system_rules" ON public.system_rules
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- 7. system_integrations_full : outbound/inbound/AI/RPC layers
CREATE TABLE IF NOT EXISTS public.system_integrations_full (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_key text NOT NULL UNIQUE,
  integration_name text NOT NULL,
  layer text NOT NULL,             -- outbound_email | inbound_webhook | supplier_rpc | ai_gateway | other
  description text DEFAULT '',
  endpoint text DEFAULT '',
  related_objects text DEFAULT '',
  documented boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_integrations_full ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_integrations_full" ON public.system_integrations_full;
CREATE POLICY "Founders manage system_integrations_full" ON public.system_integrations_full
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- 8. system_data_flows : entity-to-entity dependency graph
CREATE TABLE IF NOT EXISTS public.system_data_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity text NOT NULL,
  target_entity text NOT NULL,
  relationship text NOT NULL DEFAULT 'writes_to',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_entity, target_entity, relationship)
);
ALTER TABLE public.system_data_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_data_flows" ON public.system_data_flows;
CREATE POLICY "Founders manage system_data_flows" ON public.system_data_flows
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- 9. system_changes : append-only change ledger
CREATE TABLE IF NOT EXISTS public.system_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,    -- 'page' | 'content' | 'backend_object' | 'workflow' | 'rule' | 'integration' | 'data_flow' | 'manual_page'
  entity_id uuid,
  entity_key text DEFAULT '',
  change_type text NOT NULL DEFAULT 'updated',  -- created | updated | removed | regenerated
  summary text DEFAULT '',
  manual_version integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders read system_changes" ON public.system_changes;
CREATE POLICY "Founders read system_changes" ON public.system_changes
  FOR SELECT USING (has_role(auth.uid(), 'founder'::app_role));
DROP POLICY IF EXISTS "Service writes system_changes" ON public.system_changes;
CREATE POLICY "Service writes system_changes" ON public.system_changes
  FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_system_changes_created ON public.system_changes(created_at DESC);

-- 10. system_versions : global manual snapshots
CREATE TABLE IF NOT EXISTS public.system_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number integer NOT NULL,
  pages_count integer NOT NULL DEFAULT 0,
  content_count integer NOT NULL DEFAULT 0,
  backend_count integer NOT NULL DEFAULT 0,
  workflow_count integer NOT NULL DEFAULT 0,
  rule_count integer NOT NULL DEFAULT 0,
  integration_count integer NOT NULL DEFAULT 0,
  data_flow_count integer NOT NULL DEFAULT 0,
  coverage_score integer NOT NULL DEFAULT 100,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_versions" ON public.system_versions;
CREATE POLICY "Founders manage system_versions" ON public.system_versions
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- 11. system_coverage_reports
CREATE TABLE IF NOT EXISTS public.system_coverage_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_pages integer NOT NULL DEFAULT 0,
  documented_pages integer NOT NULL DEFAULT 0,
  total_tables integer NOT NULL DEFAULT 0,
  documented_tables integer NOT NULL DEFAULT 0,
  total_functions integer NOT NULL DEFAULT 0,
  documented_functions integer NOT NULL DEFAULT 0,
  total_workflows integer NOT NULL DEFAULT 0,
  documented_workflows integer NOT NULL DEFAULT 0,
  total_rules integer NOT NULL DEFAULT 0,
  documented_rules integer NOT NULL DEFAULT 0,
  coverage_score integer NOT NULL DEFAULT 0,
  gaps_found integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_coverage_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage system_coverage_reports" ON public.system_coverage_reports;
CREATE POLICY "Founders manage system_coverage_reports" ON public.system_coverage_reports
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- =========================================================
-- HELPER : record_system_change
-- =========================================================
CREATE OR REPLACE FUNCTION public.record_system_change(
  _entity_type text, _entity_id uuid, _entity_key text,
  _change_type text, _summary text, _manual_version integer DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO system_changes (entity_type, entity_id, entity_key, change_type, summary, manual_version)
  VALUES (_entity_type, _entity_id, COALESCE(_entity_key,''), _change_type, COALESCE(_summary,''), _manual_version)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- =========================================================
-- REBUILD : rebuild_full_manual
-- Regenerates pages_index, backend_objects, workflows, rules, integrations,
-- data_flows from live database state. Bumps version & logs change.
-- =========================================================
CREATE OR REPLACE FUNCTION public.rebuild_full_manual()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_version integer;
  v_pages integer; v_content integer; v_backend integer;
  v_wf integer; v_rules integer; v_integrations integer; v_flows integer;
BEGIN
  -- Backend objects: tables
  INSERT INTO system_backend_objects (object_kind, object_name, schema_name, purpose, inputs, outputs, dependencies, documented, updated_at)
  SELECT 'table', t.table_name, 'public',
         'Public schema table',
         (SELECT string_agg(c.column_name || ':' || c.data_type, ', ' ORDER BY c.ordinal_position)
            FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = t.table_name),
         '', '', true, now()
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  ON CONFLICT (object_kind, schema_name, object_name) DO UPDATE
    SET inputs = EXCLUDED.inputs, updated_at = now(), documented = true;

  -- Backend objects: functions
  INSERT INTO system_backend_objects (object_kind, object_name, schema_name, purpose, documented, updated_at)
  SELECT 'function', r.routine_name, 'public', 'PL/pgSQL routine', true, now()
  FROM information_schema.routines r
  WHERE r.routine_schema = 'public' AND r.routine_type = 'FUNCTION'
  ON CONFLICT (object_kind, schema_name, object_name) DO UPDATE
    SET updated_at = now(), documented = true;

  -- Backend objects: triggers
  INSERT INTO system_backend_objects (object_kind, object_name, schema_name, purpose, dependencies, documented, updated_at)
  SELECT DISTINCT 'trigger', tg.trigger_name, 'public',
         'Trigger on ' || tg.event_object_table,
         tg.event_object_table, true, now()
  FROM information_schema.triggers tg
  WHERE tg.trigger_schema = 'public'
  ON CONFLICT (object_kind, schema_name, object_name) DO UPDATE
    SET updated_at = now(), documented = true;

  -- Backend objects: edge functions (static catalogue — auto-discovered list)
  INSERT INTO system_backend_objects (object_kind, object_name, schema_name, purpose, documented, updated_at) VALUES
    ('edge_function','ai-conversation-engine','functions','AI reply generation for inbound conversations',true,now()),
    ('edge_function','crm-send-check','functions','Pre-send sanity check gating outbound communications',true,now()),
    ('edge_function','finance-chase-overdue','functions','Automatic overdue invoice chaser',true,now()),
    ('edge_function','founder-copilot','functions','Founder Co-Pilot AI assistant',true,now()),
    ('edge_function','generate-proposal','functions','Public AI proposal generator',true,now()),
    ('edge_function','internal-proposal-generate','functions','Internal proposal drafting from deal data',true,now()),
    ('edge_function','internal-proposal-send','functions','Send internal proposal via assigned inbox',true,now()),
    ('edge_function','outreach-import-leads','functions','CSV lead import to outreach pipeline',true,now()),
    ('edge_function','outreach-inbound-webhook','functions','Inbound email webhook handler',true,now()),
    ('edge_function','outreach-schedule-batch','functions','Schedule next outreach batch',true,now()),
    ('edge_function','outreach-send-worker','functions','Outbound email send worker',true,now()),
    ('edge_function','platform-diagnostics','functions','Platform self-diagnostics agent',true,now()),
    ('edge_function','platform-sandbox','functions','Sandbox mode toggle and reset',true,now()),
    ('edge_function','platform-testing','functions','End-to-end automated test runner',true,now())
  ON CONFLICT (object_kind, schema_name, object_name) DO UPDATE
    SET updated_at = now(), documented = true, purpose = EXCLUDED.purpose;

  -- Workflows (top-level)
  INSERT INTO system_workflows_full (workflow_key, workflow_name, description, start_module, end_module, step_count, documented, updated_at) VALUES
    ('lead_to_payment','Lead to Payment','End-to-end revenue cycle: imported lead becomes paid invoice','outreach-import-leads','payments',10,true,now()),
    ('reply_to_proposal','Reply to Proposal','Inbound reply triggers AI conversation, qualification, and proposal generation','outreach-inbound-webhook','internal-proposal-send',6,true,now()),
    ('proposal_to_demo','Proposal to Demo','Sent proposal generates demo access and tracks engagement','internal_proposals','demo_access',4,true,now()),
    ('demo_to_deal','Demo to Deal','High-intent demo activity converts to a Deal record','demo_events','deals',3,true,now()),
    ('deal_to_invoice','Deal to Invoice','WON deal automatically issues an invoice','deals','invoices',2,true,now()),
    ('deal_to_assignment','Deal to Assignment','WON deal assigned to balanced supplier','deals','assignments',3,true,now()),
    ('assignment_to_completion','Assignment to Completion','Supplier delivers; founder confirms; payment recorded','assignments','payments',4,true,now()),
    ('compliance_oversight','Compliance Oversight','Compliance checks fire on every contact, communication, deal, invoice','run_compliance_checks','compliance_events',5,true,now()),
    ('priority_engine','Priority Engine','Recalculates priority scores across contacts, deals, assignments, invoices','recalculate_priority','priority_scores',5,true,now()),
    ('oversight_recovery','Oversight & Recovery','Detects anomalies, retries safe operations, escalates failures','detect_anomalies','retry_queue',6,true,now())
  ON CONFLICT (workflow_key) DO UPDATE
    SET workflow_name = EXCLUDED.workflow_name, description = EXCLUDED.description,
        start_module = EXCLUDED.start_module, end_module = EXCLUDED.end_module,
        step_count = EXCLUDED.step_count, updated_at = now(), documented = true;

  -- Workflow steps (rebuild lead_to_payment as canonical)
  DELETE FROM system_workflow_steps
   WHERE workflow_id IN (SELECT id FROM system_workflows_full WHERE workflow_key = 'lead_to_payment');
  INSERT INTO system_workflow_steps (workflow_id, step_index, step_name, trigger_source, data_input, data_output, linked_tables, failure_points)
  SELECT w.id, s.idx, s.name, s.trigger, s.din, s.dout, s.tables, s.fails FROM system_workflows_full w
  CROSS JOIN (VALUES
    (1,'Import Lead','Founder upload / outreach-import-leads','CSV row','contacts row','imported_leads, contacts','Bad email format, duplicate email'),
    (2,'Schedule Outreach','outreach-schedule-batch cron','contact + campaign','email_queue row','email_queue, inboxes','No inbox available, throttle cap'),
    (3,'Send Email','outreach-send-worker','queued email','email_events sent','email_queue, email_events','Bounce, SMTP error, reputation drop'),
    (4,'Inbound Reply','outreach-inbound-webhook','webhook payload','communications inbound','communications, conversations','Webhook missing inbox mapping'),
    (5,'AI Reply','ai-conversation-engine','conversation history','ai_actions row','ai_actions, communications','Token cap, quality fail'),
    (6,'Generate Proposal','internal-proposal-generate','contact + deal context','internal_proposals row','internal_proposals','Quality score below threshold'),
    (7,'Send Proposal','internal-proposal-send','proposal id','communications outbound','internal_proposals, communications','Inbox paused, send blocked'),
    (8,'Demo Engagement','demo_access link','contact opens demo','demo_events row','demo_access, demo_events','Demo expired, low engagement'),
    (9,'Deal Won','founder updates deal','deals.status = WON','invoices row','deals, invoices','FK violation, missing contact'),
    (10,'Payment Received','handle_payment_received trigger','payments row','priority recalculation','payments, priority_scores','Currency mismatch, late payment')
  ) AS s(idx,name,trigger,din,dout,tables,fails)
  WHERE w.workflow_key = 'lead_to_payment';

  -- Rules registry (declarative seed of canonical rules)
  INSERT INTO system_rules (rule_key, rule_name, module, condition_text, action_text, severity, source_function, documented, updated_at) VALUES
    ('compliance_engaged_block','Block sends to engaged contacts','compliance','contact.status IN (ENGAGED, QUALIFIED, CLIENT, DO_NOT_CONTACT) OR conversation_active','Block outbound communication','high','check_outreach_allowed',true,now()),
    ('compliance_24h_window','24h communication window','compliance','Any communication on contact within last 24h','Block outbound send','medium','check_outreach_allowed',true,now()),
    ('compliance_48h_contact','48h re-contact gate','compliance','last_contacted_at less than 48h ago','Block outbound send','medium','check_outreach_allowed',true,now()),
    ('compliance_bounced','Bounced events suppress','compliance','Any bounced email_events for contact','Mark DO_NOT_CONTACT','high','handle_email_bounce',true,now()),
    ('compliance_inbox_required','Inbox assignment required','compliance','contact.assigned_inbox_id IS NULL','Block outbound send','high','check_outreach_allowed',true,now()),
    ('priority_critical_invoice','Overdue invoice critical','priority','invoice age greater than 14 days AND status not in (PAID, VOID)','Score boosted to 81-100','critical','priority_score_invoice',true,now()),
    ('priority_critical_assignment','Failed assignment critical','priority','assignment.status = failed','Score 95 critical','critical','priority_score_assignment',true,now()),
    ('priority_high_value_deal','High value deal','priority','deal.estimated_value_max greater than 100000','Boost into critical band','critical','priority_score_deal',true,now()),
    ('priority_intent_boost','Intent score engagement boost','priority','contact.intent_score greater than 0','Add 0.7 * intent_score to engagement factor','low','priority_score_contact',true,now()),
    ('throttle_inbox_daily','Inbox daily limit','timing','current_send_count greater than or equal daily_send_limit','Block further sends today','medium','check_send_throttle',true,now()),
    ('throttle_low_reputation','Low reputation pause','timing','reputation_score less than 20','Inbox paused','high','pick_inbox_for_business',true,now()),
    ('throttle_warmup','Warmup ramp','timing','warmup_status = warming','Daily limit overridden by warmup curve','low','inbox_warmup_limit',true,now()),
    ('oversight_stuck_queue','Stuck email queue','oversight','email_queue items pending greater than 30 minutes','Enqueue retry + system_event','high','detect_anomalies',true,now()),
    ('oversight_idle_assignment','Idle assignment','oversight','assignment unchanged greater than 24h while in_progress','Flag system_event','medium','detect_anomalies',true,now()),
    ('oversight_overdue_invoice','Overdue invoice oversight','oversight','invoice age greater than 14 days unpaid','Flag system_event high','high','detect_anomalies',true,now()),
    ('oversight_compliance_score','High compliance risk','oversight','business compliance_score greater than 70','Flag critical system_event','critical','detect_anomalies',true,now()),
    ('oversight_low_reputation','Low inbox reputation','oversight','inbox reputation_score less than 20','Flag system_event','high','detect_anomalies',true,now()),
    ('retry_exhaustion','Retry exhaustion','oversight','retry_count greater than or equal 3','Mark queue failed + critical event','critical','escalate_retry_failure',true,now()),
    ('test_mode_lock','Test mode safety','oversight','system_settings.system_mode = test','Outbound senders simulate, no real SMTP','medium','get_system_mode',true,now())
  ON CONFLICT (rule_key) DO UPDATE
    SET rule_name = EXCLUDED.rule_name, module = EXCLUDED.module,
        condition_text = EXCLUDED.condition_text, action_text = EXCLUDED.action_text,
        severity = EXCLUDED.severity, source_function = EXCLUDED.source_function,
        updated_at = now(), documented = true;

  -- Integrations
  INSERT INTO system_integrations_full (integration_key, integration_name, layer, description, endpoint, related_objects, documented, updated_at) VALUES
    ('outbound_email','Outbound Email Sender','outbound_email','Sends queued emails through inbox pool','outreach-send-worker','email_queue, inboxes, communications',true,now()),
    ('inbound_webhook','Inbound Email Webhook','inbound_webhook','Receives reply webhooks from email infra','outreach-inbound-webhook','communications, email_events, conversations',true,now()),
    ('crm_sanity_check','CRM Send Check','outbound_email','Pre-send compliance gate','crm-send-check','contacts, inboxes, check_outreach_allowed',true,now()),
    ('finance_chaser','Finance Overdue Chaser','outbound_email','Auto-chase overdue invoices','finance-chase-overdue','invoices, communications',true,now()),
    ('proposal_send','Internal Proposal Send','outbound_email','Send internal proposals via assigned inbox','internal-proposal-send','internal_proposals, communications',true,now()),
    ('supplier_login_rpc','Supplier Login RPC','supplier_rpc','Token-based supplier authentication','supplier_login_with_token','suppliers, supplier_users',true,now()),
    ('supplier_assignment_rpc','Supplier Assignment Confirmation','supplier_rpc','Supplier accepts/completes assignment','founder_confirm_assignment','assignments, suppliers',true,now()),
    ('ai_gateway_conversation','AI Gateway — Conversation','ai_gateway','Lovable AI Gateway used by ai-conversation-engine','ai-conversation-engine','ai_actions, conversations',true,now()),
    ('ai_gateway_proposal','AI Gateway — Proposal Generator','ai_gateway','Lovable AI Gateway used by generate-proposal','generate-proposal','proposal_requests',true,now()),
    ('ai_gateway_copilot','AI Gateway — Founder Co-Pilot','ai_gateway','Lovable AI Gateway used by founder-copilot','founder-copilot','copilot_threads, copilot_messages',true,now()),
    ('platform_testing','Platform Testing Runner','other','Edge function executing test runs','platform-testing','platform_test_runs, platform_test_results',true,now()),
    ('platform_diagnostics','Platform Diagnostics Agent','other','30-min health check agent','platform-diagnostics','system_health, system_events',true,now())
  ON CONFLICT (integration_key) DO UPDATE
    SET integration_name = EXCLUDED.integration_name, layer = EXCLUDED.layer,
        description = EXCLUDED.description, endpoint = EXCLUDED.endpoint,
        related_objects = EXCLUDED.related_objects, updated_at = now(), documented = true;

  -- Data flows (canonical entity graph)
  INSERT INTO system_data_flows (source_entity, target_entity, relationship, description) VALUES
    ('imported_leads','contacts','writes_to','Imported leads upserted into contacts'),
    ('contacts','email_queue','writes_to','Outreach scheduler enqueues emails per contact'),
    ('email_queue','communications','writes_to','Sent queue items recorded as outbound communications'),
    ('communications','conversations','writes_to','Inbound communications open/reopen conversations'),
    ('conversations','ai_actions','writes_to','AI engine logs each reply action'),
    ('ai_actions','communications','writes_to','AI replies persisted as outbound comms'),
    ('contacts','internal_proposals','writes_to','Proposals generated for qualified contacts'),
    ('internal_proposals','demo_access','writes_to','Sent proposals issue demo tokens'),
    ('demo_access','demo_events','writes_to','Demo sessions log events'),
    ('contacts','deals','writes_to','Qualified contacts become deals'),
    ('deals','invoices','writes_to','WON deals create invoices via handle_deal_won'),
    ('deals','assignments','writes_to','WON deals are assigned to suppliers'),
    ('suppliers','assignments','writes_to','Suppliers receive assignments'),
    ('assignments','payments','writes_to','Completed work generates payments'),
    ('invoices','payments','writes_to','Payments settle invoices'),
    ('contacts','priority_scores','writes_to','Priority engine scores contacts'),
    ('deals','priority_scores','writes_to','Priority engine scores deals'),
    ('assignments','priority_scores','writes_to','Priority engine scores assignments'),
    ('invoices','priority_scores','writes_to','Priority engine scores invoices'),
    ('compliance_rules','compliance_events','writes_to','Active rules raise events'),
    ('compliance_events','system_events','writes_to','High severity compliance events bubble to oversight'),
    ('email_queue','retry_queue','writes_to','Stuck queue items requeued for retry'),
    ('retry_queue','system_events','writes_to','Exhausted retries escalated as critical events')
  ON CONFLICT (source_entity, target_entity, relationship) DO UPDATE SET description = EXCLUDED.description;

  -- Pages index : seed canonical routes and link to manual_pages where module_name matches
  -- Public + Founder + Portal + Partner + Supplier
  INSERT INTO system_pages_index (route_path, page_name, area, purpose, documented, updated_at) VALUES
    ('/','Home','public','Marketing landing page',true,now()),
    ('/what-we-build','What We Build','public','Capabilities overview',true,now()),
    ('/industries','Industries','public','Target industries',true,now()),
    ('/method','Method','public','5-step engineering sequence',true,now()),
    ('/case-studies','Case Studies','public','Client outcomes',true,now()),
    ('/partners','Partner Program','public','Partner ecosystem',true,now()),
    ('/project-discovery','Project Discovery','public','AI proposal intake form',true,now()),
    ('/about','About','public','Company background',true,now()),
    ('/ai-proposal','AI Proposal','public','AI proposal generator UI',true,now()),
    ('/platform','Platform','public','Platform overview',true,now()),
    ('/systems','Systems','public','Eight-system credibility',true,now()),
    ('/architecture','Architecture','public','Public architecture flows',true,now()),
    ('/legal','Legal Hub','public','Index of legal documents',true,now()),
    ('/portal/login','Portal Login','auth','Client login',true,now()),
    ('/portal/signup','Portal Signup','auth','Client signup',true,now()),
    ('/portal/forgot-password','Forgot Password','auth','Password reset request',true,now()),
    ('/portal/reset-password','Reset Password','auth','Password reset confirm',true,now()),
    ('/portal/dashboard','Client Dashboard','portal','Client home',true,now()),
    ('/portal/projects','Client Projects','portal','Client project list',true,now()),
    ('/portal/documents','Client Documents','portal','Shared documents',true,now()),
    ('/portal/messages','Client Messages','portal','Messaging',true,now()),
    ('/portal/support','Client Support','portal','Support requests',true,now()),
    ('/portal/maintenance','Maintenance Dashboard','portal','Subscription maintenance',true,now()),
    ('/portal/monitoring','Client Monitoring','portal','Live monitoring',true,now()),
    ('/portal/systems','Client Control Panel','portal','System control',true,now()),
    ('/portal/analytics','Client Analytics','portal','Analytics',true,now()),
    ('/portal/optimisation','Client Optimisation','portal','Optimisation insights',true,now()),
    ('/founder','Founder Overview','founder','Founder home',true,now()),
    ('/founder/proposals','Founder Proposals','founder','Public proposal requests',true,now()),
    ('/founder/pipeline','Lead Pipeline','founder','Lead pipeline view',true,now()),
    ('/founder/projects','Founder Projects','founder','All projects',true,now()),
    ('/founder/activity','Founder Activity','founder','Activity log',true,now()),
    ('/founder/documents','Founder Documents','founder','Document library',true,now()),
    ('/founder/monitoring','Monitoring','founder','Systems monitoring',true,now()),
    ('/founder/agents','Agent Directory','founder','AI agents',true,now()),
    ('/founder/workflows','Workflow Directory','founder','Automation workflows',true,now()),
    ('/founder/integrations','Integration Directory','founder','Integrations',true,now()),
    ('/founder/executions','Execution Dashboard','founder','Workflow executions',true,now()),
    ('/founder/command-center','Command Center','founder','Command center',true,now()),
    ('/founder/processes','Process Directory','founder','Business processes',true,now()),
    ('/founder/architectures','Architecture Directory','founder','System architectures',true,now()),
    ('/founder/deployments','Deployment Directory','founder','Deployments',true,now()),
    ('/founder/analytics','Founder Analytics','founder','Platform analytics',true,now()),
    ('/founder/optimisation','Optimisation Dashboard','founder','Optimisation insights',true,now()),
    ('/founder/knowledge','Knowledge Directory','founder','Knowledge base',true,now()),
    ('/founder/operations','Global Operations','founder','Global ops',true,now()),
    ('/founder/organisations','Organisation Directory','founder','Multi-tenant orgs',true,now()),
    ('/founder/access-control','Access Control','founder','RBAC management',true,now()),
    ('/founder/security','Security Dashboard','founder','Security & anomalies',true,now()),
    ('/founder/templates','Template Directory','founder','System templates',true,now()),
    ('/founder/expansion','Platform Expansion','founder','Venture launcher',true,now()),
    ('/founder/manual','Founder Manual','founder','Self-updating manual',true,now()),
    ('/founder/manual/full','Full System Mirror','founder','Complete system mirror',true,now()),
    ('/founder/build-log','Build Log','founder','Append-only build log',true,now()),
    ('/founder/revenue','Founder Revenue','founder','Revenue console',true,now()),
    ('/founder/brain','Brain Core','founder','AI Brain Core',true,now()),
    ('/founder/decisions','Decision Engine','founder','Decision recommendations',true,now()),
    ('/founder/strategy','Strategy Engine','founder','Strategic plans',true,now()),
    ('/founder/copilot','Founder Co-Pilot','founder','AI co-pilot chat',true,now()),
    ('/founder/testing','Platform Testing','founder','Automated tests',true,now()),
    ('/founder/legal','Founder Legal Console','founder','Legal compliance',true,now()),
    ('/founder/compliance','Compliance Dashboard','founder','Compliance overview',true,now()),
    ('/founder/compliance/events','Compliance Events','founder','Event log',true,now()),
    ('/founder/compliance/rules','Compliance Rules','founder','Rule management',true,now()),
    ('/founder/crm','CRM Dashboard','founder','CRM master',true,now()),
    ('/founder/crm/contacts','CRM Contacts','founder','Contact registry',true,now()),
    ('/founder/crm/inboxes','CRM Inboxes','founder','Inbox management',true,now()),
    ('/founder/finance','Finance Dashboard','founder','Finance overview',true,now()),
    ('/founder/finance/targets','Finance Targets','founder','Revenue targets',true,now()),
    ('/founder/finance/deals','Finance Deals','founder','Deal pipeline',true,now()),
    ('/founder/finance/invoices','Finance Invoices','founder','Invoice ledger',true,now()),
    ('/founder/finance/payments','Finance Payments','founder','Payment ledger',true,now()),
    ('/founder/outreach','Outreach Dashboard','founder','Outreach overview',true,now()),
    ('/founder/outreach/imports','Outreach Imports','founder','Lead imports',true,now()),
    ('/founder/outreach/campaigns','Outreach Campaigns','founder','Campaigns',true,now()),
    ('/founder/outreach/queue','Outreach Queue','founder','Send queue',true,now()),
    ('/founder/conversations','Conversations Dashboard','founder','AI conversations',true,now()),
    ('/founder/internal-proposals','Internal Proposals','founder','Internal proposals',true,now()),
    ('/founder/demos','Demos Dashboard','founder','Demo access',true,now()),
    ('/founder/suppliers','Suppliers Dashboard','founder','Supplier directory',true,now()),
    ('/founder/assignments','Assignments Dashboard','founder','Assignments',true,now()),
    ('/founder/priority','Priority Dashboard','founder','Priority engine',true,now()),
    ('/founder/sending','Sending Health','founder','Inbox/domain health',true,now()),
    ('/founder/system','System Oversight','founder','Oversight dashboard',true,now()),
    ('/founder/system/events','System Events','founder','Event log',true,now()),
    ('/founder/system/health','System Health','founder','Health metrics',true,now()),
    ('/proposals/view/:token','Public Proposal View','public','Public proposal view',true,now()),
    ('/proposals/accept/:token','Public Proposal Accept','public','Public proposal accept',true,now()),
    ('/demo/:token','Public Demo','public','Public demo session',true,now()),
    ('/supplier/login','Supplier Login','supplier','Supplier login',true,now()),
    ('/supplier/dashboard','Supplier Dashboard','supplier','Supplier home',true,now()),
    ('/supplier/assignments','Supplier Assignments','supplier','Supplier assignments',true,now()),
    ('/partner','Partner Dashboard','partner','Partner home',true,now()),
    ('/partner/opportunities','Partner Opportunities','partner','Opportunities',true,now()),
    ('/partner/projects','Partner Projects','partner','Projects',true,now()),
    ('/partner/documents','Partner Documents','partner','Documents',true,now()),
    ('/partner/messages','Partner Messages','partner','Messages',true,now())
  ON CONFLICT (route_path) DO UPDATE
    SET page_name = EXCLUDED.page_name, area = EXCLUDED.area,
        purpose = EXCLUDED.purpose, updated_at = now(), documented = true;

  -- Seed minimal content fragments (canonical anchors per major page)
  INSERT INTO system_content (page, content_type, text_value, linked_feature, source_path, last_updated) VALUES
    ('/','heading','AI infrastructure for organisations that need to win','marketing','src/pages/Index.tsx',now()),
    ('/founder','heading','Founder Overview','founder_console','src/pages/founder/FounderOverview.tsx',now()),
    ('/founder/manual','heading','Founder Manual','documentation','src/pages/founder/FounderManual.tsx',now()),
    ('/founder/manual/full','heading','Full System Mirror','documentation','src/pages/founder/FullSystemMirror.tsx',now()),
    ('/founder/system','heading','System Oversight','oversight','src/pages/founder/system/SystemDashboard.tsx',now()),
    ('/founder/crm','heading','CRM Dashboard','crm','src/pages/founder/CRMDashboard.tsx',now()),
    ('/founder/finance','heading','Finance Dashboard','finance','src/pages/founder/finance/FinanceDashboard.tsx',now())
  ON CONFLICT DO NOTHING;

  -- Counts
  SELECT count(*) INTO v_pages FROM system_pages_index;
  SELECT count(*) INTO v_content FROM system_content;
  SELECT count(*) INTO v_backend FROM system_backend_objects;
  SELECT count(*) INTO v_wf FROM system_workflows_full;
  SELECT count(*) INTO v_rules FROM system_rules;
  SELECT count(*) INTO v_integrations FROM system_integrations_full;
  SELECT count(*) INTO v_flows FROM system_data_flows;

  -- Bump version
  SELECT COALESCE(MAX(version_number),0)+1 INTO v_version FROM system_versions;
  INSERT INTO system_versions (version_number, pages_count, content_count, backend_count, workflow_count, rule_count, integration_count, data_flow_count, coverage_score, notes)
  VALUES (v_version, v_pages, v_content, v_backend, v_wf, v_rules, v_integrations, v_flows, 100, 'Auto rebuild');

  -- Log change
  PERFORM record_system_change('manual', NULL, 'rebuild_full_manual', 'regenerated',
    format('Rebuilt manual: %s pages, %s backend, %s workflows, %s rules', v_pages, v_backend, v_wf, v_rules), v_version);
  PERFORM log_activity('manual_rebuilt',
    format('Full manual rebuilt to v%s — %s pages, %s backend objects', v_version, v_pages, v_backend), 'system_versions', NULL, 'platform');

  RETURN jsonb_build_object(
    'version', v_version, 'pages', v_pages, 'content', v_content,
    'backend', v_backend, 'workflows', v_wf, 'rules', v_rules,
    'integrations', v_integrations, 'data_flows', v_flows
  );
END; $$;

-- =========================================================
-- VALIDATE : validate_full_system_coverage
-- Check every page, table, function, workflow, rule has documentation.
-- Log critical system_event for each gap.
-- =========================================================
CREATE OR REPLACE FUNCTION public.validate_full_system_coverage()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_pages int; v_doc_pages int;
  v_total_tables int; v_doc_tables int;
  v_total_funcs int; v_doc_funcs int;
  v_total_wf int; v_doc_wf int;
  v_total_rules int; v_doc_rules int;
  v_gaps int := 0;
  v_score int;
  v_details jsonb := '{}'::jsonb;
  rec RECORD;
BEGIN
  -- Pages
  SELECT count(*) INTO v_total_pages FROM system_pages_index;
  SELECT count(*) INTO v_doc_pages FROM system_pages_index WHERE documented = true;

  -- Tables: live vs mirror
  SELECT count(*) INTO v_total_tables FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE';
  SELECT count(*) INTO v_doc_tables FROM system_backend_objects
    WHERE object_kind='table' AND documented = true;

  FOR rec IN
    SELECT t.table_name FROM information_schema.tables t
     WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
     AND NOT EXISTS (SELECT 1 FROM system_backend_objects b
                      WHERE b.object_kind='table' AND b.object_name=t.table_name)
  LOOP
    v_gaps := v_gaps + 1;
    PERFORM log_system_event('coverage_gap_table','table',NULL,'platform','critical',
      'Undocumented table: '||rec.table_name, jsonb_build_object('table',rec.table_name));
  END LOOP;

  -- Functions
  SELECT count(*) INTO v_total_funcs FROM information_schema.routines
    WHERE routine_schema='public' AND routine_type='FUNCTION';
  SELECT count(*) INTO v_doc_funcs FROM system_backend_objects
    WHERE object_kind='function' AND documented = true;

  FOR rec IN
    SELECT r.routine_name FROM information_schema.routines r
     WHERE r.routine_schema='public' AND r.routine_type='FUNCTION'
     AND NOT EXISTS (SELECT 1 FROM system_backend_objects b
                      WHERE b.object_kind='function' AND b.object_name=r.routine_name)
  LOOP
    v_gaps := v_gaps + 1;
    PERFORM log_system_event('coverage_gap_function','function',NULL,'platform','critical',
      'Undocumented function: '||rec.routine_name, jsonb_build_object('function',rec.routine_name));
  END LOOP;

  -- Workflows
  SELECT count(*) INTO v_total_wf FROM system_workflows_full;
  SELECT count(*) INTO v_doc_wf FROM system_workflows_full WHERE documented = true;

  -- Rules
  SELECT count(*) INTO v_total_rules FROM system_rules;
  SELECT count(*) INTO v_doc_rules FROM system_rules WHERE documented = true;

  -- Coverage score (weighted)
  v_score := GREATEST(0, LEAST(100,
    ROUND( ((COALESCE(v_doc_pages,0)::numeric / NULLIF(v_total_pages,0)) * 25)
         + ((COALESCE(v_doc_tables,0)::numeric / NULLIF(v_total_tables,0)) * 25)
         + ((COALESCE(v_doc_funcs,0)::numeric / NULLIF(v_total_funcs,0)) * 25)
         + ((COALESCE(v_doc_wf,0)::numeric / NULLIF(v_total_wf,0)) * 12)
         + ((COALESCE(v_doc_rules,0)::numeric / NULLIF(v_total_rules,0)) * 13))::int
  ));

  v_details := jsonb_build_object(
    'pages',  jsonb_build_object('total',v_total_pages, 'documented',v_doc_pages),
    'tables', jsonb_build_object('total',v_total_tables,'documented',v_doc_tables),
    'functions', jsonb_build_object('total',v_total_funcs,'documented',v_doc_funcs),
    'workflows', jsonb_build_object('total',v_total_wf,  'documented',v_doc_wf),
    'rules',  jsonb_build_object('total',v_total_rules, 'documented',v_doc_rules)
  );

  INSERT INTO system_coverage_reports
    (total_pages, documented_pages, total_tables, documented_tables,
     total_functions, documented_functions, total_workflows, documented_workflows,
     total_rules, documented_rules, coverage_score, gaps_found, details)
  VALUES (v_total_pages, v_doc_pages, v_total_tables, v_doc_tables,
          v_total_funcs, v_doc_funcs, v_total_wf, v_doc_wf,
          v_total_rules, v_doc_rules, v_score, v_gaps, v_details);

  PERFORM log_activity('coverage_validated',
    format('System coverage validated: %s%% (%s gaps)', v_score, v_gaps),
    'system_coverage_reports', NULL, 'platform');

  RETURN jsonb_build_object('coverage_score', v_score, 'gaps_found', v_gaps, 'details', v_details);
END; $$;