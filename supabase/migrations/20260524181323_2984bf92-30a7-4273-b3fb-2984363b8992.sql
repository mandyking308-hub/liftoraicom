
ALTER TABLE public.ai_kill_switch_state
  ADD COLUMN IF NOT EXISTS simulation_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS simulation_label text;

ALTER TABLE public.ai_usage_ledger ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;
ALTER TABLE public.ai_cost_alerts ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;
ALTER TABLE public.ai_action_queue ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;
ALTER TABLE public.ai_quality_scores ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_sim ON public.ai_usage_ledger(is_simulation);
CREATE INDEX IF NOT EXISTS idx_ai_cost_alerts_sim ON public.ai_cost_alerts(is_simulation);
CREATE INDEX IF NOT EXISTS idx_ai_action_queue_sim ON public.ai_action_queue(is_simulation);

CREATE TABLE IF NOT EXISTS public.ai_sandbox_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('seed','scenario','backtest','replay','purge','qa_check')),
  scope text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  affected_rows integer NOT NULL DEFAULT 0,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_sandbox_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_sandbox_runs"
  ON public.ai_sandbox_runs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
