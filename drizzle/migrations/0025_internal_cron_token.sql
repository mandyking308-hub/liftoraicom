CREATE TABLE public.internal_cron_token (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_cron_token FROM anon, authenticated, public;
GRANT ALL ON public.internal_cron_token TO service_role;
ALTER TABLE public.internal_cron_token ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_cron_token (id) VALUES (1) ON CONFLICT DO NOTHING;