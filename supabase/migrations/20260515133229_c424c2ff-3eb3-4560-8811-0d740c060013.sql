
CREATE TABLE IF NOT EXISTS public.liftor_operating_test_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_key text NOT NULL UNIQUE,
  scenario_name text NOT NULL,
  description text NULL,
  module_area text NOT NULL,
  required_objects jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  forbidden_operations jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liftor_operating_test_scenarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='liftor_operating_test_scenarios' AND policyname='Founders/admins manage operating test scenarios') THEN
    CREATE POLICY "Founders/admins manage operating test scenarios"
      ON public.liftor_operating_test_scenarios FOR ALL
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
      WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='liftor_operating_test_scenarios' AND policyname='Authenticated read active operating test scenarios') THEN
    CREATE POLICY "Authenticated read active operating test scenarios"
      ON public.liftor_operating_test_scenarios FOR SELECT
      USING (auth.uid() IS NOT NULL AND active = true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_lots_updated_at ON public.liftor_operating_test_scenarios;
CREATE TRIGGER trg_lots_updated_at BEFORE UPDATE ON public.liftor_operating_test_scenarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.liftor_operating_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_scope text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  scenario_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  readiness_score numeric NULL,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  forbidden_operations_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liftor_operating_test_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='liftor_operating_test_runs' AND policyname='Founders/admins manage operating test runs') THEN
    CREATE POLICY "Founders/admins manage operating test runs"
      ON public.liftor_operating_test_runs FOR ALL
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
      WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_lotr_started ON public.liftor_operating_test_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS public.liftor_live_readiness_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_key text NOT NULL UNIQUE,
  gate_label text NOT NULL,
  gate_area text NOT NULL,
  required_for_live boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'not_checked',
  blocker_reason text NULL,
  last_checked_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liftor_live_readiness_gates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='liftor_live_readiness_gates' AND policyname='Founders/admins manage live readiness gates') THEN
    CREATE POLICY "Founders/admins manage live readiness gates"
      ON public.liftor_live_readiness_gates FOR ALL
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
      WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
  END IF;
END $$;
DROP TRIGGER IF EXISTS trg_llrg_updated_at ON public.liftor_live_readiness_gates;
CREATE TRIGGER trg_llrg_updated_at BEFORE UPDATE ON public.liftor_live_readiness_gates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.liftor_operating_test_scenarios (scenario_key, scenario_name, module_area, description) VALUES
  ('smartlead_scale_readiness', 'Smartlead scale lane readiness', 'outreach', 'Verifies Smartlead provider config, mailbox, campaign mapping and webhook readiness without sending.'),
  ('crm_customer_memory_readiness', 'CRM customer memory readiness', 'crm', 'Verifies canonical contacts, ledger, identity match and dedupe are in place.'),
  ('provider_event_to_crm_match', 'Provider event → CRM match', 'crm', 'Validates inbound provider events match a contact via identity rules.'),
  ('crm_timeline_contact_360', 'CRM timeline + Contact 360', 'crm', 'Verifies unified timeline assembles for a sample contact.'),
  ('ai_agent_status_readiness', 'AI agent operating status readiness', 'ai_agents', 'Confirms agents are registered with permissions and guardrails.'),
  ('ai_orchestrator_task_preview', 'AI orchestrator task preview', 'ai_agents', 'Confirms orchestrator preview surfaces tasks without execution.'),
  ('ai_conversation_draft_preview', 'AI conversation draft preview', 'ai_drafts', 'Confirms draft engine returns intent + draft without saving or sending.'),
  ('founder_approval_queue_preview', 'Founder approval queue preview', 'approvals', 'Confirms approval queue aggregates pending items, no execution.'),
  ('commercial_handoff_preview', 'Commercial handoff preview', 'commercial', 'Confirms qualified conversations classify into proposal/demo/deal candidates.'),
  ('proposal_preview', 'Proposal preview generation', 'commercial', 'Confirms proposal preview generates from CRM context, no record created.'),
  ('demo_readiness_preview', 'Demo readiness preview', 'commercial', 'Confirms demo-ready candidates surface for founder scheduling.'),
  ('deal_finance_readiness_preview', 'Deal/finance readiness preview', 'finance', 'Confirms deals→invoice→payment readiness items surface.'),
  ('supplier_assignment_preview', 'Supplier assignment preview', 'delivery', 'Confirms supplier match recommendations for unassigned won deals.'),
  ('full_source_to_payment_dry_run', 'Full source → payment dry run', 'meta', 'End-to-end spine check from outreach to payment, preview-only.'),
  ('no_send_safety_audit', 'No-send safety audit', 'safety', 'Confirms no email send paths are wired or executed.'),
  ('no_provider_mutation_audit', 'No provider mutation audit', 'safety', 'Confirms no Apollo/Smartlead POST mutations are wired or executed.')
ON CONFLICT (scenario_key) DO UPDATE SET
  scenario_name = EXCLUDED.scenario_name,
  module_area = EXCLUDED.module_area,
  description = EXCLUDED.description,
  active = true;

INSERT INTO public.liftor_live_readiness_gates (gate_key, gate_label, gate_area, required_for_live) VALUES
  ('safety_brake_confirmed', 'Safety brake confirmed', 'safety', true),
  ('auto_send_disabled_until_live', 'Auto-send disabled until live', 'safety', true),
  ('cron_disabled_until_live', 'Cron disabled until live', 'safety', true),
  ('smartlead_mailbox_connected', 'Smartlead mailbox connected', 'outreach', true),
  ('smartlead_campaign_mapped', 'Smartlead campaign mapped', 'outreach', true),
  ('smartlead_webhook_ready', 'Smartlead webhook ready', 'outreach', true),
  ('lead_push_preview_passed', 'Lead push preview passed', 'outreach', true),
  ('crm_memory_ready', 'CRM memory ready', 'crm', true),
  ('ai_agents_ready', 'AI agents ready', 'ai_agents', true),
  ('founder_approval_ready', 'Founder approval ready', 'approvals', true),
  ('proposal_handoff_ready', 'Proposal handoff ready', 'commercial', true),
  ('finance_supplier_ready', 'Finance/supplier ready', 'finance', true),
  ('no_forbidden_operations', 'No forbidden operations detected', 'safety', true),
  ('manual_updated', 'Manual + build log updated', 'docs', true),
  ('founder_final_live_authorisation', 'Founder final live authorisation', 'governance', true)
ON CONFLICT (gate_key) DO UPDATE SET
  gate_label = EXCLUDED.gate_label,
  gate_area = EXCLUDED.gate_area,
  required_for_live = EXCLUDED.required_for_live;
