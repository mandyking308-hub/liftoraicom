
CREATE TABLE IF NOT EXISTS public.agent_business_live_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  setting_key text NOT NULL,
  setting_value boolean NOT NULL DEFAULT false,
  description text,
  risk_level text NOT NULL DEFAULT 'medium',
  founder_approval_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_business_live_settings_key
  ON public.agent_business_live_settings (setting_key, COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.agent_business_live_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders manage business live settings" ON public.agent_business_live_settings;
CREATE POLICY "Founders manage business live settings"
  ON public.agent_business_live_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_agent_business_live_settings_updated
  BEFORE UPDATE ON public.agent_business_live_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.agent_action_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  agent_key text,
  action_type text NOT NULL,
  source_function text,
  source_table text,
  source_id uuid,
  target_table text,
  target_id uuid,
  founder_user_id uuid,
  confirmation_phrase text,
  dry_run boolean NOT NULL DEFAULT true,
  action_status text NOT NULL,
  blocked_reason text,
  external_provider_called boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  apollo_called boolean NOT NULL DEFAULT false,
  smartlead_post_called boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_action_audit_created ON public.agent_action_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_action_audit_action_type ON public.agent_action_audit_log (action_type);
CREATE INDEX IF NOT EXISTS idx_agent_action_audit_status ON public.agent_action_audit_log (action_status);

ALTER TABLE public.agent_action_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders read audit log" ON public.agent_action_audit_log;
CREATE POLICY "Founders read audit log"
  ON public.agent_action_audit_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_agent_live_setting_enabled(_setting_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT setting_value
       FROM public.agent_business_live_settings
      WHERE setting_key = _setting_key
        AND business_id IS NULL
      LIMIT 1),
    false
  );
$$;

INSERT INTO public.agent_business_live_settings (setting_key, setting_value, description, risk_level, founder_approval_required)
VALUES
  ('agent_task_creation_enabled', true, 'Allow AI agents to create internal task queue records', 'low', true),
  ('ai_draft_creation_enabled', true, 'Allow AI agents to save draft replies for founder review', 'low', true),
  ('founder_approval_item_creation_enabled', true, 'Allow agents to create founder approval items', 'low', true),
  ('crm_next_action_creation_enabled', true, 'Allow agents to create CRM next-action review items', 'low', true),
  ('crm_interaction_capture_enabled', true, 'Allow idempotent capture of CRM interaction ledger rows from matched sources', 'low', true),
  ('conversation_bridge_review_enabled', true, 'Allow creation of conversation bridge review records', 'low', true),
  ('proposal_draft_creation_enabled', true, 'Allow creation of proposal draft/review records', 'low', true),
  ('commercial_handoff_review_enabled', true, 'Allow creation of commercial handoff review records', 'low', true),
  ('revenue_review_creation_enabled', true, 'Allow creation of revenue/supplier review records', 'low', true),
  ('external_email_send_enabled', false, 'Allow agents to send real outbound emails', 'critical', true),
  ('apollo_credit_spend_enabled', false, 'Allow agents to spend Apollo credits', 'critical', true),
  ('smartlead_post_enabled', false, 'Allow agents to call Smartlead POST endpoints', 'critical', true),
  ('smartlead_campaign_start_enabled', false, 'Allow agents to start Smartlead campaigns', 'critical', true),
  ('auto_send_enabled', false, 'Allow autonomous send without per-item founder approval', 'critical', true),
  ('cron_send_enabled', false, 'Allow cron-driven send', 'critical', true),
  ('bulk_compliance_approval_enabled', false, 'Allow bulk approval of compliance records', 'critical', true)
ON CONFLICT DO NOTHING;
