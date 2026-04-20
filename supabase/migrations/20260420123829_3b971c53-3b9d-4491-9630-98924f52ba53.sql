-- ============================================================
-- 1. ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.priority_entity_type AS ENUM ('contact','conversation','deal','assignment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.priority_level AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.system_task_type AS ENUM ('follow_up','review','escalate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.system_task_status AS ENUM ('pending','in_progress','completed','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.priority_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.priority_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  business_name text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority_level public.priority_level NOT NULL DEFAULT 'low',
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_priority_scores_score ON public.priority_scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_priority_scores_level ON public.priority_scores (priority_level);
CREATE INDEX IF NOT EXISTS idx_priority_scores_business ON public.priority_scores (business_name);

ALTER TABLE public.priority_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage priority_scores" ON public.priority_scores;
CREATE POLICY "admins manage priority_scores" ON public.priority_scores
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.system_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.priority_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  business_name text NOT NULL DEFAULT '',
  task_type public.system_task_type NOT NULL,
  priority_score integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  status public.system_task_status NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_tasks_status_priority ON public.system_tasks (status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_system_tasks_entity ON public.system_tasks (entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_system_task
  ON public.system_tasks (entity_type, entity_id, task_type)
  WHERE status IN ('pending','in_progress');

ALTER TABLE public.system_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage system_tasks" ON public.system_tasks;
CREATE POLICY "admins manage system_tasks" ON public.system_tasks
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 3. HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.priority_level_from_score(_s integer)
RETURNS public.priority_level
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _s >= 81 THEN 'critical'::public.priority_level
    WHEN _s >= 61 THEN 'high'::public.priority_level
    WHEN _s >= 31 THEN 'medium'::public.priority_level
    ELSE 'low'::public.priority_level
  END;
$$;

CREATE OR REPLACE FUNCTION public.compliance_score_for(_etype text, _eid uuid)
RETURNS integer
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT score FROM public.compliance_scores
                    WHERE entity_type::text = _etype AND entity_id = _eid), 0);
$$;

-- ============================================================
-- 4. PER-ENTITY SCORING
-- ============================================================
CREATE OR REPLACE FUNCTION public.priority_score_deal(_deal_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  d public.deals;
  mid numeric := 0;
  revenue_f numeric := 0;
  prob_f numeric := 0;
  urgency_f numeric := 0;
  engagement_f numeric := 0;
  risk_f numeric := 0;
  days_idle int := 0;
  has_invoice_overdue boolean := false;
  demo_uses int := 0;
  raw numeric := 0;
  final_score int := 0;
  factors jsonb;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id = _deal_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF d.status::text IN ('WON','LOST') THEN
    DELETE FROM public.priority_scores WHERE entity_type = 'deal' AND entity_id = _deal_id;
    RETURN;
  END IF;

  mid := (COALESCE(d.estimated_value_min,0) + COALESCE(d.estimated_value_max,0)) / 2.0;
  revenue_f := LEAST(100, (mid / 1000.0));

  prob_f := COALESCE(d.probability, 0);
  IF d.status::text = 'QUALIFIED' THEN prob_f := prob_f + 15; END IF;
  IF d.status::text = 'PROPOSAL_SENT' THEN prob_f := prob_f + 25; END IF;
  IF prob_f > 100 THEN prob_f := 100; END IF;

  days_idle := EXTRACT(EPOCH FROM (now() - d.updated_at)) / 86400;
  urgency_f := LEAST(100, days_idle * 8);
  SELECT EXISTS(SELECT 1 FROM public.invoices WHERE deal_id = _deal_id AND status = 'OVERDUE')
    INTO has_invoice_overdue;
  IF has_invoice_overdue THEN urgency_f := LEAST(100, urgency_f + 30); END IF;

  IF d.contact_id IS NOT NULL THEN
    SELECT COUNT(*) INTO demo_uses
      FROM public.demo_events de
      JOIN public.demo_access da ON da.id = de.demo_id
     WHERE da.contact_id = d.contact_id
       AND de.timestamp > now() - interval '14 days';
    engagement_f := LEAST(100, demo_uses * 12);
  END IF;

  IF d.contact_id IS NOT NULL THEN
    risk_f := public.compliance_score_for('contact', d.contact_id);
  END IF;

  raw := (revenue_f * 0.30) + (prob_f * 0.25) + (urgency_f * 0.20)
       + (engagement_f * 0.15) - (risk_f * 0.10);
  final_score := GREATEST(0, LEAST(100, ROUND(raw)::int));

  factors := jsonb_build_object(
    'revenue', ROUND(revenue_f,1),
    'probability', ROUND(prob_f,1),
    'urgency', ROUND(urgency_f,1),
    'engagement', ROUND(engagement_f,1),
    'risk', ROUND(risk_f,1),
    'mid_value', mid,
    'days_idle', days_idle,
    'demo_uses_14d', demo_uses,
    'invoice_overdue', has_invoice_overdue,
    'status', d.status::text
  );

  INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
  VALUES ('deal', _deal_id, COALESCE(d.business_name,''), final_score, factors,
          public.priority_level_from_score(final_score), now())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score,
        factors = EXCLUDED.factors,
        priority_level = EXCLUDED.priority_level,
        business_name = EXCLUDED.business_name,
        last_updated = now();
END; $$;

CREATE OR REPLACE FUNCTION public.priority_score_assignment(_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a public.assignments;
  d public.deals;
  revenue_f numeric := 0;
  prob_f numeric := 60;
  urgency_f numeric := 0;
  engagement_f numeric := 0;
  risk_f numeric := 0;
  raw numeric := 0;
  final_score int := 0;
  mid numeric := 0;
  days_to_due int;
  factors jsonb;
BEGIN
  SELECT * INTO a FROM public.assignments WHERE id = _assignment_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF a.status::text IN ('completed','failed') THEN
    DELETE FROM public.priority_scores WHERE entity_type = 'assignment' AND entity_id = _assignment_id;
    RETURN;
  END IF;

  SELECT * INTO d FROM public.deals WHERE id = a.deal_id;
  mid := (COALESCE(d.estimated_value_min,0) + COALESCE(d.estimated_value_max,0)) / 2.0;
  revenue_f := LEAST(100, mid / 1000.0);

  IF a.expected_completion_date IS NOT NULL THEN
    days_to_due := (a.expected_completion_date - CURRENT_DATE);
    urgency_f := CASE
      WHEN days_to_due < 0 THEN 100
      WHEN days_to_due <= 1 THEN 90
      WHEN days_to_due <= 3 THEN 70
      WHEN days_to_due <= 7 THEN 40
      ELSE 20 END;
  ELSE
    urgency_f := 50;
  END IF;
  IF a.sla_status::text = 'overdue' THEN urgency_f := 100;
  ELSIF a.sla_status::text = 'at_risk' THEN urgency_f := GREATEST(urgency_f, 80);
  END IF;

  IF a.status::text = 'in_progress' THEN engagement_f := 70;
  ELSIF a.acknowledged_at IS NOT NULL THEN engagement_f := 50;
  ELSE engagement_f := 20;
  END IF;

  risk_f := public.compliance_score_for('assignment', _assignment_id);

  raw := (revenue_f * 0.30) + (prob_f * 0.25) + (urgency_f * 0.20)
       + (engagement_f * 0.15) - (risk_f * 0.10);
  final_score := GREATEST(0, LEAST(100, ROUND(raw)::int));

  factors := jsonb_build_object(
    'revenue', ROUND(revenue_f,1),
    'probability', ROUND(prob_f,1),
    'urgency', ROUND(urgency_f,1),
    'engagement', ROUND(engagement_f,1),
    'risk', ROUND(risk_f,1),
    'sla_status', a.sla_status::text,
    'status', a.status::text,
    'acknowledged', a.acknowledged_at IS NOT NULL
  );

  INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
  VALUES ('assignment', _assignment_id, COALESCE(a.business_name,''), final_score, factors,
          public.priority_level_from_score(final_score), now())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score, factors = EXCLUDED.factors,
        priority_level = EXCLUDED.priority_level,
        business_name = EXCLUDED.business_name, last_updated = now();
END; $$;

CREATE OR REPLACE FUNCTION public.priority_score_contact(_contact_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c public.contacts;
  open_deal_value numeric := 0;
  revenue_f numeric := 0;
  prob_f numeric := 30;
  urgency_f numeric := 0;
  engagement_f numeric := 0;
  risk_f numeric := 0;
  raw numeric := 0;
  final_score int := 0;
  hours_since_reply int;
  demo_uses int := 0;
  factors jsonb;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF c.status::text IN ('CLIENT','DO_NOT_CONTACT','SUPPLIER') THEN
    DELETE FROM public.priority_scores WHERE entity_type = 'contact' AND entity_id = _contact_id;
    RETURN;
  END IF;

  SELECT COALESCE(MAX((estimated_value_min + estimated_value_max)/2.0), 0)
    INTO open_deal_value
    FROM public.deals WHERE contact_id = _contact_id AND status::text NOT IN ('WON','LOST');
  revenue_f := LEAST(100, open_deal_value / 1000.0);

  prob_f := CASE c.status::text
    WHEN 'QUALIFIED' THEN 70
    WHEN 'ENGAGED' THEN 50
    WHEN 'CONTACTED' THEN 30
    WHEN 'NEW' THEN 20
    ELSE 10 END;

  IF c.last_replied_at IS NOT NULL THEN
    hours_since_reply := EXTRACT(EPOCH FROM (now() - c.last_replied_at)) / 3600;
    urgency_f := CASE
      WHEN hours_since_reply <= 4 THEN 95
      WHEN hours_since_reply <= 24 THEN 75
      WHEN hours_since_reply <= 72 THEN 50
      ELSE 25 END;
  ELSE
    urgency_f := 20;
  END IF;

  SELECT COUNT(*) INTO demo_uses
    FROM public.demo_events de
    JOIN public.demo_access da ON da.id = de.demo_id
   WHERE da.contact_id = _contact_id AND de.timestamp > now() - interval '14 days';
  engagement_f := LEAST(100, demo_uses * 15 + (CASE WHEN c.conversation_active THEN 30 ELSE 0 END));

  risk_f := public.compliance_score_for('contact', _contact_id);

  raw := (revenue_f * 0.30) + (prob_f * 0.25) + (urgency_f * 0.20)
       + (engagement_f * 0.15) - (risk_f * 0.10);
  final_score := GREATEST(0, LEAST(100, ROUND(raw)::int));

  factors := jsonb_build_object(
    'revenue', ROUND(revenue_f,1),
    'probability', ROUND(prob_f,1),
    'urgency', ROUND(urgency_f,1),
    'engagement', ROUND(engagement_f,1),
    'risk', ROUND(risk_f,1),
    'open_deal_value', open_deal_value,
    'demo_uses_14d', demo_uses,
    'conversation_active', c.conversation_active,
    'status', c.status::text
  );

  INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
  VALUES ('contact', _contact_id, COALESCE(c.assigned_business,''), final_score, factors,
          public.priority_level_from_score(final_score), now())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score, factors = EXCLUDED.factors,
        priority_level = EXCLUDED.priority_level,
        business_name = EXCLUDED.business_name, last_updated = now();
END; $$;

CREATE OR REPLACE FUNCTION public.priority_score_conversation(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  conv public.conversations;
  revenue_f numeric := 0;
  prob_f numeric := 40;
  urgency_f numeric := 0;
  engagement_f numeric := 0;
  risk_f numeric := 0;
  raw numeric := 0;
  final_score int := 0;
  hours_since int;
  open_deal_value numeric := 0;
  factors jsonb;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = _conversation_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF conv.status::text NOT IN ('OPEN','open','PENDING') THEN
    DELETE FROM public.priority_scores WHERE entity_type = 'conversation' AND entity_id = _conversation_id;
    RETURN;
  END IF;

  SELECT COALESCE(MAX((estimated_value_min + estimated_value_max)/2.0), 0)
    INTO open_deal_value
    FROM public.deals WHERE contact_id = conv.contact_id AND status::text NOT IN ('WON','LOST');
  revenue_f := LEAST(100, open_deal_value / 1000.0);

  hours_since := EXTRACT(EPOCH FROM (now() - conv.last_message_at)) / 3600;
  urgency_f := CASE
    WHEN hours_since <= 2 THEN 95
    WHEN hours_since <= 24 THEN 70
    WHEN hours_since <= 72 THEN 35
    ELSE 5 END;

  engagement_f := LEAST(100, 40 + COALESCE(conv.priority_boost,0) * 10);

  risk_f := public.compliance_score_for('contact', conv.contact_id);

  raw := (revenue_f * 0.30) + (prob_f * 0.25) + (urgency_f * 0.20)
       + (engagement_f * 0.15) - (risk_f * 0.10);
  final_score := GREATEST(0, LEAST(100, ROUND(raw)::int));

  factors := jsonb_build_object(
    'revenue', ROUND(revenue_f,1),
    'probability', ROUND(prob_f,1),
    'urgency', ROUND(urgency_f,1),
    'engagement', ROUND(engagement_f,1),
    'risk', ROUND(risk_f,1),
    'hours_since_last_message', hours_since,
    'priority_boost', COALESCE(conv.priority_boost,0),
    'last_intent', conv.last_intent
  );

  INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
  VALUES ('conversation', _conversation_id, COALESCE(conv.business_name,''), final_score, factors,
          public.priority_level_from_score(final_score), now())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score, factors = EXCLUDED.factors,
        priority_level = EXCLUDED.priority_level,
        business_name = EXCLUDED.business_name, last_updated = now();
END; $$;

-- ============================================================
-- 5. DISPATCHER + TASK GENERATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_system_tasks_from_priority(
  _entity_type public.priority_entity_type, _entity_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ps public.priority_scores;
  csc int := 0;
  bn text := '';
BEGIN
  SELECT * INTO ps FROM public.priority_scores
   WHERE entity_type = _entity_type AND entity_id = _entity_id;
  IF NOT FOUND THEN RETURN; END IF;
  bn := COALESCE(ps.business_name,'');

  IF _entity_type = 'assignment' THEN
    IF EXISTS (SELECT 1 FROM public.assignments
                WHERE id = _entity_id
                  AND sla_status::text IN ('at_risk','overdue')
                  AND status::text NOT IN ('completed','failed')) THEN
      INSERT INTO public.system_tasks (entity_type, entity_id, business_name, task_type, priority_score, reason)
      VALUES (_entity_type, _entity_id, bn, 'review', ps.score, 'Assignment SLA at risk or overdue')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF _entity_type = 'deal' THEN
    IF EXISTS (
      SELECT 1 FROM public.internal_proposals ip
       WHERE ip.deal_id = _entity_id
         AND ip.status::text = 'viewed'
         AND ip.viewed_at IS NOT NULL
         AND ip.viewed_at < now() - interval '24 hours'
         AND ip.follow_up_completed_at IS NULL
    ) THEN
      INSERT INTO public.system_tasks (entity_type, entity_id, business_name, task_type, priority_score, reason)
      VALUES (_entity_type, _entity_id, bn, 'follow_up', ps.score, 'Proposal viewed >24h ago, no follow-up')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  csc := public.compliance_score_for(_entity_type::text, _entity_id);
  IF csc > 70 THEN
    INSERT INTO public.system_tasks (entity_type, entity_id, business_name, task_type, priority_score, reason)
    VALUES (_entity_type, _entity_id, bn, 'escalate', ps.score,
            'Compliance score ' || csc || ' exceeds 70 — review required')
    ON CONFLICT DO NOTHING;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.recalculate_priority(_entity_type public.priority_entity_type, _entity_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  CASE _entity_type
    WHEN 'deal' THEN PERFORM public.priority_score_deal(_entity_id);
    WHEN 'assignment' THEN PERFORM public.priority_score_assignment(_entity_id);
    WHEN 'contact' THEN PERFORM public.priority_score_contact(_entity_id);
    WHEN 'conversation' THEN PERFORM public.priority_score_conversation(_entity_id);
  END CASE;
  PERFORM public.generate_system_tasks_from_priority(_entity_type, _entity_id);
END; $$;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_priority_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recalculate_priority('deal', NEW.id);
  IF NEW.contact_id IS NOT NULL THEN
    PERFORM public.recalculate_priority('contact', NEW.contact_id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_priority_deal ON public.deals;
CREATE TRIGGER trg_priority_deal
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.trg_priority_deal();

CREATE OR REPLACE FUNCTION public.trg_priority_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recalculate_priority('assignment', NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_priority_assignment ON public.assignments;
CREATE TRIGGER trg_priority_assignment
AFTER INSERT OR UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.trg_priority_assignment();

CREATE OR REPLACE FUNCTION public.trg_priority_conversation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recalculate_priority('conversation', NEW.id);
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_priority_conversation ON public.conversations;
CREATE TRIGGER trg_priority_conversation
AFTER INSERT OR UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.trg_priority_conversation();

CREATE OR REPLACE FUNCTION public.trg_priority_communication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE conv_id uuid;
BEGIN
  PERFORM public.recalculate_priority('contact', NEW.contact_id);
  SELECT id INTO conv_id FROM public.conversations WHERE contact_id = NEW.contact_id LIMIT 1;
  IF conv_id IS NOT NULL THEN
    PERFORM public.recalculate_priority('conversation', conv_id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_priority_communication ON public.communications;
CREATE TRIGGER trg_priority_communication
AFTER INSERT ON public.communications
FOR EACH ROW EXECUTE FUNCTION public.trg_priority_communication();

CREATE OR REPLACE FUNCTION public.trg_priority_demo_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  cid uuid; did uuid;
BEGIN
  SELECT contact_id INTO cid FROM public.demo_access WHERE id = NEW.demo_id;
  IF cid IS NOT NULL THEN
    PERFORM public.recalculate_priority('contact', cid);
    SELECT id INTO did FROM public.deals WHERE contact_id = cid AND status::text NOT IN ('WON','LOST') LIMIT 1;
    IF did IS NOT NULL THEN
      PERFORM public.recalculate_priority('deal', did);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_priority_demo_event ON public.demo_events;
CREATE TRIGGER trg_priority_demo_event
AFTER INSERT ON public.demo_events
FOR EACH ROW EXECUTE FUNCTION public.trg_priority_demo_event();

CREATE OR REPLACE FUNCTION public.trg_priority_from_compliance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF NEW.entity_type::text IN ('contact','deal','assignment','conversation') THEN
    PERFORM public.recalculate_priority(NEW.entity_type::text::public.priority_entity_type, NEW.entity_id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_priority_from_compliance ON public.compliance_scores;
CREATE TRIGGER trg_priority_from_compliance
AFTER INSERT OR UPDATE OF score ON public.compliance_scores
FOR EACH ROW EXECUTE FUNCTION public.trg_priority_from_compliance();

-- ============================================================
-- 7. VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.high_priority_contacts AS
SELECT ps.*, c.email, c.name AS contact_name, c.company, c.status AS contact_status
  FROM public.priority_scores ps
  JOIN public.contacts c ON c.id = ps.entity_id
 WHERE ps.entity_type = 'contact'
   AND ps.priority_level IN ('high','critical')
 ORDER BY ps.score DESC;

CREATE OR REPLACE VIEW public.high_priority_deals AS
SELECT ps.*, d.deal_name, d.status AS deal_status, d.estimated_value_min, d.estimated_value_max, d.contact_id
  FROM public.priority_scores ps
  JOIN public.deals d ON d.id = ps.entity_id
 WHERE ps.entity_type = 'deal'
   AND ps.priority_level IN ('high','critical')
 ORDER BY ps.score DESC;

CREATE OR REPLACE VIEW public.at_risk_assignments AS
SELECT ps.*, a.status AS assignment_status, a.sla_status, a.expected_completion_date,
       a.supplier_id, a.deal_id
  FROM public.priority_scores ps
  JOIN public.assignments a ON a.id = ps.entity_id
 WHERE ps.entity_type = 'assignment'
   AND (a.sla_status::text IN ('at_risk','overdue') OR ps.priority_level IN ('high','critical'))
 ORDER BY ps.score DESC;

CREATE OR REPLACE VIEW public.hot_conversations AS
SELECT ps.*, conv.contact_id, conv.last_message_at, conv.last_intent, conv.status AS conv_status
  FROM public.priority_scores ps
  JOIN public.conversations conv ON conv.id = ps.entity_id
 WHERE ps.entity_type = 'conversation'
   AND ps.priority_level IN ('high','critical')
 ORDER BY ps.score DESC;

-- ============================================================
-- 8. BACKFILL
-- ============================================================
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.deals WHERE status::text NOT IN ('WON','LOST') LOOP
    PERFORM public.recalculate_priority('deal', r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.assignments WHERE status::text NOT IN ('completed','failed') LOOP
    PERFORM public.recalculate_priority('assignment', r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.contacts WHERE status::text NOT IN ('CLIENT','DO_NOT_CONTACT','SUPPLIER') LOOP
    PERFORM public.recalculate_priority('contact', r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.conversations WHERE status::text IN ('OPEN','open') LOOP
    PERFORM public.recalculate_priority('conversation', r.id);
  END LOOP;
END $$;