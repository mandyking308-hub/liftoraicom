
CREATE TABLE IF NOT EXISTS public.self_healing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_label text NOT NULL,
  monitored_area text NOT NULL,
  detection_query_description text,
  severity text NOT NULL DEFAULT 'medium',
  safe_auto_repair_allowed boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  repair_action_type text,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.self_healing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view self healing rules"
  ON public.self_healing_rules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders can manage self healing rules"
  ON public.self_healing_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_shr_updated_at BEFORE UPDATE ON public.self_healing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.self_healing_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  business_id uuid,
  severity text NOT NULL DEFAULT 'medium',
  finding_title text NOT NULL,
  finding_summary text,
  source_table text,
  source_id uuid,
  recommended_repair text,
  repair_safe boolean NOT NULL DEFAULT false,
  repair_status text NOT NULL DEFAULT 'open',
  founder_approval_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shf_rule ON public.self_healing_findings(rule_key);
CREATE INDEX IF NOT EXISTS idx_shf_status ON public.self_healing_findings(repair_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shf_open ON public.self_healing_findings(rule_key, source_table, source_id) WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

ALTER TABLE public.self_healing_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view self healing findings"
  ON public.self_healing_findings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders can manage self healing findings"
  ON public.self_healing_findings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_shf_updated_at BEFORE UPDATE ON public.self_healing_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.self_healing_rules (rule_key, rule_label, monitored_area, detection_query_description, severity, safe_auto_repair_allowed, repair_action_type) VALUES
  ('unmatched_provider_events','Unmatched provider events','integrations','Provider events with no contact match', 'medium', true, 'rematch_event'),
  ('stuck_agent_tasks','Stuck agent tasks','agents','ai_agent_task_queue rows pending > 24h', 'high', true, 'requeue_task'),
  ('failed_edge_function','Failed edge function executions','platform','workflow_executions with status=failed recently', 'high', false, 'flag_for_review'),
  ('missing_business_profile','Missing business profile','crm','contacts with business_id but no business profile row', 'medium', false, 'create_profile_stub'),
  ('missing_agent_assignment','Missing agent assignment','agents','active business with no agent assignments', 'medium', false, 'recommend_assignment'),
  ('crm_empty_timeline','CRM contact with empty timeline','crm','contacts with no interactions in 30d', 'low', true, 'tag_for_outreach_review'),
  ('broken_route_mount','Broken route mount','platform','known route returning 404 in monitoring', 'high', false, 'flag_for_review'),
  ('missing_RLS_on_new_table','Missing RLS on new table','platform','public table without RLS enabled', 'critical', false, 'escalate_security'),
  ('stale_smartlead_readiness','Stale Smartlead readiness check','integrations','smartlead readiness > 7d old', 'low', true, 'reschedule_check'),
  ('webhook_not_configured','Webhook not configured','integrations','integration marked active but no webhook', 'medium', false, 'flag_for_review'),
  ('high_unanswered_warm_leads','High unanswered warm leads','outreach','warm replies with no founder action > 48h', 'high', false, 'escalate_to_founder'),
  ('overdue_founder_approvals','Overdue founder approvals','approvals','approval items pending > 72h', 'high', false, 'escalate_to_founder'),
  ('failed_proposal_generation','Failed proposal generation','proposals','proposal status=failed in last 7d', 'medium', false, 'flag_for_review'),
  ('invoice_overdue','Invoice overdue','finance','invoice past due_date and unpaid', 'high', false, 'escalate_to_finance'),
  ('supplier_assignment_stuck','Supplier assignment stuck','suppliers','supplier assignment pending > 5d', 'medium', false, 'escalate_to_ops'),
  ('portfolio_business_blocked','Portfolio business blocked','operations','business marked blocked > 24h', 'high', false, 'escalate_to_founder')
ON CONFLICT (rule_key) DO NOTHING;
