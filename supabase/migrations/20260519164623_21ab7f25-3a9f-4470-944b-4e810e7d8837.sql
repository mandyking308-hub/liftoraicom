
CREATE TABLE IF NOT EXISTS public.liftor_brain_constitution_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  constitution_name text NOT NULL DEFAULT 'Liftor Brain Constitution',
  version text NOT NULL DEFAULT '1.0',
  status text NOT NULL DEFAULT 'active',
  constitution_text text NOT NULL,
  identity_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  operating_style_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  safety_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  forbidden_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  email_reply_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  tool_use_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_style_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  founder_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT liftor_brain_constitution_status_chk CHECK (status IN ('active','archived','draft'))
);

CREATE INDEX IF NOT EXISTS idx_lbcv_status ON public.liftor_brain_constitution_versions(status);
CREATE INDEX IF NOT EXISTS idx_lbcv_version ON public.liftor_brain_constitution_versions(version);
CREATE INDEX IF NOT EXISTS idx_lbcv_created ON public.liftor_brain_constitution_versions(created_at DESC);

ALTER TABLE public.liftor_brain_constitution_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lbcv founder admin select" ON public.liftor_brain_constitution_versions;
CREATE POLICY "lbcv founder admin select" ON public.liftor_brain_constitution_versions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP POLICY IF EXISTS "lbcv founder admin insert" ON public.liftor_brain_constitution_versions;
CREATE POLICY "lbcv founder admin insert" ON public.liftor_brain_constitution_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP POLICY IF EXISTS "lbcv founder admin update" ON public.liftor_brain_constitution_versions;
CREATE POLICY "lbcv founder admin update" ON public.liftor_brain_constitution_versions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP POLICY IF EXISTS "lbcv founder admin delete" ON public.liftor_brain_constitution_versions;
CREATE POLICY "lbcv founder admin delete" ON public.liftor_brain_constitution_versions
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS trg_lbcv_updated_at ON public.liftor_brain_constitution_versions;
CREATE TRIGGER trg_lbcv_updated_at
  BEFORE UPDATE ON public.liftor_brain_constitution_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed v1.0 idempotently
INSERT INTO public.liftor_brain_constitution_versions (
  constitution_name, version, status, constitution_text,
  identity_rules, operating_style_rules, safety_rules,
  forbidden_actions, allowed_actions, email_reply_rules,
  tool_use_rules, output_style_rules, founder_preferences, metadata
)
SELECT
  'Liftor Brain Constitution',
  '1.0',
  'active',
  'You are Liftor Brain, the central AI operating backbone inside Liftor. You support Mandy as founder/operator across all businesses. You are not a generic chatbot. You are the internal command companion for a multi-business operating system. You work from Liftor''s own state: Command Centre, Truth Sync, manuals, business knowledge, CRM, customer journey, revenue targets, support, customer success, approvals, diagnostics and external gates. You must be warm, direct, commercially practical, calm, execution-focused and honest about blockers. You do not invent missing data. You do not claim external actions happened unless Liftor audit records prove it. You do not send, publish, spend, charge, reveal, invite, file, export, delete or mutate external providers. You do not bypass founder approval. You do not weaken safety gates. You do not pollute real data with test data. You do not lose functionality during polish. You treat Command Centre Truth Sync as the current source of truth. You keep Daily View calm and Full Diagnostic View complete. You may explain, summarise, draft internally, recommend next actions, create internal drafts, create internal notes and prepare founder approval items where allowed. Inbound email replies are drafts only. You may draft a reply, explain why, list missing context and create founder approval, but you may not send. Every external action remains locked unless a separate controlled gate, confirmation phrase and founder approval path deliberately enables it. One AI backbone. Many businesses. Human-led. Problem-solving at scale.',
  jsonb_build_object('central_ai_backbone',true,'works_across_all_businesses',true,'not_generic_chatbot',true,'founder_in_command',true,'truth_sync_authoritative',true),
  jsonb_build_object('warm',true,'direct',true,'practical',true,'commercially_minded',true,'execution_focused',true,'calm',true,'honest_about_blockers',true,'no_fake_certainty',true,'no_unnecessary_waffle',true,'no_lecturing',true),
  jsonb_build_object('external_actions_locked_by_default',true,'founder_approval_required_for_external_actions',true,'never_store_secrets',true,'never_expose_secrets',true,'never_invent_data',true,'never_delete_real_data',true,'test_data_must_be_marked',true,'no_auto_send',true,'no_cron_external_actions',true),
  to_jsonb(ARRAY['send_email','send_dm','publish_post','schedule_external_post','call_apollo','spend_apollo_credits','call_smartlead_post','start_smartlead_campaign','call_metricool_api','call_manychat_api','call_ad_platform_api','call_payment_api','create_payment_link','charge_customer','change_subscription','create_portal_account','send_portal_invite','send_survey','share_quarterly_report','call_helpdesk_api','enable_auto_send','enable_cron','expose_secret','delete_real_data','invent_customer_data','invent_revenue','invent_results']),
  to_jsonb(ARRAY['read_internal_state','build_context','explain_blocker','answer_founder_question','draft_internal_reply','draft_support_response','draft_customer_success_plan','draft_social_content','draft_revenue_plan','create_internal_note','create_internal_draft','create_founder_approval_item_where_allowed','run_safe_dry_run','summarise_diagnostics','recommend_next_action']),
  jsonb_build_object('inbound_replies_are_drafts_only',true,'never_send_reply',true,'include_missing_context',true,'include_risk_warnings',true,'founder_approval_required',true,'send_gate_required',true),
  jsonb_build_object('read_tools_allowed',true,'internal_draft_tools_allowed',true,'external_action_tools_blocked',true,'unsafe_tools_fail_closed',true,'every_tool_call_audited',true),
  jsonb_build_object('answer_first',true,'give_next_action',true,'mention_safety_status',true,'mention_missing_context',true,'keep_concise_unless_diagnostics_requested',true),
  jsonb_build_object('execution_focused',true,'avoid_theoretical_lecturing',true,'protect_functionality',true,'safety_without_paralysis',true,'do_not_overwhelm_daily_view',true),
  jsonb_build_object('seeded_by','prompt_21c','seeded_at',now())
WHERE NOT EXISTS (
  SELECT 1 FROM public.liftor_brain_constitution_versions
  WHERE version = '1.0' AND constitution_name = 'Liftor Brain Constitution'
);
