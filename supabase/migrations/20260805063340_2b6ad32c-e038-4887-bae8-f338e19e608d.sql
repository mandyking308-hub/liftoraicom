-- 1. Repair any rows written with the broken vocabulary -----------------
UPDATE public.social_relationship_action_queue SET action_status = 'ready'      WHERE action_status IN ('approved','scheduled');
UPDATE public.social_relationship_action_queue SET action_status = 'retrying'   WHERE action_status = 'retry';
UPDATE public.social_relationship_action_queue SET action_status = 'submitting' WHERE action_status = 'submitted';
UPDATE public.social_relationship_action_queue SET action_status = 'sent'       WHERE action_status = 'completed';
UPDATE public.social_relationship_targets      SET target_status = 'invited'    WHERE target_status = 'actioned';
UPDATE public.social_relationship_accounts     SET account_status = 'challenge' WHERE account_status = 'restricted';

-- 2. Widen the CHECK constraints the code legitimately needs ------------
ALTER TABLE public.social_relationship_conversations
  DROP CONSTRAINT IF EXISTS social_relationship_conversations_conversation_status_check;
ALTER TABLE public.social_relationship_conversations
  ADD CONSTRAINT social_relationship_conversations_conversation_status_check
  CHECK (conversation_status IN ('open','qualified','escalated','closed','suppressed','dormant'));

ALTER TABLE public.social_relationship_suppressions
  DROP CONSTRAINT IF EXISTS social_relationship_suppressions_scope_check;
ALTER TABLE public.social_relationship_suppressions
  ADD CONSTRAINT social_relationship_suppressions_scope_check
  CHECK (scope IN ('business','global','profile','network'));

ALTER TABLE public.social_relationship_crm_links
  DROP CONSTRAINT IF EXISTS social_relationship_crm_links_link_status_check;
ALTER TABLE public.social_relationship_crm_links
  ADD CONSTRAINT social_relationship_crm_links_link_status_check
  CHECK (link_status IN ('linked','created','merged','failed','pending_review'));

-- 3. Dispatch index on the canonical runnable statuses ------------------
DROP INDEX IF EXISTS idx_srl_queue_idem;
CREATE INDEX IF NOT EXISTS idx_srl_queue_runnable
  ON public.social_relationship_action_queue(business_id, action_status, scheduled_for)
  WHERE action_status IN ('ready','retrying');

-- 4. Atomic idempotency claim, canonical statuses only ------------------
CREATE OR REPLACE FUNCTION public.social_relationship_claim_action(p_action_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT action_status INTO v_status
  FROM public.social_relationship_action_queue
  WHERE id = p_action_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RETURN 'not_found';
  END IF;

  -- Anything already submitted (or resolved) can never be claimed again.
  IF v_status IN ('submitting','sent','accepted','replied','submission_unknown') THEN
    RETURN 'duplicate';
  END IF;

  IF v_status NOT IN ('ready','retrying') THEN
    RETURN 'not_claimable';
  END IF;

  UPDATE public.social_relationship_action_queue
  SET action_status = 'submitting',
      submitted_at = now(),
      attempt_count = attempt_count + 1,
      updated_at = now()
  WHERE id = p_action_id;

  RETURN 'claimed';
END;
$$;

REVOKE ALL ON FUNCTION public.social_relationship_claim_action(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_relationship_claim_action(UUID) TO service_role;