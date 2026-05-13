ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS lawful_basis text,
  ADD COLUMN IF NOT EXISTS lawful_basis_notes text,
  ADD COLUMN IF NOT EXISTS lawful_basis_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS data_source text,
  ADD COLUMN IF NOT EXISTS source_platform text,
  ADD COLUMN IF NOT EXISTS source_record_id text,
  ADD COLUMN IF NOT EXISTS source_collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_until timestamptz,
  ADD COLUMN IF NOT EXISTS retention_policy text,
  ADD COLUMN IF NOT EXISTS unsubscribe_token text,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribe_source text,
  ADD COLUMN IF NOT EXISTS do_not_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS do_not_contact_reason text,
  ADD COLUMN IF NOT EXISTS last_compliance_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'pending_review';

ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_compliance_status_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_compliance_status_check
  CHECK (compliance_status IN (
    'pending_review','outreach_allowed','do_not_contact',
    'unsubscribed','hard_bounced','retained_no_outreach'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS contacts_unsubscribe_token_uniq
  ON public.contacts (unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS contacts_compliance_status_idx ON public.contacts (compliance_status);
CREATE INDEX IF NOT EXISTS contacts_retention_until_idx ON public.contacts (retention_until);

CREATE TABLE IF NOT EXISTS public.contact_compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  business_id uuid,
  business_name text NOT NULL DEFAULT '',
  event_type text NOT NULL,
  event_source text NOT NULL DEFAULT '',
  event_notes text NOT NULL DEFAULT '',
  old_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_compliance_events DROP CONSTRAINT IF EXISTS contact_compliance_events_event_type_check;
ALTER TABLE public.contact_compliance_events ADD CONSTRAINT contact_compliance_events_event_type_check
  CHECK (event_type IN (
    'lawful_basis_recorded','retention_set','unsubscribe_token_created',
    'unsubscribe_clicked','manual_do_not_contact','hard_bounce_suppressed',
    'reply_stop_suppressed','compliance_reviewed','outreach_allowed','outreach_blocked'
  ));

CREATE INDEX IF NOT EXISTS cce_contact_idx ON public.contact_compliance_events (contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cce_event_type_idx ON public.contact_compliance_events (event_type, created_at DESC);

ALTER TABLE public.contact_compliance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage contact compliance events" ON public.contact_compliance_events;
CREATE POLICY "Founders can manage contact compliance events"
  ON public.contact_compliance_events FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE OR REPLACE FUNCTION public.handle_email_bounce()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_contact public.contacts%ROWTYPE;
BEGIN
  IF NEW.event_type = 'bounced' THEN
    SELECT * INTO v_contact FROM public.contacts WHERE id = NEW.contact_id;
    IF FOUND AND (v_contact.hard_bounced = false OR v_contact.compliance_status <> 'hard_bounced') THEN
      UPDATE public.contacts
         SET status='DO_NOT_CONTACT'::contact_status,
             hard_bounced=true,
             is_globally_suppressed=true,
             global_suppression_reason=COALESCE(global_suppression_reason,'hard_bounce'),
             global_suppression_at=COALESCE(global_suppression_at, now()),
             compliance_status='hard_bounced',
             do_not_contact_at=COALESCE(do_not_contact_at, now()),
             do_not_contact_reason=COALESCE(NULLIF(do_not_contact_reason,''),'hard_bounce')
       WHERE id=NEW.contact_id;
      INSERT INTO public.contact_compliance_events (contact_id, event_type, event_source, event_notes, new_value, actor)
      VALUES (NEW.contact_id,'hard_bounce_suppressed','email_events',
              'Hard bounce auto-suppressed contact and marked DO_NOT_CONTACT',
              jsonb_build_object('email_event_id', NEW.id, 'email_id', NEW.email_id),'system');
    END IF;
  ELSIF NEW.event_type='replied' THEN
    UPDATE public.contacts SET conversation_active=true, last_replied_at=NEW."timestamp"
     WHERE id=NEW.contact_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.apply_reply_stop_suppression(
  p_contact_id uuid, p_message_body text, p_source text DEFAULT 'inbound_message'
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_body text; v_match boolean := false;
BEGIN
  IF p_contact_id IS NULL OR p_message_body IS NULL THEN RETURN false; END IF;
  v_body := lower(p_message_body);
  IF v_body ~ '(^|\W)(unsubscribe|stop|remove me|do not contact|don''?t contact me|no further emails)(\W|$)' THEN
    v_match := true;
  END IF;
  IF NOT v_match THEN RETURN false; END IF;
  UPDATE public.contacts
     SET is_globally_suppressed=true, status='DO_NOT_CONTACT'::contact_status,
         compliance_status='do_not_contact',
         do_not_contact_at=COALESCE(do_not_contact_at, now()),
         do_not_contact_reason=COALESCE(NULLIF(do_not_contact_reason,''),'reply_stop_request'),
         global_suppression_reason=COALESCE(global_suppression_reason,'reply_stop_request'),
         global_suppression_at=COALESCE(global_suppression_at, now())
   WHERE id=p_contact_id;
  INSERT INTO public.contact_compliance_events (contact_id, event_type, event_source, event_notes, new_value, actor)
  VALUES (p_contact_id,'reply_stop_suppressed', p_source,
          'Inbound message contained opt-out wording',
          jsonb_build_object('snippet', left(p_message_body, 240)),'system');
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.check_outreach_allowed(
  p_contact_id uuid, p_business_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.contacts%ROWTYPE;
  bcr public.business_contact_relationships%ROWTYPE;
  reasons text[] := ARRAY[]::text[];
  retention_valid boolean := false;
  unsub_present boolean := false;
  basis_present boolean := false;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id=p_contact_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'blocker_reasons', ARRAY['contact_not_found']); END IF;
  basis_present := c.lawful_basis IS NOT NULL AND length(c.lawful_basis) > 0;
  unsub_present := c.unsubscribe_token IS NOT NULL;
  retention_valid := c.retention_until IS NOT NULL AND c.retention_until > now();
  IF NOT basis_present THEN reasons := reasons || 'no_lawful_basis'; END IF;
  IF NOT unsub_present THEN reasons := reasons || 'no_unsubscribe_token'; END IF;
  IF NOT retention_valid THEN reasons := reasons || 'retention_invalid_or_expired'; END IF;
  IF c.is_globally_suppressed THEN reasons := reasons || 'globally_suppressed'; END IF;
  IF c.hard_bounced THEN reasons := reasons || 'hard_bounced'; END IF;
  IF c.unsubscribed_at IS NOT NULL THEN reasons := reasons || 'unsubscribed'; END IF;
  IF c.status='DO_NOT_CONTACT'::contact_status THEN reasons := reasons || 'status_do_not_contact'; END IF;
  IF c.compliance_status IN ('unsubscribed','hard_bounced','do_not_contact','pending_review','retained_no_outreach') THEN
    reasons := reasons || ('compliance_status_' || c.compliance_status);
  END IF;
  IF p_business_id IS NOT NULL THEN
    SELECT * INTO bcr FROM public.business_contact_relationships WHERE contact_id=p_contact_id AND business_id=p_business_id LIMIT 1;
    IF FOUND THEN
      IF bcr.do_not_contact THEN reasons := reasons || 'bcr_do_not_contact'; END IF;
      IF NOT bcr.campaign_eligible THEN reasons := reasons || 'bcr_not_campaign_eligible'; END IF;
      IF bcr.qualification <> 'qualified'::bcr_qualification THEN reasons := reasons || 'bcr_not_qualified'; END IF;
    ELSE
      reasons := reasons || 'bcr_missing';
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'allowed', array_length(reasons, 1) IS NULL,
    'blocker_reasons', reasons,
    'compliance_status', c.compliance_status,
    'unsubscribe_token_present', unsub_present,
    'lawful_basis_present', basis_present,
    'retention_valid', retention_valid
  );
END; $$;

DO $$
DECLARE r record; v_count int := 0; v_token text;
BEGIN
  FOR r IN
    SELECT c.* FROM public.contacts c
    WHERE c.source='autopilot_promotion'
      AND c.assigned_business='Neon Candy'
      AND c.email IS NOT NULL AND c.email <> ''
      AND c.is_globally_suppressed=false
      AND c.hard_bounced=false
      AND c.status <> 'DO_NOT_CONTACT'::contact_status
  LOOP
    v_token := COALESCE(r.unsubscribe_token, encode(gen_random_bytes(24),'hex'));
    UPDATE public.contacts
       SET lawful_basis=COALESCE(lawful_basis,'legitimate_interest_b2b'),
           lawful_basis_notes=COALESCE(NULLIF(lawful_basis_notes,''),
             'B2B music/media outreach based on role/company relevance from Apollo; contact validated before promotion; no send permitted until unsubscribe and suppression controls are active.'),
           lawful_basis_recorded_at=COALESCE(lawful_basis_recorded_at, now()),
           data_source=COALESCE(data_source,'Apollo'),
           source_platform=COALESCE(source_platform,'Apollo'),
           source_record_id=COALESCE(source_record_id, r.apollo_person_id),
           source_collected_at=COALESCE(source_collected_at, r.created_at),
           retention_policy=COALESCE(retention_policy,'apollo_b2b_outreach_review_12_months'),
           retention_until=COALESCE(retention_until, now() + interval '12 months'),
           unsubscribe_token=v_token,
           last_compliance_review_at=now()
     WHERE id=r.id;
    INSERT INTO public.contact_compliance_events (contact_id, business_name, event_type, event_source, event_notes, new_value, actor) VALUES
      (r.id,'Neon Candy','lawful_basis_recorded','compliance_spine_backfill',
       'legitimate_interest_b2b recorded for Apollo-sourced B2B contact',
       jsonb_build_object('lawful_basis','legitimate_interest_b2b'),'system'),
      (r.id,'Neon Candy','retention_set','compliance_spine_backfill',
       '12-month retention window set',
       jsonb_build_object('retention_policy','apollo_b2b_outreach_review_12_months','retention_until',(now()+interval '12 months')),'system'),
      (r.id,'Neon Candy','unsubscribe_token_created','compliance_spine_backfill',
       'Unsubscribe token issued',
       jsonb_build_object('token_prefix', left(v_token, 8)),'system'),
      (r.id,'Neon Candy','compliance_reviewed','compliance_spine_backfill',
       'Initial compliance state recorded; awaiting founder approval before outreach',
       jsonb_build_object('compliance_status','pending_review'),'system');
    v_count := v_count + 1;
  END LOOP;

  INSERT INTO public.system_events (event_type, business_name, severity, message, metadata)
  VALUES ('compliance_spine_backfilled','Neon Candy','low',
          'Compliance spine backfilled for Neon Candy Apollo-promoted contacts',
          jsonb_build_object('contacts_count', v_count, 'queue_rows_created', 0,
                             'emails_sent', 0, 'apollo_credits_spent', 0));
END; $$;