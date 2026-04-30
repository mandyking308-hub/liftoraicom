CREATE OR REPLACE FUNCTION public.validate_campaign_activation(_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign public.outreach_campaigns;
  v_issues text[] := '{}';
  v_messages jsonb := '{}'::jsonb;
  v_active_inboxes int;
  v_mapped_inboxes int;
  v_low_rep int;
BEGIN
  SELECT * INTO v_campaign FROM public.outreach_campaigns WHERE id=_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'issues', jsonb_build_array('campaign_not_found'));
  END IF;

  SELECT COUNT(*) INTO v_active_inboxes
    FROM public.inboxes
   WHERE business_name = v_campaign.business_name AND active = true;
  IF v_active_inboxes = 0 THEN
    v_issues := array_append(v_issues, 'no_active_inbox_for_business');
    v_messages := v_messages || jsonb_build_object(
      'no_active_inbox_for_business',
      format('No active inbox is configured for %s. Add and activate an inbox before activating campaigns.', v_campaign.business_name)
    );
  END IF;

  -- An inbox is "inbound-mapped" if EITHER:
  --   (a) classic webhook+domain path is wired, OR
  --   (b) IMAP polling is enabled with a monitored mailbox and inbound status has reached at least test_passed.
  SELECT COUNT(*) INTO v_mapped_inboxes
    FROM public.inboxes
   WHERE business_name = v_campaign.business_name
     AND active = true
     AND (
       (COALESCE(inbound_webhook_url,'') <> '' AND sending_domain_id IS NOT NULL)
       OR (
         COALESCE(inbound_polling_enabled, false) = true
         AND COALESCE(monitored_mailbox, '') <> ''
         AND inbound_status IN ('inbound_test_passed'::public.inbound_status_type, 'live_ready'::public.inbound_status_type)
       )
     );
  IF v_active_inboxes > 0 AND v_mapped_inboxes = 0 THEN
    v_issues := array_append(v_issues, 'inbound_mapping_missing');
    v_messages := v_messages || jsonb_build_object(
      'inbound_mapping_missing',
      'This campaign needs an inbound reply route. Configure either inbound IMAP polling (set the monitored mailbox/folder and pass an inbound test) or an inbound webhook with a sending domain on at least one inbox for this business.'
    );
  END IF;

  SELECT COUNT(*) INTO v_low_rep
    FROM public.inboxes
   WHERE business_name = v_campaign.business_name
     AND active = true
     AND reputation_score < 50;
  IF v_low_rep > 0 THEN
    v_issues := array_append(v_issues, 'inbox_reputation_below_50');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sending_domains sd
    JOIN public.inboxes i ON i.sending_domain_id = sd.id
    WHERE i.business_name = v_campaign.business_name AND sd.domain_reputation_score < 20
  ) THEN
    v_issues := array_append(v_issues, 'sending_domain_paused');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.outreach_sequences WHERE campaign_id=_campaign_id) THEN
    v_issues := array_append(v_issues, 'no_sequences_configured');
  END IF;

  RETURN jsonb_build_object(
    'allowed', cardinality(v_issues)=0,
    'issues', COALESCE(to_jsonb(v_issues), '[]'::jsonb),
    'messages', v_messages,
    'campaign_id', _campaign_id
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_campaign_activation(uuid) TO authenticated, service_role;