CREATE OR REPLACE FUNCTION public.activate_outreach_campaign(_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.outreach_campaigns%ROWTYPE;
  v_mode text;
  v_seq_count int;
  v_contact_count int;
  v_inbox public.inboxes%ROWTYPE;
  v_has_creds boolean;
  v_business_live boolean;
  v_effective_mode text;
BEGIN
  SELECT * INTO c FROM public.outreach_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'campaign not found'; END IF;

  v_mode := public.get_system_mode();
  v_business_live := public.has_live_ready_inbox(c.business_name);

  SELECT COUNT(*) INTO v_seq_count FROM public.outreach_sequences WHERE campaign_id = _campaign_id;
  IF v_seq_count = 0 THEN
    RAISE EXCEPTION 'cannot activate: no sequence steps defined' USING ERRCODE='check_violation';
  END IF;

  SELECT COUNT(*) INTO v_contact_count FROM public.contacts WHERE assigned_business = c.business_name;
  IF v_contact_count = 0 THEN
    RAISE EXCEPTION 'cannot activate: no contacts found for business %', c.business_name USING ERRCODE='check_violation';
  END IF;

  IF v_mode = 'live' OR v_business_live THEN
    SELECT * INTO v_inbox FROM public.inboxes
     WHERE business_name = c.business_name
       AND active = true
       AND provider_type = 'ionos_smtp'::public.inbox_provider_type
       AND live_readiness = 'live_ready'::public.inbox_live_readiness
     ORDER BY last_test_send_at DESC NULLS LAST, created_at DESC LIMIT 1;
    IF NOT FOUND THEN
      IF v_mode = 'live' THEN
        RAISE EXCEPTION 'cannot activate in live mode: no Live Ready inbox for business %', c.business_name USING ERRCODE='check_violation';
      END IF;
    ELSE
      IF v_inbox.last_test_send_status IS DISTINCT FROM 'passed' THEN
        RAISE EXCEPTION 'cannot activate: inbox % has not passed a real test send', v_inbox.email_address USING ERRCODE='check_violation';
      END IF;
      SELECT EXISTS(SELECT 1 FROM public.inbox_credentials WHERE inbox_id = v_inbox.id AND smtp_password_enc IS NOT NULL)
        INTO v_has_creds;
      IF NOT v_has_creds THEN
        RAISE EXCEPTION 'cannot activate: inbox % has no provider credentials', v_inbox.email_address USING ERRCODE='check_violation';
      END IF;
    END IF;
  END IF;

  v_effective_mode := CASE
    WHEN v_mode = 'live' THEN 'live'
    WHEN v_business_live THEN 'business_live'
    ELSE 'simulated'
  END;

  UPDATE public.outreach_campaigns SET status = 'active' WHERE id = _campaign_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('campaign_activated',
    format('Campaign %s activated in %s mode (business=%s)', c.campaign_name, v_effective_mode, c.business_name),
    'outreach_campaign', _campaign_id);

  RETURN jsonb_build_object('ok', true, 'mode', v_effective_mode, 'system_mode', v_mode, 'business_live', v_business_live);
END;
$$;