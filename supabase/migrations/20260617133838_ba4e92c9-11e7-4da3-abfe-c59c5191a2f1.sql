ALTER TABLE public.business_setup_tunnel_runs
ADD COLUMN IF NOT EXISTS module_connections_json jsonb NOT NULL DEFAULT '{}'::jsonb;