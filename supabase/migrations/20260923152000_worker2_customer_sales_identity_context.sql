-- Customer-sales CRM context repair.
-- Additive only: no existing rows are deleted, and no owner or EXECUTE ACL is changed.

ALTER TABLE public.customer_sales_conversations
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid
    REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS customer_sales_conversations_bcr_id_idx
  ON public.customer_sales_conversations (business_contact_relationship_id);

-- Resolve only global person identity here. Business/BCR resolution stays separate.
-- Multiple case-insensitive email matches raise a reviewable error instead of choosing one.
CREATE OR REPLACE FUNCTION public.customer_sales_link_contact_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_match_count bigint;
  v_contact_id uuid;
BEGIN
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
