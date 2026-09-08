-- Smartlead data, campaign transfer and inbound processing.
-- No credentials, purchases, campaign starts, schedules or feature-flag changes.
-- Abort on legacy identity collisions; do not delete or guess how to merge contacts.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.contacts WHERE email IS NOT NULL
    GROUP BY lower(btrim(email)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Smartlead prerequisite: resolve duplicate normalised contact emails before applying this migration';
  END IF;
  IF EXISTS (SELECT 1 FROM public.outbound_provider_lead_mappings
    WHERE provider_campaign_id IS NOT NULL AND provider_lead_id IS NOT NULL
    GROUP BY provider_type, provider_campaign_id, provider_lead_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Smartlead prerequisite: resolve duplicate provider lead identities before applying this migration';
  END IF;
END $$;

CREATE UNIQUE INDEX contacts_email_normalised_uniq ON public.contacts(lower(btrim(email)));
CREATE UNIQUE INDEX outbound_provider_lead_mappings_provider_lead_uniq
  ON public.outbound_provider_lead_mappings(provider_type, provider_campaign_id, provider_lead_id)
  WHERE provider_campaign_id IS NOT NULL AND provider_lead_id IS NOT NULL;
ALTER TABLE public.outbound_provider_lead_mappings
  DROP CONSTRAINT IF EXISTS outbound_provider_lead_mappings_push_status_check;
ALTER TABLE public.outbound_provider_lead_mappings
  ADD CONSTRAINT outbound_provider_lead_mappings_push_status_check CHECK
  (push_status IN ('not_pushed','previewed','pushing','pushed','failed','skipped','imported_from_provider'));

ALTER TABLE public.outbound_provider_events ADD COLUMN dedupe_key text;
CREATE UNIQUE INDEX outbound_provider_events_dedupe_uniq
  ON public.outbound_provider_events(provider_type, dedupe_key);

-- Purchase planning stores business identity and intended capacity, never mailbox passwords.
CREATE TABLE public.smartlead_business_setup (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id),
  website text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  reply_owner_email text NOT NULL DEFAULT '',
  proposed_domains text[] NOT NULL DEFAULT '{}',
  mailbox_target integer NOT NULL DEFAULT 50 CHECK (mailbox_target BETWEEN 1 AND 200),
  daily_per_mailbox integer NOT NULL DEFAULT 20 CHECK (daily_per_mailbox BETWEEN 1 AND 50),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.smartlead_business_setup ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.smartlead_business_setup TO authenticated;
GRANT ALL ON public.smartlead_business_setup TO service_role;
CREATE POLICY smartlead_setup_read ON public.smartlead_business_setup FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY smartlead_setup_insert ON public.smartlead_business_setup FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY smartlead_setup_update ON public.smartlead_business_setup FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.smartlead_contact_threads (
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  thread_id uuid NOT NULL REFERENCES public.communication_threads(id),
  PRIMARY KEY (business_id, contact_id)
);
ALTER TABLE public.smartlead_contact_threads ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.smartlead_contact_threads TO authenticated;
GRANT ALL ON public.smartlead_contact_threads TO service_role;
CREATE POLICY smartlead_threads_read ON public.smartlead_contact_threads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- Literal, case-insensitive matching. %, _, commas and parentheses are not patterns.
CREATE FUNCTION public.smartlead_find_contacts_by_emails(p_emails text[])
RETURNS SETOF public.contacts LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT c.* FROM public.contacts c
  WHERE lower(btrim(c.email)) = ANY(ARRAY(SELECT lower(btrim(e)) FROM unnest(p_emails) e));
$$;
CREATE FUNCTION public.smartlead_find_lead_mappings(p_campaign text, p_emails text[], p_ids text[])
RETURNS SETOF public.outbound_provider_lead_mappings LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT m.* FROM public.outbound_provider_lead_mappings m
  WHERE m.provider_type='smartlead' AND m.provider_campaign_id=p_campaign
    AND (lower(btrim(m.contact_email)) = ANY(ARRAY(SELECT lower(btrim(e)) FROM unnest(p_emails) e))
      OR m.provider_lead_id=ANY(p_ids));
$$;

-- Merge against a locked current row, not a stale pre-import snapshot.
CREATE FUNCTION public.smartlead_merge_contact(p_id uuid, p_patch jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE c public.contacts%ROWTYPE; p jsonb; k text; fields text[] := ARRAY[
  'name','first_name','last_name','company','role','linkedin_url','phone','country','source_record_id','source_platform'];
BEGIN
  SELECT * INTO STRICT c FROM public.contacts WHERE id=p_id FOR UPDATE;
  p := to_jsonb(c);
  IF NOT (c.is_globally_suppressed OR c.hard_bounced OR c.unsubscribed_at IS NOT NULL
    OR c.do_not_contact_at IS NOT NULL OR c.archived_at IS NOT NULL OR c.sendable_status::text='suppressed') THEN
    FOREACH k IN ARRAY fields LOOP
      IF coalesce(btrim(p->>k),'') IN ('','unknown','null','-') AND coalesce(btrim(p_patch->>k),'')<>'' THEN
        p := jsonb_set(p, ARRAY[k], p_patch->k);
      END IF;
    END LOOP;
    IF lower(coalesce(c.email_verified_status,'')) NOT IN ('verified','valid','deliverable')
      AND lower(coalesce(p_patch->>'email_verified_status','')) IN ('verified','valid','deliverable') THEN
      p := jsonb_set(p, '{email_verified_status}', p_patch->'email_verified_status');
    END IF;
  END IF;
  c := jsonb_populate_record(c, p);
  UPDATE public.contacts SET name=c.name, first_name=c.first_name, last_name=c.last_name,
    company=c.company, role=c.role, linkedin_url=c.linkedin_url, phone=c.phone, country=c.country,
    source_record_id=c.source_record_id, source_platform=c.source_platform,
    email_verified_status=c.email_verified_status,
    hard_bounced=hard_bounced OR coalesce((p_patch->>'hard_bounced')::boolean,false),
    unsubscribed_at=coalesce(unsubscribed_at,(p_patch->>'unsubscribed_at')::timestamptz),
    unsubscribe_source=CASE WHEN p_patch->>'unsubscribed_at' IS NOT NULL THEN coalesce(unsubscribe_source,'smartlead') ELSE unsubscribe_source END,
    sendable_status=CASE WHEN p_patch->>'hard_bounced'='true' OR p_patch->>'unsubscribed_at' IS NOT NULL
      THEN 'suppressed'::public.contact_sendable_status ELSE sendable_status END
  WHERE id=p_id;
END $$;

CREATE FUNCTION public.smartlead_merge_relationship(p_row jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.business_contact_relationships%ROWTYPE; cid uuid; bid uuid; bname text;
BEGIN
  bid := (p_row->>'business_id')::uuid; bname := p_row->>'business_name';
  IF p_row->>'id' IS NOT NULL THEN
    SELECT * INTO STRICT r FROM public.business_contact_relationships WHERE id=(p_row->>'id')::uuid FOR UPDATE;
    cid := r.contact_id;
  ELSE cid := (p_row->>'contact_id')::uuid; END IF;
  IF cid IS NULL OR NOT EXISTS (SELECT 1 FROM public.businesses WHERE id=bid AND name=bname) THEN
    RAISE EXCEPTION 'invalid_business_relationship';
  END IF;
  INSERT INTO public.business_contact_relationships(contact_id,business_id,business_name,campaign_eligible,
      do_not_contact,do_not_contact_reason,current_stage,notes)
    VALUES(cid,bid,bname,false,coalesce((p_row->>'do_not_contact')::boolean,false),
      coalesce(p_row->>'do_not_contact_reason',''),
      CASE WHEN p_row->>'do_not_contact'='true' THEN 'do_not_contact' ELSE 'ready_to_stage' END::public.bcr_stage,
      coalesce(p_row->>'notes',''))
    ON CONFLICT(contact_id,business_name) DO NOTHING;
  SELECT * INTO STRICT r FROM public.business_contact_relationships
    WHERE contact_id=cid AND business_name=bname FOR UPDATE;
  IF r.business_id IS NOT NULL AND r.business_id<>bid THEN RAISE EXCEPTION 'relationship_business_conflict'; END IF;
  -- Import can tighten suppression; it cannot clear it or reset a campaign's existing eligibility/stage.
  UPDATE public.business_contact_relationships SET business_id=bid,
    do_not_contact=r.do_not_contact OR coalesce((p_row->>'do_not_contact')::boolean,false),
    do_not_contact_reason=CASE WHEN r.do_not_contact THEN r.do_not_contact_reason
      ELSE coalesce(p_row->>'do_not_contact_reason',r.do_not_contact_reason) END,
    campaign_eligible=CASE WHEN p_row->>'do_not_contact'='true' THEN false ELSE r.campaign_eligible END,
    current_stage=CASE WHEN p_row->>'do_not_contact'='true' THEN 'do_not_contact'::public.bcr_stage ELSE r.current_stage END
    WHERE id=r.id;
END $$;

CREATE FUNCTION public.smartlead_merge_lead_mapping(p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE r public.outbound_provider_lead_mappings%ROWTYPE; matches integer; eid text;
BEGIN
  eid := lower(btrim(p_row->>'contact_email'));
  -- Serialise each campaign+email identity, including the first insert.
  PERFORM pg_advisory_xact_lock(hashtextextended('smartlead:'||(p_row->>'provider_campaign_id')||':'||eid,0));
  SELECT count(*) INTO matches FROM public.outbound_provider_lead_mappings
    WHERE provider_type='smartlead' AND provider_campaign_id=p_row->>'provider_campaign_id'
    AND (lower(btrim(contact_email))=eid OR provider_lead_id=p_row->>'provider_lead_id');
  IF matches>1 THEN RAISE EXCEPTION 'lead_mapping_identifier_conflict'; END IF;
  SELECT * INTO r FROM public.outbound_provider_lead_mappings
    WHERE provider_type='smartlead' AND provider_campaign_id=p_row->>'provider_campaign_id'
    AND (lower(btrim(contact_email))=eid OR provider_lead_id=p_row->>'provider_lead_id') FOR UPDATE;
  IF FOUND THEN
    IF r.liftor_contact_id<>(p_row->>'liftor_contact_id')::uuid OR r.business_id<>(p_row->>'business_id')::uuid
      OR r.liftor_campaign_id<>(p_row->>'liftor_campaign_id')::uuid THEN
      RAISE EXCEPTION 'lead_mapping_ownership_conflict';
    END IF;
    UPDATE public.outbound_provider_lead_mappings SET
      provider_lead_id=coalesce(p_row->>'provider_lead_id',r.provider_lead_id),
      metadata=r.metadata || (p_row->'metadata'), provider_response=p_row->'provider_response',
      push_status=CASE WHEN r.push_status IN ('pushing','pushed') THEN 'pushed' ELSE 'imported_from_provider' END
      WHERE id=r.id;
  ELSE
    INSERT INTO public.outbound_provider_lead_mappings(business_id,liftor_contact_id,liftor_campaign_id,
      campaign_mapping_id,provider_type,provider_campaign_id,provider_lead_id,contact_email,push_status,metadata,provider_response)
    VALUES((p_row->>'business_id')::uuid,(p_row->>'liftor_contact_id')::uuid,(p_row->>'liftor_campaign_id')::uuid,
      (p_row->>'campaign_mapping_id')::uuid,'smartlead',p_row->>'provider_campaign_id',p_row->>'provider_lead_id',eid,
      'imported_from_provider',p_row->'metadata',p_row->'provider_response') RETURNING * INTO r;
  END IF;
  RETURN jsonb_build_object('id',r.id);
END $$;

-- Stable eligibility query used by both preview and durable claims.
CREATE FUNCTION public.smartlead_transfer_candidates(p_mapping uuid, p_ids uuid[] DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS SETOF public.contacts LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT c.* FROM public.contacts c
  JOIN public.outbound_provider_campaign_mappings m ON m.id=p_mapping
  JOIN public.businesses b ON b.id=m.business_id
  JOIN public.outreach_campaigns oc ON oc.id=m.liftor_campaign_id AND oc.business_name=b.name
  WHERE m.provider_type='smartlead' AND m.is_active AND m.mapping_status='mapped'
    AND m.provider_campaign_id IS NOT NULL
    AND (p_ids IS NULL OR c.id=ANY(p_ids))
    AND c.active_campaign_id=m.liftor_campaign_id
    AND c.assigned_business IN (b.id::text,b.name)
    AND c.email IS NOT NULL AND position('@' in c.email)>1
    AND c.sendable_status::text='sendable' AND c.compliance_status='outreach_allowed'
    AND nullif(btrim(c.lawful_basis),'') IS NOT NULL AND nullif(btrim(c.unsubscribe_token),'') IS NOT NULL
    AND lower(c.email_verified_status) IN ('verified','valid','deliverable')
    AND NOT c.is_globally_suppressed AND NOT c.hard_bounced AND NOT c.is_internal
    AND c.unsubscribed_at IS NULL AND c.archived_at IS NULL AND c.do_not_contact_at IS NULL
    AND c.founder_review_requested_at IS NULL AND c.last_replied_at IS NULL AND NOT c.conversation_active
    AND NOT EXISTS (SELECT 1 FROM public.business_contact_relationships r WHERE r.contact_id=c.id
      AND (r.business_id=b.id OR r.business_name=b.name) AND (r.do_not_contact OR NOT r.campaign_eligible))
    AND NOT EXISTS (SELECT 1 FROM public.email_queue q WHERE q.contact_id=c.id
      AND q.status::text IN ('pending','sending','sent','delayed','throttled','review_required'))
    AND NOT EXISTS (SELECT 1 FROM public.outbound_provider_lead_mappings lm WHERE lm.provider_type='smartlead'
      AND lm.provider_campaign_id=m.provider_campaign_id AND lower(btrim(lm.contact_email))=lower(btrim(c.email)))
  ORDER BY c.id LIMIT least(greatest(p_limit,1),50);
$$;

CREATE FUNCTION public.smartlead_claim_transfer(p_mapping uuid, p_ids uuid[], p_operation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE m public.outbound_provider_campaign_mappings%ROWTYPE; c public.contacts%ROWTYPE; result jsonb := '[]'; rid uuid;
BEGIN
  IF cardinality(p_ids) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'select_1_to_50_contacts'; END IF;
  SELECT * INTO STRICT m FROM public.outbound_provider_campaign_mappings WHERE id=p_mapping FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM public.external_action_gates WHERE gate_key='smartlead_lead_push_gate' AND enabled)
    OR NOT EXISTS (SELECT 1 FROM public.business_operating_profiles WHERE business_id=m.business_id AND external_provider_mutation_allowed) THEN
    RAISE EXCEPTION 'external_transfer_gate_disabled';
  END IF;
  FOR c IN SELECT * FROM public.smartlead_transfer_candidates(p_mapping,p_ids,50) LOOP
    INSERT INTO public.outbound_provider_lead_mappings(business_id,liftor_contact_id,liftor_campaign_id,
      campaign_mapping_id,provider_type,provider_campaign_id,contact_email,push_status,metadata)
    VALUES(m.business_id,c.id,m.liftor_campaign_id,m.id,'smartlead',m.provider_campaign_id,
      lower(btrim(c.email)),'pushing',jsonb_build_object('operation_id',p_operation,'direction','export_to_provider'))
    ON CONFLICT DO NOTHING RETURNING id INTO rid;
    IF rid IS NOT NULL THEN result := result || jsonb_build_array(jsonb_build_object('mapping_id',rid,'contact',to_jsonb(c))); END IF;
  END LOOP;
  RETURN result;
END $$;

-- Applies one persisted event atomically. Only the modern business-scoped
-- communications tables are written: the legacy communications INSERT trigger
-- invokes the AI email engine and must never be invoked by this import.
CREATE FUNCTION public.smartlead_apply_provider_event(p_event uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE e public.outbound_provider_events%ROWTYPE; m public.outbound_provider_campaign_mappings%ROWTYPE;
  lm public.outbound_provider_lead_mappings%ROWTYPE; c public.contacts%ROWTYPE;
  matches integer; n jsonb; et text; happened timestamptz; cid uuid; tid uuid; bname text;
BEGIN
  SELECT * INTO STRICT e FROM public.outbound_provider_events WHERE id=p_event AND provider_type='smartlead' FOR UPDATE;
  IF e.operational_mutation_applied THEN RETURN jsonb_build_object('applied',false,'duplicate',true); END IF;
  n:=e.normalized_payload; et:=n->>'event_type';
  IF et NOT IN ('email_sent','reply_received','email_bounced','lead_unsubscribed') THEN
    UPDATE public.outbound_provider_events SET processing_status='ignored' WHERE id=e.id;
    RETURN jsonb_build_object('applied',false,'reason','event_logged_only');
  END IF;
  SELECT count(*) INTO matches FROM public.outbound_provider_campaign_mappings
    WHERE provider_type='smartlead' AND provider_campaign_id=e.provider_campaign_id AND is_active AND mapping_status='mapped';
  IF matches<>1 THEN RAISE EXCEPTION 'event_campaign_mapping_missing_or_ambiguous'; END IF;
  SELECT * INTO STRICT m FROM public.outbound_provider_campaign_mappings
    WHERE provider_type='smartlead' AND provider_campaign_id=e.provider_campaign_id AND is_active AND mapping_status='mapped';
  SELECT name INTO STRICT bname FROM public.businesses WHERE id=m.business_id;
  SELECT count(*) INTO matches FROM public.outbound_provider_lead_mappings
    WHERE provider_type='smartlead' AND provider_campaign_id=e.provider_campaign_id AND business_id=m.business_id
      AND (provider_lead_id=e.provider_lead_id OR lower(btrim(contact_email))=n->>'email');
  IF matches<>1 THEN RAISE EXCEPTION 'event_contact_mapping_missing_or_ambiguous'; END IF;
  SELECT * INTO STRICT lm FROM public.outbound_provider_lead_mappings
    WHERE provider_type='smartlead' AND provider_campaign_id=e.provider_campaign_id AND business_id=m.business_id
      AND (provider_lead_id=e.provider_lead_id OR lower(btrim(contact_email))=n->>'email') FOR UPDATE;
  IF lm.campaign_mapping_id IS DISTINCT FROM m.id OR lm.liftor_campaign_id IS DISTINCT FROM m.liftor_campaign_id
    OR (n->>'email' IS NOT NULL AND lower(btrim(lm.contact_email))<>n->>'email')
    OR (e.provider_lead_id IS NOT NULL AND lm.provider_lead_id IS NOT NULL AND lm.provider_lead_id<>e.provider_lead_id) THEN
    RAISE EXCEPTION 'event_identifier_conflict';
  END IF;
  SELECT * INTO STRICT c FROM public.contacts WHERE id=lm.liftor_contact_id FOR UPDATE;
  IF n->>'email' IS NOT NULL AND lower(btrim(c.email))<>n->>'email' THEN RAISE EXCEPTION 'event_contact_email_changed'; END IF;
  happened:=coalesce((n->>'event_timestamp')::timestamptz,e.received_at);
  IF et IN ('email_sent','reply_received') THEN
    IF nullif(n->>'body_text','') IS NULL THEN RAISE EXCEPTION 'event_message_body_missing'; END IF;
    INSERT INTO public.communication_records(business_id,contact_id,channel,direction,communication_status,
      subject,summary,content_reference,external_provider,provider_message_id,sent_at,received_at,audit_metadata)
    VALUES(m.business_id,c.id,'email',CASE WHEN et='reply_received' THEN 'inbound' ELSE 'outbound' END,
      CASE WHEN et='reply_received' THEN 'received' ELSE 'sent' END,n->>'subject',n->>'body_text',
      'outbound_provider_events:'||e.id::text,'smartlead',n->>'provider_message_id',
      CASE WHEN et='email_sent' THEN happened END,CASE WHEN et='reply_received' THEN happened END,
      jsonb_build_object('provider_event_id',e.id,'campaign_mapping_id',m.id,'ai_reply_requested',false)) RETURNING id INTO cid;
    SELECT thread_id INTO tid FROM public.smartlead_contact_threads WHERE business_id=m.business_id AND contact_id=c.id;
    IF tid IS NULL THEN
      INSERT INTO public.communication_threads(business_id,thread_title,last_message_at)
      VALUES(m.business_id,coalesce(nullif(c.name,''),c.email)||' — Smartlead',happened) RETURNING id INTO tid;
      INSERT INTO public.smartlead_contact_threads(business_id,contact_id,thread_id) VALUES(m.business_id,c.id,tid);
    END IF;
    INSERT INTO public.communication_thread_messages(thread_id,communication_record_id,message_order)
      SELECT tid,cid,coalesce(max(message_order),0)+1 FROM public.communication_thread_messages WHERE thread_id=tid;
    UPDATE public.communication_threads SET last_message_at=greatest(last_message_at,happened) WHERE id=tid;
  END IF;
  IF et='reply_received' THEN
    UPDATE public.contacts SET last_replied_at=greatest(last_replied_at,happened),conversation_active=true,
      status=CASE WHEN status::text IN ('NEW','CONTACTED') THEN 'ENGAGED'::public.contact_status ELSE status END WHERE id=c.id;
    UPDATE public.email_queue SET status='cancelled',block_reason='Smartlead reply received'
      WHERE contact_id=c.id AND campaign_id=m.liftor_campaign_id AND status::text IN ('pending','delayed','throttled');
  ELSIF et='email_sent' THEN
    UPDATE public.contacts SET last_contacted_at=greatest(last_contacted_at,happened),
      status=CASE WHEN status::text='NEW' THEN 'CONTACTED'::public.contact_status ELSE status END WHERE id=c.id;
  ELSE
    UPDATE public.contacts SET sendable_status='suppressed',is_globally_suppressed=true,
      global_suppression_at=coalesce(global_suppression_at,happened),
      global_suppression_reason=coalesce(global_suppression_reason,'smartlead_'||et),
      hard_bounced=hard_bounced OR et='email_bounced',
      unsubscribed_at=CASE WHEN et='lead_unsubscribed' THEN coalesce(unsubscribed_at,happened) ELSE unsubscribed_at END,
      unsubscribe_source=CASE WHEN et='lead_unsubscribed' THEN coalesce(unsubscribe_source,'smartlead') ELSE unsubscribe_source END
      WHERE id=c.id;
    UPDATE public.business_contact_relationships SET do_not_contact=true,campaign_eligible=false,
      current_stage='do_not_contact',do_not_contact_reason='smartlead_'||et WHERE contact_id=c.id;
    UPDATE public.email_queue SET status='cancelled',block_reason='Smartlead suppression'
      WHERE contact_id=c.id AND status::text IN ('pending','delayed','throttled');
  END IF;
  UPDATE public.outbound_provider_events SET contact_id=c.id,processing_status='mapped',
    operational_mutation_applied=true,error=NULL WHERE id=e.id;
  RETURN jsonb_build_object('applied',true,'contact_id',c.id,'business_id',m.business_id,
    'communication_record_id',cid,'thread_id',tid);
END $$;

-- RPCs run only behind Edge authentication. No new privileged definer functions.
REVOKE ALL ON FUNCTION public.smartlead_find_contacts_by_emails(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.smartlead_find_lead_mappings(text,text[],text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.smartlead_merge_contact(uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.smartlead_merge_relationship(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.smartlead_merge_lead_mapping(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.smartlead_transfer_candidates(uuid,uuid[],integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.smartlead_claim_transfer(uuid,uuid[],uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.smartlead_apply_provider_event(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.smartlead_find_contacts_by_emails(text[]),
  public.smartlead_find_lead_mappings(text,text[],text[]),public.smartlead_merge_contact(uuid,jsonb),
  public.smartlead_merge_relationship(jsonb),public.smartlead_merge_lead_mapping(jsonb),
  public.smartlead_transfer_candidates(uuid,uuid[],integer),public.smartlead_claim_transfer(uuid,uuid[],uuid),
  public.smartlead_apply_provider_event(uuid) TO service_role;
