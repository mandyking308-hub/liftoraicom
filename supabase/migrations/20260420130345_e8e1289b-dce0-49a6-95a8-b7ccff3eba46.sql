
-- ============= TIMEZONE ON CONTACTS =============
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS country  text;

-- ============= INBOX EXTENSIONS =============
ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS hourly_send_limit  integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS last_sent_at       timestamptz,
  ADD COLUMN IF NOT EXISTS reputation_score   integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS warmup_started_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS hourly_send_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_window_start timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  ADD COLUMN IF NOT EXISTS paused_reason      text NOT NULL DEFAULT '';

ALTER TABLE public.inboxes
  ALTER COLUMN daily_send_limit SET DEFAULT 80;

-- Clamp reputation
ALTER TABLE public.inboxes
  DROP CONSTRAINT IF EXISTS inboxes_reputation_score_chk;
ALTER TABLE public.inboxes
  ADD CONSTRAINT inboxes_reputation_score_chk
  CHECK (reputation_score BETWEEN 0 AND 100);

-- ============= SEND WINDOWS =============
CREATE TABLE IF NOT EXISTS public.send_windows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region      text NOT NULL UNIQUE,
  start_hour  integer NOT NULL DEFAULT 8  CHECK (start_hour BETWEEN 0 AND 23),
  end_hour    integer NOT NULL DEFAULT 17 CHECK (end_hour   BETWEEN 1 AND 24),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_hour > start_hour)
);

ALTER TABLE public.send_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders manage send_windows" ON public.send_windows;
CREATE POLICY "Founders manage send_windows" ON public.send_windows
  FOR ALL USING (public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_send_windows_updated_at
  BEFORE UPDATE ON public.send_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.send_windows (region, start_hour, end_hour)
VALUES ('GLOBAL', 8, 17)
ON CONFLICT (region) DO NOTHING;

-- ============= SENDING DOMAINS =============
CREATE TYPE public.warmup_stage AS ENUM ('new','warming','stable');

CREATE TABLE IF NOT EXISTS public.sending_domains (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name        text NOT NULL UNIQUE,
  daily_limit        integer NOT NULL DEFAULT 500,
  current_usage      integer NOT NULL DEFAULT 0,
  usage_window_start timestamptz NOT NULL DEFAULT date_trunc('day', now()),
  reputation_score   integer NOT NULL DEFAULT 100 CHECK (reputation_score BETWEEN 0 AND 100),
  warmup_stage       public.warmup_stage NOT NULL DEFAULT 'new',
  warmup_started_at  timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sending_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders manage sending_domains" ON public.sending_domains;
CREATE POLICY "Founders manage sending_domains" ON public.sending_domains
  FOR ALL USING (public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_sending_domains_updated_at
  BEFORE UPDATE ON public.sending_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= REPUTATION EVENTS =============
CREATE TYPE public.reputation_event_type AS ENUM ('bounce','spam','reply','open','sent','delivered');

CREATE TABLE IF NOT EXISTS public.reputation_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id      uuid NOT NULL REFERENCES public.inboxes(id) ON DELETE CASCADE,
  domain_id     uuid REFERENCES public.sending_domains(id) ON DELETE SET NULL,
  contact_id    uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  event_type    public.reputation_event_type NOT NULL,
  impact_score  integer NOT NULL DEFAULT 0,
  details       text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_inbox     ON public.reputation_events(inbox_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_events_domain    ON public.reputation_events(domain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reputation_events_type_time ON public.reputation_events(event_type, created_at DESC);

ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders read reputation_events" ON public.reputation_events;
CREATE POLICY "Founders read reputation_events" ON public.reputation_events
  FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

-- ============= EMAIL QUEUE STATUS EXTENSIONS =============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum
                  WHERE enumtypid = 'public.email_queue_status'::regtype
                    AND enumlabel = 'delayed') THEN
    ALTER TYPE public.email_queue_status ADD VALUE 'delayed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum
                  WHERE enumtypid = 'public.email_queue_status'::regtype
                    AND enumlabel = 'throttled') THEN
    ALTER TYPE public.email_queue_status ADD VALUE 'throttled';
  END IF;
END$$;

-- ============= COUNTRY -> TIMEZONE FALLBACK =============
CREATE OR REPLACE FUNCTION public.country_to_timezone(_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(coalesce(_country,''))
    WHEN 'US' THEN 'America/New_York'
    WHEN 'CA' THEN 'America/Toronto'
    WHEN 'MX' THEN 'America/Mexico_City'
    WHEN 'BR' THEN 'America/Sao_Paulo'
    WHEN 'AR' THEN 'America/Argentina/Buenos_Aires'
    WHEN 'GB' THEN 'Europe/London'
    WHEN 'UK' THEN 'Europe/London'
    WHEN 'IE' THEN 'Europe/Dublin'
    WHEN 'FR' THEN 'Europe/Paris'
    WHEN 'DE' THEN 'Europe/Berlin'
    WHEN 'ES' THEN 'Europe/Madrid'
    WHEN 'IT' THEN 'Europe/Rome'
    WHEN 'NL' THEN 'Europe/Amsterdam'
    WHEN 'PT' THEN 'Europe/Lisbon'
    WHEN 'SE' THEN 'Europe/Stockholm'
    WHEN 'NO' THEN 'Europe/Oslo'
    WHEN 'CH' THEN 'Europe/Zurich'
    WHEN 'AE' THEN 'Asia/Dubai'
    WHEN 'SA' THEN 'Asia/Riyadh'
    WHEN 'IN' THEN 'Asia/Kolkata'
    WHEN 'SG' THEN 'Asia/Singapore'
    WHEN 'HK' THEN 'Asia/Hong_Kong'
    WHEN 'JP' THEN 'Asia/Tokyo'
    WHEN 'CN' THEN 'Asia/Shanghai'
    WHEN 'AU' THEN 'Australia/Sydney'
    WHEN 'NZ' THEN 'Pacific/Auckland'
    WHEN 'ZA' THEN 'Africa/Johannesburg'
    ELSE 'UTC'
  END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_contact_timezone(_contact_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contacts;
  tz text;
  ctry text;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN RETURN 'UTC'; END IF;
  IF coalesce(c.timezone,'') <> '' THEN RETURN c.timezone; END IF;
  IF coalesce(c.country,'') <> '' THEN
    RETURN public.country_to_timezone(c.country);
  END IF;
  -- fallback to imported_leads.raw_data.country
  SELECT raw_data->>'country' INTO ctry
    FROM public.imported_leads WHERE contact_id = _contact_id LIMIT 1;
  IF coalesce(ctry,'') <> '' THEN
    RETURN public.country_to_timezone(ctry);
  END IF;
  RETURN 'UTC';
END;
$$;

-- ============= WARMUP LIMITS =============
CREATE OR REPLACE FUNCTION public.inbox_warmup_limit(_inbox_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ib public.inboxes;
  days_in int;
  warmup_max int;
BEGIN
  SELECT * INTO ib FROM public.inboxes WHERE id = _inbox_id;
  IF NOT FOUND THEN RETURN 0; END IF;
  days_in := GREATEST(0, EXTRACT(DAY FROM (now() - ib.warmup_started_at))::int);
  warmup_max := CASE
    WHEN days_in <  3 THEN 10
    WHEN days_in <  7 THEN 25
    WHEN days_in < 14 THEN 50
    ELSE ib.daily_send_limit
  END;
  -- Reputation throttling
  IF ib.reputation_score < 20 THEN RETURN 0; END IF;
  IF ib.reputation_score < 40 THEN RETURN GREATEST(1, warmup_max / 2); END IF;
  RETURN warmup_max;
END;
$$;

-- ============= DOMAIN HELPER =============
CREATE OR REPLACE FUNCTION public.domain_for_inbox(_inbox_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_addr text; dom_name text; dom_id uuid;
BEGIN
  SELECT email_address INTO email_addr FROM public.inboxes WHERE id = _inbox_id;
  IF email_addr IS NULL OR position('@' in email_addr) = 0 THEN RETURN NULL; END IF;
  dom_name := split_part(email_addr, '@', 2);
  SELECT id INTO dom_id FROM public.sending_domains WHERE domain_name = dom_name;
  IF dom_id IS NULL THEN
    INSERT INTO public.sending_domains (domain_name) VALUES (dom_name) RETURNING id INTO dom_id;
  END IF;
  RETURN dom_id;
END;
$$;

-- ============= NEXT VALID SEND TIME =============
CREATE OR REPLACE FUNCTION public.next_valid_send_time(_contact_id uuid, _from timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text;
  win public.send_windows;
  local_ts timestamptz;
  local_hour int;
  candidate timestamptz;
BEGIN
  tz := public.resolve_contact_timezone(_contact_id);
  SELECT * INTO win FROM public.send_windows WHERE region = 'GLOBAL';
  IF NOT FOUND THEN RETURN _from; END IF;

  local_ts := _from AT TIME ZONE tz; -- timestamp in local tz (as timestamp without tz)
  local_hour := EXTRACT(HOUR FROM local_ts)::int;

  IF local_hour >= win.start_hour AND local_hour < win.end_hour THEN
    RETURN _from;
  END IF;

  -- Compute today's window start in local tz, advance to next day if past end
  candidate := (date_trunc('day', local_ts) + make_interval(hours => win.start_hour)) AT TIME ZONE tz;
  IF candidate <= _from THEN
    candidate := (date_trunc('day', local_ts) + interval '1 day' + make_interval(hours => win.start_hour)) AT TIME ZONE tz;
  END IF;
  RETURN candidate;
END;
$$;

-- ============= THROTTLE CHECK =============
-- Returns: { allowed boolean, reason text, retry_at timestamptz }
CREATE OR REPLACE FUNCTION public.check_send_throttle(_inbox_id uuid, _contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ib public.inboxes;
  dom public.sending_domains;
  dom_id uuid;
  warmup_cap int;
  next_ts timestamptz;
BEGIN
  SELECT * INTO ib FROM public.inboxes WHERE id = _inbox_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'INBOX_NOT_FOUND', 'retry_at', null);
  END IF;
  IF NOT ib.active THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'INBOX_INACTIVE', 'retry_at', null);
  END IF;
  IF ib.reputation_score < 20 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'REPUTATION_PAUSE', 'retry_at', null);
  END IF;

  -- Reset hourly counter if window expired
  IF ib.hourly_window_start < date_trunc('hour', now()) THEN
    UPDATE public.inboxes
       SET hourly_send_count = 0,
           hourly_window_start = date_trunc('hour', now())
     WHERE id = _inbox_id;
    ib.hourly_send_count := 0;
  END IF;

  warmup_cap := public.inbox_warmup_limit(_inbox_id);
  IF ib.current_send_count >= warmup_cap THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'INBOX_DAILY_LIMIT',
      'retry_at', (date_trunc('day', now()) + interval '1 day')
    );
  END IF;
  IF ib.hourly_send_count >= ib.hourly_send_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'INBOX_HOURLY_LIMIT',
      'retry_at', (date_trunc('hour', now()) + interval '1 hour')
    );
  END IF;

  -- Domain check
  dom_id := public.domain_for_inbox(_inbox_id);
  IF dom_id IS NOT NULL THEN
    SELECT * INTO dom FROM public.sending_domains WHERE id = dom_id;
    IF dom.usage_window_start < date_trunc('day', now()) THEN
      UPDATE public.sending_domains
         SET current_usage = 0,
             usage_window_start = date_trunc('day', now())
       WHERE id = dom_id;
      dom.current_usage := 0;
    END IF;
    IF dom.reputation_score < 20 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'DOMAIN_REPUTATION_PAUSE', 'retry_at', null);
    END IF;
    IF dom.current_usage >= dom.daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false, 'reason', 'DOMAIN_DAILY_LIMIT',
        'retry_at', (date_trunc('day', now()) + interval '1 day')
      );
    END IF;
  END IF;

  -- Window check
  next_ts := public.next_valid_send_time(_contact_id, now());
  IF next_ts > now() + interval '1 minute' THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'OUTSIDE_SEND_WINDOW', 'retry_at', next_ts
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'reason', 'OK', 'retry_at', null);
END;
$$;

-- ============= REPUTATION APPLICATION =============
CREATE OR REPLACE FUNCTION public.apply_reputation_event(
  _inbox_id uuid, _contact_id uuid, _event public.reputation_event_type, _details text DEFAULT ''
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  impact int := 0;
  dom_id uuid;
  new_score int;
  ib public.inboxes;
BEGIN
  IF _inbox_id IS NULL THEN RETURN; END IF;
  impact := CASE _event
    WHEN 'bounce'    THEN -10
    WHEN 'spam'      THEN -25
    WHEN 'open'      THEN  +2
    WHEN 'reply'     THEN  +5
    ELSE 0
  END;

  dom_id := public.domain_for_inbox(_inbox_id);

  INSERT INTO public.reputation_events (inbox_id, domain_id, contact_id, event_type, impact_score, details)
  VALUES (_inbox_id, dom_id, _contact_id, _event, impact, coalesce(_details,''));

  IF impact <> 0 THEN
    SELECT * INTO ib FROM public.inboxes WHERE id = _inbox_id;
    new_score := GREATEST(0, LEAST(100, ib.reputation_score + impact));
    UPDATE public.inboxes
       SET reputation_score = new_score, updated_at = now()
     WHERE id = _inbox_id;

    IF new_score < 40 AND ib.reputation_score >= 40 THEN
      INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
      VALUES ('reputation_drop',
              'Inbox '||ib.email_address||' reputation dropped to '||new_score||' — sending volume halved',
              'inbox', _inbox_id);
    END IF;
    IF new_score < 20 AND ib.reputation_score >= 20 THEN
      INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
      VALUES ('reputation_drop',
              'Inbox '||ib.email_address||' reputation dropped to '||new_score||' — sending paused',
              'inbox', _inbox_id);
    END IF;

    IF dom_id IS NOT NULL THEN
      UPDATE public.sending_domains
         SET reputation_score = GREATEST(0, LEAST(100, reputation_score + impact)),
             updated_at = now()
       WHERE id = dom_id;
    END IF;
  END IF;
END;
$$;

-- ============= TRIGGER: email_events -> reputation =============
CREATE OR REPLACE FUNCTION public.trg_reputation_from_email_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.email_queue;
  rep_event public.reputation_event_type;
BEGIN
  -- Try to correlate to a queue row (email_id stores queue id in our send-worker)
  BEGIN
    SELECT * INTO q FROM public.email_queue WHERE id = NEW.email_id::uuid;
  EXCEPTION WHEN others THEN
    q := NULL;
  END;

  IF q.inbox_id IS NULL THEN RETURN NEW; END IF;

  rep_event := CASE NEW.event_type::text
    WHEN 'bounced'   THEN 'bounce'::public.reputation_event_type
    WHEN 'opened'    THEN 'open'::public.reputation_event_type
    WHEN 'replied'   THEN 'reply'::public.reputation_event_type
    WHEN 'sent'      THEN 'sent'::public.reputation_event_type
    WHEN 'delivered' THEN 'delivered'::public.reputation_event_type
    ELSE NULL
  END;
  IF rep_event IS NULL THEN RETURN NEW; END IF;

  PERFORM public.apply_reputation_event(q.inbox_id, NEW.contact_id, rep_event, NEW.event_type::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_events_reputation ON public.email_events;
CREATE TRIGGER trg_email_events_reputation
  AFTER INSERT ON public.email_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_reputation_from_email_event();

-- ============= REPLACE bump_inbox_send_count to also bump hourly + domain + last_sent_at =============
CREATE OR REPLACE FUNCTION public.bump_inbox_send_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE dom_id uuid;
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') AND NEW.inbox_id IS NOT NULL THEN
    -- Reset hourly counter if window expired
    UPDATE public.inboxes
       SET hourly_send_count = CASE
             WHEN hourly_window_start < date_trunc('hour', now()) THEN 1
             ELSE hourly_send_count + 1 END,
           hourly_window_start = CASE
             WHEN hourly_window_start < date_trunc('hour', now()) THEN date_trunc('hour', now())
             ELSE hourly_window_start END,
           current_send_count = current_send_count + 1,
           last_sent_at = now(),
           updated_at = now()
     WHERE id = NEW.inbox_id;

    -- Domain usage
    dom_id := public.domain_for_inbox(NEW.inbox_id);
    IF dom_id IS NOT NULL THEN
      UPDATE public.sending_domains
         SET current_usage = CASE
               WHEN usage_window_start < date_trunc('day', now()) THEN 1
               ELSE current_usage + 1 END,
             usage_window_start = CASE
               WHEN usage_window_start < date_trunc('day', now()) THEN date_trunc('day', now())
               ELSE usage_window_start END,
             updated_at = now()
       WHERE id = dom_id;

      -- Auto-promote warmup stage based on cumulative reputation
      UPDATE public.sending_domains
         SET warmup_stage = CASE
           WHEN EXTRACT(DAY FROM (now() - warmup_started_at)) >= 14 THEN 'stable'::public.warmup_stage
           WHEN EXTRACT(DAY FROM (now() - warmup_started_at)) >=  3 THEN 'warming'::public.warmup_stage
           ELSE 'new'::public.warmup_stage
         END
       WHERE id = dom_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============= SPAM DETECTION FROM CONTACT STATUS =============
CREATE OR REPLACE FUNCTION public.trg_spam_on_dnc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q public.email_queue;
BEGIN
  IF NEW.status = 'DO_NOT_CONTACT' AND OLD.status IS DISTINCT FROM 'DO_NOT_CONTACT' THEN
    -- find most recent sent queue entry for this contact
    SELECT * INTO q FROM public.email_queue
     WHERE contact_id = NEW.id AND status = 'sent'
     ORDER BY sent_at DESC LIMIT 1;
    IF q.inbox_id IS NOT NULL THEN
      PERFORM public.apply_reputation_event(q.inbox_id, NEW.id, 'spam', 'Contact moved to DO_NOT_CONTACT');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_spam_on_dnc ON public.contacts;
CREATE TRIGGER trg_contacts_spam_on_dnc
  AFTER UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.trg_spam_on_dnc();

-- ============= HOURLY RESET HELPER (callable from cron) =============
CREATE OR REPLACE FUNCTION public.reset_inbox_hourly_counts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  UPDATE public.inboxes
     SET hourly_send_count = 0,
         hourly_window_start = date_trunc('hour', now()),
         updated_at = now()
   WHERE hourly_window_start < date_trunc('hour', now());
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ============= FOUNDER VIEWS =============
DROP VIEW IF EXISTS public.inbox_health_summary;
CREATE VIEW public.inbox_health_summary
WITH (security_invoker = true) AS
SELECT
  i.id, i.email_address, i.business_name, i.active,
  i.reputation_score, i.daily_send_limit, i.hourly_send_limit,
  i.current_send_count, i.hourly_send_count, i.last_sent_at,
  public.inbox_warmup_limit(i.id) AS effective_daily_cap,
  GREATEST(0, EXTRACT(DAY FROM (now() - i.warmup_started_at))::int) AS warmup_days,
  CASE
    WHEN i.reputation_score < 20 THEN 'paused'
    WHEN i.reputation_score < 40 THEN 'throttled'
    WHEN i.warmup_status::text = 'warming' OR EXTRACT(DAY FROM (now() - i.warmup_started_at)) < 14 THEN 'warming'
    ELSE 'healthy'
  END AS health_status
FROM public.inboxes i;

DROP VIEW IF EXISTS public.domain_usage_summary;
CREATE VIEW public.domain_usage_summary
WITH (security_invoker = true) AS
SELECT
  d.id, d.domain_name, d.daily_limit, d.current_usage,
  d.reputation_score, d.warmup_stage,
  CASE WHEN d.daily_limit > 0 THEN ROUND((d.current_usage::numeric / d.daily_limit) * 100, 1) ELSE 0 END AS usage_pct,
  d.usage_window_start, d.updated_at
FROM public.sending_domains d;

DROP VIEW IF EXISTS public.blocked_sends_24h;
CREATE VIEW public.blocked_sends_24h
WITH (security_invoker = true) AS
SELECT
  eq.id, eq.contact_id, eq.campaign_id, eq.business_name,
  eq.status, eq.block_reason, eq.scheduled_at, eq.created_at,
  c.email AS contact_email
FROM public.email_queue eq
LEFT JOIN public.contacts c ON c.id = eq.contact_id
WHERE eq.status::text IN ('blocked','delayed','throttled')
  AND eq.created_at > now() - interval '24 hours'
ORDER BY eq.created_at DESC;

DROP VIEW IF EXISTS public.warmup_progress;
CREATE VIEW public.warmup_progress
WITH (security_invoker = true) AS
SELECT
  i.id AS inbox_id, i.email_address, i.business_name,
  i.warmup_started_at,
  GREATEST(0, EXTRACT(DAY FROM (now() - i.warmup_started_at))::int) AS days_in_warmup,
  public.inbox_warmup_limit(i.id) AS current_cap,
  i.daily_send_limit AS target_cap,
  CASE
    WHEN EXTRACT(DAY FROM (now() - i.warmup_started_at)) >= 14 THEN 100
    ELSE LEAST(99, ROUND((EXTRACT(DAY FROM (now() - i.warmup_started_at))::numeric / 14) * 100))
  END AS progress_pct
FROM public.inboxes i;

-- ============= BACKFILL DOMAINS FROM EXISTING INBOXES =============
INSERT INTO public.sending_domains (domain_name)
SELECT DISTINCT split_part(email_address, '@', 2)
  FROM public.inboxes
 WHERE email_address LIKE '%@%'
ON CONFLICT (domain_name) DO NOTHING;
