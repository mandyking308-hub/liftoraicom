-- Customer-sales CRM context repair.
-- Additive only: no existing rows are deleted; the identity RPC is founder/admin or service-role only.

ALTER TABLE public.customer_sales_conversations
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid
    REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customer_sales_conversations_bcr_id_idx
  ON public.customer_sales_conversations (business_contact_relationship_id);

-- Resolve only global person identity here. Business/BCR resolution stays separate.
-- Multiple normalized email matches raise a reviewable error instead of choosing one.
-- Founder/admin CRM callers and trusted service-role functions may use the resolver.
CREATE OR REPLACE FUNCTION public.customer_sales_link_contact_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_user_id uuid := auth.uid();
  v_jwt_role text := current_setting('request.jwt.claim.role', true);
  v_match_count bigint;
  v_contact_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    IF COALESCE(v_jwt_role, '') <> 'service_role' THEN
      RAISE EXCEPTION 'founder_admin_or_service_role_required'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NOT public.has_role(v_user_id, 'founder'::public.app_role)
        AND NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'founder_admin_or_service_role_required'
      USING ERRCODE = '42501';
  END IF;

  IF v_email = '' THEN
    RETURN NULL;
  END IF;

  SELECT count(*)
    INTO v_match_count
    FROM public.contacts c
   WHERE lower(btrim(c.email)) = v_email;

  IF v_match_count > 1 THEN
    RAISE EXCEPTION 'ambiguous_contact_email'
      USING ERRCODE = 'P0001', HINT = 'Founder CRM identity review is required.';
  END IF;

  IF v_match_count = 0 THEN
    RETURN NULL;
  END IF;

  SELECT c.id
    INTO v_contact_id
    FROM public.contacts c
   WHERE lower(btrim(c.email)) = v_email;

  RETURN v_contact_id;
END;
$$;

-- Keep this security-definer identity lookup away from anon/PUBLIC. The body
-- independently verifies founder/admin JWT callers; edge functions use service_role.
REVOKE EXECUTE ON FUNCTION public.customer_sales_link_contact_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_sales_link_contact_by_email(text) TO authenticated, service_role;
