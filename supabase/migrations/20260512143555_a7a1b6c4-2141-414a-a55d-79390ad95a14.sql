-- ============================================================
-- internal_email_identities + is_internal_email()
-- ============================================================
CREATE TABLE IF NOT EXISTS public.internal_email_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'founder',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_email_identities_email
  ON public.internal_email_identities (lower(email));

ALTER TABLE public.internal_email_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders read internal_email_identities" ON public.internal_email_identities;
CREATE POLICY "Founders read internal_email_identities"
  ON public.internal_email_identities
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Founders insert internal_email_identities" ON public.internal_email_identities;
CREATE POLICY "Founders insert internal_email_identities"
  ON public.internal_email_identities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Founders update internal_email_identities" ON public.internal_email_identities;
CREATE POLICY "Founders update internal_email_identities"
  ON public.internal_email_identities
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Founders delete internal_email_identities" ON public.internal_email_identities;
CREATE POLICY "Founders delete internal_email_identities"
  ON public.internal_email_identities
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'founder'));

-- Seed: mandyking308 + any user_roles founder address (best-effort via auth.users join)
INSERT INTO public.internal_email_identities (email, kind, notes)
VALUES ('mandyking308@gmail.com', 'founder', 'Primary founder account')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.internal_email_identities (email, kind, notes)
SELECT lower(au.email), 'founder', 'Auto-seeded from user_roles'
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id AND ur.role = 'founder'
WHERE au.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Helper: is_internal_email
CREATE OR REPLACE FUNCTION public.is_internal_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _email IS NULL OR btrim(_email) = '' THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.internal_email_identities iei
        WHERE lower(iei.email) = lower(_email)
      )
      OR EXISTS (
        SELECT 1
        FROM auth.users au
        JOIN public.user_roles ur ON ur.user_id = au.id
        WHERE lower(au.email) = lower(_email)
          AND ur.role IN ('founder','admin')
      )
    END;
$$;

REVOKE ALL ON FUNCTION public.is_internal_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_internal_email(text) TO authenticated, service_role;

-- ============================================================
-- command_centre_active_inboxes view
-- ============================================================
DROP VIEW IF EXISTS public.command_centre_active_inboxes;
CREATE VIEW public.command_centre_active_inboxes
WITH (security_invoker = true)
AS
SELECT
  id,
  business_name,
  email_address,
  from_name,
  from_email,
  reply_to_email,
  active,
  live_readiness,
  provider_blocked_until,
  provider_blocked_reason,
  CASE
    WHEN provider_blocked_until IS NOT NULL AND provider_blocked_until > now()
      THEN 'capped_until_' || to_char(provider_blocked_until,'YYYY-MM-DD HH24:MI UTC')
    WHEN active AND live_readiness = 'live_ready' THEN 'ok'
    WHEN active THEN 'live_readiness:' || COALESCE(live_readiness::text,'unknown')
    ELSE 'inactive'
  END AS status_label
FROM public.inboxes
WHERE active = true
ORDER BY business_name NULLS LAST, email_address;