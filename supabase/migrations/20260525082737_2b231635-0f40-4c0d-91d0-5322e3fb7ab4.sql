
-- 1. Per-business concurrency cap
ALTER TABLE public.ai_business_budgets
  ADD COLUMN IF NOT EXISTS max_concurrent_requests integer NOT NULL DEFAULT 25;

-- 2. Lease table
CREATE TABLE IF NOT EXISTS public.ai_concurrency_leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_key text NOT NULL,
  request_id text NOT NULL,
  agent_id uuid NULL,
  business_id uuid NULL,
  provider text NULL,
  model text NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','released','expired')),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_leases_active_agent
  ON public.ai_concurrency_leases (agent_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_leases_active_business
  ON public.ai_concurrency_leases (business_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_leases_request
  ON public.ai_concurrency_leases (request_id);

CREATE INDEX IF NOT EXISTS idx_leases_expires
  ON public.ai_concurrency_leases (expires_at)
  WHERE status = 'active';

ALTER TABLE public.ai_concurrency_leases ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_concurrency_leases' AND policyname='Founders read leases'
  ) THEN
    CREATE POLICY "Founders read leases" ON public.ai_concurrency_leases
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 3. Atomic acquire
CREATE OR REPLACE FUNCTION public.acquire_ai_lease(
  _request_id text,
  _agent_id uuid,
  _business_id uuid,
  _agent_capacity int,
  _business_capacity int,
  _provider text,
  _model text,
  _ttl_seconds int DEFAULT 180
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  now_ts timestamptz := now();
  exp_ts timestamptz := now() + make_interval(secs => GREATEST(_ttl_seconds, 30));
  agent_in_use int := 0;
  business_in_use int := 0;
  lease_key_v text;
BEGIN
  -- opportunistic sweep of expired leases in the scopes we care about
  UPDATE public.ai_concurrency_leases
     SET status='expired', released_at = now_ts
   WHERE status='active'
     AND expires_at < now_ts
     AND (
       (_agent_id IS NOT NULL AND agent_id = _agent_id)
       OR (_business_id IS NOT NULL AND business_id = _business_id)
     );

  -- Serialise within scope only (no global serial bottleneck)
  IF _agent_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('ai_lease_agent:' || _agent_id::text, 0));
    SELECT count(*) INTO agent_in_use
      FROM public.ai_concurrency_leases
     WHERE agent_id = _agent_id AND status='active' AND expires_at > now_ts;
    IF _agent_capacity > 0 AND agent_in_use >= _agent_capacity THEN
      RETURN jsonb_build_object(
        'ok', false, 'reason', 'agent_concurrency_limit',
        'in_use', agent_in_use, 'capacity', _agent_capacity
      );
    END IF;
  END IF;

  IF _business_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('ai_lease_business:' || _business_id::text, 0));
    SELECT count(*) INTO business_in_use
      FROM public.ai_concurrency_leases
     WHERE business_id = _business_id AND status='active' AND expires_at > now_ts;
    IF _business_capacity > 0 AND business_in_use >= _business_capacity THEN
      RETURN jsonb_build_object(
        'ok', false, 'reason', 'business_concurrency_limit',
        'in_use', business_in_use, 'capacity', _business_capacity
      );
    END IF;
  END IF;

  lease_key_v := COALESCE(
    'agent:' || _agent_id::text,
    'business:' || _business_id::text,
    'global'
  );

  INSERT INTO public.ai_concurrency_leases
    (lease_key, request_id, agent_id, business_id, provider, model, expires_at)
  VALUES
    (lease_key_v, _request_id, _agent_id, _business_id, _provider, _model, exp_ts);

  RETURN jsonb_build_object(
    'ok', true,
    'expires_at', exp_ts,
    'agent_in_use', agent_in_use + CASE WHEN _agent_id IS NOT NULL THEN 1 ELSE 0 END,
    'business_in_use', business_in_use + CASE WHEN _business_id IS NOT NULL THEN 1 ELSE 0 END
  );
END;
$$;

-- 4. Release
CREATE OR REPLACE FUNCTION public.release_ai_lease(_request_id text, _ok boolean DEFAULT true)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  UPDATE public.ai_concurrency_leases
     SET status='released',
         released_at = now(),
         metadata = metadata || jsonb_build_object('release_ok', _ok)
   WHERE request_id = _request_id AND status='active';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- 5. Cleanup
CREATE OR REPLACE FUNCTION public.cleanup_stale_ai_leases()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  UPDATE public.ai_concurrency_leases
     SET status='expired', released_at = now()
   WHERE status='active' AND expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;

  IF n > 0 THEN
    INSERT INTO public.ai_runtime_events (event_type, severity, message, metadata)
    VALUES ('stale_lease_cleanup', 'warning',
            'Expired ' || n || ' stale AI concurrency lease(s)',
            jsonb_build_object('expired_count', n));
  END IF;

  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acquire_ai_lease(text,uuid,uuid,int,int,text,text,int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_lease(text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_ai_leases() TO authenticated, service_role;
