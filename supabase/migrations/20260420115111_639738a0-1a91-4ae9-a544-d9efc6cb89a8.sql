-- 1. New columns on internal_proposals
ALTER TABLE public.internal_proposals
  ADD COLUMN IF NOT EXISTS follow_up_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS proposal_score integer NOT NULL DEFAULT 0;

-- 2. Demo events: session duration
ALTER TABLE public.demo_events
  ADD COLUMN IF NOT EXISTS session_duration_seconds integer NOT NULL DEFAULT 0;

-- 3. Lock: one active proposal per contact per business
-- Active = status in (draft, sent, viewed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_internal_proposals_one_active_per_contact
  ON public.internal_proposals (contact_id, business_name)
  WHERE status IN ('draft','sent','viewed');

-- 4. Trigger: auto-set follow_up_due_at when proposal becomes viewed
CREATE OR REPLACE FUNCTION public.set_proposal_followup_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'viewed' AND (OLD.status IS DISTINCT FROM 'viewed') THEN
    NEW.viewed_at := COALESCE(NEW.viewed_at, now());
    NEW.follow_up_due_at := COALESCE(NEW.follow_up_due_at, NEW.viewed_at + interval '48 hours');
  END IF;

  -- Clear follow-up when accepted/rejected/expired
  IF NEW.status IN ('accepted','rejected','expired') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.follow_up_completed_at := COALESCE(NEW.follow_up_completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_proposal_followup_due ON public.internal_proposals;
CREATE TRIGGER trg_set_proposal_followup_due
  BEFORE UPDATE ON public.internal_proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_proposal_followup_due();

-- 5. Function: list proposals needing follow-up
CREATE OR REPLACE FUNCTION public.proposals_needing_followup()
RETURNS SETOF public.internal_proposals
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.internal_proposals
   WHERE status = 'viewed'
     AND follow_up_due_at IS NOT NULL
     AND follow_up_due_at <= now()
     AND follow_up_completed_at IS NULL
   ORDER BY follow_up_due_at ASC;
$$;

-- 6. Function: compute proposal_score (0-100)
-- Heuristic: 50 base if accepted, +20 per demo access (cap 30), +10 if total session > 60s, +10 if high_intent
CREATE OR REPLACE FUNCTION public.recompute_proposal_score(_proposal_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.internal_proposals;
  d public.demo_access;
  total_seconds integer := 0;
  score integer := 0;
BEGIN
  SELECT * INTO p FROM public.internal_proposals WHERE id = _proposal_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF p.status = 'accepted' THEN score := score + 50; END IF;
  IF p.viewed_at IS NOT NULL THEN score := score + 10; END IF;

  SELECT * INTO d FROM public.demo_access WHERE proposal_id = _proposal_id LIMIT 1;
  IF FOUND THEN
    score := score + LEAST(d.access_count * 10, 30);
    IF d.high_intent THEN score := score + 10; END IF;

    SELECT COALESCE(SUM(session_duration_seconds),0) INTO total_seconds
      FROM public.demo_events WHERE demo_id = d.id;
    IF total_seconds > 60 THEN score := score + 10; END IF;
  END IF;

  IF score > 100 THEN score := 100; END IF;
  IF score < 0 THEN score := 0; END IF;

  UPDATE public.internal_proposals SET proposal_score = score, updated_at = now()
   WHERE id = _proposal_id;

  RETURN score;
END;
$$;

-- 7. Auto-recompute score when a demo_event is logged
CREATE OR REPLACE FUNCTION public.trg_recompute_score_on_demo_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT proposal_id INTO pid FROM public.demo_access WHERE id = NEW.demo_id;
  IF pid IS NOT NULL THEN
    PERFORM public.recompute_proposal_score(pid);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_demo_event_score ON public.demo_events;
CREATE TRIGGER trg_demo_event_score
  AFTER INSERT ON public.demo_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_score_on_demo_event();

-- 8. Update log_demo_event to also accept session_duration_seconds in metadata
CREATE OR REPLACE FUNCTION public.log_demo_event(_token text, _event_type text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.demo_access;
  ev_type public.demo_event_type;
  duration int := 0;
BEGIN
  SELECT * INTO d FROM public.demo_access WHERE demo_token = _token LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_TOKEN'); END IF;

  IF d.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'DEMO_'|| upper(d.status::text));
  END IF;

  IF d.expires_at < now() THEN
    UPDATE public.demo_access SET status = 'expired', updated_at = now() WHERE id = d.id;
    RETURN jsonb_build_object('ok', false, 'error', 'DEMO_EXPIRED');
  END IF;

  BEGIN
    ev_type := _event_type::public.demo_event_type;
  EXCEPTION WHEN invalid_text_representation THEN
    ev_type := 'view';
  END;

  duration := COALESCE((_metadata->>'session_duration_seconds')::int, 0);

  INSERT INTO public.demo_events (demo_id, event_type, metadata, session_duration_seconds)
  VALUES (d.id, ev_type, COALESCE(_metadata,'{}'::jsonb), duration);

  UPDATE public.demo_access
     SET access_count = access_count + 1,
         last_accessed_at = now(),
         high_intent = (access_count + 1) >= 2,
         updated_at = now()
   WHERE id = d.id;

  RETURN jsonb_build_object('ok', true, 'demo_id', d.id, 'access_count', d.access_count + 1);
END;
$$;