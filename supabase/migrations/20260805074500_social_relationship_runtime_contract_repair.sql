-- Repair the Social Relationship Engine runtime contract after the initial build.
-- This migration is intentionally additive/corrective because the original schema
-- may already be applied in production.

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
BEGIN
  SELECT * INTO v_row
  FROM public.social_relationship_action_queue
  WHERE id = p_action_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  -- Only actions that have passed every gate may be claimed.  This makes a
  -- second worker, repeated click, or stale retry harmless.
  IF v_row.action_status NOT IN ('ready', 'retrying') THEN
    RETURN 'not_claimable';
  END IF;

  UPDATE public.social_relationship_action_queue
  SET action_status = 'submitting',
      submitted_at = COALESCE(submitted_at, now()),
      attempt_count = COALESCE(attempt_count, 0) + 1,
      updated_at = now()
  WHERE id = v_row.id
    AND action_status IN ('ready', 'retrying');

  IF NOT FOUND THEN
    RETURN 'not_claimable';
  END IF;

  RETURN 'claimed';
END;
$$;

REVOKE ALL ON FUNCTION public.social_relationship_claim_action(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_relationship_claim_action(uuid) TO service_role;

-- Normalise any rows created by the defective pre-release runner. These values
-- cannot exist when the original CHECK constraint was active, but the updates
-- are retained for databases where the constraint may have been temporarily
-- relaxed during development.
UPDATE public.social_relationship_action_queue
SET action_status = CASE action_status
  WHEN 'approved' THEN 'ready'
  WHEN 'scheduled' THEN 'ready'
  WHEN 'retry' THEN 'retrying'
  WHEN 'submitted' THEN 'submitting'
  WHEN 'completed' THEN CASE WHEN action_type = 'reply_message' THEN 'replied' ELSE 'sent' END
  ELSE action_status
END,
updated_at = now()
WHERE action_status IN ('approved','scheduled','retry','submitted','completed');

-- Target/account status normalisation for the same defective runtime vocabulary.
UPDATE public.social_relationship_targets
SET target_status = CASE
  WHEN target_status = 'actioned' THEN 'in_conversation'
  ELSE target_status
END,
updated_at = now()
WHERE target_status = 'actioned';

UPDATE public.social_relationship_accounts
SET account_status = 'challenge', updated_at = now()
WHERE account_status = 'restricted';
