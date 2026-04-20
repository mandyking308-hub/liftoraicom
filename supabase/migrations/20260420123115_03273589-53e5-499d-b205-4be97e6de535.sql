-- 1. compliance_scores: trend + high_risk flag
ALTER TABLE public.compliance_scores
  ADD COLUMN IF NOT EXISTS previous_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_trend text NOT NULL DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS high_risk boolean NOT NULL DEFAULT false;

-- 2. compliance_events: resolution metadata
ALTER TABLE public.compliance_events
  ADD COLUMN IF NOT EXISTS resolution_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- 3. compliance_rules: hit_count
ALTER TABLE public.compliance_rules
  ADD COLUMN IF NOT EXISTS hit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_hit_at timestamptz;

-- 4. business_risk_scores
CREATE TABLE IF NOT EXISTS public.business_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL UNIQUE,
  score integer NOT NULL DEFAULT 0,
  previous_score integer NOT NULL DEFAULT 0,
  risk_trend text NOT NULL DEFAULT 'stable',
  high_risk boolean NOT NULL DEFAULT false,
  event_count integer NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_risk_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage business_risk_scores" ON public.business_risk_scores;
CREATE POLICY "admins manage business_risk_scores"
  ON public.business_risk_scores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. deals: compliance snapshot at close
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS compliance_score_at_close integer;

-- 6. Upgrade recompute_compliance_score → trend + high_risk
CREATE OR REPLACE FUNCTION public.recompute_compliance_score(_entity_type compliance_entity_type, _entity_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total int := 0; n int := 0; last_at timestamptz;
  prev_total int := 0;
  trend text := 'stable';
  is_high boolean := false;
  prev_score_val int := 0;
  bn text;
BEGIN
  -- current 7-day weighted total (open events)
  SELECT COALESCE(SUM(public.severity_weight(severity)), 0),
         COUNT(*), MAX(created_at)
    INTO total, n, last_at
    FROM public.compliance_events
   WHERE entity_type = _entity_type
     AND entity_id   = _entity_id
     AND resolved    = false
     AND created_at  > now() - interval '7 days';

  -- previous 7-day weighted total (8–14 days ago, all events)
  SELECT COALESCE(SUM(public.severity_weight(severity)), 0)
    INTO prev_total
    FROM public.compliance_events
   WHERE entity_type = _entity_type
     AND entity_id   = _entity_id
     AND created_at  > now() - interval '14 days'
     AND created_at <= now() - interval '7 days';

  IF total > 100 THEN total := 100; END IF;
  IF total < 0   THEN total := 0;   END IF;

  -- Trend
  IF total > prev_total + 5 THEN trend := 'up';
  ELSIF total < prev_total - 5 THEN trend := 'down';
  ELSE trend := 'stable';
  END IF;

  is_high := (total > 70);

  -- Capture previous score before upsert
  SELECT score INTO prev_score_val FROM public.compliance_scores
   WHERE entity_type = _entity_type AND entity_id = _entity_id;
  prev_score_val := COALESCE(prev_score_val, 0);

  INSERT INTO public.compliance_scores
    (entity_type, entity_id, score, previous_score, risk_trend, high_risk, event_count, last_event_at)
  VALUES (_entity_type, _entity_id, total, prev_score_val, trend, is_high, n, last_at)
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET previous_score = public.compliance_scores.score,
        score = EXCLUDED.score,
        risk_trend = EXCLUDED.risk_trend,
        high_risk = EXCLUDED.high_risk,
        event_count = EXCLUDED.event_count,
        last_event_at = EXCLUDED.last_event_at,
        updated_at = now();

  -- Cascade: refresh business risk score using the most recent business_name we can find
  SELECT business_name INTO bn FROM public.compliance_events
   WHERE entity_type = _entity_type AND entity_id = _entity_id
     AND COALESCE(business_name,'') <> ''
   ORDER BY created_at DESC LIMIT 1;
  IF bn IS NOT NULL AND bn <> '' THEN
    PERFORM public.recompute_business_risk_score(bn);
  END IF;

  RETURN total;
END; $$;

-- 7. Business-level risk scoring
CREATE OR REPLACE FUNCTION public.recompute_business_risk_score(_business_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total int := 0; prev_total int := 0; n int := 0;
  last_at timestamptz; trend text := 'stable'; is_high boolean := false;
  prev_score_val int := 0;
BEGIN
  IF COALESCE(_business_name,'') = '' THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(public.severity_weight(severity)), 0),
         COUNT(*), MAX(created_at)
    INTO total, n, last_at
    FROM public.compliance_events
   WHERE business_name = _business_name
     AND resolved      = false
     AND created_at    > now() - interval '7 days';

  SELECT COALESCE(SUM(public.severity_weight(severity)), 0)
    INTO prev_total
    FROM public.compliance_events
   WHERE business_name = _business_name
     AND created_at    > now() - interval '14 days'
     AND created_at   <= now() - interval '7 days';

  IF total > 100 THEN total := 100; END IF;
  IF total < 0   THEN total := 0;   END IF;

  IF total > prev_total + 5 THEN trend := 'up';
  ELSIF total < prev_total - 5 THEN trend := 'down';
  ELSE trend := 'stable';
  END IF;
  is_high := (total > 70);

  SELECT score INTO prev_score_val FROM public.business_risk_scores
   WHERE business_name = _business_name;
  prev_score_val := COALESCE(prev_score_val, 0);

  INSERT INTO public.business_risk_scores
    (business_name, score, previous_score, risk_trend, high_risk, event_count, last_event_at)
  VALUES (_business_name, total, prev_score_val, trend, is_high, n, last_at)
  ON CONFLICT (business_name) DO UPDATE
    SET previous_score = public.business_risk_scores.score,
        score = EXCLUDED.score,
        risk_trend = EXCLUDED.risk_trend,
        high_risk = EXCLUDED.high_risk,
        event_count = EXCLUDED.event_count,
        last_event_at = EXCLUDED.last_event_at,
        updated_at = now();

  RETURN total;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_all_business_risk_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT business_name FROM public.compliance_events
     WHERE COALESCE(business_name,'') <> ''
  LOOP
    PERFORM public.recompute_business_risk_score(r.business_name);
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

-- 8. Rule hit-count trigger
CREATE OR REPLACE FUNCTION public.bump_rule_hit_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rule_id IS NOT NULL THEN
    UPDATE public.compliance_rules
       SET hit_count = hit_count + 1,
           last_hit_at = now()
     WHERE id = NEW.rule_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bump_rule_hit_count ON public.compliance_events;
CREATE TRIGGER trg_bump_rule_hit_count
AFTER INSERT ON public.compliance_events
FOR EACH ROW EXECUTE FUNCTION public.bump_rule_hit_count();

-- 9. Resolution timestamp trigger
CREATE OR REPLACE FUNCTION public.stamp_compliance_event_resolution()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.resolved = true AND OLD.resolved = false THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSIF NEW.resolved = false AND OLD.resolved = true THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_stamp_compliance_resolution ON public.compliance_events;
CREATE TRIGGER trg_stamp_compliance_resolution
BEFORE UPDATE ON public.compliance_events
FOR EACH ROW EXECUTE FUNCTION public.stamp_compliance_event_resolution();

-- 10. Deal-close compliance snapshot
CREATE OR REPLACE FUNCTION public.snapshot_deal_compliance_on_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  contact_score int := 0;
  business_score int := 0;
BEGIN
  IF NEW.status = 'WON' AND (OLD.status IS DISTINCT FROM 'WON') THEN
    IF NEW.contact_id IS NOT NULL THEN
      SELECT COALESCE(score,0) INTO contact_score
        FROM public.compliance_scores
       WHERE entity_type = 'contact' AND entity_id = NEW.contact_id;
    END IF;
    IF COALESCE(NEW.business_name,'') <> '' THEN
      SELECT COALESCE(score,0) INTO business_score
        FROM public.business_risk_scores
       WHERE business_name = NEW.business_name;
    END IF;
    NEW.compliance_score_at_close := GREATEST(COALESCE(contact_score,0), COALESCE(business_score,0));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_snapshot_deal_compliance ON public.deals;
CREATE TRIGGER trg_snapshot_deal_compliance
BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.snapshot_deal_compliance_on_won();

-- 11. Backfill: initialize hit_count from existing events
UPDATE public.compliance_rules r
   SET hit_count = sub.cnt,
       last_hit_at = sub.last_at
  FROM (
    SELECT rule_id, COUNT(*) AS cnt, MAX(created_at) AS last_at
      FROM public.compliance_events
     WHERE rule_id IS NOT NULL
     GROUP BY rule_id
  ) sub
 WHERE r.id = sub.rule_id;

-- Backfill business risk scores
SELECT public.refresh_all_business_risk_scores();