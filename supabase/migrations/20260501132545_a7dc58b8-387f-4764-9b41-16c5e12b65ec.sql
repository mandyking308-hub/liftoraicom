
-- 1. Add column to mark communications that should not block future sends
ALTER TABLE public.communications 
  ADD COLUMN IF NOT EXISTS ignored_for_send_check boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ignored_reason text;

CREATE INDEX IF NOT EXISTS idx_communications_contact_ts_active
  ON public.communications (contact_id, timestamp)
  WHERE ignored_for_send_check = false;

-- 2. Update check_outreach_allowed: only block on real SMTP outbound or any inbound
CREATE OR REPLACE FUNCTION public.check_outreach_allowed(_contact_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.contacts%ROWTYPE;
  recent_bounce boolean;
  recent_real_outbound timestamptz;
  recent_inbound timestamptz;
  recent_last_contacted_real boolean;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'CONTACT_NOT_FOUND');
  END IF;

  IF c.status = 'DO_NOT_CONTACT' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DO_NOT_CONTACT');
  END IF;

  IF c.status IN ('ENGAGED', 'QUALIFIED', 'CLIENT') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'STATUS_BLOCKED', 'status', c.status);
  END IF;

  IF c.conversation_active = true THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'CONVERSATION_ACTIVE');
  END IF;

  -- Block on any genuine inbound communication in last 24h (always real, never synthetic)
  SELECT MAX(timestamp) INTO recent_inbound
    FROM public.communications
   WHERE contact_id = _contact_id
     AND direction = 'inbound'
     AND ignored_for_send_check = false
     AND timestamp > (now() - interval '24 hours');

  IF recent_inbound IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'RECENT_COMMUNICATION_24H',
      'detail', 'recent_inbound_reply',
      'last_communication_at', recent_inbound
    );
  END IF;

  -- Block on outbound communication in last 24h ONLY when it represents a real SMTP send.
  -- A real outbound is one that has a corresponding email_queue row with smtp_accepted_at populated
  -- within the last 24 hours, OR a non-ignored manual/founder communication.
  SELECT MAX(cm.timestamp) INTO recent_real_outbound
    FROM public.communications cm
   WHERE cm.contact_id = _contact_id
     AND cm.direction = 'outbound'
     AND cm.ignored_for_send_check = false
     AND cm.timestamp > (now() - interval '24 hours')
     AND (
       -- Real SMTP-backed: there is an email_queue row marking actual SMTP acceptance
       EXISTS (
         SELECT 1 FROM public.email_queue eq
          WHERE eq.contact_id = _contact_id
            AND eq.smtp_accepted_at IS NOT NULL
            AND eq.smtp_accepted_at > (now() - interval '24 hours')
       )
       -- Or a manual/non-AI communication (founder/human) — treat as real
       OR cm.ai_generated = false
     );

  IF recent_real_outbound IS NOT NULL THEN
    -- Double check: if the only matching cm is a non-AI but no real SMTP, still block (manual contact)
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'RECENT_COMMUNICATION_24H',
      'detail', 'recent_real_smtp',
      'last_communication_at', recent_real_outbound
    );
  END IF;

  -- last_contacted_at < 48h: only honor when there is a real SMTP-backed send corroborating it
  IF c.last_contacted_at IS NOT NULL AND c.last_contacted_at > (now() - interval '48 hours') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.email_queue eq
       WHERE eq.contact_id = _contact_id
         AND eq.smtp_accepted_at IS NOT NULL
         AND eq.smtp_accepted_at > (now() - interval '48 hours')
    ) INTO recent_last_contacted_real;

    IF recent_last_contacted_real THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'RECENTLY_CONTACTED',
        'detail', 'recent_real_smtp',
        'last_contacted_at', c.last_contacted_at
      );
    END IF;
    -- else: stale/ghost stamp from simulated/failed send — do not block
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.email_events
     WHERE contact_id = _contact_id AND event_type = 'bounced'
  ) INTO recent_bounce;

  IF recent_bounce THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'EMAIL_BOUNCED');
  END IF;

  IF c.assigned_inbox_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'NO_INBOX_ASSIGNED');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'inbox_id', c.assigned_inbox_id);
END;
$function$;
