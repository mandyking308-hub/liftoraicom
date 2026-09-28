-- Worker 3B: authenticated inbound social multi-turn processing.
-- Additive only. Existing social/provider/CRM rows are preserved.

ALTER TABLE public.social_provider_connections
  ADD COLUMN IF NOT EXISTS inbound_receiver_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_secret_ref text;

DO $$ BEGIN
  ALTER TABLE public.social_provider_connections
    ADD CONSTRAINT social_provider_connections_webhook_ref_namespaced
    CHECK (webhook_secret_ref IS NULL OR webhook_secret_ref =
      'LIFTOR_SOCIAL_INBOUND_' || upper(replace(id::text, '-', '')) || '_WEBHOOK_SECRET');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.social_provider_connections
    ADD CONSTRAINT social_provider_connections_receiver_requires_secret
    CHECK (NOT inbound_receiver_enabled OR webhook_secret_ref IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_id_business_scope_key
  ON public.social_accounts (id, business_id);
CREATE UNIQUE INDEX IF NOT EXISTS social_provider_connections_id_business_scope_key
  ON public.social_provider_connections (id, business_id);

ALTER TABLE public.social_engagement_events
  ADD COLUMN IF NOT EXISTS social_account_id uuid,
  ADD COLUMN IF NOT EXISTS provider_connection_id uuid,
  ADD COLUMN IF NOT EXISTS business_contact_relationship_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

DO $$ BEGIN
  ALTER TABLE public.social_engagement_events
    ADD CONSTRAINT social_engagement_events_social_account_scope_fkey
    FOREIGN KEY (social_account_id, business_id)
    REFERENCES public.social_accounts(id, business_id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.social_engagement_events
    ADD CONSTRAINT social_engagement_events_provider_connection_scope_fkey
    FOREIGN KEY (provider_connection_id, business_id)
    REFERENCES public.social_provider_connections(id, business_id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.social_engagement_events
    ADD CONSTRAINT social_engagement_events_bcr_scope_fkey
    FOREIGN KEY (business_contact_relationship_id, business_id, crm_contact_id)
    REFERENCES public.business_contact_relationships(id, business_id, contact_id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS social_engagement_events_account_idempotency_key
  ON public.social_engagement_events (social_account_id, idempotency_key)
  WHERE social_account_id IS NOT NULL AND idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS social_engagement_events_account_external_event_key
  ON public.social_engagement_events (social_account_id, external_event_id)
  WHERE social_account_id IS NOT NULL AND external_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.social_inbound_contact_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  social_account_id uuid NOT NULL,
  provider_connection_id uuid NOT NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  external_user_id text NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  business_contact_relationship_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_inbound_contact_identities_actor_key
    UNIQUE (business_id, social_account_id, provider, platform, external_user_id),
  CONSTRAINT social_inbound_contact_identities_scope_key
    UNIQUE (id, business_id, contact_id),
  CONSTRAINT social_inbound_contact_identities_account_scope_fkey
    FOREIGN KEY (social_account_id, business_id)
    REFERENCES public.social_accounts(id, business_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_contact_identities_connection_scope_fkey
    FOREIGN KEY (provider_connection_id, business_id)
    REFERENCES public.social_provider_connections(id, business_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_contact_identities_bcr_scope_fkey
    FOREIGN KEY (business_contact_relationship_id, business_id, contact_id)
    REFERENCES public.business_contact_relationships(id, business_id, contact_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_contact_identities_external_user_nonempty
    CHECK (length(btrim(external_user_id)) > 0)
);

CREATE TABLE IF NOT EXISTS public.social_inbound_conversation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  social_account_id uuid NOT NULL,
  provider_connection_id uuid NOT NULL,
  identity_id uuid NOT NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  external_thread_id text NOT NULL,
  external_user_id text NOT NULL,
  contact_id uuid NOT NULL,
  business_contact_relationship_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
  turn_count integer NOT NULL DEFAULT 0 CHECK (turn_count >= 0),
  turn_history jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(turn_history) = 'array'),
  last_intent text,
  last_sentiment text,
  last_risk_level text,
  last_confidence_score integer,
  escalation_pending boolean NOT NULL DEFAULT false,
  escalation_reason text,
  last_event_id uuid REFERENCES public.social_engagement_events(id) ON DELETE SET NULL,
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_inbound_conversation_states_thread_key
    UNIQUE (business_id, social_account_id, provider, platform, external_thread_id, external_user_id),
  CONSTRAINT social_inbound_conversation_states_scope_key
    UNIQUE (id, business_id),
  CONSTRAINT social_inbound_conversation_states_identity_scope_fkey
    FOREIGN KEY (identity_id, business_id, contact_id)
    REFERENCES public.social_inbound_contact_identities(id, business_id, contact_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_conversation_states_account_scope_fkey
    FOREIGN KEY (social_account_id, business_id)
    REFERENCES public.social_accounts(id, business_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_conversation_states_connection_scope_fkey
    FOREIGN KEY (provider_connection_id, business_id)
    REFERENCES public.social_provider_connections(id, business_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_conversation_states_bcr_scope_fkey
    FOREIGN KEY (business_contact_relationship_id, business_id, contact_id)
    REFERENCES public.business_contact_relationships(id, business_id, contact_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_conversation_states_external_thread_nonempty
    CHECK (length(btrim(external_thread_id)) > 0)
);

CREATE TABLE IF NOT EXISTS public.social_inbound_event_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  social_account_id uuid NOT NULL,
  provider_connection_id uuid NOT NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  idempotency_key text NOT NULL,
  external_event_id text NOT NULL,
  conversation_state_id uuid,
  engagement_event_id uuid REFERENCES public.social_engagement_events(id) ON DELETE RESTRICT,
  payload_sha256 text NOT NULL,
  processing_status text NOT NULL DEFAULT 'processing'
    CHECK (processing_status IN ('processing','processed','escalated')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT social_inbound_event_receipts_account_idempotency_key
    UNIQUE (social_account_id, idempotency_key),
  CONSTRAINT social_inbound_event_receipts_account_external_event_key
    UNIQUE (social_account_id, external_event_id),
  CONSTRAINT social_inbound_event_receipts_idempotency_nonempty
    CHECK (length(btrim(idempotency_key)) > 0),
  CONSTRAINT social_inbound_event_receipts_account_scope_fkey
    FOREIGN KEY (social_account_id, business_id)
    REFERENCES public.social_accounts(id, business_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_event_receipts_connection_scope_fkey
    FOREIGN KEY (provider_connection_id, business_id)
    REFERENCES public.social_provider_connections(id, business_id) ON DELETE RESTRICT,
  CONSTRAINT social_inbound_event_receipts_state_scope_fkey
    FOREIGN KEY (conversation_state_id, business_id)
    REFERENCES public.social_inbound_conversation_states(id, business_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS social_inbound_states_contact_idx
  ON public.social_inbound_conversation_states (business_id, contact_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS social_inbound_receipts_state_idx
  ON public.social_inbound_event_receipts (business_id, conversation_state_id, received_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'social_inbound_contact_identities',
    'social_inbound_conversation_states',
    'social_inbound_event_receipts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.process_social_inbound_multiturn_event(
  p_provider_connection_id uuid,
  p_social_account_id uuid,
  p_provider text,
  p_platform text,
  p_idempotency_key text,
  p_external_event_id text,
  p_external_thread_id text,
  p_external_user_id text,
  p_event_type text,
  p_message_text text,
  p_social_handle text,
  p_display_name text,
  p_received_at timestamptz,
  p_expected_turn_count integer,
  p_payload_sha256 text,
  p_analysis jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_business_name text;
  v_connection_provider text;
  v_account_provider text;
  v_account_platform text;
  v_event_receipt_id uuid;
  v_identity public.social_inbound_contact_identities%ROWTYPE;
  v_state public.social_inbound_conversation_states%ROWTYPE;
  v_contact_id uuid;
  v_bcr_id uuid;
  v_conversation_id uuid;
  v_event_id uuid;
  v_classification_id uuid;
  v_draft_id uuid;
  v_escalation_id uuid;
  v_decision text;
  v_intent text;
  v_sentiment text;
  v_risk_level text;
  v_confidence integer;
  v_risk_flags text[];
  v_escalation_reasons text[];
  v_escalation_reason text;
  v_draft_text text;
  v_turn_history jsonb;
  v_turn_count integer;
  v_received_at timestamptz := coalesce(p_received_at, now());
  v_prior_receipt public.social_inbound_event_receipts%ROWTYPE;
  v_contact_email text;
BEGIN
  IF p_provider_connection_id IS NULL OR p_social_account_id IS NULL
     OR nullif(btrim(p_provider), '') IS NULL OR nullif(btrim(p_platform), '') IS NULL
     OR nullif(btrim(p_idempotency_key), '') IS NULL OR nullif(btrim(p_external_event_id), '') IS NULL
     OR nullif(btrim(p_external_thread_id), '') IS NULL OR nullif(btrim(p_external_user_id), '') IS NULL
     OR nullif(btrim(p_message_text), '') IS NULL OR length(p_message_text) > 8000
     OR p_expected_turn_count IS NULL OR p_expected_turn_count < 0
     OR p_analysis IS NULL OR jsonb_typeof(p_analysis) <> 'object'
     OR coalesce(p_analysis->>'decision', '') NOT IN ('draft','escalate')
     OR p_payload_sha256 IS NULL OR p_payload_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'social_inbound_event_invalid';
  END IF;

  SELECT c.business_id, b.name, c.provider, a.provider, a.platform
    INTO v_business_id, v_business_name, v_connection_provider, v_account_provider, v_account_platform
  FROM public.social_provider_connections c
  JOIN public.social_accounts a
    ON a.id = c.connected_account_id AND a.business_id = c.business_id
  JOIN public.businesses b ON b.id = c.business_id
  JOIN public.social_business_profiles profile
    ON profile.business_id = c.business_id AND profile.social_inbox_enabled = true
  WHERE c.id = p_provider_connection_id
    AND a.id = p_social_account_id
    AND c.provider = p_provider
    AND a.provider = p_provider
    AND a.platform = p_platform
    AND c.connection_status = 'connected'
    AND a.connection_status = 'connected'
    AND c.inbound_receiver_enabled = true;

  IF v_business_id IS NULL THEN RAISE EXCEPTION 'social_inbound_scope_not_enabled'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'social-inbound-event-id:' || p_social_account_id::text || ':' || p_external_event_id, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'social-inbound-idempotency:' || p_social_account_id::text || ':' || p_idempotency_key, 0));
  SELECT * INTO v_prior_receipt
  FROM public.social_inbound_event_receipts
  WHERE social_account_id = p_social_account_id
    AND (idempotency_key = p_idempotency_key OR external_event_id = p_external_event_id)
  ORDER BY received_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'duplicate', true,
      'event_id', v_prior_receipt.engagement_event_id,
      'state_id', v_prior_receipt.conversation_state_id,
      'processing_status', v_prior_receipt.processing_status
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'social-inbound-identity:' || v_business_id::text || ':' || p_social_account_id::text || ':' ||
    p_provider || ':' || p_platform || ':' || p_external_user_id, 0));
  SELECT * INTO v_identity
  FROM public.social_inbound_contact_identities
  WHERE business_id = v_business_id
    AND social_account_id = p_social_account_id
    AND provider = p_provider
    AND platform = p_platform
    AND external_user_id = p_external_user_id;

  IF NOT FOUND THEN
    v_contact_id := gen_random_uuid();
    v_contact_email := 'social+' || replace(v_contact_id::text, '-', '') || '@identity.invalid';
    INSERT INTO public.contacts (
      id, email, name, source, assigned_business, status, conversation_active,
      sendable_status, compliance_status, email_verified_status,
      data_source, source_platform, source_record_id, source_collected_at,
      notes, is_internal
    ) VALUES (
      v_contact_id, v_contact_email,
      coalesce(nullif(btrim(p_display_name), ''), nullif(p_social_handle, ''), 'Social contact'),
      'social_inbound', v_business_name, 'ENGAGED', true,
      'no_email', 'retained_no_outreach', 'unknown',
      'authenticated_social_provider', p_platform, p_external_user_id, v_received_at,
      'Social identity only. Placeholder address uses the reserved .invalid domain; email is not used for identity or outreach.',
      false
    );

    INSERT INTO public.business_contact_relationships (
      contact_id, business_id, business_name, qualification, qualification_reason,
      campaign_eligible, do_not_contact, current_stage, notes
    ) VALUES (
      v_contact_id, v_business_id, v_business_name, 'needs_review',
      'Authenticated inbound social identity; no email identity resolution.',
      false, false, 'engaged', 'Social engagement only; not eligible for outbound email.'
    ) RETURNING id INTO v_bcr_id;

    INSERT INTO public.social_inbound_contact_identities (
      business_id, social_account_id, provider_connection_id, provider, platform,
      external_user_id, contact_id, business_contact_relationship_id
    ) VALUES (
      v_business_id, p_social_account_id, p_provider_connection_id, p_provider, p_platform,
      p_external_user_id, v_contact_id, v_bcr_id
    ) RETURNING * INTO v_identity;
  ELSE
    v_contact_id := v_identity.contact_id;
    v_bcr_id := v_identity.business_contact_relationship_id;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'social-inbound-thread:' || v_business_id::text || ':' || p_social_account_id::text || ':' ||
    p_provider || ':' || p_platform || ':' || p_external_thread_id || ':' || p_external_user_id, 0));
  SELECT * INTO v_state
  FROM public.social_inbound_conversation_states
  WHERE business_id = v_business_id
    AND social_account_id = p_social_account_id
    AND provider = p_provider
    AND platform = p_platform
    AND external_thread_id = p_external_thread_id
    AND external_user_id = p_external_user_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_state.turn_count <> p_expected_turn_count THEN RAISE EXCEPTION 'social_inbound_state_version_conflict'; END IF;
    v_conversation_id := v_state.conversation_id;
    v_turn_history := v_state.turn_history;
    v_turn_count := v_state.turn_count + 1;
  ELSE
    IF p_expected_turn_count <> 0 THEN RAISE EXCEPTION 'social_inbound_state_version_conflict'; END IF;
    SELECT id, business_name INTO v_conversation_id, v_business_name
    FROM public.conversations WHERE contact_id = v_contact_id;
    IF v_conversation_id IS NOT NULL AND v_business_name <> (
      SELECT name FROM public.businesses WHERE id = v_business_id
    ) THEN RAISE EXCEPTION 'social_inbound_conversation_business_mismatch'; END IF;
    IF v_conversation_id IS NULL THEN
      INSERT INTO public.conversations (contact_id, business_name, status, last_message_at)
      VALUES (v_contact_id, (SELECT name FROM public.businesses WHERE id = v_business_id), 'OPEN', v_received_at)
      RETURNING id INTO v_conversation_id;
    END IF;
    v_turn_history := '[]'::jsonb;
    v_turn_count := 1;
  END IF;

  v_decision := p_analysis->>'decision';
  v_intent := coalesce(nullif(p_analysis->>'intent', ''), 'general_question');
  v_sentiment := coalesce(nullif(p_analysis->>'sentiment', ''), 'unknown');
  v_risk_level := coalesce(nullif(p_analysis->>'risk_level', ''), 'medium');
  IF v_sentiment NOT IN ('positive','neutral','negative','mixed','unknown')
     OR v_risk_level NOT IN ('low','medium','high','critical') THEN
    RAISE EXCEPTION 'social_inbound_analysis_invalid';
  END IF;
  v_confidence := greatest(0, least(100, coalesce((p_analysis->>'confidence_score')::integer, 0)));
  SELECT coalesce(array_agg(risk_item.value), '{}') INTO v_risk_flags
    FROM jsonb_array_elements_text(coalesce(p_analysis->'risk_flags', '[]'::jsonb)) AS risk_item(value);
  SELECT coalesce(array_agg(reason_item.value), '{}') INTO v_escalation_reasons
    FROM jsonb_array_elements_text(coalesce(p_analysis->'escalation_reasons', '[]'::jsonb)) AS reason_item(value);
  v_escalation_reason := coalesce(nullif(p_analysis->>'escalation_reason', ''), v_escalation_reasons[1]);
  v_draft_text := nullif(btrim(p_analysis->>'draft_text'), '');
  IF v_decision = 'draft' AND (v_draft_text IS NULL OR v_confidence < 60 OR cardinality(v_escalation_reasons) > 0) THEN
    RAISE EXCEPTION 'social_inbound_unsafe_draft_blocked';
  END IF;
  IF v_decision = 'escalate' AND coalesce(cardinality(v_escalation_reasons), 0) = 0 THEN
    RAISE EXCEPTION 'social_inbound_escalation_reason_required';
  END IF;

  INSERT INTO public.social_inbound_event_receipts (
    business_id, social_account_id, provider_connection_id, provider, platform,
    idempotency_key, external_event_id, payload_sha256, processing_status
  ) VALUES (
    v_business_id, p_social_account_id, p_provider_connection_id, p_provider, p_platform,
    p_idempotency_key, p_external_event_id, p_payload_sha256, 'processing'
  ) RETURNING id INTO v_event_receipt_id;

  INSERT INTO public.social_engagement_events (
    business_id, platform_key, platform, provider, event_type, external_event_id,
    external_thread_id, external_user_id, social_handle, display_name, message_text,
    source_type, event_status, crm_contact_id, business_contact_relationship_id,
    conversation_id, social_account_id, provider_connection_id, idempotency_key,
    received_at, intent, urgency, risk_level, metadata
  ) VALUES (
    v_business_id, p_platform, p_platform, p_provider, p_event_type, p_external_event_id,
    p_external_thread_id, p_external_user_id, nullif(p_social_handle, ''), nullif(p_display_name, ''), p_message_text,
    'provider_webhook', CASE WHEN v_decision = 'escalate' THEN 'escalated' ELSE 'draft_reply_ready' END,
    v_contact_id, v_bcr_id, v_conversation_id, p_social_account_id, p_provider_connection_id, p_idempotency_key,
    v_received_at, v_intent, 'normal', v_risk_level,
    jsonb_build_object('multi_turn_receiver', true, 'payload_sha256', p_payload_sha256, 'turn_number', v_turn_count)
  ) RETURNING id INTO v_event_id;

  INSERT INTO public.social_engagement_classifications (
    business_id, engagement_event_id, classification_status, detected_intent,
    detected_sentiment, detected_risk_flags, recommended_agent, recommended_next_action,
    confidence_score, founder_review_required, compliance_review_required,
    support_review_required, customer_success_review_required, metadata
  ) VALUES (
    v_business_id, v_event_id, v_decision, v_intent, v_sentiment, v_risk_flags,
    coalesce(nullif(p_analysis->>'recommended_agent', ''), 'human_review'),
    coalesce(nullif(p_analysis->>'recommended_next_action', ''), 'Founder review required.'),
    v_confidence, true, v_decision = 'escalate', v_intent = 'customer_support',
    v_intent = 'testimonial' OR v_intent = 'referral',
    jsonb_build_object('risk_level', v_risk_level, 'escalation_reasons', to_jsonb(v_escalation_reasons))
  ) RETURNING id INTO v_classification_id;

  IF v_decision = 'escalate' THEN
    INSERT INTO public.social_engagement_escalations (
      business_id, engagement_event_id, escalation_type, priority, reason,
      recommended_action, founder_review_required, metadata
    ) VALUES (
      v_business_id, v_event_id, coalesce(v_escalation_reason, 'human_review'),
      CASE WHEN v_risk_level = 'critical' THEN 'urgent' WHEN v_risk_level = 'high' THEN 'high' ELSE 'normal' END,
      array_to_string(v_escalation_reasons, ', '),
      coalesce(nullif(p_analysis->>'recommended_next_action', ''), 'Human review required before reply.'),
      true, jsonb_build_object('risk_level', v_risk_level, 'confidence_score', v_confidence)
    ) RETURNING id INTO v_escalation_id;
  ELSE
    INSERT INTO public.social_engagement_reply_drafts (
      business_id, engagement_event_id, classification_id, draft_type, platform,
      reply_channel, draft_text, suggested_tone, risk_flags, compliance_warnings,
      founder_review_required, external_send_allowed, metadata
    ) VALUES (
      v_business_id, v_event_id, v_classification_id, 'ai_response_draft', p_platform,
      'dm', v_draft_text, 'safe, non-committal, context-aware', v_risk_flags,
      '{}', true, false,
      jsonb_build_object(
        'multi_turn_receiver', true,
        'turn_number', v_turn_count,
        'context_turn_count', coalesce(v_state.turn_count, 0),
        'draft_source', coalesce(p_analysis->>'draft_source', 'safe_fallback'),
        'ai_trace_id', p_analysis->>'ai_trace_id'
      )
    ) RETURNING id INTO v_draft_id;
    v_turn_history := v_turn_history || jsonb_build_array(jsonb_build_object(
      'role', 'inbound', 'event_id', v_event_id, 'idempotency_key', p_idempotency_key,
      'content', p_message_text, 'intent', v_intent, 'sentiment', v_sentiment,
      'risk_level', v_risk_level, 'confidence_score', v_confidence, 'created_at', v_received_at
    )) || jsonb_build_array(jsonb_build_object(
      'role', 'assistant_draft', 'event_id', v_event_id, 'draft_id', v_draft_id,
      'content', v_draft_text, 'intent', v_intent, 'sent', false, 'created_at', v_received_at
    ));
  END IF;

  IF v_decision = 'escalate' THEN
    v_turn_history := v_turn_history || jsonb_build_array(jsonb_build_object(
      'role', 'inbound', 'event_id', v_event_id, 'idempotency_key', p_idempotency_key,
      'content', p_message_text, 'intent', v_intent, 'sentiment', v_sentiment,
      'risk_level', v_risk_level, 'confidence_score', v_confidence, 'created_at', v_received_at
    ));
  END IF;
  IF jsonb_array_length(v_turn_history) > 60 THEN
    SELECT coalesce(jsonb_agg(value ORDER BY ord), '[]'::jsonb) INTO v_turn_history
    FROM jsonb_array_elements(v_turn_history) WITH ORDINALITY AS t(value, ord)
    WHERE ord > jsonb_array_length(v_turn_history) - 60;
  END IF;

  IF v_state.id IS NULL THEN
    INSERT INTO public.social_inbound_conversation_states (
      business_id, social_account_id, provider_connection_id, identity_id,
      provider, platform, external_thread_id, external_user_id, contact_id,
      business_contact_relationship_id, conversation_id, turn_count, turn_history,
      last_intent, last_sentiment, last_risk_level, last_confidence_score,
      escalation_pending, escalation_reason, last_event_id, last_event_at
    ) VALUES (
      v_business_id, p_social_account_id, p_provider_connection_id, v_identity.id,
      p_provider, p_platform, p_external_thread_id, p_external_user_id, v_contact_id,
      v_bcr_id, v_conversation_id, v_turn_count, v_turn_history, v_intent, v_sentiment,
      v_risk_level, v_confidence, v_decision = 'escalate', v_escalation_reason,
      v_event_id, v_received_at
    ) RETURNING * INTO v_state;
  ELSE
    UPDATE public.social_inbound_conversation_states
    SET provider_connection_id = p_provider_connection_id,
        turn_count = v_turn_count,
        turn_history = v_turn_history,
        last_intent = v_intent,
        last_sentiment = v_sentiment,
        last_risk_level = v_risk_level,
        last_confidence_score = v_confidence,
        escalation_pending = escalation_pending OR v_decision = 'escalate',
        escalation_reason = CASE WHEN v_decision = 'escalate' THEN v_escalation_reason ELSE escalation_reason END,
        last_event_id = v_event_id,
        last_event_at = v_received_at,
        updated_at = now()
    WHERE id = v_state.id AND business_id = v_business_id
    RETURNING * INTO v_state;
  END IF;

  UPDATE public.conversations
  SET last_message_at = v_received_at,
      last_intent = v_intent,
      intent_history = coalesce(intent_history, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object('intent', v_intent, 'at', v_received_at, 'social_event_id', v_event_id)
      ),
      ai_last_used_at = now(),
      escalation_pending = escalation_pending OR v_decision = 'escalate',
      escalation_reason = CASE WHEN v_decision = 'escalate' THEN v_escalation_reason ELSE escalation_reason END,
      updated_at = now()
  WHERE id = v_conversation_id AND contact_id = v_contact_id;

  UPDATE public.social_inbound_event_receipts
  SET conversation_state_id = v_state.id,
      engagement_event_id = v_event_id,
      processing_status = CASE WHEN v_decision = 'escalate' THEN 'escalated' ELSE 'processed' END,
      processed_at = now()
  WHERE id = v_event_receipt_id AND business_id = v_business_id;

  INSERT INTO public.social_engagement_audit (
    business_id, engagement_event_id, action, action_status, result_json,
    provider_calls, dms_sent, comments_sent, external_actions, crm_records_created,
    metadata
  ) VALUES (
    v_business_id, v_event_id, 'inbound_multiturn_processed', v_decision,
    jsonb_build_object('state_id', v_state.id, 'contact_id', v_contact_id, 'bcr_id', v_bcr_id,
      'conversation_id', v_conversation_id, 'turn_count', v_turn_count,
      'draft_id', v_draft_id, 'escalation_id', v_escalation_id),
    0, 0, 0, 0, 0,
    jsonb_build_object('signature_verified', true, 'idempotent', true, 'all_send_gates_off', true)
  );

  RETURN jsonb_build_object(
    'ok', true, 'duplicate', false, 'decision', v_decision,
    'event_id', v_event_id, 'state_id', v_state.id, 'contact_id', v_contact_id,
    'business_contact_relationship_id', v_bcr_id, 'conversation_id', v_conversation_id,
    'turn_count', v_turn_count, 'draft_id', v_draft_id, 'escalation_id', v_escalation_id,
    'external_send_allowed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_social_inbound_multiturn_event(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text,
  timestamptz, integer, text, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_social_inbound_multiturn_event(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text,
  timestamptz, integer, text, jsonb
) TO service_role;

COMMENT ON FUNCTION public.process_social_inbound_multiturn_event(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text,
  timestamptz, integer, text, jsonb
) IS 'Atomically records an authenticated, business-scoped social inbound turn and creates either an escalation or an unsent internal response draft.';
