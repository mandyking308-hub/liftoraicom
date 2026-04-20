CREATE OR REPLACE FUNCTION public.check_outreach_allowed(_contact_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.contacts%ROWTYPE;
  recent_bounce boolean;
  recent_comm timestamptz;
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

  -- Block if ANY communication (inbound or outbound) in the last 24 hours
  SELECT MAX(timestamp) INTO recent_comm
    FROM public.communications
   WHERE contact_id = _contact_id
     AND timestamp > (now() - interval '24 hours');

  IF recent_comm IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'RECENT_COMMUNICATION_24H',
      'last_communication_at', recent_comm
    );
  END IF;

  IF c.last_contacted_at IS NOT NULL AND c.last_contacted_at > (now() - interval '48 hours') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'RECENTLY_CONTACTED', 'last_contacted_at', c.last_contacted_at);
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