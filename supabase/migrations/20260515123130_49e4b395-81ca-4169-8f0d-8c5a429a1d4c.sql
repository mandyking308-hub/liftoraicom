
CREATE TABLE IF NOT EXISTS public.crm_match_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid REFERENCES public.crm_interaction_ledger(id) ON DELETE CASCADE,
  provider_event_id uuid REFERENCES public.outbound_provider_events(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_contact_relationship_id uuid REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  provider_campaign_id text,
  contact_email text,
  match_method text NOT NULL,
  match_confidence numeric NOT NULL DEFAULT 0,
  match_rank integer DEFAULT 0,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended boolean NOT NULL DEFAULT false,
  apply_status text NOT NULL DEFAULT 'preview',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmc_interaction ON public.crm_match_candidates(interaction_id);
CREATE INDEX IF NOT EXISTS idx_cmc_provider_event ON public.crm_match_candidates(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_cmc_contact ON public.crm_match_candidates(contact_id);
CREATE INDEX IF NOT EXISTS idx_cmc_business ON public.crm_match_candidates(business_id);
CREATE INDEX IF NOT EXISTS idx_cmc_conversation ON public.crm_match_candidates(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cmc_email ON public.crm_match_candidates(contact_email);
CREATE INDEX IF NOT EXISTS idx_cmc_confidence ON public.crm_match_candidates(match_confidence DESC);

ALTER TABLE public.crm_match_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders manage crm match candidates" ON public.crm_match_candidates;
CREATE POLICY "Founders manage crm match candidates"
  ON public.crm_match_candidates
  FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.crm_match_interaction_preview(
  p_interaction_id uuid DEFAULT NULL,
  p_provider_event_id uuid DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL,
  p_provider_campaign_id text DEFAULT NULL,
  p_business_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_contact_email, '')));
  v_provider_type text;
  v_external_event_id text;
  v_provider_msg text := p_provider_message_id;
  v_provider_camp text := p_provider_campaign_id;
  v_business_id uuid := p_business_id;
  v_interaction_type text;
  v_candidates jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_recommended jsonb := NULL;
  v_dedupe_key text := NULL;
  v_should_create_conv boolean := false;
  v_founder_review boolean := false;
  r record;
  v_confidence numeric;
BEGIN
  -- Authorization
  IF NOT (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Hydrate from ledger
  IF p_interaction_id IS NOT NULL THEN
    SELECT lower(trim(coalesce(contact_email, ''))), provider_type, provider_message_id, provider_campaign_id, external_event_id, interaction_type, business_id
    INTO v_email, v_provider_type, v_provider_msg, v_provider_camp, v_external_event_id, v_interaction_type, v_business_id
    FROM public.crm_interaction_ledger WHERE id = p_interaction_id;
  END IF;

  -- Hydrate from provider event
  IF p_provider_event_id IS NOT NULL THEN
    SELECT
      coalesce(v_provider_type, provider_type),
      coalesce(v_external_event_id, external_event_id),
      coalesce(v_provider_camp, provider_campaign_id),
      coalesce(v_provider_msg, provider_message_id),
      coalesce(NULLIF(v_email,''), lower(trim(coalesce(contact_email,''))))
    INTO v_provider_type, v_external_event_id, v_provider_camp, v_provider_msg, v_email
    FROM public.outbound_provider_events WHERE id = p_provider_event_id;
  END IF;

  -- 1. provider lead mapping
  IF v_provider_type IS NOT NULL AND v_provider_camp IS NOT NULL AND v_email <> '' THEN
    FOR r IN
      SELECT liftor_contact_id, business_id, liftor_campaign_id
      FROM public.outbound_provider_lead_mappings
      WHERE provider_type = v_provider_type
        AND provider_campaign_id = v_provider_camp
        AND lower(contact_email) = v_email
      LIMIT 3
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','provider_lead_mapping','confidence',0.98,
        'contact_id',r.liftor_contact_id,'business_id',r.business_id,'campaign_id',r.liftor_campaign_id);
    END LOOP;
  END IF;

  -- 2. provider campaign mapping
  IF v_provider_type IS NOT NULL AND v_provider_camp IS NOT NULL THEN
    FOR r IN
      SELECT liftor_campaign_id, business_id
      FROM public.outbound_provider_campaign_mappings
      WHERE provider_type = v_provider_type
        AND provider_campaign_id = v_provider_camp
      LIMIT 3
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','provider_campaign_mapping','confidence',0.7,
        'campaign_id',r.liftor_campaign_id,'business_id',r.business_id);
    END LOOP;
  END IF;

  -- 3. exact contact email
  IF v_email <> '' THEN
    FOR r IN
      SELECT id FROM public.contacts WHERE lower(trim(email)) = v_email LIMIT 5
    LOOP
      v_confidence := 0.9;
      v_candidates := v_candidates || jsonb_build_object(
        'method','contact_email_exact','confidence',v_confidence,'contact_id',r.id);
    END LOOP;
  END IF;

  -- 4. communication by provider_message_id
  IF v_provider_msg IS NOT NULL THEN
    FOR r IN
      SELECT c.id, c.contact_id
      FROM public.communications c
      WHERE c.message ILIKE '%' || v_provider_msg || '%'
      LIMIT 2
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','communication_provider_message_id','confidence',0.6,
        'communication_id',r.id,'contact_id',r.contact_id);
    END LOOP;
  END IF;

  -- 5. email_events by provider_message_id
  IF v_provider_msg IS NOT NULL THEN
    BEGIN
      FOR r IN EXECUTE 'SELECT contact_id FROM public.email_events WHERE provider_message_id = $1 LIMIT 2' USING v_provider_msg
      LOOP
        v_candidates := v_candidates || jsonb_build_object(
          'method','email_event_provider_message_id','confidence',0.85,'contact_id',r.contact_id);
      END LOOP;
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      NULL;
    END;
  END IF;

  -- 6. existing conversation by contact/business
  IF v_email <> '' THEN
    FOR r IN
      SELECT cv.id, cv.contact_id
      FROM public.conversations cv
      JOIN public.contacts ct ON ct.id = cv.contact_id
      WHERE lower(trim(ct.email)) = v_email
      ORDER BY cv.last_message_at DESC
      LIMIT 2
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','conversation_by_contact','confidence',0.7,
        'conversation_id',r.id,'contact_id',r.contact_id);
    END LOOP;
  END IF;

  -- 7. BCR by contact/business
  IF v_email <> '' THEN
    FOR r IN
      SELECT bcr.id, bcr.contact_id, bcr.business_id
      FROM public.business_contact_relationships bcr
      JOIN public.contacts ct ON ct.id = bcr.contact_id
      WHERE lower(trim(ct.email)) = v_email
      LIMIT 3
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','bcr_by_contact','confidence',0.6,
        'business_contact_relationship_id',r.id,'contact_id',r.contact_id,'business_id',r.business_id);
    END LOOP;
  END IF;

  -- 9. fallback by business_id
  IF v_business_id IS NOT NULL THEN
    v_candidates := v_candidates || jsonb_build_object(
      'method','business_only_fallback','confidence',0.2,'business_id',v_business_id);
  END IF;

  -- Recommended = highest confidence
  SELECT to_jsonb(c)
  INTO v_recommended
  FROM jsonb_array_elements(v_candidates) c
  ORDER BY (c->>'confidence')::numeric DESC NULLS LAST
  LIMIT 1;

  -- Warnings
  IF v_email = '' THEN
    v_warnings := v_warnings || to_jsonb('no_contact_email'::text);
  END IF;
  IF jsonb_array_length(v_candidates) = 0 THEN
    v_warnings := v_warnings || to_jsonb('no_candidates_found'::text);
    v_founder_review := true;
  END IF;
  IF jsonb_array_length(v_candidates) > 1 AND v_recommended IS NOT NULL
     AND (v_recommended->>'confidence')::numeric < 0.7 THEN
    v_founder_review := true;
  END IF;

  -- dedupe_key recommendation
  IF v_provider_type IS NOT NULL AND v_external_event_id IS NOT NULL THEN
    v_dedupe_key := v_provider_type || ':' || v_external_event_id;
  ELSIF v_provider_type IS NOT NULL AND v_provider_msg IS NOT NULL AND v_interaction_type IS NOT NULL THEN
    v_dedupe_key := v_provider_type || ':' || v_provider_msg || ':' || v_interaction_type;
  ELSIF v_email <> '' AND v_interaction_type IS NOT NULL THEN
    v_dedupe_key := 'email:' || v_email || ':' || v_interaction_type;
  END IF;

  -- should create conversation later
  IF v_recommended IS NOT NULL
     AND v_recommended ? 'contact_id'
     AND NOT (v_recommended ? 'conversation_id') THEN
    v_should_create_conv := true;
  END IF;

  RETURN jsonb_build_object(
    'candidates', v_candidates,
    'recommended', v_recommended,
    'confidence', COALESCE((v_recommended->>'confidence')::numeric, 0),
    'warnings', v_warnings,
    'dedupe_key', v_dedupe_key,
    'should_create_conversation_later', v_should_create_conv,
    'founder_review_required', v_founder_review,
    'inputs', jsonb_build_object(
      'contact_email', v_email,
      'provider_type', v_provider_type,
      'provider_campaign_id', v_provider_camp,
      'provider_message_id', v_provider_msg,
      'external_event_id', v_external_event_id,
      'business_id', v_business_id,
      'interaction_type', v_interaction_type
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.crm_match_interaction_preview(uuid, uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_match_interaction_preview(uuid, uuid, text, text, text, uuid) TO authenticated;

CREATE TRIGGER trg_crm_match_candidates_updated
  BEFORE UPDATE ON public.crm_match_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
