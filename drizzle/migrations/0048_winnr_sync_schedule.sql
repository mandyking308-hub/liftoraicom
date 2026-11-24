CREATE TABLE public.winnr_sync_schedule (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.winnr_sync_schedule FROM anon, authenticated;
GRANT ALL ON public.winnr_sync_schedule TO service_role;
ALTER TABLE public.winnr_sync_schedule ENABLE ROW LEVEL SECURITY;
INSERT INTO public.winnr_sync_schedule(id) VALUES (1);