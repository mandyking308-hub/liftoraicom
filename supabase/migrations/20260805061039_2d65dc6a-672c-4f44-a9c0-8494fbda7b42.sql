CREATE INDEX IF NOT EXISTS idx_srl_queue_idem
  ON public.social_relationship_action_queue(business_id, idempotency_key, action_status);

CREATE OR REPLACE FUNCTION public.social_relationship_claim_action(p_action_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.social_relationship_action_queue%ROWTYPE;
  v_dupe uuid;
BEGIN
  SELECT * INTO v_row
  FROM public.social_relationship_action_queue
  WHERE id = p_action_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_row.action_status IN ('submitted', 'completed', 'submission_unknown', 'cancelled') THEN
    RETURN 'not_claimable';
  END IF;

  SELECT id INTO v_dupe
  FROM public.social_relationship_action_queue
  WHERE business_id = v_row.business_id
    AND idempotency_key = v_row.idempotency_key
    AND id <> v_row.id
    AND action_status IN ('submitted', 'completed', 'submission_unknown')
  LIMIT 1;

  IF v_dupe IS NOT NULL THEN
    UPDATE public.social_relationship_action_queue
    SET action_status = 'cancelled',
        blocked_reason = 'duplicate_idempotency_key'
    WHERE id = v_row.id;
    RETURN 'duplicate';
  END IF;

  UPDATE public.social_relationship_action_queue
  SET action_status = 'submitted',
      submitted_at = now(),
      attempt_count = COALESCE(attempt_count, 0) + 1
  WHERE id = v_row.id;

  RETURN 'claimed';
END;
$$;

REVOKE ALL ON FUNCTION public.social_relationship_claim_action(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_relationship_claim_action(uuid) TO service_role;