
CREATE TABLE public.internal_operating_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_key text NOT NULL UNIQUE,
  schedule_name text NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  run_scope text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  safe_internal_only boolean NOT NULL DEFAULT true,
  external_actions_allowed boolean NOT NULL DEFAULT false,
  cron_expression text,
  frequency_label text,
  last_run_at timestamptz,
  next_run_at timestamptz,
  status text NOT NULL DEFAULT 'paused',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_operating_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage internal schedules"
  ON public.internal_operating_schedules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_internal_schedules_updated
  BEFORE UPDATE ON public.internal_operating_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.internal_operating_schedules (schedule_key, schedule_name, run_scope, frequency_label, cron_expression, metadata) VALUES
  ('morning_founder_brief', 'Morning founder brief', 'portfolio_summary', 'Daily 07:00', '0 7 * * *', '{"description": "Generate portfolio snapshot for founder review"}'::jsonb),
  ('crm_capture_check', 'CRM capture check', 'crm_capture', 'Every 30 min', '*/30 * * * *', '{"description": "Scan inbound interactions and persist to ledger"}'::jsonb),
  ('inbox_triage_check', 'Inbox triage check', 'inbox_triage', 'Every 30 min', '*/30 * * * *', '{"description": "Classify untriaged inbox items"}'::jsonb),
  ('ai_engagement_agent_check', 'AI engagement agent check', 'ai_engagement_agent', 'Hourly', '0 * * * *', '{"description": "Classify CRM interactions and create internal drafts/tasks"}'::jsonb),
  ('proposal_opportunity_check', 'Proposal opportunity check', 'proposal_agent', 'Every 2h', '0 */2 * * *', '{"description": "Detect proposal-ready conversations and stage internal drafts"}'::jsonb),
  ('finance_overdue_review', 'Finance overdue review', 'finance_review', 'Daily 09:00', '0 9 * * *', '{"description": "Flag overdue invoices and surface review queue"}'::jsonb),
  ('supplier_assignment_review', 'Supplier assignment review', 'supplier_review', 'Daily 09:30', '30 9 * * *', '{"description": "Surface unassigned/at-risk supplier work"}'::jsonb),
  ('system_health_check', 'System health check', 'system_health', 'Every 30 min', '*/30 * * * *', '{"description": "Run platform diagnostics and log warnings"}'::jsonb),
  ('portfolio_snapshot_check', 'Portfolio snapshot', 'portfolio_snapshot', 'Daily 23:00', '0 23 * * *', '{"description": "Persist portfolio_operating_snapshots row"}'::jsonb);
