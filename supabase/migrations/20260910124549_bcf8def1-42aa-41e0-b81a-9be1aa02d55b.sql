
-- ============ 1. Portfolio Apollo credit policy ============
CREATE TABLE IF NOT EXISTS public.apollo_portfolio_credit_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'apollo',
  paid_enrichment_enabled boolean NOT NULL DEFAULT false,
  hard_credit_limit integer NOT NULL DEFAULT 0,
  safety_reserve integer NOT NULL DEFAULT 0,
  per_run_cap integer NOT NULL DEFAULT 25,
  allow_phone_reveal boolean NOT NULL DEFAULT false,
  allow_personal_email_reveal boolean NOT NULL DEFAULT false,
  allow_waterfall boolean NOT NULL DEFAULT false,
  notes text,
  updated_by uuid,
  updated_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_apollo_portfolio_credit_policy_provider
  ON public.apollo_portfolio_credit_policy (provider);

GRANT SELECT, INSERT, UPDATE ON public.apollo_portfolio_credit_policy TO authenticated;
GRANT ALL ON public.apollo_portfolio_credit_policy TO service_role;
ALTER TABLE public.apollo_portfolio_credit_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders manage apollo portfolio credit policy" ON public.apollo_portfolio_credit_policy;
CREATE POLICY "Founders manage apollo portfolio credit policy"
  ON public.apollo_portfolio_credit_policy FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.apollo_portfolio_credit_policy (provider, notes)
SELECT 'apollo', 'Stage 4 firewall installed 2026-09-10. Paid enrichment disabled; hard limit 0 until founder deliberately configures it.'
WHERE NOT EXISTS (SELECT 1 FROM public.apollo_portfolio_credit_policy WHERE provider = 'apollo');

-- ============ 2. Reservations / attempts ============
CREATE TABLE IF NOT EXISTS public.apollo_credit_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key text NOT NULL,
  provider text NOT NULL DEFAULT 'apollo',
  business_name text,
  business_id uuid,
  function_source text NOT NULL,
  run_id text,
  apollo_person_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  estimated_credits integer NOT NULL DEFAULT 0,
  actual_credits integer,
  status text NOT NULL DEFAULT 'reserved',
  release_reason text,
  ledger_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apollo_credit_reservations_status_chk
    CHECK (status IN ('reserved','settled','released'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_apollo_credit_reservations_operation_key
  ON public.apollo_credit_reservations (operation_key);
CREATE INDEX IF NOT EXISTS ix_apollo_credit_reservations_status
  ON public.apollo_credit_reservations (status);

GRANT SELECT ON public.apollo_credit_reservations TO authenticated;
GRANT ALL ON public.apollo_credit_reservations TO service_role;
ALTER TABLE public.apollo_credit_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders read apollo credit reservations" ON public.apollo_credit_reservations;
CREATE POLICY "Founders read apollo credit reservations"
  ON public.apollo_credit_reservations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.apollo_paid_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apollo_person_id text NOT NULL,
  provider text NOT NULL DEFAULT 'apollo',
  outcome text NOT NULL DEFAULT 'no_email',
  function_source text,
  operation_key text,
  attempts integer NOT NULL DEFAULT 1,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT apollo_paid_attempts_outcome_chk
    CHECK (outcome IN ('no_email','email_returned','provider_error'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_apollo_paid_attempts_person
  ON public.apollo_paid_attempts (provider, apollo_person_id);

GRANT SELECT ON public.apollo_paid_attempts TO authenticated;
GRANT ALL ON public.apollo_paid_attempts TO service_role;
ALTER TABLE public.apollo_paid_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders read apollo paid attempts" ON public.apollo_paid_attempts;
CREATE POLICY "Founders read apollo paid attempts"
  ON public.apollo_paid_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

-- ============ 3. Firewall RPCs ============
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

REVOKE ALL ON FUNCTION public.apollo_credit_status() FROM public;
GRANT EXECUTE ON FUNCTION public.apollo_credit_status() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apollo_credit_reserve(
  _operation_key text,
  _function_source text,
  _estimated_credits integer,
  _business_name text DEFAULT NULL,
  _business_id uuid DEFAULT NULL,
  _run_id text DEFAULT NULL,
  _apollo_person_ids text[] DEFAULT ARRAY[]::text[],
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pol public.apollo_portfolio_credit_policy%ROWTYPE;
  existing public.apollo_credit_reservations%ROWTYPE;
  used integer;
  reserved integer;
  available integer;
  new_id uuid;
BEGIN
  IF _operation_key IS NULL OR length(trim(_operation_key)) = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'operation_key_required');
  END IF;
  IF _estimated_credits IS NULL OR _estimated_credits < 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_estimate');
  END IF;

  -- Serialise every portfolio reservation decision.
  PERFORM pg_advisory_xact_lock(hashtext('apollo_credit_firewall'));

  SELECT * INTO existing FROM public.apollo_credit_reservations WHERE operation_key = _operation_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'duplicate_operation_key',
      'existing_status', existing.status,
      'reservation_id', existing.id,
      'idempotent', true
    );
  END IF;

  SELECT * INTO pol FROM public.apollo_portfolio_credit_policy WHERE provider = 'apollo';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'policy_missing');
  END IF;
  IF NOT pol.paid_enrichment_enabled THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'paid_enrichment_disabled');
  END IF;
  IF pol.hard_credit_limit <= 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'hard_credit_limit_zero');
  END IF;
  IF _estimated_credits > pol.per_run_cap THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'per_run_cap_exceeded',
      'per_run_cap', pol.per_run_cap, 'requested', _estimated_credits);
  END IF;

  SELECT COALESCE(SUM(credits_used), 0) INTO used FROM public.apollo_credit_ledger;
  SELECT COALESCE(SUM(estimated_credits), 0) INTO reserved
    FROM public.apollo_credit_reservations WHERE status = 'reserved';
  available := pol.hard_credit_limit - pol.safety_reserve - used - reserved;

  IF _estimated_credits > available THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'hard_limit_would_be_exceeded',
      'credits_available', GREATEST(0, available), 'requested', _estimated_credits);
  END IF;

  INSERT INTO public.apollo_credit_reservations (
    operation_key, business_name, business_id, function_source, run_id,
    apollo_person_ids, estimated_credits, status, metadata
  ) VALUES (
    _operation_key, _business_name, _business_id, _function_source, _run_id,
    COALESCE(_apollo_person_ids, ARRAY[]::text[]), _estimated_credits, 'reserved', COALESCE(_metadata, '{}'::jsonb)
  ) RETURNING id INTO new_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'reservation_id', new_id,
    'operation_key', _operation_key,
    'estimated_credits', _estimated_credits,
    'credits_available_after', GREATEST(0, available - _estimated_credits)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apollo_credit_reserve(text, text, integer, text, uuid, text, text[], jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apollo_credit_reserve(text, text, integer, text, uuid, text, text[], jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.apollo_credit_settle(
  _operation_key text,
  _actual_credits integer,
  _no_email_person_ids text[] DEFAULT ARRAY[]::text[],
  _revealed_person_ids text[] DEFAULT ARRAY[]::text[],
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.apollo_credit_reservations%ROWTYPE;
  led_id uuid;
  pid text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('apollo_credit_firewall'));

  SELECT * INTO res FROM public.apollo_credit_reservations WHERE operation_key = _operation_key FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reservation_not_found');
  END IF;
  IF res.status <> 'reserved' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_' || res.status,
      'idempotent', true, 'ledger_id', res.ledger_id, 'actual_credits', res.actual_credits);
  END IF;

  INSERT INTO public.apollo_credit_ledger (
    business_name, business_id, function_source, credits_used, apollo_person_ids, metadata
  ) VALUES (
    COALESCE(res.business_name, 'portfolio'), res.business_id, res.function_source,
    GREATEST(0, COALESCE(_actual_credits, 0)), res.apollo_person_ids,
    COALESCE(_metadata, '{}'::jsonb) || jsonb_build_object('operation_key', _operation_key, 'reservation_id', res.id)
  ) RETURNING id INTO led_id;

  UPDATE public.apollo_credit_reservations
     SET status = 'settled',
         actual_credits = GREATEST(0, COALESCE(_actual_credits, 0)),
         ledger_id = led_id,
         settled_at = now(),
         updated_at = now()
   WHERE id = res.id;

  FOREACH pid IN ARRAY COALESCE(_no_email_person_ids, ARRAY[]::text[]) LOOP
    INSERT INTO public.apollo_paid_attempts (apollo_person_id, outcome, function_source, operation_key)
    VALUES (pid, 'no_email', res.function_source, _operation_key)
    ON CONFLICT (provider, apollo_person_id)
    DO UPDATE SET attempts = public.apollo_paid_attempts.attempts + 1,
                  outcome = 'no_email',
                  last_attempt_at = now(),
                  operation_key = EXCLUDED.operation_key;
  END LOOP;

  FOREACH pid IN ARRAY COALESCE(_revealed_person_ids, ARRAY[]::text[]) LOOP
    INSERT INTO public.apollo_paid_attempts (apollo_person_id, outcome, function_source, operation_key)
    VALUES (pid, 'email_returned', res.function_source, _operation_key)
    ON CONFLICT (provider, apollo_person_id)
    DO UPDATE SET attempts = public.apollo_paid_attempts.attempts + 1,
                  outcome = 'email_returned',
                  last_attempt_at = now(),
                  operation_key = EXCLUDED.operation_key;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'ledger_id', led_id, 'reservation_id', res.id,
    'actual_credits', GREATEST(0, COALESCE(_actual_credits, 0)));
END;
$$;

REVOKE ALL ON FUNCTION public.apollo_credit_settle(text, integer, text[], text[], jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apollo_credit_settle(text, integer, text[], text[], jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.apollo_credit_release(
  _operation_key text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.apollo_credit_reservations%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('apollo_credit_firewall'));
  SELECT * INTO res FROM public.apollo_credit_reservations WHERE operation_key = _operation_key FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reservation_not_found');
  END IF;
  IF res.status <> 'reserved' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_' || res.status, 'idempotent', true);
  END IF;
  UPDATE public.apollo_credit_reservations
     SET status = 'released', release_reason = _reason, updated_at = now()
   WHERE id = res.id;
  RETURN jsonb_build_object('ok', true, 'reservation_id', res.id, 'released', true);
END;
$$;

REVOKE ALL ON FUNCTION public.apollo_credit_release(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.apollo_credit_release(text, text) TO service_role;

-- ============ 4. Relationship intelligence education mapping (additive, nullable) ============
ALTER TABLE public.relationship_intelligence_contacts
  ADD COLUMN IF NOT EXISTS education_group_id text,
  ADD COLUMN IF NOT EXISTS strategic_target_account_id uuid,
  ADD COLUMN IF NOT EXISTS apollo_org_id text,
  ADD COLUMN IF NOT EXISTS education_role_family text,
  ADD COLUMN IF NOT EXISTS education_role_score integer,
  ADD COLUMN IF NOT EXISTS research_program_key text,
  ADD COLUMN IF NOT EXISTS reveal_status text;

CREATE INDEX IF NOT EXISTS ix_ric_education_group_id
  ON public.relationship_intelligence_contacts (education_group_id)
  WHERE education_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_ric_research_program_key
  ON public.relationship_intelligence_contacts (research_program_key)
  WHERE research_program_key IS NOT NULL;

-- ============ 5. Education master account uniqueness (scoped, non-breaking) ============
CREATE UNIQUE INDEX IF NOT EXISTS ux_strategic_target_accounts_education_source_key
  ON public.strategic_target_accounts (source_key)
  WHERE source_key LIKE 'education_152_master:%';
