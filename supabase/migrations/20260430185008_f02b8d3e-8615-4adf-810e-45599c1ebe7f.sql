
CREATE OR REPLACE FUNCTION public.activate_outreach_campaign(_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.outreach_campaigns%ROWTYPE;
  v_mode text;
  v_seq_count int;
  v_contact_count int;
  v_inbox public.inboxes%ROWTYPE;
  v_has_creds boolean;
BEGIN
  SELECT * INTO c FROM public.outreach_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'campaign not found'; END IF;

  v_mode := public.get_system_mode();

  -- Always require sequence + contacts
  SELECT COUNT(*) INTO v_seq_count FROM public.outreach_sequences WHERE campaign_id = _campaign_id;
  IF v_seq_count = 0 THEN
    RAISE EXCEPTION 'cannot activate: no sequence steps defined' USING ERRCODE='check_violation';
  END IF;

  SELECT COUNT(*) INTO v_contact_count FROM public.contacts WHERE business_name = c.business_name;
  IF v_contact_count = 0 THEN
    RAISE EXCEPTION 'cannot activate: no contacts found for business %', c.business_name USING ERRCODE='check_violation';
  END IF;

  -- LIVE-mode additional gates
  IF v_mode = 'live' THEN
    SELECT * INTO v_inbox FROM public.inboxes
     WHERE business_name = c.business_name AND active = true
     ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'cannot activate in live mode: no active inbox for business %', c.business_name USING ERRCODE='check_violation';
    END IF;
    IF v_inbox.sending_domain_id IS NULL THEN
      RAISE EXCEPTION 'cannot activate in live mode: inbox % has no sending domain', v_inbox.email_address USING ERRCODE='check_violation';
    END IF;
    SELECT EXISTS(SELECT 1 FROM public.inbox_credentials WHERE inbox_id = v_inbox.id AND smtp_password_enc IS NOT NULL)
      INTO v_has_creds;
    IF NOT v_has_creds THEN
      RAISE EXCEPTION 'cannot activate in live mode: inbox % has no provider credentials', v_inbox.email_address USING ERRCODE='check_violation';
    END IF;
    IF v_inbox.last_test_send_status IS DISTINCT FROM 'passed' THEN
      RAISE EXCEPTION 'cannot activate in live mode: inbox % has not passed a real test send', v_inbox.email_address USING ERRCODE='check_violation';
    END IF;
    IF v_inbox.live_readiness <> 'live_ready' THEN
      RAISE EXCEPTION 'cannot activate in live mode: inbox % is not Live Ready (current: %)',
        v_inbox.email_address, v_inbox.live_readiness USING ERRCODE='check_violation';
    END IF;
  END IF;

  UPDATE public.outreach_campaigns SET status = 'active' WHERE id = _campaign_id;
  RETURN jsonb_build_object('ok', true, 'mode', v_mode);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_outreach_campaign(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_outreach_campaign(uuid) TO authenticated, service_role;
