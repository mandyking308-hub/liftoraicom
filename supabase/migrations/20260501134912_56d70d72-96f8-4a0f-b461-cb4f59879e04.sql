ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS provider_blocked_until timestamptz,
  ADD COLUMN IF NOT EXISTS provider_blocked_reason text;

CREATE OR REPLACE FUNCTION public.inbox_set_provider_blocked(
  _inbox_id uuid,
  _blocked_until timestamptz,
  _reason text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.inboxes
     SET provider_blocked_until = _blocked_until,
         provider_blocked_reason = _reason,
         updated_at = now()
   WHERE id = _inbox_id;
$$;

GRANT EXECUTE ON FUNCTION public.inbox_set_provider_blocked(uuid, timestamptz, text) TO authenticated, service_role;