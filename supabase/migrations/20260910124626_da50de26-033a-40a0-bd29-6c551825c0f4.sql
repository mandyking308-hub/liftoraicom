
CREATE OR REPLACE FUNCTION public.apollo_credit_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pol public.apollo_portfolio_credit_policy%ROWTYPE;
  used integer;
  reserved integer;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  SELECT * INTO pol FROM public.apollo_portfolio_credit_policy WHERE provider = 'apollo';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'policy_missing', 'paid_enrichment_enabled', false);
  END IF;
  SELECT COALESCE(SUM(credits_used), 0) INTO used FROM public.apollo_credit_ledger;
  SELECT COALESCE(SUM(estimated_credits), 0) INTO reserved
    FROM public.apollo_credit_reservations WHERE status = 'reserved';
  RETURN jsonb_build_object(
    'ok', true,
    'provider', pol.provider,
    'paid_enrichment_enabled', pol.paid_enrichment_enabled,
    'hard_credit_limit', pol.hard_credit_limit,
    'safety_reserve', pol.safety_reserve,
    'per_run_cap', pol.per_run_cap,
    'allow_phone_reveal', pol.allow_phone_reveal,
    'allow_personal_email_reveal', pol.allow_personal_email_reveal,
    'allow_waterfall', pol.allow_waterfall,
    'credits_used', used,
    'credits_reserved', reserved,
    'credits_remaining', GREATEST(0, pol.hard_credit_limit - pol.safety_reserve - used - reserved)
  );
END;
$$;
