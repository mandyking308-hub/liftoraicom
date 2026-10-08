CREATE UNIQUE INDEX IF NOT EXISTS businesses_active_name_unique_idx
  ON public.businesses (lower(btrim(name)))
  WHERE portfolio_status = 'active';
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_name_key;
COMMENT ON INDEX public.businesses_active_name_unique_idx IS 'Business names are unique (case/whitespace-insensitive) among active portfolio businesses only; archived legacy rows keep their historical names.';