
-- AI Action Queue
CREATE TABLE public.ai_action_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  agent_id uuid,
  campaign_id uuid,
  task_id uuid,
  workflow_id uuid,
  action_type text NOT NULL,
  task_category text NOT NULL,
  requested_model_tier text,
  selected_model_tier text,
  estimated_cost numeric NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','blocked','cancelled','requires_approval','duplicate_prevented')),
  idempotency_key text UNIQUE,
  linked_ledger_id uuid,
  block_reason text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 2,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_ai_action_queue_status ON public.ai_action_queue(status);
CREATE INDEX idx_ai_action_queue_business ON public.ai_action_queue(business_id);
CREATE INDEX idx_ai_action_queue_agent ON public.ai_action_queue(agent_id);
CREATE INDEX idx_ai_action_queue_campaign ON public.ai_action_queue(campaign_id);
CREATE INDEX idx_ai_action_queue_created ON public.ai_action_queue(created_at DESC);

ALTER TABLE public.ai_action_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_action_queue"
  ON public.ai_action_queue
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AI Rate Limits
CREATE TABLE public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('global','business','agent','campaign','task_category')),
  scope_id text,
  task_category text,
  per_hour_limit integer,
  per_day_limit integer,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope_type, scope_id, task_category)
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_rate_limits"
  ON public.ai_rate_limits
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Kill Switch State (singleton)
CREATE TABLE public.ai_kill_switch_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  global_ai_paused boolean NOT NULL DEFAULT false,
  paused_business_ids uuid[] NOT NULL DEFAULT '{}',
  paused_agent_ids uuid[] NOT NULL DEFAULT '{}',
  paused_campaign_ids uuid[] NOT NULL DEFAULT '{}',
  pause_reason text,
  paused_by uuid,
  paused_at timestamptz,
  resumed_by uuid,
  resumed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_kill_switch_state (singleton) VALUES (true);

ALTER TABLE public.ai_kill_switch_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage kill switch"
  ON public.ai_kill_switch_state
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ai_action_queue_updated_at
  BEFORE UPDATE ON public.ai_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER ai_kill_switch_updated_at
  BEFORE UPDATE ON public.ai_kill_switch_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
