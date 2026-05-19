
-- =====================================================================
-- LIFTOR BRAIN FOUNDATION (Prompt 21B)
-- Tables, indexes, RLS (founder/admin only), seed provider + tool rows
-- No secret values stored. No external action capability created.
-- =====================================================================

-- ---------- TABLES ----------

CREATE TABLE IF NOT EXISTS public.liftor_brain_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  founder_user_id uuid,
  session_name text,
  session_type text NOT NULL DEFAULT 'command_centre',
  session_status text NOT NULL DEFAULT 'active',
  selected_scope text NOT NULL DEFAULT 'current_business',
  model_provider text NOT NULL DEFAULT 'openai',
  model_name text,
  last_user_message_at timestamptz,
  last_ai_message_at timestamptz,
  last_context_pack_id uuid,
  message_count integer NOT NULL DEFAULT 0,
  total_prompt_tokens integer NOT NULL DEFAULT 0,
  total_completion_tokens integer NOT NULL DEFAULT 0,
  total_cost_estimate numeric NOT NULL DEFAULT 0,
  external_actions_allowed boolean NOT NULL DEFAULT false,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_sessions_type_chk CHECK (session_type IN
    ('command_centre','business_operator','inbox_reply','support','customer_success','social_marketing','revenue','diagnostic','manual','other')),
  CONSTRAINT liftor_brain_sessions_status_chk CHECK (session_status IN ('active','archived','blocked','error')),
  CONSTRAINT liftor_brain_sessions_scope_chk CHECK (selected_scope IN
    ('current_business','all_businesses','customer','conversation','diagnostic','manual','other'))
);

CREATE TABLE IF NOT EXISTS public.liftor_brain_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.liftor_brain_sessions(id) ON DELETE CASCADE,
  business_id uuid,
  role text NOT NULL,
  message_text text NOT NULL,
  message_status text NOT NULL DEFAULT 'recorded',
  context_pack_id uuid,
  tool_call_batch_id uuid,
  source_object_type text,
  source_object_id uuid,
  tokens_prompt integer NOT NULL DEFAULT 0,
  tokens_completion integer NOT NULL DEFAULT 0,
  cost_estimate numeric NOT NULL DEFAULT 0,
  external_action_requested boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT false,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_messages_role_chk CHECK (role IN ('user','assistant','system','tool','audit')),
  CONSTRAINT liftor_brain_messages_status_chk CHECK (message_status IN ('recorded','generated','blocked','error','archived'))
);

CREATE TABLE IF NOT EXISTS public.liftor_brain_context_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  session_id uuid REFERENCES public.liftor_brain_sessions(id) ON DELETE SET NULL,
  context_type text NOT NULL DEFAULT 'command_centre',
  context_status text NOT NULL DEFAULT 'built',
  selected_business_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  portfolio_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  command_centre_truth jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_manual_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  technical_manual_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_knowledge_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  crm_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  conversation_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_journey_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  revenue_target_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  approvals_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_gates_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_marketing_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_media_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  support_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_success_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  finance_commercial_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  supplier_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  group_hq_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  agent_autonomy_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  diagnostics_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  security_safety_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_usage_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  retrieved_records jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_context text[] NOT NULL DEFAULT '{}',
  risk_warnings text[] NOT NULL DEFAULT '{}',
  recommended_tools text[] NOT NULL DEFAULT '{}',
  forbidden_actions text[] NOT NULL DEFAULT '{}',
  token_estimate integer NOT NULL DEFAULT 0,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_context_packs_type_chk CHECK (context_type IN
    ('command_centre','selected_business','inbox_reply','support_reply','customer_success','social_marketing','revenue_target','diagnostic','manual','other'))
);

CREATE TABLE IF NOT EXISTS public.liftor_brain_tool_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key text UNIQUE NOT NULL,
  tool_name text NOT NULL,
  tool_category text NOT NULL,
  tool_description text,
  edge_function_name text,
  data_source_hint text,
  risk_level text NOT NULL DEFAULT 'low',
  tool_status text NOT NULL DEFAULT 'enabled',
  external_action boolean NOT NULL DEFAULT false,
  read_only boolean NOT NULL DEFAULT true,
  internal_mutation_allowed boolean NOT NULL DEFAULT false,
  requires_founder_approval boolean NOT NULL DEFAULT false,
  requires_confirmation_phrase boolean NOT NULL DEFAULT false,
  confirmation_phrase text,
  max_batch_size integer NOT NULL DEFAULT 1,
  allowed_scopes text[] NOT NULL DEFAULT '{}',
  forbidden_outputs text[] NOT NULL DEFAULT '{}',
  blocked_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_tool_registry_risk_chk CHECK (risk_level IN ('low','medium','high','critical')),
  CONSTRAINT liftor_brain_tool_registry_status_chk CHECK (tool_status IN ('enabled','disabled','locked','diagnostic_only','deprecated'))
);

CREATE TABLE IF NOT EXISTS public.liftor_brain_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.liftor_brain_sessions(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.liftor_brain_messages(id) ON DELETE SET NULL,
  business_id uuid,
  tool_key text NOT NULL,
  tool_status text NOT NULL DEFAULT 'requested',
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_level text NOT NULL DEFAULT 'low',
  external_action boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT false,
  confirmation_phrase_required boolean NOT NULL DEFAULT false,
  error_message text,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_tool_calls_status_chk CHECK (tool_status IN ('requested','executed','blocked','failed','skipped'))
);

CREATE TABLE IF NOT EXISTS public.liftor_brain_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  session_id uuid REFERENCES public.liftor_brain_sessions(id) ON DELETE SET NULL,
  source_message_id uuid REFERENCES public.liftor_brain_messages(id) ON DELETE SET NULL,
  draft_type text NOT NULL,
  draft_status text NOT NULL DEFAULT 'draft',
  title text,
  subject text,
  body text NOT NULL,
  rationale text,
  source_object_type text,
  source_object_id uuid,
  crm_contact_id uuid,
  conversation_id uuid,
  approval_status text NOT NULL DEFAULT 'needs_review',
  founder_approval_review_id uuid,
  external_send_allowed boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  risk_warnings text[] NOT NULL DEFAULT '{}',
  missing_context text[] NOT NULL DEFAULT '{}',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_drafts_type_chk CHECK (draft_type IN
    ('inbound_email_reply','support_reply','customer_success_message','social_post','campaign_copy','proposal_note','revenue_plan','founder_brief','diagnostic_summary','manual_update_suggestion','other')),
  CONSTRAINT liftor_brain_drafts_status_chk CHECK (draft_status IN
    ('draft','needs_review','approved_internal','sent_to_founder_approval','rejected','archived'))
);

CREATE TABLE IF NOT EXISTS public.liftor_brain_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  session_id uuid REFERENCES public.liftor_brain_sessions(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text NOT NULL DEFAULT 'recorded',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_api_calls integer NOT NULL DEFAULT 0,
  external_provider_mutations integer NOT NULL DEFAULT 0,
  emails_sent integer NOT NULL DEFAULT 0,
  dms_sent integer NOT NULL DEFAULT 0,
  posts_published integer NOT NULL DEFAULT 0,
  apollo_calls integer NOT NULL DEFAULT 0,
  apollo_credits_spent integer NOT NULL DEFAULT 0,
  smartlead_posts integer NOT NULL DEFAULT 0,
  smartlead_campaign_starts integer NOT NULL DEFAULT 0,
  metricool_mutations integer NOT NULL DEFAULT 0,
  manychat_mutations integer NOT NULL DEFAULT 0,
  ad_platform_mutations integer NOT NULL DEFAULT 0,
  payment_mutations integer NOT NULL DEFAULT 0,
  portal_accounts_created integer NOT NULL DEFAULT 0,
  portal_invites_sent integer NOT NULL DEFAULT 0,
  surveys_sent integer NOT NULL DEFAULT 0,
  reports_shared integer NOT NULL DEFAULT 0,
  secrets_exposed integer NOT NULL DEFAULT 0,
  real_data_deleted integer NOT NULL DEFAULT 0,
  auto_send_changed boolean NOT NULL DEFAULT false,
  cron_changed boolean NOT NULL DEFAULT false,
  error_message text,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.liftor_brain_provider_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text UNIQUE NOT NULL,
  provider_name text NOT NULL,
  provider_status text NOT NULL DEFAULT 'not_configured',
  secret_name text NOT NULL,
  default_model text,
  fallback_model text,
  max_context_tokens integer NOT NULL DEFAULT 24000,
  max_output_tokens integer NOT NULL DEFAULT 4000,
  temperature numeric NOT NULL DEFAULT 0.3,
  reasoning_effort text,
  usage_budget_daily numeric,
  usage_budget_monthly numeric,
  allow_streaming boolean NOT NULL DEFAULT false,
  secret_value_stored boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_provider_config_status_chk CHECK (provider_status IN ('not_configured','configured','error','disabled'))
);

CREATE TABLE IF NOT EXISTS public.liftor_brain_access_map_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_name text NOT NULL,
  snapshot_status text NOT NULL DEFAULT 'draft',
  source_prompt text NOT NULL DEFAULT '21A',
  command_centre_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_knowledge_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  crm_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  inbox_email_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  approvals_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_gates_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_marketing_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  support_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_success_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  revenue_finance_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  agents_autonomy_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  group_hq_security_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_tool_registry jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_context_pack_shape jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocker_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  no_forbidden_action_audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_access_map_snapshots_status_chk CHECK (snapshot_status IN
    ('draft','ready_for_21b','ready_with_warnings','blocked','archived'))
);

-- ---------- INDEXES ----------
CREATE INDEX IF NOT EXISTS idx_lbs_business_id ON public.liftor_brain_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_lbs_founder_user_id ON public.liftor_brain_sessions(founder_user_id);
CREATE INDEX IF NOT EXISTS idx_lbs_status ON public.liftor_brain_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_lbs_type ON public.liftor_brain_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_lbs_created_at ON public.liftor_brain_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lbm_session_id ON public.liftor_brain_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_lbm_business_id ON public.liftor_brain_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_lbm_role ON public.liftor_brain_messages(role);
CREATE INDEX IF NOT EXISTS idx_lbm_created_at ON public.liftor_brain_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lbm_source_object ON public.liftor_brain_messages(source_object_type, source_object_id);

CREATE INDEX IF NOT EXISTS idx_lbcp_session_id ON public.liftor_brain_context_packs(session_id);
CREATE INDEX IF NOT EXISTS idx_lbcp_business_id ON public.liftor_brain_context_packs(business_id);
CREATE INDEX IF NOT EXISTS idx_lbcp_context_type ON public.liftor_brain_context_packs(context_type);
CREATE INDEX IF NOT EXISTS idx_lbcp_created_at ON public.liftor_brain_context_packs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lbtr_category ON public.liftor_brain_tool_registry(tool_category);
CREATE INDEX IF NOT EXISTS idx_lbtr_status ON public.liftor_brain_tool_registry(tool_status);
CREATE INDEX IF NOT EXISTS idx_lbtr_external ON public.liftor_brain_tool_registry(external_action);

CREATE INDEX IF NOT EXISTS idx_lbtc_session_id ON public.liftor_brain_tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_lbtc_business_id ON public.liftor_brain_tool_calls(business_id);
CREATE INDEX IF NOT EXISTS idx_lbtc_tool_key ON public.liftor_brain_tool_calls(tool_key);
CREATE INDEX IF NOT EXISTS idx_lbtc_status ON public.liftor_brain_tool_calls(tool_status);
CREATE INDEX IF NOT EXISTS idx_lbtc_created_at ON public.liftor_brain_tool_calls(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lbd_business_id ON public.liftor_brain_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_lbd_session_id ON public.liftor_brain_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_lbd_type ON public.liftor_brain_drafts(draft_type);
CREATE INDEX IF NOT EXISTS idx_lbd_status ON public.liftor_brain_drafts(draft_status);
CREATE INDEX IF NOT EXISTS idx_lbd_approval ON public.liftor_brain_drafts(approval_status);
CREATE INDEX IF NOT EXISTS idx_lbd_source_object ON public.liftor_brain_drafts(source_object_type, source_object_id);
CREATE INDEX IF NOT EXISTS idx_lbd_created_at ON public.liftor_brain_drafts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lba_business_id ON public.liftor_brain_audit(business_id);
CREATE INDEX IF NOT EXISTS idx_lba_session_id ON public.liftor_brain_audit(session_id);
CREATE INDEX IF NOT EXISTS idx_lba_action ON public.liftor_brain_audit(action);
CREATE INDEX IF NOT EXISTS idx_lba_action_status ON public.liftor_brain_audit(action_status);
CREATE INDEX IF NOT EXISTS idx_lba_created_at ON public.liftor_brain_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lbpc_status ON public.liftor_brain_provider_config(provider_status);

CREATE INDEX IF NOT EXISTS idx_lbams_status ON public.liftor_brain_access_map_snapshots(snapshot_status);
CREATE INDEX IF NOT EXISTS idx_lbams_source ON public.liftor_brain_access_map_snapshots(source_prompt);
CREATE INDEX IF NOT EXISTS idx_lbams_created_at ON public.liftor_brain_access_map_snapshots(created_at DESC);

-- ---------- RLS ----------
ALTER TABLE public.liftor_brain_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liftor_brain_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liftor_brain_context_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liftor_brain_tool_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liftor_brain_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liftor_brain_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liftor_brain_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liftor_brain_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liftor_brain_access_map_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'liftor_brain_sessions','liftor_brain_messages','liftor_brain_context_packs',
    'liftor_brain_tool_registry','liftor_brain_tool_calls','liftor_brain_drafts',
    'liftor_brain_audit','liftor_brain_provider_config','liftor_brain_access_map_snapshots'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "founder_admin_all_%s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "founder_admin_all_%s" ON public.%I FOR ALL TO authenticated
         USING (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''founder''::app_role))
         WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''founder''::app_role))',
      t, t
    );
  END LOOP;
END $$;

-- ---------- SEED PROVIDER CONFIG (no secret value) ----------
INSERT INTO public.liftor_brain_provider_config
  (provider_key, provider_name, provider_status, secret_name, default_model,
   fallback_model, max_context_tokens, max_output_tokens, temperature,
   reasoning_effort, allow_streaming, secret_value_stored)
VALUES
  ('openai','OpenAI','not_configured','OPENAI_API_KEY','gpt-5.5',
   NULL, 24000, 4000, 0.3, 'medium', false, false)
ON CONFLICT (provider_key) DO NOTHING;

-- ---------- SEED TOOL REGISTRY ----------
-- Read-only tools
INSERT INTO public.liftor_brain_tool_registry
  (tool_key, tool_name, tool_category, tool_description, read_only, internal_mutation_allowed,
   external_action, requires_founder_approval, requires_confirmation_phrase, risk_level, tool_status)
VALUES
  ('read_truth_sync','Read Truth Sync','command_centre','Read Command Centre truth-sync snapshot',true,false,false,false,false,'low','enabled'),
  ('read_business_status','Read Business Status','command_centre','Read selected business status',true,false,false,false,false,'low','enabled'),
  ('read_command_centre_summary','Read Command Centre Summary','command_centre','Read Command Centre summary blocks',true,false,false,false,false,'low','enabled'),
  ('read_manual_summary','Read Manual Summary','manuals','Read user/technical manual section index',true,false,false,false,false,'low','enabled'),
  ('read_business_knowledge','Read Business Knowledge','knowledge','Read business knowledge summary (no raw uploads)',true,false,false,false,false,'low','enabled'),
  ('read_crm_summary','Read CRM Summary','crm','Read CRM summary for selected business',true,false,false,false,false,'low','enabled'),
  ('read_customer_journey','Read Customer Journey','customer_success','Read customer journey snapshot',true,false,false,false,false,'low','enabled'),
  ('read_revenue_targets','Read Revenue Targets','revenue','Read revenue target operating mode',true,false,false,false,false,'low','enabled'),
  ('read_founder_approvals','Read Founder Approvals','approvals','Read founder approval queue summary',true,false,false,false,false,'low','enabled'),
  ('read_external_gates','Read External Gates','safety','Read external action gate statuses',true,false,false,false,false,'low','enabled'),
  ('read_social_marketing_summary','Read Social/Marketing Summary','social','Read social/marketing summary',true,false,false,false,false,'low','enabled'),
  ('read_paid_media_summary','Read Paid Media Summary','paid_media','Read paid media summary',true,false,false,false,false,'low','enabled'),
  ('read_support_summary','Read Support Summary','support','Read support summary',true,false,false,false,false,'low','enabled'),
  ('read_customer_success_summary','Read Customer Success Summary','customer_success','Read customer success summary',true,false,false,false,false,'low','enabled'),
  ('read_group_hq_summary','Read Group HQ Summary','group_hq','Read group HQ summary',true,false,false,false,false,'low','enabled'),
  ('read_security_summary','Read Security Summary','security','Read security/RLS/secrets summary (no values)',true,false,false,false,false,'low','enabled'),
  ('read_cost_summary','Read Cost Summary','cost','Read cost/usage/credits summary',true,false,false,false,false,'low','enabled')
ON CONFLICT (tool_key) DO NOTHING;

-- Internal draft tools
INSERT INTO public.liftor_brain_tool_registry
  (tool_key, tool_name, tool_category, tool_description, read_only, internal_mutation_allowed,
   external_action, requires_founder_approval, requires_confirmation_phrase, confirmation_phrase, risk_level, tool_status)
VALUES
  ('draft_inbound_email_reply','Draft Inbound Email Reply','inbox','Draft a reply to an inbound email (internal only)',false,true,false,true,true,'CREATE INBOUND EMAIL REPLY DRAFT','medium','enabled'),
  ('draft_support_reply','Draft Support Reply','support','Draft a support reply (internal only)',false,true,false,true,true,'CREATE SUPPORT REPLY DRAFT','medium','enabled'),
  ('draft_customer_success_plan','Draft Customer Success Plan','customer_success','Draft an onboarding/CS plan',false,true,false,true,true,'CREATE CUSTOMER SUCCESS PLAN DRAFT','medium','enabled'),
  ('draft_social_content_ideas','Draft Social Content Ideas','social','Draft social content ideas (no publish)',false,true,false,true,true,'CREATE SOCIAL CONTENT DRAFT','medium','enabled'),
  ('draft_revenue_activity_plan','Draft Revenue Activity Plan','revenue','Draft revenue activity plan',false,true,false,true,true,'CREATE REVENUE ACTIVITY DRAFT','medium','enabled'),
  ('draft_founder_brief','Draft Founder Brief','founder','Draft an internal founder brief',false,true,false,true,true,'CREATE FOUNDER BRIEF DRAFT','medium','enabled'),
  ('draft_diagnostic_summary','Draft Diagnostic Summary','diagnostic','Draft a diagnostic summary',false,true,false,true,true,'CREATE DIAGNOSTIC SUMMARY DRAFT','medium','enabled')
ON CONFLICT (tool_key) DO NOTHING;

-- Internal action tools
INSERT INTO public.liftor_brain_tool_registry
  (tool_key, tool_name, tool_category, tool_description, read_only, internal_mutation_allowed,
   external_action, requires_founder_approval, requires_confirmation_phrase, confirmation_phrase, risk_level, tool_status)
VALUES
  ('create_founder_approval_item','Create Founder Approval Item','approvals','Create an internal founder approval item',false,true,false,false,true,'CREATE FOUNDER APPROVAL ITEM','medium','enabled'),
  ('create_internal_ai_note','Create Internal AI Note','founder','Create an internal AI note',false,true,false,false,false,NULL,'low','enabled'),
  ('create_manual_export_pack','Create Manual Export Pack','manuals','Create an internal manual export pack',false,true,false,false,true,'CREATE MANUAL EXPORT PACK','medium','enabled'),
  ('generate_internal_next_actions','Generate Internal Next Actions','founder','Generate internal next-action list',false,true,false,false,false,NULL,'low','enabled')
ON CONFLICT (tool_key) DO NOTHING;

-- Blocked external placeholder
INSERT INTO public.liftor_brain_tool_registry
  (tool_key, tool_name, tool_category, tool_description, read_only, internal_mutation_allowed,
   external_action, requires_founder_approval, requires_confirmation_phrase, risk_level, tool_status, blocked_reason)
VALUES
  ('external_action_placeholder_blocked','External Action Placeholder (Blocked)','safety',
   'Placeholder for any external action. Always blocked.',false,false,true,true,true,'critical','locked',
   'External actions are locked by design. Liftor Brain cannot send, publish, spend, charge, invite, reveal or mutate providers.')
ON CONFLICT (tool_key) DO NOTHING;

-- Dangerous tools registered as locked/critical (future visibility, never enabled)
INSERT INTO public.liftor_brain_tool_registry
  (tool_key, tool_name, tool_category, tool_description, read_only, internal_mutation_allowed,
   external_action, requires_founder_approval, requires_confirmation_phrase, risk_level, tool_status, blocked_reason)
VALUES
  ('send_email','Send Email','external','Send email via provider',false,false,true,true,true,'critical','locked','External send locked by design'),
  ('send_dm','Send DM','external','Send DM via provider',false,false,true,true,true,'critical','locked','External send locked by design'),
  ('publish_post','Publish Post','external','Publish social post',false,false,true,true,true,'critical','locked','External publish locked by design'),
  ('schedule_metricool_post','Schedule Metricool Post','external','Schedule via Metricool API',false,false,true,true,true,'critical','locked','External provider mutation locked by design'),
  ('send_manychat_dm','Send ManyChat DM','external','Send via ManyChat API',false,false,true,true,true,'critical','locked','External provider mutation locked by design'),
  ('apollo_reveal','Apollo Reveal','external','Apollo reveal/credit spend',false,false,true,true,true,'critical','locked','External provider mutation locked by design'),
  ('smartlead_post','Smartlead POST','external','Smartlead POST',false,false,true,true,true,'critical','locked','External provider mutation locked by design'),
  ('smartlead_campaign_start','Smartlead Campaign Start','external','Smartlead campaign start',false,false,true,true,true,'critical','locked','External provider mutation locked by design'),
  ('stripe_charge','Stripe Charge','external','Payment mutation',false,false,true,true,true,'critical','locked','Payment mutations locked by design'),
  ('create_portal_account','Create Portal Account','external','Create customer portal account',false,false,true,true,true,'critical','locked','Portal account creation locked by design'),
  ('send_survey','Send Survey','external','Send customer survey',false,false,true,true,true,'critical','locked','External send locked by design'),
  ('share_report','Share Report','external','Share quarterly report externally',false,false,true,true,true,'critical','locked','External share locked by design')
ON CONFLICT (tool_key) DO NOTHING;

-- ---------- AUDIT ROW ----------
INSERT INTO public.liftor_brain_audit (action, action_status, details)
VALUES ('brain_foundation_created','recorded',
  jsonb_build_object(
    'prompt','21B',
    'tables_created',9,
    'provider_seeded','openai',
    'secret_value_stored',false,
    'external_actions','locked_by_design'
  ));
