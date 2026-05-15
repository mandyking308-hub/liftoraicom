
CREATE OR REPLACE FUNCTION public.get_crm_contact_timeline(
  p_contact_id uuid,
  p_business_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  timeline_id text,
  source_table text,
  source_id text,
  occurred_at timestamptz,
  source_system text,
  source_channel text,
  interaction_type text,
  direction text,
  subject text,
  summary text,
  status text,
  business_id uuid,
  contact_id uuid,
  conversation_id uuid,
  proposal_id uuid,
  demo_access_id uuid,
  deal_id uuid,
  invoice_id uuid,
  payment_id uuid,
  compliance_status text,
  founder_review_required boolean,
  ai_relevant boolean,
  risk_flags jsonb,
  next_step text,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH bcrs AS (
    SELECT bcr.business_name
    FROM public.business_contact_relationships bcr
    WHERE bcr.contact_id = p_contact_id
      AND (p_business_id IS NULL OR bcr.business_id = p_business_id)
  ),
  business_names AS (SELECT DISTINCT business_name FROM bcrs WHERE business_name IS NOT NULL),
  unioned AS (
    SELECT
      ('cil:'||l.id::text) AS timeline_id, 'crm_interaction_ledger'::text AS source_table,
      l.id::text AS source_id, l.occurred_at,
      l.source_system, l.source_channel, l.interaction_type, l.direction,
      l.subject, l.summary, l.matched_status AS status,
      l.business_id, l.contact_id, l.conversation_id,
      l.internal_proposal_id, l.demo_access_id, l.deal_id, l.invoice_id, l.payment_id,
      NULL::text, l.founder_review_required, l.ai_relevant,
      '[]'::jsonb, NULL::text,
      jsonb_build_object('provider_type', l.provider_type, 'provider_message_id', l.provider_message_id)
    FROM public.crm_interaction_ledger l
    WHERE l.contact_id = p_contact_id
       OR (p_business_id IS NOT NULL AND l.business_id = p_business_id)

    UNION ALL
    SELECT ('comm:'||c.id::text), 'communications', c.id::text, c."timestamp",
      'native','communication',
      CASE WHEN c.direction='inbound'::communication_direction THEN 'native_email_reply_received'
           WHEN c.ai_generated THEN 'ai_reply_sent' ELSE 'native_email_sent' END,
      c.direction::text, LEFT(c.message,120), LEFT(c.message,400), NULL,
      NULL::uuid, c.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, c.ai_generated, '[]'::jsonb, NULL::text,
      jsonb_build_object('inbox_id', c.inbox_id, 'channel', c.channel)
    FROM public.communications c WHERE c.contact_id = p_contact_id

    UNION ALL
    SELECT ('ee:'||e.id::text), 'email_events', e.id::text, e."timestamp",
      'native','email_event','native_email_'||e.event_type::text, NULL::text,
      NULL::text, NULL::text, e.event_type::text,
      NULL::uuid, e.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('email_id', e.email_id)
    FROM public.email_events e WHERE e.contact_id = p_contact_id

    UNION ALL
    SELECT ('ope:'||ope.id::text), 'outbound_provider_events', ope.id::text, ope.received_at,
      ope.provider_type,'provider_event',
      ope.provider_type||'_'||lower(ope.provider_event_type), NULL::text,
      NULL::text, NULL::text, ope.processing_status,
      NULL::uuid, ope.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, true, '[]'::jsonb, NULL::text,
      jsonb_build_object('provider_event_id', ope.provider_event_id, 'provider_campaign_id', ope.provider_campaign_id, 'provider_lead_id', ope.provider_lead_id)
    FROM public.outbound_provider_events ope
    WHERE ope.contact_id = p_contact_id
       OR EXISTS (SELECT 1 FROM public.outbound_provider_lead_mappings m
                   WHERE m.liftor_contact_id = p_contact_id
                     AND m.provider_type = ope.provider_type
                     AND m.provider_campaign_id = ope.provider_campaign_id)

    UNION ALL
    SELECT ('aia:'||a.id::text), 'ai_actions', a.id::text, a.created_at,
      'liftor_ai','ai_action',
      CASE WHEN a.status::text='success' THEN 'ai_action_recorded' ELSE 'ai_action_'||a.status::text END,
      'internal', LEFT(a.classification,120), LEFT(a.reply_preview,400), a.status::text,
      NULL::uuid, a.contact_id, a.conversation_id,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, (a.ai_quality_flag::text <> 'pass'), true,
      CASE WHEN a.ai_quality_flag::text <> 'pass' THEN jsonb_build_array(a.ai_quality_flag::text) ELSE '[]'::jsonb END,
      NULL::text,
      jsonb_build_object('action_type', a.action_type, 'tokens_used', a.tokens_used)
    FROM public.ai_actions a WHERE a.contact_id = p_contact_id

    UNION ALL
    SELECT ('aid:'||d.id::text), 'ai_drafts', d.id::text, d.created_at,
      'liftor_ai','ai_draft','ai_reply_draft_created','internal',
      LEFT(d.classification,120), LEFT(d.draft_body,400), d.status::text,
      NULL::uuid, d.contact_id, d.conversation_id,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, (d.status::text='pending'), true, '[]'::jsonb, NULL::text,
      jsonb_build_object('inbox_id', d.inbox_id, 'suggested_tags', d.suggested_tags)
    FROM public.ai_drafts d WHERE d.contact_id = p_contact_id

    UNION ALL
    SELECT ('prop:'||p.id::text), 'internal_proposals', p.id::text, p.created_at,
      'liftor','proposal','proposal_created','outbound',
      p.title, LEFT(p.business_problem,400), NULL,
      NULL::uuid, p.contact_id, NULL::uuid,
      p.id, NULL::uuid, p.deal_id, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('business_name', p.business_name, 'industry', p.industry)
    FROM public.internal_proposals p WHERE p.contact_id = p_contact_id

    UNION ALL
    SELECT ('dma:'||da.id::text), 'demo_access', da.id::text, da.created_at,
      'liftor','demo','demo_access_created','outbound',
      da.business_name, NULL::text, da.status::text,
      NULL::uuid, da.contact_id, NULL::uuid,
      da.proposal_id, da.id, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('high_intent', da.high_intent, 'access_count', da.access_count)
    FROM public.demo_access da WHERE da.contact_id = p_contact_id

    UNION ALL
    SELECT ('dme:'||de.id::text), 'demo_events', de.id::text, de."timestamp",
      'liftor','demo',
      CASE WHEN de.event_type::text='completed' THEN 'demo_completed' ELSE 'demo_'||de.event_type::text END,
      'inbound', NULL::text, NULL::text, NULL::text,
      NULL::uuid, da.contact_id, NULL::uuid,
      da.proposal_id, da.id, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('session_duration_seconds', de.session_duration_seconds)
    FROM public.demo_events de
    JOIN public.demo_access da ON da.id = de.demo_id
    WHERE da.contact_id = p_contact_id

    UNION ALL
    SELECT ('deal:'||d.id::text), 'deals', d.id::text, COALESCE(d.won_at, d.lost_at, d.updated_at),
      'liftor','deal',
      CASE WHEN d.status::text='WON' THEN 'deal_won'
           WHEN d.status::text='LOST' THEN 'deal_lost'
           WHEN d.created_at = d.updated_at THEN 'deal_created'
           ELSE 'deal_stage_changed' END,
      'internal', d.deal_name, d.notes, d.status::text,
      NULL::uuid, d.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, d.id, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('business_name', d.business_name, 'probability', d.probability,
                         'estimated_value_min', d.estimated_value_min, 'estimated_value_max', d.estimated_value_max)
    FROM public.deals d
    WHERE d.contact_id = p_contact_id
       OR d.business_name IN (SELECT business_name FROM business_names)

    UNION ALL
    SELECT ('inv:'||i.id::text), 'invoices', i.id::text, i.created_at,
      'liftor','finance','invoice_created','outbound',
      i.invoice_number, i.notes, i.status::text,
      NULL::uuid, i.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, i.deal_id, i.id, NULL::uuid,
      NULL::text, i.payment_risk_flag, false,
      CASE WHEN i.payment_risk_flag THEN jsonb_build_array('payment_risk') ELSE '[]'::jsonb END,
      NULL::text,
      jsonb_build_object('business_name', i.business_name, 'amount_min', i.amount_min, 'amount_max', i.amount_max, 'currency', i.currency)
    FROM public.invoices i
    WHERE i.contact_id = p_contact_id
       OR i.business_name IN (SELECT business_name FROM business_names)

    UNION ALL
    SELECT ('pay:'||py.id::text), 'payments', py.id::text, py.created_at,
      'liftor','finance','payment_received','inbound',
      py.business_name, py.reference, py.method::text,
      NULL::uuid, i.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, i.deal_id, i.id, py.id,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('amount_received', py.amount_received, 'received_date', py.received_date)
    FROM public.payments py
    JOIN public.invoices i ON i.id = py.invoice_id
    WHERE i.contact_id = p_contact_id
       OR py.business_name IN (SELECT business_name FROM business_names)

    UNION ALL
    SELECT ('ce:'||ce.id::text), 'compliance_events', ce.id::text, ce.created_at,
      'liftor','compliance','compliance_event_created','system',
      ce.flag_type, ce.message, CASE WHEN ce.resolved THEN 'resolved' ELSE 'open' END,
      NULL::uuid,
      CASE WHEN ce.entity_type::text='contact' THEN ce.entity_id ELSE NULL END,
      NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      ce.severity::text,
      (NOT ce.resolved AND ce.severity::text IN ('high','critical')),
      false,
      jsonb_build_array(ce.severity::text, ce.flag_type), NULL::text,
      jsonb_build_object('jurisdiction', ce.jurisdiction, 'business_name', ce.business_name)
    FROM public.compliance_events ce
    WHERE (ce.entity_type::text='contact' AND ce.entity_id = p_contact_id)
       OR (ce.business_name IN (SELECT business_name FROM business_names))

    UNION ALL
    SELECT ('al:'||al.id::text), 'activity_log', al.id::text, al.created_at,
      'liftor','system','system_event_created','system',
      al.event_type, LEFT(al.description,400), NULL,
      NULL::uuid,
      CASE WHEN al.entity_type='contact' THEN al.entity_id ELSE NULL END,
      NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('business_name', al.business_name, 'entity_type', al.entity_type)
    FROM public.activity_log al
    WHERE (al.entity_type='contact' AND al.entity_id = p_contact_id)
       OR (al.business_name IN (SELECT business_name FROM business_names))
  )
  SELECT * FROM unioned
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT GREATEST(p_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.get_crm_contact_timeline(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_crm_contact_timeline(uuid, uuid, integer) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_crm_relationship_timeline(
  p_business_contact_relationship_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact uuid;
  v_business uuid;
  v_rows jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT contact_id, business_id INTO v_contact, v_business
  FROM public.business_contact_relationships
  WHERE id = p_business_contact_relationship_id;

  IF v_contact IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'relationship_not_found', 'rows', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_rows
  FROM public.get_crm_contact_timeline(v_contact, v_business, p_limit) t;

  RETURN jsonb_build_object(
    'ok', true,
    'business_contact_relationship_id', p_business_contact_relationship_id,
    'contact_id', v_contact,
    'business_id', v_business,
    'rows', v_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_crm_relationship_timeline(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_crm_relationship_timeline(uuid, integer) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_crm_contact_360_summary(
  p_contact_id uuid,
  p_business_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact jsonb;
  v_bcr jsonb;
  v_compliance jsonb;
  v_latest jsonb;
  v_comm jsonb;
  v_proposal_count int;
  v_demo_count int;
  v_deal_count int;
  v_invoice_count int;
  v_payment_count int;
  v_open_conversations int;
  v_risk jsonb := '[]'::jsonb;
  v_next text;
  v_score int := 0;
  v_business_names text[];
BEGIN
  IF NOT (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT to_jsonb(c) INTO v_contact FROM public.contacts c WHERE c.id = p_contact_id;
  IF v_contact IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'contact_not_found');
  END IF;

  SELECT array_agg(business_name) INTO v_business_names
  FROM public.business_contact_relationships
  WHERE contact_id = p_contact_id
    AND (p_business_id IS NULL OR business_id = p_business_id);

  SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) INTO v_bcr
  FROM (
    SELECT * FROM public.business_contact_relationships
    WHERE contact_id = p_contact_id
      AND (p_business_id IS NULL OR business_id = p_business_id)
    ORDER BY updated_at DESC
  ) b;

  SELECT jsonb_build_object(
    'open_count', COUNT(*) FILTER (WHERE NOT resolved),
    'high_critical_open', COUNT(*) FILTER (WHERE NOT resolved AND severity::text IN ('high','critical')),
    'last_event_at', MAX(created_at)
  ) INTO v_compliance
  FROM public.compliance_events
  WHERE (entity_type::text='contact' AND entity_id = p_contact_id)
     OR (business_name = ANY(COALESCE(v_business_names,'{}')));

  SELECT to_jsonb(t) INTO v_latest FROM (
    SELECT * FROM public.get_crm_contact_timeline(p_contact_id, p_business_id, 1) LIMIT 1
  ) t;

  SELECT jsonb_build_object(
    'last_inbound_at', MAX(c."timestamp") FILTER (WHERE c.direction='inbound'::communication_direction),
    'last_outbound_at', MAX(c."timestamp") FILTER (WHERE c.direction='outbound'::communication_direction),
    'last_ai_at', MAX(c."timestamp") FILTER (WHERE c.ai_generated)
  ) INTO v_comm
  FROM public.communications c WHERE c.contact_id = p_contact_id;

  SELECT count(*) INTO v_proposal_count FROM public.internal_proposals WHERE contact_id = p_contact_id;
  SELECT count(*) INTO v_demo_count FROM public.demo_access WHERE contact_id = p_contact_id;
  SELECT count(*) INTO v_deal_count FROM public.deals
   WHERE contact_id = p_contact_id OR business_name = ANY(COALESCE(v_business_names,'{}'));
  SELECT count(*) INTO v_invoice_count FROM public.invoices
   WHERE contact_id = p_contact_id OR business_name = ANY(COALESCE(v_business_names,'{}'));
  SELECT count(*) INTO v_payment_count FROM public.payments py
   JOIN public.invoices i ON i.id = py.invoice_id
   WHERE i.contact_id = p_contact_id OR py.business_name = ANY(COALESCE(v_business_names,'{}'));
  SELECT count(*) INTO v_open_conversations FROM public.conversations
   WHERE contact_id = p_contact_id AND status::text='OPEN';

  IF (v_compliance->>'high_critical_open')::int > 0 THEN
    v_risk := v_risk || to_jsonb('compliance_open_high_critical'::text);
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_contact_relationships
              WHERE contact_id = p_contact_id AND do_not_contact = true) THEN
    v_risk := v_risk || to_jsonb('do_not_contact'::text);
  END IF;

  IF (v_compliance->>'high_critical_open')::int > 0 THEN
    v_next := 'Resolve open high/critical compliance events before any outreach';
  ELSIF v_open_conversations > 0 THEN
    v_next := 'Review open conversation and decide on next reply';
  ELSIF v_demo_count > 0 AND v_deal_count = 0 THEN
    v_next := 'Move demo viewer into a deal record';
  ELSIF v_proposal_count > 0 AND v_payment_count = 0 THEN
    v_next := 'Follow up on outstanding proposal / invoice';
  ELSE
    v_next := 'Capture latest interaction into ledger and assess intent';
  END IF;

  v_score := LEAST(100,
    (CASE WHEN v_contact->>'email' <> '' THEN 20 ELSE 0 END)
    + (CASE WHEN v_bcr <> '[]'::jsonb THEN 20 ELSE 0 END)
    + (CASE WHEN v_latest IS NOT NULL THEN 20 ELSE 0 END)
    + (CASE WHEN COALESCE((v_compliance->>'high_critical_open')::int,0) = 0 THEN 20 ELSE 0 END)
    + (CASE WHEN v_open_conversations > 0 OR v_proposal_count > 0 OR v_deal_count > 0 THEN 20 ELSE 0 END)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'contact', v_contact,
    'business_relationships', v_bcr,
    'business_names', COALESCE(to_jsonb(v_business_names), '[]'::jsonb),
    'compliance_state', COALESCE(v_compliance, '{}'::jsonb),
    'latest_interaction', v_latest,
    'latest_inbound', jsonb_build_object('last_inbound_at', v_comm->'last_inbound_at'),
    'latest_outbound', jsonb_build_object('last_outbound_at', v_comm->'last_outbound_at'),
    'latest_ai', jsonb_build_object('last_ai_at', v_comm->'last_ai_at'),
    'proposal_count', v_proposal_count,
    'demo_count', v_demo_count,
    'deal_count', v_deal_count,
    'invoice_count', v_invoice_count,
    'payment_count', v_payment_count,
    'open_conversations', v_open_conversations,
    'risk_flags', v_risk,
    'next_recommended_action', v_next,
    'timeline_readiness_score', v_score,
    'safety', jsonb_build_object('read_only', true, 'no_writes', true, 'no_send', true)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_crm_contact_360_summary(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_crm_contact_360_summary(uuid, uuid) TO authenticated;
