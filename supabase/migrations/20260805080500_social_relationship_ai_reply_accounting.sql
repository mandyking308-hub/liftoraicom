-- Count AI replies only after the provider has returned a real message ID and
-- the action has transitioned to the terminal `replied` state.

ALTER TABLE public.social_relationship_conversations
  ADD COLUMN IF NOT EXISTS last_ai_reply_at timestamptz;

CREATE OR REPLACE FUNCTION public.social_relationship_count_confirmed_ai_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone text := 'Europe/London';
  v_local_day date;
BEGIN
  IF NEW.action_status <> 'replied'
     OR OLD.action_status = 'replied'
     OR NEW.conversation_id IS NULL
     OR COALESCE((NEW.payload->>'ai_generated')::boolean, false) IS NOT TRUE
     OR NEW.provider_action_id IS NULL
  THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(policy.timezone, 'Europe/London')
  INTO v_timezone
  FROM public.social_relationship_policies policy
  WHERE policy.business_id = NEW.business_id
    AND (policy.account_id = NEW.account_id OR policy.account_id IS NULL)
  ORDER BY (policy.account_id = NEW.account_id) DESC
  LIMIT 1;

  v_local_day := (now() AT TIME ZONE COALESCE(v_timezone, 'Europe/London'))::date;

  UPDATE public.social_relationship_conversations
  SET ai_replies_today = CASE
        WHEN ai_replies_day = v_local_day THEN ai_replies_today + 1
        ELSE 1
      END,
      ai_replies_day = v_local_day,
      last_ai_reply_at = now(),
      updated_at = now()
  WHERE id = NEW.conversation_id
    AND business_id = NEW.business_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_relationship_count_ai_reply
  ON public.social_relationship_action_queue;
CREATE TRIGGER trg_social_relationship_count_ai_reply
AFTER UPDATE OF action_status, provider_action_id
ON public.social_relationship_action_queue
FOR EACH ROW
EXECUTE FUNCTION public.social_relationship_count_confirmed_ai_reply();
