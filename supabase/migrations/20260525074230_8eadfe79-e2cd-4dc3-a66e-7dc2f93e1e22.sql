-- =====================================================================
-- AI Gateway Runtime — parallel orchestration tables
-- =====================================================================

-- Helper: founder/admin check using existing has_role()
-- (has_role(_user_id, _role app_role) already exists in this project)

-- =====================================================================
-- 1. ai_agent_registry
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ai_agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  agent_type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  allowed_actions TEXT[] NOT NULL DEFAULT '{}',
  prohibited_actions TEXT[] NOT NULL DEFAULT '{}',
  approval_required_actions TEXT[] NOT NULL DEFAULT '{}',
  max_concurrency INTEGER NOT NULL DEFAULT 4,
  daily_run_limit INTEGER NOT NULL DEFAULT 500,
  monthly_budget_gbp NUMERIC(12,2) NOT NULL DEFAULT 50,
  primary_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  fallback_model TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_status ON public.ai_agent_registry(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_type   ON public.ai_agent_registry(agent_type);

ALTER TABLE public.ai_agent_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders read agent registry"  ON public.ai_agent_registry;
DROP POLICY IF EXISTS "founders write agent registry" ON public.ai_agent_registry;
CREATE POLICY "founders read agent registry"
  ON public.ai_agent_registry FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "founders write agent registry"
  ON public.ai_agent_registry FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- 2. ai_conversations
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL UNIQUE,
  business_id UUID,
  portfolio_asset_id UUID,
  agent_id UUID REFERENCES public.ai_agent_registry(id) ON DELETE SET NULL,
  user_id UUID,
  channel TEXT NOT NULL DEFAULT 'internal'
    CHECK (channel IN ('internal','email','chat','crm','buyer_warmup','support','other')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','archived')),
  context_scope TEXT,
  data_classification TEXT NOT NULL DEFAULT 'internal',
  title TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_business ON public.ai_conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_agent    ON public.ai_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_status   ON public.ai_conversations(status);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated  ON public.ai_conversations(updated_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders read ai conversations"  ON public.ai_conversations;
DROP POLICY IF EXISTS "founders write ai conversations" ON public.ai_conversations;
CREATE POLICY "founders read ai conversations"
  ON public.ai_conversations FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "founders write ai conversations"
  ON public.ai_conversations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- 3. ai_gateway_requests
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ai_gateway_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  conversation_id TEXT,
  workflow_id TEXT,
  agent_id UUID REFERENCES public.ai_agent_registry(id) ON DELETE SET NULL,
  portfolio_asset_id UUID,
  business_id UUID,
  user_id UUID,
  request_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'lovable-ai-gateway',
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  prompt_version TEXT,
  input_hash TEXT,
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low','medium','high','critical')),
  approval_required BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed','cancelled','waiting_approval')),
  priority INTEGER NOT NULL DEFAULT 5,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  token_usage JSONB,
  estimated_cost_gbp NUMERIC(12,6),
  actual_cost_gbp NUMERIC(12,6),
  trace_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_gateway_requests_idem
  ON public.ai_gateway_requests(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_gateway_requests_status   ON public.ai_gateway_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_requests_agent    ON public.ai_gateway_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_requests_business ON public.ai_gateway_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_requests_conv     ON public.ai_gateway_requests(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_gateway_requests_created  ON public.ai_gateway_requests(created_at DESC);

ALTER TABLE public.ai_gateway_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders read gateway requests"  ON public.ai_gateway_requests;
DROP POLICY IF EXISTS "founders write gateway requests" ON public.ai_gateway_requests;
CREATE POLICY "founders read gateway requests"
  ON public.ai_gateway_requests FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "founders write gateway requests"
  ON public.ai_gateway_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- 4. ai_runtime_events
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ai_runtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT,
  conversation_id TEXT,
  agent_id UUID,
  business_id UUID,
  event_type TEXT NOT NULL,
  message TEXT,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('debug','info','warning','error','critical')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_events_request  ON public.ai_runtime_events(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_events_severity ON public.ai_runtime_events(severity);
CREATE INDEX IF NOT EXISTS idx_ai_runtime_events_created  ON public.ai_runtime_events(created_at DESC);

ALTER TABLE public.ai_runtime_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders read runtime events"  ON public.ai_runtime_events;
DROP POLICY IF EXISTS "founders write runtime events" ON public.ai_runtime_events;
CREATE POLICY "founders read runtime events"
  ON public.ai_runtime_events FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "founders write runtime events"
  ON public.ai_runtime_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- updated_at triggers (reuse public.update_updated_at_column if exists)
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    DROP TRIGGER IF EXISTS trg_ai_agent_registry_updated ON public.ai_agent_registry;
    CREATE TRIGGER trg_ai_agent_registry_updated
      BEFORE UPDATE ON public.ai_agent_registry
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    DROP TRIGGER IF EXISTS trg_ai_conversations_updated ON public.ai_conversations;
    CREATE TRIGGER trg_ai_conversations_updated
      BEFORE UPDATE ON public.ai_conversations
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;