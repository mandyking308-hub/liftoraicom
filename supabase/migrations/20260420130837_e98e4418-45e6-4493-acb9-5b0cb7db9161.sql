-- =====================================================
-- 1. DOMAIN-LEVEL REPUTATION SHIELD
-- =====================================================
ALTER TABLE public.sending_domains
  ADD COLUMN IF NOT EXISTS domain_reputation_score integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS reputation_updated_at timestamptz NOT NULL DEFAULT now();

-- =====================================================
-- 2. INBOX ROTATION MEMORY + SOFT-FAIL TRACKING
-- =====================================================
ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS last_used_sequence_position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0;

-- =====================================================
-- 3. TIMEZONE CONFIDENCE SCORE
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.timezone_confidence_level AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS timezone_confidence public.timezone_confidence_level NOT NULL DEFAULT 'medium';

-- Backfill: explicit timezone => high, country only => medium, neither => low
UPDATE public.contacts
SET timezone_confidence = CASE
  WHEN timezone IS NOT NULL AND timezone <> '' THEN 'high'::public.timezone_confidence_level
  WHEN country IS NOT NULL AND country <> '' THEN 'medium'::public.timezone_confidence_level
  ELSE 'low'::public.timezone_confidence_level
END;

-- =====================================================
-- 4. EMAIL QUEUE: RETRY + PRIORITY
-- =====================================================
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_email_queue_priority_scheduled
  ON public.email_queue (priority ASC, scheduled_at ASC)
  WHERE status IN ('pending', 'delayed', 'throttled');

-- =====================================================
-- 5. RECOMPUTE DOMAIN REPUTATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.recompute_domain_reputation(_domain_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_score numeric;
BEGIN
  SELECT COALESCE(AVG(reputation_score), 100)
  INTO avg_score
  FROM public.inboxes
  WHERE split_part(email_address, '@', 2) = _domain_name
    AND active = true;

  INSERT INTO public.sending_domains (domain_name, daily_limit, current_usage, reputation_score, warmup_stage, domain_reputation_score, reputation_updated_at)
  VALUES (_domain_name, 500, 0, ROUND(avg_score), 'stable', ROUND(avg_score), now())
  ON CONFLICT (domain_name) DO UPDATE
    SET domain_reputation_score = ROUND(avg_score),
        reputation_score = ROUND(avg_score),
        reputation_updated_at = now();
END;
$$;

-- Trigger to keep domain reputation in sync with inbox changes
CREATE OR REPLACE FUNCTION public.sync_domain_reputation_on_inbox_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dom text;
BEGIN
  dom := split_part(COALESCE(NEW.email_address, OLD.email_address), '@', 2);
  IF dom <> '' THEN
    PERFORM public.recompute_domain_reputation(dom);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_domain_reputation ON public.inboxes;
CREATE TRIGGER trg_sync_domain_reputation
AFTER INSERT OR UPDATE OF reputation_score, active, email_address ON public.inboxes
FOR EACH ROW
EXECUTE FUNCTION public.sync_domain_reputation_on_inbox_change();

-- =====================================================
-- 6. INBOX ROTATION (round-robin by last_used_sequence_position)
-- =====================================================
CREATE OR REPLACE FUNCTION public.pick_inbox_for_business(_business_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked_id uuid;
  next_pos integer;
BEGIN
  -- Round-robin: pick the inbox with the LOWEST last_used_sequence_position,
  -- breaking ties on highest reputation, then lowest current_send_count.
  SELECT id INTO picked_id
  FROM public.inboxes
  WHERE business_name = _business_name
    AND active = true
    AND reputation_score >= 20
    AND current_send_count < daily_send_limit
  ORDER BY last_used_sequence_position ASC, reputation_score DESC, current_send_count ASC
  LIMIT 1;

  IF picked_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Stamp rotation memory so the next pick chooses a different inbox
  SELECT COALESCE(MAX(last_used_sequence_position), 0) + 1
  INTO next_pos
  FROM public.inboxes
  WHERE business_name = _business_name;

  UPDATE public.inboxes
  SET last_used_sequence_position = next_pos
  WHERE id = picked_id;

  RETURN picked_id;
END;
$$;

-- =====================================================
-- 7. SOFT-FAIL RETRY HELPER
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_send_failure(_queue_id uuid, _error text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_retries integer;
  next_retry_at timestamptz;
  final_status text;
  delay_minutes integer;
BEGIN
  SELECT retry_count INTO current_retries
  FROM public.email_queue
  WHERE id = _queue_id;

  IF current_retries IS NULL THEN
    RETURN jsonb_build_object('error', 'queue_id_not_found');
  END IF;

  -- Exponential backoff: attempt 1 → 5 min, 2 → 20 min, 3 → 60 min
  delay_minutes := CASE current_retries
    WHEN 0 THEN 5
    WHEN 1 THEN 20
    WHEN 2 THEN 60
    ELSE 0
  END;

  IF current_retries >= 3 THEN
    final_status := 'failed';
    next_retry_at := NULL;
  ELSE
    final_status := 'pending';
    next_retry_at := now() + (delay_minutes || ' minutes')::interval;
  END IF;

  UPDATE public.email_queue
  SET retry_count = current_retries + 1,
      last_attempt_at = now(),
      status = final_status::public.email_queue_status,
      scheduled_at = COALESCE(next_retry_at, scheduled_at),
      block_reason = LEFT(_error, 200)
  WHERE id = _queue_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES (
    CASE WHEN final_status = 'failed' THEN 'send_failed_final' ELSE 'send_retry_scheduled' END,
    'Queue ' || _queue_id || ' attempt ' || (current_retries + 1) || ': ' || LEFT(_error, 200),
    'email_queue',
    _queue_id
  );

  RETURN jsonb_build_object(
    'status', final_status,
    'retry_count', current_retries + 1,
    'next_retry_at', next_retry_at
  );
END;
$$;

-- =====================================================
-- 8. UPDATE THROTTLE ENGINE: domain shield, low-confidence widening,
--    reply-priority bypass
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_send_throttle(_inbox_id uuid, _contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ib record;
  ct record;
  domain_name text;
  domain_score integer;
  domain_usage integer;
  domain_limit integer;
  warmup_max integer;
  days_in integer;
  effective_daily_limit integer;
  start_hr integer := 8;
  end_hr integer := 17;
  current_hr_local integer;
  is_reply_priority boolean := false;
BEGIN
  SELECT * INTO ib FROM public.inboxes WHERE id = _inbox_id;
  IF ib IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'INBOX_NOT_FOUND'); END IF;

  SELECT * INTO ct FROM public.contacts WHERE id = _contact_id;
  IF ct IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'CONTACT_NOT_FOUND'); END IF;

  -- Reply-first priority: if contact has replied, bypass window/throttle (still respect hard reputation pause)
  is_reply_priority := ct.last_replied_at IS NOT NULL
                       AND ct.last_replied_at > now() - interval '14 days';

  -- ===== HARD STOPS (apply even to reply priority) =====
  IF NOT ib.active THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'INBOX_INACTIVE',
      'retry_at', (now() + interval '6 hours')::text);
  END IF;

  IF ib.reputation_score < 20 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'REPUTATION_PAUSE',
      'retry_at', (now() + interval '24 hours')::text);
  END IF;

  -- Domain reputation shield
  domain_name := split_part(ib.email_address, '@', 2);
  SELECT domain_reputation_score, current_usage, daily_limit
  INTO domain_score, domain_usage, domain_limit
  FROM public.sending_domains
  WHERE sending_domains.domain_name = check_send_throttle.domain_name;

  IF domain_score IS NOT NULL AND domain_score < 20 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DOMAIN_REPUTATION_PAUSE',
      'retry_at', (now() + interval '24 hours')::text);
  END IF;

  -- ===== Reply-priority skips remaining checks =====
  IF is_reply_priority THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'REPLY_PRIORITY_BYPASS');
  END IF;

  -- ===== WARMUP CAP =====
  days_in := GREATEST(0, EXTRACT(EPOCH FROM (now() - ib.warmup_started_at))::int / 86400);
  warmup_max := CASE
    WHEN days_in < 3 THEN 10
    WHEN days_in < 7 THEN 25
    WHEN days_in < 14 THEN 50
    ELSE ib.daily_send_limit
  END;
  effective_daily_limit := LEAST(warmup_max, ib.daily_send_limit);

  -- Reduce by half if reputation borderline
  IF ib.reputation_score < 40 THEN
    effective_daily_limit := effective_daily_limit / 2;
  END IF;

  -- Reduce by half if domain reputation borderline
  IF domain_score IS NOT NULL AND domain_score < 40 THEN
    effective_daily_limit := effective_daily_limit / 2;
  END IF;

  -- ===== DAILY LIMIT =====
  IF ib.current_send_count >= effective_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DAILY_LIMIT_REACHED',
      'retry_at', (date_trunc('day', now()) + interval '1 day' + interval '8 hours')::text);
  END IF;

  -- ===== HOURLY LIMIT =====
  IF ib.hourly_window_start < now() - interval '1 hour' THEN
    UPDATE public.inboxes SET hourly_send_count = 0, hourly_window_start = now() WHERE id = _inbox_id;
  ELSIF ib.hourly_send_count >= ib.hourly_send_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'HOURLY_LIMIT_REACHED',
      'retry_at', (ib.hourly_window_start + interval '1 hour')::text);
  END IF;

  -- ===== DOMAIN DAILY LIMIT =====
  IF domain_limit IS NOT NULL AND domain_usage >= domain_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DOMAIN_DAILY_LIMIT',
      'retry_at', (date_trunc('day', now()) + interval '1 day' + interval '8 hours')::text);
  END IF;

  -- ===== SEND WINDOW (timezone-aware, widened for low confidence) =====
  IF ct.timezone_confidence = 'low' THEN
    start_hr := 7;
    end_hr := 19;
  ELSIF ct.timezone_confidence = 'medium' THEN
    start_hr := 8;
    end_hr := 18;
  ELSE
    start_hr := 8;
    end_hr := 17;
  END IF;

  -- Use contact timezone if present, fall back to UTC
  BEGIN
    current_hr_local := EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(NULLIF(ct.timezone, ''), 'UTC')))::int;
  EXCEPTION WHEN OTHERS THEN
    current_hr_local := EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC'))::int;
  END;

  IF current_hr_local < start_hr OR current_hr_local >= end_hr THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'OUTSIDE_SEND_WINDOW',
      'retry_at', (date_trunc('day', now()) + interval '1 day' + (start_hr || ' hours')::interval)::text);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'OK');
END;
$$;

-- =====================================================
-- 9. AUTO-MAINTAIN timezone_confidence on contact upsert
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_timezone_confidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.timezone_confidence := CASE
    WHEN NEW.timezone IS NOT NULL AND NEW.timezone <> '' THEN 'high'::public.timezone_confidence_level
    WHEN NEW.country IS NOT NULL AND NEW.country <> '' THEN 'medium'::public.timezone_confidence_level
    ELSE 'low'::public.timezone_confidence_level
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_timezone_confidence ON public.contacts;
CREATE TRIGGER trg_set_timezone_confidence
BEFORE INSERT OR UPDATE OF timezone, country ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.set_timezone_confidence();

-- =====================================================
-- 10. AUTO-SET reply priority on email_queue when contact has replied
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_queue_priority_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_replied boolean;
BEGIN
  SELECT (last_replied_at IS NOT NULL AND last_replied_at > now() - interval '14 days')
  INTO has_replied
  FROM public.contacts
  WHERE id = NEW.contact_id;

  IF has_replied THEN
    NEW.priority := 10; -- high priority (lower number = higher priority)
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_queue_priority ON public.email_queue;
CREATE TRIGGER trg_set_queue_priority
BEFORE INSERT ON public.email_queue
FOR EACH ROW
EXECUTE FUNCTION public.set_queue_priority_on_reply();

-- Initial backfill of domain reputation for existing inboxes
DO $$
DECLARE
  d text;
BEGIN
  FOR d IN SELECT DISTINCT split_part(email_address, '@', 2) FROM public.inboxes WHERE email_address LIKE '%@%'
  LOOP
    PERFORM public.recompute_domain_reputation(d);
  END LOOP;
END $$;