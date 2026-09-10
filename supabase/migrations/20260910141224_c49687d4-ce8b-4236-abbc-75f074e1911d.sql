-- =========================================================================
-- Education commercial layer (Chat 3). Additive and idempotent.
-- Does NOT touch Apollo firewall tables, Smartlead provider state or mailboxes.
-- =========================================================================

-- 1. Canonical education businesses -------------------------------------
INSERT INTO public.businesses (name)
SELECT v.name
FROM (VALUES ('Aurelia'), ('Kindnesss'), ('Kingsbridge Global')) AS v(name)
LEFT JOIN public.businesses b ON b.name = v.name
WHERE b.id IS NULL;

-- 2. Business-specific relevance on the existing junction layer ----------
ALTER TABLE public.business_contact_relationships
  ADD COLUMN IF NOT EXISTS business_relevance_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_relevance_level text NOT NULL DEFAULT 'not_relevant',
  ADD COLUMN IF NOT EXISTS business_relevance_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS business_relevance_categories text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS relevance_engine_version text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS relevance_scored_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS business_contact_relationships_contact_business_uniq
  ON public.business_contact_relationships (contact_id, business_name);

CREATE INDEX IF NOT EXISTS business_contact_relationships_relevance_idx
  ON public.business_contact_relationships (business_name, business_relevance_score DESC);

-- 3. Portfolio collision policy ------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_collision_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  cross_brand_cooldown_days integer NOT NULL DEFAULT 30,
  reply_block_enabled boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT 'Default cross-brand cooldown 30 days. Founder override never bypasses hard safety blocks.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_collision_policy_singleton_idx
  ON public.portfolio_collision_policy (singleton);

GRANT SELECT, INSERT, UPDATE ON public.portfolio_collision_policy TO authenticated;
GRANT ALL ON public.portfolio_collision_policy TO service_role;
ALTER TABLE public.portfolio_collision_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage portfolio collision policy" ON public.portfolio_collision_policy;
CREATE POLICY "Founders manage portfolio collision policy"
  ON public.portfolio_collision_policy FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.portfolio_collision_policy (singleton)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.portfolio_collision_policy);

-- 4. Portfolio contact ownership -----------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_contact_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id),
  business_name text NOT NULL,
  campaign_key text,
  campaign_id uuid,
  status text NOT NULL DEFAULT 'active',
  reason_code text NOT NULL DEFAULT 'claimed',
  founder_override boolean NOT NULL DEFAULT false,
  override_reason text NOT NULL DEFAULT '',
  claimed_by uuid,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  cooldown_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_contact_ownership_status_chk CHECK (status IN ('active', 'released'))
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolio_contact_ownership_one_active_idx
  ON public.portfolio_contact_ownership (contact_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS portfolio_contact_ownership_contact_idx
  ON public.portfolio_contact_ownership (contact_id, status);
CREATE INDEX IF NOT EXISTS portfolio_contact_ownership_business_idx
  ON public.portfolio_contact_ownership (business_name, status);

GRANT SELECT, INSERT, UPDATE ON public.portfolio_contact_ownership TO authenticated;
GRANT ALL ON public.portfolio_contact_ownership TO service_role;
ALTER TABLE public.portfolio_contact_ownership ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage portfolio contact ownership" ON public.portfolio_contact_ownership;
CREATE POLICY "Founders manage portfolio contact ownership"
  ON public.portfolio_contact_ownership FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Ownership audit events ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_ownership_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  ownership_id uuid,
  business_name text NOT NULL,
  campaign_key text,
  event_type text NOT NULL,
  decision text NOT NULL DEFAULT 'unknown',
  reason_codes text[] NOT NULL DEFAULT '{}'::text[],
  founder_override boolean NOT NULL DEFAULT false,
  override_reason text NOT NULL DEFAULT '',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portfolio_ownership_events_contact_idx
  ON public.portfolio_ownership_events (contact_id, created_at DESC);

GRANT SELECT, INSERT ON public.portfolio_ownership_events TO authenticated;
GRANT ALL ON public.portfolio_ownership_events TO service_role;
ALTER TABLE public.portfolio_ownership_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders read portfolio ownership events" ON public.portfolio_ownership_events;
CREATE POLICY "Founders read portfolio ownership events"
  ON public.portfolio_ownership_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Founders write portfolio ownership events" ON public.portfolio_ownership_events;
CREATE POLICY "Founders write portfolio ownership events"
  ON public.portfolio_ownership_events FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 6. Transactional claim / release ---------------------------------------
CREATE OR REPLACE FUNCTION public.claim_portfolio_contact(
  p_contact_id uuid,
  p_business_name text,
  p_campaign_key text DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL,
  p_founder_override boolean DEFAULT false,
  p_override_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact public.contacts%ROWTYPE;
  v_owner public.portfolio_contact_ownership%ROWTYPE;
  v_business_id uuid;
  v_cooldown_days integer;
  v_cooldown_until timestamptz;
  v_hard text[] := '{}';
  v_soft text[] := '{}';
  v_new_id uuid;
BEGIN
  SELECT * INTO v_contact FROM public.contacts WHERE id = p_contact_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision', 'blocked', 'reason_codes', ARRAY['contact_not_found'], 'hard_blocked', true);
  END IF;

  SELECT cross_brand_cooldown_days INTO v_cooldown_days FROM public.portfolio_collision_policy LIMIT 1;
  v_cooldown_days := COALESCE(v_cooldown_days, 30);

  SELECT id INTO v_business_id FROM public.businesses WHERE name = p_business_name LIMIT 1;

  IF COALESCE(v_contact.is_globally_suppressed, false) THEN v_hard := v_hard || 'global_suppression'; END IF;
  IF COALESCE(v_contact.hard_bounced, false) THEN v_hard := v_hard || 'hard_bounce'; END IF;
  IF v_contact.unsubscribed_at IS NOT NULL THEN v_hard := v_hard || 'unsubscribed'; END IF;
  IF v_contact.do_not_contact_at IS NOT NULL THEN v_hard := v_hard || 'do_not_contact'; END IF;

  SELECT * INTO v_owner
  FROM public.portfolio_contact_ownership
  WHERE contact_id = p_contact_id AND status = 'active'
  FOR UPDATE;

  IF FOUND AND v_owner.business_name = p_business_name AND array_length(v_hard, 1) IS NULL THEN
    INSERT INTO public.portfolio_ownership_events
      (contact_id, ownership_id, business_name, campaign_key, event_type, decision, reason_codes, actor_id)
    VALUES (p_contact_id, v_owner.id, p_business_name, p_campaign_key, 'claim', 'allowed',
            ARRAY['already_owned_by_requesting_brand'], auth.uid());
    RETURN jsonb_build_object(
      'decision', 'allowed', 'reason_codes', ARRAY['already_owned_by_requesting_brand'],
      'hard_blocked', false, 'ownership_id', v_owner.id, 'current_owner_business', v_owner.business_name);
  END IF;

  IF COALESCE(v_contact.conversation_active, false)
     AND (NOT FOUND OR v_owner.business_name <> p_business_name) THEN
    v_hard := v_hard || 'active_conversation_block';
  END IF;

  IF FOUND AND v_owner.business_name <> p_business_name THEN
    v_soft := v_soft || 'owned_by_other_brand';
  END IF;

  SELECT max(cooldown_until) INTO v_cooldown_until
  FROM public.portfolio_contact_ownership
  WHERE contact_id = p_contact_id
    AND status = 'released'
    AND business_name <> p_business_name
    AND cooldown_until IS NOT NULL
    AND cooldown_until > now();
  IF v_cooldown_until IS NOT NULL THEN v_soft := v_soft || 'cross_brand_cooldown'; END IF;

  IF array_length(v_hard, 1) IS NOT NULL THEN
    INSERT INTO public.portfolio_ownership_events
      (contact_id, business_name, campaign_key, event_type, decision, reason_codes, founder_override, override_reason, actor_id)
    VALUES (p_contact_id, p_business_name, p_campaign_key, 'claim', 'blocked', v_hard || v_soft,
            COALESCE(p_founder_override, false), COALESCE(p_override_reason, ''), auth.uid());
    RETURN jsonb_build_object('decision', 'blocked', 'reason_codes', v_hard || v_soft,
      'hard_blocked', true, 'overridable', false,
      'explanation', 'Hard safety block; founder override cannot bypass this.');
  END IF;

  IF array_length(v_soft, 1) IS NOT NULL AND NOT COALESCE(p_founder_override, false) THEN
    INSERT INTO public.portfolio_ownership_events
      (contact_id, business_name, campaign_key, event_type, decision, reason_codes, actor_id)
    VALUES (p_contact_id, p_business_name, p_campaign_key, 'claim', 'blocked', v_soft, auth.uid());
    RETURN jsonb_build_object('decision', 'blocked', 'reason_codes', v_soft,
      'hard_blocked', false, 'overridable', true,
      'current_owner_business', v_owner.business_name,
      'cooldown_until', v_cooldown_until);
  END IF;

  IF v_owner.id IS NOT NULL AND v_owner.business_name <> p_business_name THEN
    UPDATE public.portfolio_contact_ownership
       SET status = 'released',
           released_at = now(),
           reason_code = 'released_by_founder_override',
           cooldown_until = now() + (v_cooldown_days || ' days')::interval,
           updated_at = now()
     WHERE id = v_owner.id;
    INSERT INTO public.portfolio_ownership_events
      (contact_id, ownership_id, business_name, event_type, decision, reason_codes, founder_override, override_reason, actor_id)
    VALUES (p_contact_id, v_owner.id, v_owner.business_name, 'release', 'allowed',
            ARRAY['released_by_founder_override'], true, COALESCE(p_override_reason, ''), auth.uid());
  END IF;

  INSERT INTO public.portfolio_contact_ownership
    (contact_id, business_id, business_name, campaign_key, campaign_id, status, reason_code,
     founder_override, override_reason, claimed_by)
  VALUES (p_contact_id, v_business_id, p_business_name, p_campaign_key, p_campaign_id, 'active',
          CASE WHEN COALESCE(p_founder_override, false) THEN 'claimed_with_override' ELSE 'claimed' END,
          COALESCE(p_founder_override, false), COALESCE(p_override_reason, ''), auth.uid())
  RETURNING id INTO v_new_id;

  INSERT INTO public.portfolio_ownership_events
    (contact_id, ownership_id, business_name, campaign_key, event_type, decision, reason_codes,
     founder_override, override_reason, actor_id)
  VALUES (p_contact_id, v_new_id, p_business_name, p_campaign_key, 'claim', 'allowed',
          CASE WHEN array_length(v_soft, 1) IS NULL THEN ARRAY['no_conflict'] ELSE v_soft END,
          COALESCE(p_founder_override, false), COALESCE(p_override_reason, ''), auth.uid());

  RETURN jsonb_build_object('decision', 'allowed', 'ownership_id', v_new_id,
    'reason_codes', CASE WHEN array_length(v_soft, 1) IS NULL THEN ARRAY['no_conflict'] ELSE v_soft END,
    'hard_blocked', false, 'founder_override_applied', COALESCE(p_founder_override, false) AND array_length(v_soft, 1) IS NOT NULL,
    'current_owner_business', p_business_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_portfolio_contact(
  p_contact_id uuid,
  p_business_name text,
  p_reason text DEFAULT 'released'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner public.portfolio_contact_ownership%ROWTYPE;
  v_cooldown_days integer;
BEGIN
  SELECT cross_brand_cooldown_days INTO v_cooldown_days FROM public.portfolio_collision_policy LIMIT 1;
  v_cooldown_days := COALESCE(v_cooldown_days, 30);

  SELECT * INTO v_owner FROM public.portfolio_contact_ownership
  WHERE contact_id = p_contact_id AND status = 'active' AND business_name = p_business_name
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision', 'noop', 'reason_codes', ARRAY['no_active_ownership']);
  END IF;

  UPDATE public.portfolio_contact_ownership
     SET status = 'released', released_at = now(), reason_code = p_reason,
         cooldown_until = now() + (v_cooldown_days || ' days')::interval, updated_at = now()
   WHERE id = v_owner.id;

  INSERT INTO public.portfolio_ownership_events
    (contact_id, ownership_id, business_name, event_type, decision, reason_codes, actor_id)
  VALUES (p_contact_id, v_owner.id, p_business_name, 'release', 'allowed', ARRAY[p_reason], auth.uid());

  RETURN jsonb_build_object('decision', 'released', 'ownership_id', v_owner.id,
    'cooldown_days', v_cooldown_days);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_portfolio_contact(uuid, text, text, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_portfolio_contact(uuid, text, text) TO authenticated;

-- 7. Campaign shell configuration on existing campaign architecture -------
ALTER TABLE public.outreach_campaign_drafts
  ADD COLUMN IF NOT EXISTS campaign_key text,
  ADD COLUMN IF NOT EXISTS target_role_families jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qualification_threshold integer NOT NULL DEFAULT 55,
  ADD COLUMN IF NOT EXISTS relationship_eligibility_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS collision_protection_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_state text NOT NULL DEFAULT 'not_tested',
  ADD COLUMN IF NOT EXISTS founder_approval_state text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS batch_min integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS batch_max integer NOT NULL DEFAULT 50;

CREATE UNIQUE INDEX IF NOT EXISTS outreach_campaign_drafts_campaign_key_uniq
  ON public.outreach_campaign_drafts (campaign_key) WHERE campaign_key IS NOT NULL;

-- 8. Education commercial funnel view -------------------------------------
CREATE OR REPLACE VIEW public.education_commercial_funnel
WITH (security_invoker = true) AS
SELECT
  b.name AS business_name,
  (SELECT count(*) FROM public.organisations o WHERE COALESCE(o.is_education_account, false)) AS accounts_in_scope,
  (SELECT count(*) FROM public.business_contact_relationships r
     WHERE r.business_name = b.name) AS contacts_relevant,
  (SELECT count(*) FROM public.business_contact_relationships r
     JOIN public.contacts c ON c.id = r.contact_id
     WHERE r.business_name = b.name
       AND r.campaign_eligible
       AND NOT r.do_not_contact
       AND c.organisation_id IS NOT NULL
       AND NOT COALESCE(c.is_globally_suppressed, false)
       AND NOT COALESCE(c.hard_bounced, false)
       AND c.unsubscribed_at IS NULL
       AND c.do_not_contact_at IS NULL) AS contacts_eligible,
  (SELECT count(*) FROM public.portfolio_contact_ownership po
     WHERE po.business_name = b.name AND po.status = 'active') AS allocated,
  (SELECT count(*) FROM public.business_contact_relationships r
     JOIN public.contacts c ON c.id = r.contact_id
     WHERE r.business_name = b.name AND c.last_contacted_at IS NOT NULL) AS contacted,
  (SELECT count(*) FROM public.business_contact_relationships r
     JOIN public.contacts c ON c.id = r.contact_id
     WHERE r.business_name = b.name AND c.last_replied_at IS NOT NULL) AS replies,
  NULL::bigint AS positive_replies,
  NULL::bigint AS meetings,
  NULL::bigint AS proposals,
  NULL::bigint AS wins,
  (SELECT COALESCE(sum(e.amount), 0) FROM public.business_revenue_events e
     WHERE e.business_id = b.id) AS revenue,
  (SELECT count(*) FROM public.business_contact_relationships r
     JOIN public.contacts c ON c.id = r.contact_id
     WHERE r.business_name = b.name
       AND (r.do_not_contact
            OR COALESCE(c.is_globally_suppressed, false)
            OR COALESCE(c.hard_bounced, false)
            OR c.unsubscribed_at IS NOT NULL
            OR c.do_not_contact_at IS NOT NULL)) AS exclusions,
  (SELECT count(*) FROM public.portfolio_ownership_events ev
     WHERE ev.business_name = b.name AND ev.decision = 'blocked') AS collisions
FROM public.businesses b
WHERE b.name IN ('Billy and the Wild Forest', 'Aurelia', 'Kindnesss', 'Kingsbridge Global');

GRANT SELECT ON public.education_commercial_funnel TO authenticated;
GRANT SELECT ON public.education_commercial_funnel TO service_role;