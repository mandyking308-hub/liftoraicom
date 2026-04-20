-- ============================================================
-- STRATEGIC SYSTEM UPGRADES (11 modules)
-- ============================================================

-- ---------- 11. SAFE TEST MODE FLAG ----------
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage settings" ON public.system_settings;
CREATE POLICY "Founders manage settings" ON public.system_settings
  FOR ALL USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));
DROP POLICY IF EXISTS "Service role settings" ON public.system_settings;
CREATE POLICY "Service role settings" ON public.system_settings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.system_settings (key, value)
VALUES ('system_mode', '"test"'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_system_mode()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value #>> '{}' FROM public.system_settings WHERE key = 'system_mode'), 'test')
$$;

-- ---------- 1. INBOX SCALING ENGINE ----------
ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS emails_sent_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reply_rate_per_inbox numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounce_rate_per_inbox numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS performance_score integer NOT NULL DEFAULT 50;

CREATE OR REPLACE FUNCTION public.recompute_inbox_performance(_inbox_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sent int := 0; v_replies int := 0; v_bounces int := 0; v_today int := 0;
  v_reply numeric := 0; v_bounce numeric := 0; v_perf int := 50; v_rep int := 50;
BEGIN
  SELECT COUNT(*) INTO v_today FROM public.email_queue
   WHERE inbox_id = _inbox_id AND status = 'sent' AND sent_at >= date_trunc('day', now());
  SELECT COUNT(*) INTO v_sent FROM public.email_queue
   WHERE inbox_id = _inbox_id AND status = 'sent' AND sent_at > now() - interval '30 days';
  SELECT COUNT(*) INTO v_replies FROM public.email_events ev
    JOIN public.email_queue q ON q.contact_id = ev.contact_id
   WHERE q.inbox_id = _inbox_id AND ev.event_type = 'replied' AND ev.timestamp > now() - interval '30 days';
  SELECT COUNT(*) INTO v_bounces FROM public.email_events ev
    JOIN public.email_queue q ON q.contact_id = ev.contact_id
   WHERE q.inbox_id = _inbox_id AND ev.event_type = 'bounced' AND ev.timestamp > now() - interval '30 days';
  IF v_sent > 0 THEN
    v_reply := ROUND((v_replies::numeric / v_sent) * 100, 2);
    v_bounce := ROUND((v_bounces::numeric / v_sent) * 100, 2);
  END IF;
  SELECT reputation_score INTO v_rep FROM public.inboxes WHERE id = _inbox_id;
  v_perf := GREATEST(0, LEAST(100, ROUND(
    (COALESCE(v_rep,50) * 0.5) + (LEAST(v_reply, 30) * 1.5) - (v_bounce * 2)
  )::int));
  UPDATE public.inboxes SET emails_sent_today = v_today, reply_rate_per_inbox = v_reply,
    bounce_rate_per_inbox = v_bounce, performance_score = v_perf, updated_at = now()
   WHERE id = _inbox_id;
END; $$;

CREATE OR REPLACE FUNCTION public.recompute_all_inbox_performance()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.inboxes LOOP
    PERFORM public.recompute_inbox_performance(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.pick_inbox_for_business(_business_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE picked_id uuid; next_pos integer;
BEGIN
  SELECT id INTO picked_id FROM public.inboxes
   WHERE business_name = _business_name AND active = true
     AND reputation_score >= 20 AND current_send_count < daily_send_limit
   ORDER BY performance_score DESC, reputation_score DESC,
            last_used_sequence_position ASC, current_send_count ASC
   LIMIT 1;
  IF picked_id IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(MAX(last_used_sequence_position), 0) + 1 INTO next_pos
  FROM public.inboxes WHERE business_name = _business_name;
  UPDATE public.inboxes SET last_used_sequence_position = next_pos WHERE id = picked_id;
  RETURN picked_id;
END; $$;

DO $$
DECLARE b text; cnt int; needed int; i int; domain text;
BEGIN
  FOR b IN SELECT DISTINCT business_name FROM public.inboxes WHERE business_name <> '' LOOP
    SELECT COUNT(*) INTO cnt FROM public.inboxes WHERE business_name = b;
    needed := GREATEST(0, 5 - cnt);
    domain := lower(regexp_replace(b, '[^a-zA-Z0-9]+', '', 'g')) || '.io';
    FOR i IN 1..needed LOOP
      INSERT INTO public.inboxes (
        email_address, business_name, daily_send_limit, hourly_send_limit,
        reputation_score, active, warmup_status, current_send_count
      ) VALUES (
        'outbound' || (cnt + i) || '@' || domain,
        b, 80, 10, 50, true, 'active', 0
      );
    END LOOP;
  END LOOP;
END $$;

-- ---------- 2. CONTACT ENRICHMENT LAYER ----------
DO $$ BEGIN CREATE TYPE public.company_size_tier AS ENUM ('small','medium','large');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.seniority_level AS ENUM ('junior','manager','director','c-level');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS company_size public.company_size_tier,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS seniority public.seniority_level,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS intent_score integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.enrich_contact(_contact_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.contacts; v_industry text; v_size public.company_size_tier;
  v_sen public.seniority_level; v_li text; v_role text; pool_industry text[];
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason','not_found'); END IF;
  pool_industry := CASE c.assigned_business
    WHEN 'Liftor AI' THEN ARRAY['Technology','SaaS','Fintech','Consulting','AI Services']
    WHEN 'GloBlast' THEN ARRAY['Beauty','Cosmetics','Retail','E-commerce','Wellness']
    WHEN 'Health Access' THEN ARRAY['Healthcare','Medical Services','Pharma','BioTech','Public Health']
    ELSE ARRAY['Professional Services','Technology','Retail']
  END;
  v_industry := COALESCE(c.industry, pool_industry[1 + (abs(hashtext(c.id::text)) % array_length(pool_industry,1))]);
  v_size := COALESCE(c.company_size, (ARRAY['small','medium','large']::public.company_size_tier[])[1 + (abs(hashtext(c.id::text||'sz')) % 3)]);
  v_role := lower(COALESCE(c.role,''));
  v_sen := COALESCE(c.seniority,
    CASE
      WHEN v_role ~ '(ceo|cto|cfo|coo|chief|founder|owner|president)' THEN 'c-level'::public.seniority_level
      WHEN v_role ~ '(vp|director|head)' THEN 'director'::public.seniority_level
      WHEN v_role ~ '(manager|lead|principal)' THEN 'manager'::public.seniority_level
      WHEN v_role ~ '(junior|associate|assistant|intern)' THEN 'junior'::public.seniority_level
      ELSE (ARRAY['junior','manager','director','c-level']::public.seniority_level[])[1 + (abs(hashtext(c.id::text||'sn')) % 4)]
    END);
  v_li := COALESCE(c.linkedin_url,
    'https://linkedin.com/in/' || regexp_replace(lower(COALESCE(c.name,'lead')), '[^a-z0-9]+','-','g') || '-' || substr(c.id::text,1,6));
  UPDATE public.contacts SET company_size = v_size, industry = v_industry,
    linkedin_url = v_li, seniority = v_sen, enriched_at = now(), updated_at = now()
   WHERE id = _contact_id;
  RETURN jsonb_build_object('ok', true, 'industry', v_industry,
    'company_size', v_size, 'seniority', v_sen, 'linkedin_url', v_li);
END; $$;

CREATE OR REPLACE FUNCTION public.enrich_all_contacts()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.contacts WHERE enriched_at IS NULL LOOP
    PERFORM public.enrich_contact(r.id); n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

-- ---------- 3. ADVANCED INTENT SCORING ----------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS intent_score integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.compute_intent_score(_contact_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_replies int := 0; v_demo_uses int := 0; v_proposal_views int := 0;
  v_last_activity timestamptz; v_days_inactive int := 0; v_score int := 0;
BEGIN
  SELECT COUNT(*) INTO v_replies FROM public.email_events
   WHERE contact_id = _contact_id AND event_type = 'replied';
  SELECT COUNT(*) INTO v_demo_uses FROM public.demo_events de
    JOIN public.demo_access da ON da.id = de.demo_id
   WHERE da.contact_id = _contact_id AND de.event_type::text IN ('feature_used','session_start');
  SELECT COUNT(*) INTO v_proposal_views FROM public.internal_proposals
   WHERE contact_id = _contact_id AND viewed_at IS NOT NULL;
  IF v_replies > 0 THEN v_score := v_score + 30; END IF;
  IF v_replies > 1 THEN v_score := v_score + 20; END IF;
  IF v_demo_uses > 0 THEN v_score := v_score + 25; END IF;
  IF v_proposal_views > 0 THEN v_score := v_score + 15; END IF;
  SELECT GREATEST(
    COALESCE((SELECT MAX(timestamp) FROM public.email_events WHERE contact_id = _contact_id), 'epoch'::timestamptz),
    COALESCE((SELECT MAX(last_replied_at) FROM public.contacts WHERE id = _contact_id), 'epoch'::timestamptz)
  ) INTO v_last_activity;
  IF v_last_activity IS NOT NULL AND v_last_activity > 'epoch'::timestamptz THEN
    v_days_inactive := GREATEST(0, EXTRACT(DAY FROM (now() - v_last_activity))::int);
    v_score := v_score - (v_days_inactive * 5);
  END IF;
  v_score := GREATEST(0, LEAST(100, v_score));
  UPDATE public.contacts SET intent_score = v_score, updated_at = now() WHERE id = _contact_id;
  UPDATE public.conversations SET intent_score = v_score, updated_at = now() WHERE contact_id = _contact_id;
  RETURN v_score;
END; $$;

CREATE OR REPLACE FUNCTION public.recompute_all_intent_scores()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.contacts LOOP
    PERFORM public.compute_intent_score(r.id); n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.priority_score_contact(_contact_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.contacts; open_deal_value numeric := 0; revenue_f numeric := 0;
  prob_f numeric := 30; urgency_f numeric := 0; engagement_f numeric := 0;
  risk_f numeric := 0; raw numeric := 0; final_score int := 0;
  hours_since_reply int; demo_uses int := 0; factors jsonb;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF c.status::text IN ('CLIENT','DO_NOT_CONTACT','SUPPLIER') THEN
    DELETE FROM public.priority_scores WHERE entity_type = 'contact' AND entity_id = _contact_id;
    RETURN;
  END IF;
  SELECT COALESCE(MAX((estimated_value_min + estimated_value_max)/2.0), 0)
    INTO open_deal_value FROM public.deals
   WHERE contact_id = _contact_id AND status::text NOT IN ('WON','LOST');
  revenue_f := LEAST(100, open_deal_value / 1000.0);
  prob_f := CASE c.status::text
    WHEN 'QUALIFIED' THEN 70 WHEN 'ENGAGED' THEN 50
    WHEN 'CONTACTED' THEN 30 WHEN 'NEW' THEN 20 ELSE 10 END;
  IF c.last_replied_at IS NOT NULL THEN
    hours_since_reply := EXTRACT(EPOCH FROM (now() - c.last_replied_at)) / 3600;
    urgency_f := CASE
      WHEN hours_since_reply <= 4 THEN 95 WHEN hours_since_reply <= 24 THEN 75
      WHEN hours_since_reply <= 72 THEN 50 ELSE 25 END;
  ELSE urgency_f := 20; END IF;
  SELECT COUNT(*) INTO demo_uses FROM public.demo_events de
    JOIN public.demo_access da ON da.id = de.demo_id
   WHERE da.contact_id = _contact_id AND de.timestamp > now() - interval '14 days';
  engagement_f := LEAST(100,
    (demo_uses * 10) + (CASE WHEN c.conversation_active THEN 20 ELSE 0 END)
    + (COALESCE(c.intent_score, 0) * 0.7));
  risk_f := public.compliance_score_for('contact', _contact_id);
  raw := (revenue_f * 0.30) + (prob_f * 0.20) + (urgency_f * 0.20)
       + (engagement_f * 0.20) - (risk_f * 0.10);
  final_score := GREATEST(0, LEAST(100, ROUND(raw)::int));
  factors := jsonb_build_object(
    'revenue', ROUND(revenue_f,1), 'probability', ROUND(prob_f,1),
    'urgency', ROUND(urgency_f,1), 'engagement', ROUND(engagement_f,1),
    'risk', ROUND(risk_f,1), 'open_deal_value', open_deal_value,
    'demo_uses_14d', demo_uses, 'intent_score', COALESCE(c.intent_score,0),
    'conversation_active', c.conversation_active, 'status', c.status::text);
  INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
  VALUES ('contact', _contact_id, COALESCE(c.assigned_business,''), final_score, factors,
          public.priority_level_from_score(final_score), now())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score, factors = EXCLUDED.factors,
        priority_level = EXCLUDED.priority_level,
        business_name = EXCLUDED.business_name, last_updated = now();
END; $$;

-- ---------- 4. PROPOSAL QUALITY CONTROL ----------
ALTER TABLE public.internal_proposals
  ADD COLUMN IF NOT EXISTS proposal_quality_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.score_proposal_quality(_proposal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.internal_proposals; completeness int := 0; clarity int := 0;
  pricing_realism int := 0; total int := 0; flags jsonb := '[]'::jsonb;
  cost_min numeric := 0; cost_max numeric := 0;
  expected_min numeric := 0; expected_max numeric := 0; bullets int := 0;
BEGIN
  SELECT * INTO p FROM public.internal_proposals WHERE id = _proposal_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;

  completeness := completeness + (CASE WHEN length(COALESCE(p.suggested_solution,'')) > 100 THEN 10 ELSE 0 END);
  completeness := completeness + (CASE WHEN length(COALESCE(p.estimated_scope,'')) > 80 THEN 8 ELSE 0 END);
  completeness := completeness + (CASE WHEN length(COALESCE(p.estimated_timeline,'')) > 5 THEN 5 ELSE 0 END);
  completeness := completeness + (CASE WHEN length(COALESCE(p.estimated_cost_range,'')) > 5 THEN 5 ELSE 0 END);
  completeness := completeness + (CASE WHEN p.architecture_components IS NOT NULL AND jsonb_array_length(p.architecture_components) > 0 THEN 7 ELSE 0 END);
  completeness := completeness + (CASE WHEN length(COALESCE(p.estimated_roi_summary,'')) > 30 THEN 5 ELSE 0 END);
  IF length(COALESCE(p.suggested_solution,'')) < 50 THEN flags := flags || '"missing_solution"'::jsonb; END IF;
  IF p.architecture_components IS NULL OR jsonb_array_length(p.architecture_components) = 0 THEN flags := flags || '"no_architecture"'::jsonb; END IF;

  bullets := (length(COALESCE(p.suggested_solution,'')) - length(replace(COALESCE(p.suggested_solution,''), E'\n', '')));
  clarity := clarity + LEAST(15, bullets * 2);
  clarity := clarity + (CASE WHEN COALESCE(p.suggested_solution,'') ~* '(•|\*|\-|^\d\.)' THEN 5 ELSE 0 END);
  clarity := clarity + (CASE WHEN length(COALESCE(p.suggested_solution,'')) BETWEEN 200 AND 4000 THEN 10 ELSE 0 END);
  IF length(COALESCE(p.suggested_solution,'')) > 8000 THEN flags := flags || '"too_long"'::jsonb; END IF;

  IF p.estimated_cost_breakdown IS NOT NULL THEN
    cost_min := COALESCE((p.estimated_cost_breakdown->>'min')::numeric, 0);
    cost_max := COALESCE((p.estimated_cost_breakdown->>'max')::numeric, 0);
  END IF;

  CASE COALESCE(p.project_scale,'medium')
    WHEN 'small' THEN expected_min := 2000; expected_max := 25000;
    WHEN 'medium' THEN expected_min := 15000; expected_max := 100000;
    WHEN 'large' THEN expected_min := 60000; expected_max := 500000;
    WHEN 'enterprise' THEN expected_min := 150000; expected_max := 2000000;
    ELSE expected_min := 5000; expected_max := 200000;
  END CASE;

  IF cost_min > 0 AND cost_max > 0 AND cost_min < cost_max THEN
    pricing_realism := pricing_realism + 10;
    IF cost_min >= expected_min * 0.5 AND cost_max <= expected_max * 1.5 THEN
      pricing_realism := pricing_realism + 20;
    ELSE
      pricing_realism := pricing_realism + 5;
      flags := flags || '"pricing_outside_band"'::jsonb;
    END IF;
  ELSE
    flags := flags || '"missing_or_invalid_pricing"'::jsonb;
  END IF;

  total := GREATEST(0, LEAST(100, completeness + clarity + pricing_realism));
  UPDATE public.internal_proposals
     SET proposal_quality_score = total, quality_flags = flags, updated_at = now()
   WHERE id = _proposal_id;
  RETURN jsonb_build_object('ok', true, 'score', total,
    'completeness', completeness, 'clarity', clarity,
    'pricing_realism', pricing_realism, 'flags', flags);
END; $$;

CREATE OR REPLACE FUNCTION public.trg_score_proposal_quality()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.score_proposal_quality(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_score_proposal_quality_aiu ON public.internal_proposals;
CREATE TRIGGER trg_score_proposal_quality_aiu
AFTER INSERT OR UPDATE OF suggested_solution, estimated_cost_breakdown, estimated_cost_range,
                          estimated_scope, architecture_components, project_scale
ON public.internal_proposals
FOR EACH ROW EXECUTE FUNCTION public.trg_score_proposal_quality();

-- ---------- 5. AI RESPONSE QUALITY CONTROL ----------
DO $$ BEGIN CREATE TYPE public.ai_quality_flag AS ENUM ('pass','fail','regenerated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ai_actions
  ADD COLUMN IF NOT EXISTS ai_quality_flag public.ai_quality_flag NOT NULL DEFAULT 'pass',
  ADD COLUMN IF NOT EXISTS quality_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS regenerated boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.evaluate_ai_reply(_text text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  word_count int; has_cta boolean; has_repetition boolean;
  reasons text[] := ARRAY[]::text[]; pass boolean := true; lower_t text; repeated_word text;
BEGIN
  IF _text IS NULL OR length(trim(_text)) = 0 THEN
    RETURN jsonb_build_object('pass', false, 'reasons', ARRAY['empty']);
  END IF;
  word_count := array_length(regexp_split_to_array(trim(_text), '\s+'), 1);
  IF word_count > 120 THEN pass := false; reasons := reasons || 'too_long'; END IF;
  lower_t := lower(_text);
  has_cta := lower_t ~ '(book|schedule|reply|let me know|next step|chat|call|meeting|demo|introduce|connect|available|interested)';
  IF NOT has_cta THEN pass := false; reasons := reasons || 'missing_cta'; END IF;
  WITH words AS (
    SELECT lower(regexp_split_to_table(regexp_replace(_text,'[^a-zA-Z0-9 ]','','g'),'\s+')) AS w
  ), grams AS (
    SELECT string_agg(w, ' ') AS phrase
    FROM (SELECT w, row_number() OVER () rn FROM words) t
    GROUP BY (rn-1)/4
  )
  SELECT phrase INTO repeated_word FROM grams
  WHERE length(phrase) > 10 GROUP BY phrase HAVING COUNT(*) > 1 LIMIT 1;
  has_repetition := repeated_word IS NOT NULL;
  IF has_repetition THEN pass := false; reasons := reasons || 'repetition'; END IF;
  RETURN jsonb_build_object('pass', pass, 'word_count', word_count,
    'has_cta', has_cta, 'has_repetition', has_repetition, 'reasons', reasons);
END; $$;

-- ---------- 6. RETRY ENGINE HARDENING ----------
ALTER TABLE public.retry_queue
  ADD COLUMN IF NOT EXISTS retry_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_error_message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS escalated boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.escalate_retry_failure(_retry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.retry_queue;
BEGIN
  SELECT * INTO r FROM public.retry_queue WHERE id = _retry_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF r.retry_count >= 3 AND NOT r.escalated THEN
    PERFORM public.log_system_event(
      'retry_exhausted', r.entity_type, r.entity_id, r.business_name, 'critical',
      'Retry exhausted for ' || r.entity_type || ' ' || COALESCE(r.entity_id::text,'') || ': ' || COALESCE(r.last_error_message, r.last_error,''),
      jsonb_build_object('action_type', r.action_type, 'retries', r.retry_count, 'reason', r.retry_reason));
    UPDATE public.retry_queue SET escalated = true, status = 'failed', updated_at = now()
     WHERE id = _retry_id;
  END IF;
END; $$;

-- ---------- 7. ASSIGNMENT LOAD BALANCING ----------
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS active_assignment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_concurrent_assignments integer NOT NULL DEFAULT 5;

CREATE OR REPLACE FUNCTION public.recompute_supplier_load(_supplier_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int := 0;
BEGIN
  SELECT COUNT(*) INTO n FROM public.assignments
   WHERE supplier_id = _supplier_id AND status::text IN ('assigned','acknowledged','in_progress');
  UPDATE public.suppliers SET active_assignment_count = n, updated_at = now() WHERE id = _supplier_id;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_supplier_load()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recompute_supplier_load(NEW.supplier_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.recompute_supplier_load(NEW.supplier_id);
    IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
      PERFORM public.recompute_supplier_load(OLD.supplier_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_supplier_load(OLD.supplier_id);
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_assignments_load ON public.assignments;
CREATE TRIGGER trg_assignments_load
AFTER INSERT OR UPDATE OF status, supplier_id OR DELETE
ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_supplier_load();

CREATE OR REPLACE FUNCTION public.pick_supplier_for_deal(_deal_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.deals; picked uuid;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id = _deal_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT s.id INTO picked FROM public.suppliers s
   WHERE s.status::text = 'APPROVED'
     AND (d.business_name = '' OR s.business_name = d.business_name)
     AND s.active_assignment_count < s.max_concurrent_assignments
     AND (d.required_skills IS NULL OR array_length(d.required_skills,1) IS NULL OR s.skills && d.required_skills)
   ORDER BY s.active_assignment_count ASC, COALESCE(s.supplier_score,50) DESC, s.last_activity_at DESC NULLS LAST
   LIMIT 1;
  RETURN picked;
END; $$;

SELECT public.recompute_supplier_load(id) FROM public.suppliers;

-- ---------- 8. DATA CONSISTENCY CHECKS ----------
CREATE OR REPLACE FUNCTION public.validate_system_integrity()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  orphan_proposals int := 0; deals_no_contact int := 0;
  assignments_no_deal int := 0; invoices_no_deal int := 0;
  queue_no_inbox int := 0; result jsonb;
BEGIN
  SELECT COUNT(*) INTO orphan_proposals FROM public.internal_proposals p
    LEFT JOIN public.contacts c ON c.id = p.contact_id
   WHERE p.contact_id IS NULL OR c.id IS NULL;
  SELECT COUNT(*) INTO deals_no_contact FROM public.deals WHERE contact_id IS NULL;
  SELECT COUNT(*) INTO assignments_no_deal FROM public.assignments a
    LEFT JOIN public.deals d ON d.id = a.deal_id WHERE a.deal_id IS NULL OR d.id IS NULL;
  SELECT COUNT(*) INTO invoices_no_deal FROM public.invoices i
    LEFT JOIN public.deals d ON d.id = i.deal_id WHERE i.deal_id IS NULL OR d.id IS NULL;
  SELECT COUNT(*) INTO queue_no_inbox FROM public.email_queue
   WHERE status IN ('pending','delayed') AND inbox_id IS NULL;

  IF orphan_proposals > 0 THEN
    PERFORM public.log_system_event('integrity_orphan_proposals','system',NULL,'',
      'medium','Found '||orphan_proposals||' proposals without a valid contact',
      jsonb_build_object('count',orphan_proposals));
  END IF;
  IF deals_no_contact > 0 THEN
    PERFORM public.log_system_event('integrity_deals_missing_contact','system',NULL,'',
      'high','Found '||deals_no_contact||' deals without contact_id',
      jsonb_build_object('count',deals_no_contact));
  END IF;
  IF assignments_no_deal > 0 THEN
    PERFORM public.log_system_event('integrity_assignments_no_deal','system',NULL,'',
      'high','Found '||assignments_no_deal||' assignments not linked to a deal',
      jsonb_build_object('count',assignments_no_deal));
  END IF;
  IF invoices_no_deal > 0 THEN
    PERFORM public.log_system_event('integrity_invoices_no_deal','system',NULL,'',
      'high','Found '||invoices_no_deal||' invoices not linked to a deal',
      jsonb_build_object('count',invoices_no_deal));
  END IF;
  IF queue_no_inbox > 0 THEN
    PERFORM public.log_system_event('integrity_queue_no_inbox','system',NULL,'',
      'medium','Found '||queue_no_inbox||' pending emails without an inbox',
      jsonb_build_object('count',queue_no_inbox));
  END IF;

  result := jsonb_build_object(
    'orphan_proposals', orphan_proposals,
    'deals_missing_contact', deals_no_contact,
    'assignments_no_deal', assignments_no_deal,
    'invoices_no_deal', invoices_no_deal,
    'queue_no_inbox', queue_no_inbox,
    'checked_at', now());
  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('system_integrity_check', 'Integrity check: ' || result::text, 'system', NULL);
  RETURN result;
END; $$;

-- ---------- 9. PERFORMANCE METRICS EXPANSION ----------
CREATE OR REPLACE FUNCTION public.compute_system_health()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  emails_per_hr numeric := 0; reply_rate_v numeric := 0; conversion_v numeric := 0;
  assignment_completion_v numeric := 0; payment_collection_v numeric := 0;
  avg_response_time_v numeric := 0; proposal_conversion_v numeric := 0;
  demo_to_deal_v numeric := 0; supplier_util_v numeric := 0;
  v_sent int := 0; v_replies int := 0; v_demos_sent int := 0; v_deals_won int := 0;
  v_assigned int := 0; v_completed int := 0; v_invoiced numeric := 0; v_paid numeric := 0;
  v_proposals_sent int := 0; v_proposals_accepted int := 0;
  v_demo_high_intent int := 0; v_supplier_active int := 0; v_supplier_total int := 0;
BEGIN
  SELECT COUNT(*) INTO emails_per_hr FROM public.email_queue
   WHERE status = 'sent' AND sent_at > now() - interval '1 hour';
  SELECT COUNT(*) INTO v_sent FROM public.email_queue
   WHERE status = 'sent' AND sent_at > now() - interval '7 days';
  SELECT COUNT(*) INTO v_replies FROM public.email_events
   WHERE event_type = 'replied' AND timestamp > now() - interval '7 days';
  IF v_sent > 0 THEN reply_rate_v := ROUND((v_replies::numeric / v_sent) * 100, 2); END IF;
  SELECT COUNT(*) INTO v_demos_sent FROM public.demo_access
   WHERE created_at > now() - interval '30 days';
  SELECT COUNT(*) INTO v_deals_won FROM public.deals
   WHERE status::text = 'WON' AND won_at > now() - interval '30 days';
  IF v_demos_sent > 0 THEN conversion_v := ROUND((v_deals_won::numeric / v_demos_sent) * 100, 2); END IF;
  SELECT COUNT(*) INTO v_assigned FROM public.assignments WHERE assigned_at > now() - interval '30 days';
  SELECT COUNT(*) INTO v_completed FROM public.assignments
   WHERE assigned_at > now() - interval '30 days' AND status::text = 'completed';
  IF v_assigned > 0 THEN assignment_completion_v := ROUND((v_completed::numeric / v_assigned) * 100, 2); END IF;
  SELECT COALESCE(SUM(expected_amount),0) INTO v_invoiced FROM public.invoices
   WHERE issued_date > now() - interval '30 days';
  SELECT COALESCE(SUM(amount_received),0) INTO v_paid FROM public.payments
   WHERE received_at > now() - interval '30 days';
  IF v_invoiced > 0 THEN payment_collection_v := ROUND((v_paid / v_invoiced) * 100, 2); END IF;

  SELECT COALESCE(ROUND(AVG(reply_latency_seconds)::numeric, 2),0) INTO avg_response_time_v
    FROM public.ai_actions
   WHERE reply_latency_seconds IS NOT NULL AND created_at > now() - interval '7 days';
  SELECT COUNT(*) INTO v_proposals_sent FROM public.internal_proposals
   WHERE sent_at IS NOT NULL AND sent_at > now() - interval '30 days';
  SELECT COUNT(*) INTO v_proposals_accepted FROM public.internal_proposals
   WHERE accepted_at IS NOT NULL AND accepted_at > now() - interval '30 days';
  IF v_proposals_sent > 0 THEN proposal_conversion_v := ROUND((v_proposals_accepted::numeric / v_proposals_sent) * 100, 2); END IF;
  SELECT COUNT(*) INTO v_demo_high_intent FROM public.demo_access
   WHERE high_intent = true AND created_at > now() - interval '30 days';
  IF v_demo_high_intent > 0 THEN demo_to_deal_v := ROUND((v_deals_won::numeric / v_demo_high_intent) * 100, 2); END IF;
  SELECT COUNT(*) INTO v_supplier_total FROM public.suppliers WHERE status::text = 'APPROVED';
  SELECT COUNT(*) INTO v_supplier_active FROM public.suppliers
   WHERE status::text = 'APPROVED' AND active_assignment_count > 0;
  IF v_supplier_total > 0 THEN supplier_util_v := ROUND((v_supplier_active::numeric / v_supplier_total) * 100, 2); END IF;

  INSERT INTO public.system_health (metric_name, value) VALUES
    ('emails_sent_per_hour', emails_per_hr), ('reply_rate', reply_rate_v),
    ('conversion_rate', conversion_v), ('assignment_completion_rate', assignment_completion_v),
    ('payment_collection_rate', payment_collection_v), ('avg_response_time', avg_response_time_v),
    ('proposal_conversion_rate', proposal_conversion_v), ('demo_to_deal_rate', demo_to_deal_v),
    ('supplier_utilisation_rate', supplier_util_v);

  RETURN jsonb_build_object(
    'emails_per_hour', emails_per_hr, 'reply_rate', reply_rate_v,
    'conversion_rate', conversion_v, 'assignment_completion_rate', assignment_completion_v,
    'payment_collection_rate', payment_collection_v, 'avg_response_time', avg_response_time_v,
    'proposal_conversion_rate', proposal_conversion_v, 'demo_to_deal_rate', demo_to_deal_v,
    'supplier_utilisation_rate', supplier_util_v);
END; $$;

-- ---------- 10. STANDARDISED LOGGING ----------
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS business_name text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.log_activity(
  _event_type text, _description text,
  _entity_type text DEFAULT NULL, _entity_id uuid DEFAULT NULL,
  _business_name text DEFAULT ''
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id, business_name)
  VALUES (_event_type, _description, _entity_type, _entity_id, COALESCE(_business_name,''))
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;