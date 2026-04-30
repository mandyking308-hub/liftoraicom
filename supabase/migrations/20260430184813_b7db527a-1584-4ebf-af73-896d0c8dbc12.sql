
ALTER VIEW public.inbox_credentials_public SET (security_invoker = true);

-- Re-grant SELECT on view to authenticated; underlying table still has no client policy,
-- so SELECT works only because the view is a read of safe columns? Actually with
-- security_invoker the user must have SELECT on the table. Switch to a SECURITY INVOKER
-- function instead, which is the safer pattern.
DROP VIEW IF EXISTS public.inbox_credentials_public;

CREATE OR REPLACE FUNCTION public.list_inbox_credentials_public(_inbox_id uuid DEFAULT NULL)
RETURNS TABLE (
  inbox_id uuid,
  provider_type public.inbox_provider_type,
  smtp_host text,
  smtp_port int,
  smtp_username text,
  smtp_encryption text,
  password_is_set boolean,
  password_set_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.inbox_id, c.provider_type, c.smtp_host, c.smtp_port, c.smtp_username,
    c.smtp_encryption, (c.smtp_password_enc IS NOT NULL) AS password_is_set,
    c.password_set_at, c.updated_at
  FROM public.inbox_credentials c
  WHERE _inbox_id IS NULL OR c.inbox_id = _inbox_id;
$$;

REVOKE ALL ON FUNCTION public.list_inbox_credentials_public(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_inbox_credentials_public(uuid) TO authenticated, service_role;
