
-- ============================================================
-- AI Workflow orchestration (live, multi-agent, multi-business)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL UNIQUE,
  workflow_type TEXT NOT NULL,
  portfolio_asset_id UUID,
  business_id UUID,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed','paused','waiting_approval','cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  initiated_by UUID,
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 5,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_status ON public.ai_workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_business ON public.ai_workflow_runs(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_asset ON public.ai_workflow_runs(portfolio_asset_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_runs_created ON public.ai_workflow_runs(created_at DESC);

ALTER TABLE public.ai_workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders read ai workflow runs" ON public.ai_workflow_runs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "founders write ai workflow runs" ON public.ai_workflow_runs
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_workflow_runs_updated
  BEFORE UPDATE ON public.ai_workflow_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.ai_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES public.ai_workflow_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL DEFAULT 0,
  step_name TEXT NOT NULL,
  agent_id UUID REFERENCES public.ai_agent_registry(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed','skipped','waiting_approval','cancelled')),
  input_summary TEXT,
  output_summary TEXT,
  request_id TEXT,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_workflow_steps_run ON public.ai_workflow_steps(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_steps_status ON public.ai_workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_ai_workflow_steps_agent ON public.ai_workflow_steps(agent_id);

ALTER TABLE public.ai_workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders read ai workflow steps" ON public.ai_workflow_steps
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "founders write ai workflow steps" ON public.ai_workflow_steps
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- ============================================================
-- Seed the operating agent registry (idempotent)
-- ============================================================

INSERT INTO public.ai_agent_registry
  (agent_name, agent_type, description, allowed_actions, prohibited_actions,
   approval_required_actions, max_concurrency, daily_run_limit, monthly_budget_gbp,
   primary_model, fallback_model, status, metadata)
VALUES
  ('outreach_agent','outreach',
   'Drafts outbound outreach copy and sequences. Never sends without founder approval.',
   ARRAY['draft_message','score_lead','suggest_sequence'],
   ARRAY['send_external_email','auto_send_sequence','modify_provider_account'],
   ARRAY['queue_outbound','publish_sequence'],
   6, 800, 80, 'google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'active',
   '{"escalation":"founder_approval_agent","output":"outreach_drafts","logging":"ai_gateway_requests"}'::jsonb),

  ('inbox_agent','inbox',
   'Triages inbound messages, classifies intent, drafts replies for review.',
   ARRAY['classify_inbound','draft_reply','tag_conversation','route_to_agent'],
   ARRAY['send_external_reply','delete_inbound','modify_provider_account'],
   ARRAY['mark_resolved_external','escalate_to_human'],
   8, 1500, 60, 'google/gemini-2.5-flash', 'google/gemini-3-flash-preview', 'active',
   '{"escalation":"compliance_agent","output":"ai_drafts","logging":"ai_gateway_requests"}'::jsonb),

  ('crm_agent','crm',
   'Maintains contact, account and opportunity records based on interactions.',
   ARRAY['enrich_contact','update_opportunity_stage','log_activity','suggest_next_step'],
   ARRAY['delete_contact','export_pii','share_external'],
   ARRAY['merge_records','bulk_update_stage'],
   6, 1200, 50, 'google/gemini-2.5-flash-lite', 'google/gemini-3-flash-preview', 'active',
   '{"escalation":"founder_approval_agent","output":"crm_updates","logging":"ai_gateway_requests"}'::jsonb),

  ('content_agent','content',
   'Generates internal content drafts (posts, briefings, proposals).',
   ARRAY['draft_post','draft_briefing','draft_proposal','rewrite_section'],
   ARRAY['publish_external','send_to_customers','modify_brand_guidelines'],
   ARRAY['publish_post','send_proposal'],
   4, 400, 70, 'google/gemini-2.5-pro', 'google/gemini-3-flash-preview', 'active',
   '{"escalation":"founder_approval_agent","output":"content_drafts","logging":"ai_gateway_requests"}'::jsonb),

  ('reporting_agent','reporting',
   'Generates internal KPI, performance and finance reports.',
   ARRAY['compile_report','summarise_kpis','calculate_metric'],
   ARRAY['publish_external','share_external','modify_finance_records'],
   ARRAY[]::text[],
   4, 300, 30, 'google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'active',
   '{"escalation":"founder_approval_agent","output":"internal_reports","logging":"ai_gateway_requests"}'::jsonb),

  ('compliance_agent','compliance',
   'Audits drafts and actions for legal, privacy and policy risks.',
   ARRAY['audit_draft','check_policy','flag_risk','recommend_redaction'],
   ARRAY['send_external','modify_legal_records'],
   ARRAY['override_block'],
   3, 500, 20, 'google/gemini-2.5-flash', 'google/gemini-3-flash-preview', 'active',
   '{"escalation":"founder_approval_agent","output":"compliance_flags","logging":"ai_gateway_requests"}'::jsonb),

  ('buyer_warmup_agent','buyer_warmup',
   'Tracks buyer interest signals and prepares warm-up drafts for portfolio exits.',
   ARRAY['score_buyer_interest','draft_warmup_message','suggest_next_touch'],
   ARRAY['send_external','share_data_room_externally'],
   ARRAY['send_warmup_message','share_teaser'],
   3, 200, 40, 'google/gemini-2.5-pro', 'google/gemini-3-flash-preview', 'active',
   '{"escalation":"founder_approval_agent","output":"buyer_warmup_drafts","logging":"ai_gateway_requests"}'::jsonb),

  ('data_room_agent','data_room',
   'Indexes and answers questions on the portfolio data room. Read-only by default.',
   ARRAY['index_document','answer_question','summarise_section','generate_diligence_pack'],
   ARRAY['delete_document','share_externally','modify_document'],
   ARRAY['grant_room_access'],
   4, 600, 30, 'google/gemini-2.5-pro', 'google/gemini-3-flash-preview', 'active',
   '{"escalation":"founder_approval_agent","output":"data_room_answers","logging":"ai_gateway_requests"}'::jsonb),

  ('founder_approval_agent','approval',
   'Holds high-risk actions for founder review. Routes approvals.',
   ARRAY['queue_approval','present_evidence','notify_founder'],
   ARRAY['auto_approve','bypass_review'],
   ARRAY[]::text[],
   2, 1000, 5, 'google/gemini-3-flash-preview', 'google/gemini-2.5-flash-lite', 'active',
   '{"escalation":"founder","output":"approval_queue","logging":"ai_gateway_requests"}'::jsonb),

  ('ma_intelligence_agent','ma_intelligence',
   'Generates M&A briefings, asset analysis, comp memos and recommendations.',
   ARRAY['generate_briefing','analyse_asset','draft_memo','recommend_action'],
   ARRAY['contact_buyer_externally','send_teaser','share_financials_externally'],
   ARRAY['publish_briefing','share_with_adviser'],
   3, 200, 60, 'google/gemini-2.5-pro', 'google/gemini-3-flash-preview', 'active',
   '{"escalation":"founder_approval_agent","output":"ma_intelligence_runs","logging":"ai_gateway_requests"}'::jsonb),

  ('portfolio_commander_agent','portfolio_commander',
   'Coordinates other agents across portfolio assets and exit workflows.',
   ARRAY['orchestrate_workflow','assign_agent','escalate','pause_workflow'],
   ARRAY['contact_externally','modify_legal_entity','transfer_funds'],
   ARRAY['launch_exit_workflow','reassign_owner'],
   2, 200, 20, 'google/gemini-2.5-pro', 'google/gemini-3-flash-preview', 'active',
   '{"escalation":"founder","output":"ai_workflow_runs","logging":"ai_gateway_requests"}'::jsonb)
ON CONFLICT (agent_name) DO UPDATE SET
  agent_type = EXCLUDED.agent_type,
  description = EXCLUDED.description,
  allowed_actions = EXCLUDED.allowed_actions,
  prohibited_actions = EXCLUDED.prohibited_actions,
  approval_required_actions = EXCLUDED.approval_required_actions,
  max_concurrency = EXCLUDED.max_concurrency,
  daily_run_limit = EXCLUDED.daily_run_limit,
  monthly_budget_gbp = EXCLUDED.monthly_budget_gbp,
  primary_model = EXCLUDED.primary_model,
  fallback_model = EXCLUDED.fallback_model,
  metadata = EXCLUDED.metadata,
  updated_at = now();
