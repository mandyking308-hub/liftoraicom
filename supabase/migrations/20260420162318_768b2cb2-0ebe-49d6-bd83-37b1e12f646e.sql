-- ============== 1. SYSTEM MODE HELPERS ==============
INSERT INTO public.system_settings (key, value)
VALUES ('system_mode', '"test"'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_system_mode()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT value FROM public.system_settings WHERE key='system_mode'), '"test"'::jsonb) #>> '{}';
$$;

CREATE OR REPLACE FUNCTION public.set_system_mode(_mode text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_old text;
BEGIN
  IF _mode NOT IN ('test','live') THEN
    RAISE EXCEPTION 'invalid mode %, must be test or live', _mode;
  END IF;
  v_old := public.get_system_mode();
  INSERT INTO public.system_settings(key,value,updated_at)
  VALUES ('system_mode', to_jsonb(_mode), now())
  ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();
  INSERT INTO public.activity_log(event_type,description,entity_type,entity_id)
  VALUES ('system_mode_changed', format('System mode switched from %s to %s', v_old, _mode), 'system', NULL);
  INSERT INTO public.system_events(event_type, severity, message, metadata)
  VALUES ('system_mode_changed',
          CASE WHEN _mode='live' THEN 'high'::system_event_severity ELSE 'medium'::system_event_severity END,
          format('System mode is now %s', _mode),
          jsonb_build_object('previous_mode', v_old, 'new_mode', _mode));
  RETURN _mode;
END;
$$;

REVOKE ALL ON FUNCTION public.set_system_mode(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_system_mode(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_system_mode() TO authenticated, service_role;

-- ============== 2. INBOX INBOUND WEBHOOK ==============
ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS inbound_webhook_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS inbound_webhook_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS sending_domain_id uuid REFERENCES public.sending_domains(id) ON DELETE SET NULL;

UPDATE public.inboxes i
SET sending_domain_id = sd.id
FROM public.sending_domains sd
WHERE i.sending_domain_id IS NULL
  AND lower(split_part(i.email_address,'@',2)) = lower(sd.domain_name);

CREATE OR REPLACE FUNCTION public.validate_inbox_mapping(_inbox_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_inbox public.inboxes; v_issues text[] := '{}';
BEGIN
  SELECT * INTO v_inbox FROM public.inboxes WHERE id=_inbox_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'issues', jsonb_build_array('inbox_not_found'));
  END IF;
  IF v_inbox.inbound_webhook_url = '' THEN v_issues := array_append(v_issues, 'inbound_webhook_missing'); END IF;
  IF v_inbox.sending_domain_id IS NULL THEN v_issues := array_append(v_issues, 'sending_domain_unmapped'); END IF;
  IF NOT v_inbox.active THEN v_issues := array_append(v_issues, 'inbox_inactive'); END IF;
  RETURN jsonb_build_object('valid', cardinality(v_issues)=0,
                            'issues', COALESCE(to_jsonb(v_issues), '[]'::jsonb),
                            'inbox_id', v_inbox.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_inbox_mapping(uuid) TO authenticated, service_role;

-- ============== 3. RAMP ENFORCEMENT ==============
CREATE OR REPLACE FUNCTION public.enforce_inbox_ramp(_inbox_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_inbox public.inboxes; v_age_days int; v_max int;
BEGIN
  SELECT * INTO v_inbox FROM public.inboxes WHERE id=_inbox_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'reason', 'INBOX_NOT_FOUND'); END IF;
  v_age_days := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_inbox.warmup_started_at))::int / 86400);
  v_max := CASE WHEN v_age_days < 3 THEN 20 WHEN v_age_days < 7 THEN 40 ELSE 80 END;
  v_max := GREATEST(v_max, COALESCE(v_inbox.daily_send_limit, 0));
  IF v_inbox.current_send_count >= v_max THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'RAMP_LIMIT_REACHED',
                              'sent_today', v_inbox.current_send_count, 'max_today', v_max, 'age_days', v_age_days);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'sent_today', v_inbox.current_send_count,
                            'max_today', v_max, 'age_days', v_age_days);
END;
$$;
GRANT EXECUTE ON FUNCTION public.enforce_inbox_ramp(uuid) TO authenticated, service_role;

-- ============== 4. DOMAIN PROTECTION ALERTS ==============
CREATE TABLE IF NOT EXISTS public.domain_protection_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id uuid REFERENCES public.inboxes(id) ON DELETE CASCADE,
  sending_domain_id uuid REFERENCES public.sending_domains(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  severity system_event_severity NOT NULL DEFAULT 'high',
  metric_value numeric NOT NULL DEFAULT 0,
  threshold_value numeric NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_domain_alerts_unresolved ON public.domain_protection_alerts(severity, created_at DESC) WHERE resolved=false;
ALTER TABLE public.domain_protection_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage domain alerts" ON public.domain_protection_alerts;
CREATE POLICY "Founders manage domain alerts" ON public.domain_protection_alerts
  USING (has_role(auth.uid(), 'founder'::app_role)) WITH CHECK (has_role(auth.uid(), 'founder'::app_role));
DROP POLICY IF EXISTS "Service role domain alerts" ON public.domain_protection_alerts;
CREATE POLICY "Service role domain alerts" ON public.domain_protection_alerts
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.run_domain_protection_check()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD; v_bounce_rate numeric; v_reply_rate numeric;
  v_sent int; v_bounced int; v_replied int;
  v_alerts int := 0; v_paused int := 0;
BEGIN
  FOR r IN
    SELECT i.id AS inbox_id, i.email_address, i.sending_domain_id, i.warmup_started_at
    FROM public.inboxes i WHERE i.active = true
  LOOP
    SELECT
      COUNT(*) FILTER (WHERE eq.status='sent' AND eq.sent_at > now() - interval '3 days'),
      COUNT(DISTINCT ev.id) FILTER (WHERE ev.event_type='bounced' AND ev.timestamp > now() - interval '3 days'),
      COUNT(DISTINCT ev.id) FILTER (WHERE ev.event_type='replied' AND ev.timestamp > now() - interval '3 days')
    INTO v_sent, v_bounced, v_replied
    FROM public.email_queue eq
    LEFT JOIN public.email_events ev ON ev.contact_id=eq.contact_id
    WHERE eq.inbox_id = r.inbox_id;

    IF v_sent < 10 THEN CONTINUE; END IF;
    v_bounce_rate := (v_bounced::numeric / NULLIF(v_sent,0)) * 100;
    v_reply_rate  := (v_replied::numeric / NULLIF(v_sent,0)) * 100;

    IF v_bounce_rate > 5 THEN
      INSERT INTO public.domain_protection_alerts(inbox_id, sending_domain_id, alert_type, severity, metric_value, threshold_value, message)
      VALUES (r.inbox_id, r.sending_domain_id, 'bounce_rate_exceeded', 'critical', v_bounce_rate, 5,
              format('Inbox %s bounce rate %.2f%% over 3d (>5%%)', r.email_address, v_bounce_rate));
      INSERT INTO public.system_events(event_type, severity, message, entity_type, entity_id)
      VALUES ('domain_bounce_high','critical',
              format('Bounce rate %.2f%% on %s — campaigns paused', v_bounce_rate, r.email_address),
              'inbox', r.inbox_id);
      INSERT INTO public.system_tasks(entity_type, entity_id, task_type, priority_score, reason)
      VALUES ('contact', r.inbox_id, 'review', 90, format('Domain protection: bounce rate %.2f%% on %s', v_bounce_rate, r.email_address))
      ON CONFLICT DO NOTHING;
      UPDATE public.inboxes SET active=false, paused_reason='bounce_rate_exceeded' WHERE id=r.inbox_id;
      UPDATE public.outreach_campaigns SET status='paused'
        WHERE status='active' AND id IN (SELECT DISTINCT campaign_id FROM public.email_queue WHERE inbox_id=r.inbox_id);
      v_alerts := v_alerts + 1; v_paused := v_paused + 1;
    ELSIF v_reply_rate < 1 AND r.warmup_started_at < now() - interval '3 days' THEN
      INSERT INTO public.domain_protection_alerts(inbox_id, sending_domain_id, alert_type, severity, metric_value, threshold_value, message)
      VALUES (r.inbox_id, r.sending_domain_id, 'reply_rate_low', 'high', v_reply_rate, 1,
              format('Inbox %s reply rate %.2f%% over 3d (<1%%)', r.email_address, v_reply_rate));
      INSERT INTO public.system_events(event_type, severity, message, entity_type, entity_id)
      VALUES ('domain_reply_low','high',
              format('Reply rate %.2f%% on %s — review messaging', v_reply_rate, r.email_address),
              'inbox', r.inbox_id);
      v_alerts := v_alerts + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('alerts_created', v_alerts, 'inboxes_paused', v_paused);
END;
$$;
GRANT EXECUTE ON FUNCTION public.run_domain_protection_check() TO authenticated, service_role;

-- ============== 5. CAMPAIGN ACTIVATION GUARDRAIL ==============
CREATE OR REPLACE FUNCTION public.validate_campaign_activation(_campaign_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_campaign public.outreach_campaigns; v_issues text[] := '{}';
  v_inbox_count int; v_unmapped int; v_low_rep int;
BEGIN
  SELECT * INTO v_campaign FROM public.outreach_campaigns WHERE id=_campaign_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'issues', jsonb_build_array('campaign_not_found')); END IF;
  SELECT COUNT(*) INTO v_inbox_count FROM public.inboxes WHERE business_name = v_campaign.business_name AND active=true;
  IF v_inbox_count = 0 THEN v_issues := array_append(v_issues, 'no_active_inbox_for_business'); END IF;
  SELECT COUNT(*) INTO v_unmapped FROM public.inboxes
   WHERE business_name = v_campaign.business_name AND active=true
     AND (inbound_webhook_url='' OR sending_domain_id IS NULL);
  IF v_unmapped > 0 THEN v_issues := array_append(v_issues, 'inbound_mapping_missing'); END IF;
  SELECT COUNT(*) INTO v_low_rep FROM public.inboxes
   WHERE business_name = v_campaign.business_name AND active=true AND reputation_score < 50;
  IF v_low_rep > 0 THEN v_issues := array_append(v_issues, 'inbox_reputation_below_50'); END IF;
  IF EXISTS (
    SELECT 1 FROM public.sending_domains sd
    JOIN public.inboxes i ON i.sending_domain_id = sd.id
    WHERE i.business_name = v_campaign.business_name AND sd.domain_reputation_score < 20
  ) THEN v_issues := array_append(v_issues, 'sending_domain_paused'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.outreach_sequences WHERE campaign_id=_campaign_id) THEN
    v_issues := array_append(v_issues, 'no_sequences_configured');
  END IF;
  RETURN jsonb_build_object('allowed', cardinality(v_issues)=0,
                            'issues', COALESCE(to_jsonb(v_issues), '[]'::jsonb),
                            'campaign_id', _campaign_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_campaign_activation(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_campaign_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_check jsonb;
BEGIN
  IF NEW.status = 'active' AND (TG_OP='INSERT' OR OLD.status <> 'active') THEN
    v_check := public.validate_campaign_activation(NEW.id);
    IF (v_check->>'allowed')::boolean = false THEN
      INSERT INTO public.system_events(event_type, severity, message, entity_type, entity_id, metadata)
      VALUES ('campaign_activation_blocked','critical',
              format('Activation blocked for campaign %s', NEW.campaign_name),
              'deal', NEW.id, v_check);
      RAISE EXCEPTION 'Campaign activation blocked: %', v_check->>'issues';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_campaign_activation ON public.outreach_campaigns;
CREATE TRIGGER trg_guard_campaign_activation
  BEFORE INSERT OR UPDATE OF status ON public.outreach_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_activation();

-- ============== 6. GO-LIVE READINESS ==============
CREATE OR REPLACE FUNCTION public.validate_go_live_readiness()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_issues text[] := '{}'; v_mode text;
  v_inboxes int; v_unmapped int; v_domains int; v_active_campaigns int;
BEGIN
  v_mode := public.get_system_mode();
  SELECT COUNT(*) INTO v_inboxes FROM public.inboxes WHERE active=true;
  IF v_inboxes = 0 THEN v_issues := array_append(v_issues, 'no_active_inboxes'); END IF;
  SELECT COUNT(*) INTO v_unmapped FROM public.inboxes
    WHERE active=true AND (inbound_webhook_url='' OR sending_domain_id IS NULL);
  IF v_unmapped > 0 THEN v_issues := array_append(v_issues, format('%s_inboxes_unmapped', v_unmapped)); END IF;
  SELECT COUNT(*) INTO v_domains FROM public.sending_domains;
  IF v_domains = 0 THEN v_issues := array_append(v_issues, 'no_sending_domain_configured'); END IF;
  IF v_domains > 0 AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sending_domains'
      AND column_name IN ('spf_verified','dkim_verified','dmarc_verified')
  ) THEN
    v_issues := array_append(v_issues, 'spf_dkim_dmarc_unverified');
  END IF;
  SELECT COUNT(*) INTO v_active_campaigns FROM public.outreach_campaigns WHERE status='active';
  IF v_active_campaigns = 0 AND v_mode='live' THEN
    v_issues := array_append(v_issues, 'no_active_campaign');
  END IF;
  RETURN jsonb_build_object(
    'ready', cardinality(v_issues)=0,
    'mode', v_mode,
    'issues', COALESCE(to_jsonb(v_issues), '[]'::jsonb),
    'active_inboxes', v_inboxes,
    'unmapped_inboxes', v_unmapped,
    'sending_domains', v_domains,
    'active_campaigns', v_active_campaigns,
    'checked_at', now()
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_go_live_readiness() TO authenticated, service_role;

-- ============== 7. HIGH INTENT REVIEW QUEUE VIEW ==============
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS founder_review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS founder_review_note text NOT NULL DEFAULT '';

CREATE OR REPLACE VIEW public.high_intent_review_queue AS
SELECT
  c.id            AS contact_id,
  c.name, c.email, c.company, c.status, c.assigned_business, c.intent_score,
  c.founder_review_requested_at,
  COALESCE((SELECT COUNT(*) FROM public.demo_access da WHERE da.contact_id=c.id), 0) AS demo_views,
  COALESCE((SELECT MAX(timestamp) FROM public.email_events ev WHERE ev.contact_id=c.id AND ev.event_type='replied'), c.last_replied_at) AS last_reply_at,
  EXISTS(
    SELECT 1 FROM public.demo_access da WHERE da.contact_id=c.id AND da.access_count >= 1
  ) AS proposal_viewed,
  c.updated_at
FROM public.contacts c
WHERE c.intent_score > 70
   OR EXISTS (SELECT 1 FROM public.demo_access da WHERE da.contact_id=c.id AND da.access_count >= 2)
   OR c.founder_review_requested_at IS NOT NULL;

GRANT SELECT ON public.high_intent_review_queue TO authenticated, service_role;

-- ============== 8. MARK FOR FOUNDER REVIEW ==============
CREATE OR REPLACE FUNCTION public.mark_contact_for_founder_review(_contact_id uuid, _note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE public.contacts
     SET founder_review_requested_at = now(), founder_review_note = _note
   WHERE id = _contact_id RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'contact not found'; END IF;
  INSERT INTO public.system_tasks(entity_type, entity_id, task_type, priority_score, reason)
  VALUES ('contact', _contact_id, 'review', 95, COALESCE(NULLIF(_note,''), 'Founder review requested'))
  ON CONFLICT DO NOTHING;
  INSERT INTO public.activity_log(event_type, description, entity_type, entity_id)
  VALUES ('founder_review_requested', COALESCE(NULLIF(_note,''), 'Marked for founder review'), 'contact', _contact_id);
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_contact_for_founder_review(uuid, text) TO authenticated, service_role;