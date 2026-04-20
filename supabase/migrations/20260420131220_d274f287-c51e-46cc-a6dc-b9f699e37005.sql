-- =====================================================
-- 1. ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.system_event_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.retry_action_type AS ENUM ('send_email', 'ai_reply', 'assignment_retry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.retry_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 2. SYSTEM EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  business_name text NOT NULL DEFAULT '',
  severity public.system_event_severity NOT NULL DEFAULT 'low',
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolution_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_unresolved
  ON public.system_events (severity, created_at DESC) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_system_events_entity
  ON public.system_events (entity_type, entity_id);
-- Used by detect_anomalies dedup probe (entity_type, entity_id, event_type, resolved)
CREATE INDEX IF NOT EXISTS idx_system_events_dedup
  ON public.system_events (event_type, entity_type, entity_id) WHERE resolved = false;

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder can view system_events"
  ON public.system_events FOR SELECT
  USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founder can update system_events"
  ON public.system_events FOR UPDATE
  USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Service role inserts system_events"
  ON public.system_events FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 3. RETRY QUEUE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action_type public.retry_action_type NOT NULL,
  retry_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  last_error text NOT NULL DEFAULT '',
  status public.retry_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retry_queue_due
  ON public.retry_queue (next_retry_at) WHERE status = 'pending';

ALTER TABLE public.retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder can view retry_queue"
  ON public.retry_queue FOR SELECT
  USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Service role manages retry_queue"
  ON public.retry_queue FOR ALL
  USING (true) WITH CHECK (true);

-- =====================================================
-- 4. SYSTEM HEALTH METRICS (time series)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_metric_time
  ON public.system_health (metric_name, timestamp DESC);

ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder can view system_health"
  ON public.system_health FOR SELECT
  USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Service role inserts system_health"
  ON public.system_health FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 5. LOG SYSTEM EVENT (de-duplicating)
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_system_event(
  _event_type text,
  _entity_type text,
  _entity_id uuid,
  _business_name text,
  _severity public.system_event_severity,
  _message text,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev_id uuid;
  existing_id uuid;
BEGIN
  -- Dedup: if an UNRESOLVED event of the same type already exists for the same entity
  -- in the last 6 hours, skip insertion.
  SELECT id INTO existing_id
    FROM public.system_events
   WHERE event_type = _event_type
     AND entity_type IS NOT DISTINCT FROM _entity_type
     AND entity_id IS NOT DISTINCT FROM _entity_id
     AND resolved = false
     AND created_at > now() - interval '6 hours'
   LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  INSERT INTO public.system_events
    (event_type, entity_type, entity_id, business_name, severity, message, metadata)
  VALUES
    (_event_type, _entity_type, _entity_id, COALESCE(_business_name,''),
     _severity, COALESCE(_message,''), COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO ev_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('system_alert',
          '[' || _severity::text || '] ' || _event_type || ' — ' || COALESCE(_message,''),
          _entity_type, _entity_id);

  -- Critical → auto-create a system_task to escalate
  IF _severity = 'critical' AND _entity_type IN ('contact','deal','assignment','conversation') AND _entity_id IS NOT NULL THEN
    INSERT INTO public.system_tasks
      (entity_type, entity_id, business_name, task_type, priority_score, reason)
    VALUES
      (_entity_type::public.priority_entity_type, _entity_id, COALESCE(_business_name,''),
       'escalate', 100,
       'Critical system event: ' || _event_type || ' — ' || COALESCE(_message,''))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN ev_id;
END;
$$;

-- =====================================================
-- 6. ANOMALY DETECTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.detect_anomalies()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  flagged_count int := 0;
BEGIN
  -- a) email_queue stuck > 30 min in pending/delayed/throttled with scheduled_at past
  FOR r IN
    SELECT id, business_name, campaign_id, status, scheduled_at
      FROM public.email_queue
     WHERE status IN ('pending','delayed','throttled')
       AND scheduled_at < now() - interval '30 minutes'
     LIMIT 50
  LOOP
    PERFORM public.log_system_event(
      'email_queue_stuck', 'email_queue', r.id, COALESCE(r.business_name,''),
      'medium',
      'Queue item stuck in ' || r.status::text || ' for >30min',
      jsonb_build_object('scheduled_at', r.scheduled_at, 'campaign_id', r.campaign_id)
    );
    -- Auto-correction: requeue (only for delayed/throttled past their retry window)
    INSERT INTO public.retry_queue (entity_type, entity_id, action_type, next_retry_at)
    VALUES ('email_queue', r.id, 'send_email', now())
    ON CONFLICT DO NOTHING;
    flagged_count := flagged_count + 1;
  END LOOP;

  -- b) campaign with 0 replies after 50+ sends (last 7 days)
  FOR r IN
    SELECT cm.campaign_id, oc.business_name, oc.campaign_name, cm.total_sent, cm.total_replies
      FROM public.campaign_metrics cm
      JOIN public.outreach_campaigns oc ON oc.id = cm.campaign_id
     WHERE cm.total_sent >= 50
       AND cm.total_replies = 0
       AND oc.status::text = 'active'
  LOOP
    PERFORM public.log_system_event(
      'campaign_zero_replies', 'campaign', r.campaign_id, COALESCE(r.business_name,''),
      'high',
      'Campaign "' || r.campaign_name || '" has ' || r.total_sent || ' sends and 0 replies',
      jsonb_build_object('total_sent', r.total_sent)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- c) AI actions exceeding daily limit (20 per conversation)
  FOR r IN
    SELECT conversation_id, COUNT(*)::int AS cnt
      FROM public.ai_actions
     WHERE created_at >= date_trunc('day', now())
     GROUP BY conversation_id
    HAVING COUNT(*) > 20
  LOOP
    PERFORM public.log_system_event(
      'ai_daily_limit_exceeded', 'conversation', r.conversation_id, '',
      'high',
      'Conversation has ' || r.cnt || ' AI actions today (>20)',
      jsonb_build_object('actions_today', r.cnt)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- d) assignments not updated > 24h while still in active states
  FOR r IN
    SELECT id, business_name, status, updated_at
      FROM public.assignments
     WHERE status::text IN ('assigned','acknowledged','in_progress')
       AND updated_at < now() - interval '24 hours'
     LIMIT 100
  LOOP
    PERFORM public.log_system_event(
      'assignment_idle', 'assignment', r.id, COALESCE(r.business_name,''),
      'medium',
      'Assignment idle >24h in status ' || r.status::text,
      jsonb_build_object('last_update', r.updated_at)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- e) invoices overdue > 14 days
  FOR r IN
    SELECT id, business_name, invoice_number, due_date
      FROM public.invoices
     WHERE status IN ('OVERDUE','PARTIALLY_PAID')
       AND due_date < CURRENT_DATE - interval '14 days'
     LIMIT 100
  LOOP
    PERFORM public.log_system_event(
      'invoice_overdue_14d', 'invoice', r.id, COALESCE(r.business_name,''),
      'high',
      'Invoice ' || r.invoice_number || ' overdue >14 days',
      jsonb_build_object('due_date', r.due_date)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- f) entities with compliance_score > 70
  FOR r IN
    SELECT entity_type, entity_id, score
      FROM public.compliance_scores
     WHERE score > 70
       AND last_event_at > now() - interval '24 hours'
     LIMIT 100
  LOOP
    PERFORM public.log_system_event(
      'compliance_score_high', r.entity_type::text, r.entity_id, '',
      'high',
      'Compliance score ' || r.score || ' exceeds 70',
      jsonb_build_object('score', r.score)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- g) inbox reputation < 20
  FOR r IN
    SELECT id, business_name, email_address, reputation_score
      FROM public.inboxes
     WHERE active = true AND reputation_score < 20
  LOOP
    PERFORM public.log_system_event(
      'inbox_reputation_critical', 'inbox', r.id, COALESCE(r.business_name,''),
      'critical',
      'Inbox ' || r.email_address || ' reputation ' || r.reputation_score || ' (<20) — sending paused',
      jsonb_build_object('reputation', r.reputation_score)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  RETURN jsonb_build_object('flagged', flagged_count, 'ran_at', now());
END;
$$;

-- =====================================================
-- 7. AUTO-RESOLUTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_resolve_system_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_count int := 0;
  r record;
BEGIN
  -- email_queue_stuck → resolved if item now sent/blocked/failed OR scheduled in future
  FOR r IN
    SELECT se.id, se.entity_id
      FROM public.system_events se
     WHERE se.event_type = 'email_queue_stuck' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.email_queue
                WHERE id = r.entity_id
                  AND (status IN ('sent','blocked','failed') OR scheduled_at > now())) THEN
      UPDATE public.system_events
         SET resolved = true, resolved_at = now(), resolution_note = 'Queue item progressed'
       WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  -- assignment_idle → resolved if updated_at fresh OR completed
  FOR r IN
    SELECT se.id, se.entity_id
      FROM public.system_events se
     WHERE se.event_type = 'assignment_idle' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.assignments
                WHERE id = r.entity_id
                  AND (updated_at > now() - interval '6 hours'
                       OR status::text IN ('completed','failed'))) THEN
      UPDATE public.system_events
         SET resolved = true, resolved_at = now(), resolution_note = 'Assignment progressed'
       WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  -- invoice_overdue_14d → resolved if invoice paid
  FOR r IN
    SELECT se.id, se.entity_id
      FROM public.system_events se
     WHERE se.event_type = 'invoice_overdue_14d' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.invoices
                WHERE id = r.entity_id AND status IN ('PAID','VOID')) THEN
      UPDATE public.system_events
         SET resolved = true, resolved_at = now(), resolution_note = 'Invoice paid/voided'
       WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  -- compliance_score_high → resolved if score now <= 70
  FOR r IN
    SELECT se.id, se.entity_id, se.entity_type
      FROM public.system_events se
     WHERE se.event_type = 'compliance_score_high' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.compliance_scores
                WHERE entity_id = r.entity_id
                  AND entity_type::text = r.entity_type
                  AND score <= 70) THEN
      UPDATE public.system_events
         SET resolved = true, resolved_at = now(), resolution_note = 'Compliance score recovered'
       WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  -- inbox_reputation_critical → resolved if reputation >= 40
  FOR r IN
    SELECT se.id, se.entity_id
      FROM public.system_events se
     WHERE se.event_type = 'inbox_reputation_critical' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.inboxes
                WHERE id = r.entity_id AND reputation_score >= 40) THEN
      UPDATE public.system_events
         SET resolved = true, resolved_at = now(), resolution_note = 'Inbox reputation recovered'
       WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  RETURN resolved_count;
END;
$$;

-- =====================================================
-- 8. RETRY QUEUE PROCESSOR (only safe action: requeue email_queue items)
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_retry_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  processed int := 0;
  failed int := 0;
  delay_min int;
BEGIN
  FOR r IN
    SELECT * FROM public.retry_queue
     WHERE status = 'pending' AND next_retry_at <= now()
     ORDER BY next_retry_at ASC LIMIT 50
  LOOP
    BEGIN
      IF r.action_type = 'send_email' AND r.entity_type = 'email_queue' THEN
        -- Requeue: flip back to pending and schedule immediately
        UPDATE public.email_queue
           SET status = 'pending', scheduled_at = now()
         WHERE id = r.entity_id
           AND status IN ('delayed','throttled');

        UPDATE public.retry_queue
           SET status = 'completed', updated_at = now()
         WHERE id = r.id;
        processed := processed + 1;
      ELSE
        -- Unknown safe action — leave for manual handling
        UPDATE public.retry_queue
           SET status = 'failed', last_error = 'Unsupported action_type', updated_at = now()
         WHERE id = r.id;
        failed := failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Exponential backoff: 5 / 15 / 60 min
      delay_min := CASE r.retry_count WHEN 0 THEN 5 WHEN 1 THEN 15 WHEN 2 THEN 60 ELSE 0 END;
      IF r.retry_count >= 3 THEN
        UPDATE public.retry_queue
           SET status = 'failed',
               last_error = LEFT(SQLERRM, 200),
               updated_at = now()
         WHERE id = r.id;
        failed := failed + 1;

        PERFORM public.log_system_event(
          'retry_exhausted', r.entity_type, r.entity_id, '',
          'critical',
          'Retry exhausted for ' || r.action_type::text || ' — manual intervention required',
          jsonb_build_object('last_error', SQLERRM)
        );
      ELSE
        UPDATE public.retry_queue
           SET retry_count = r.retry_count + 1,
               next_retry_at = now() + (delay_min || ' minutes')::interval,
               last_error = LEFT(SQLERRM, 200),
               updated_at = now()
         WHERE id = r.id;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', processed, 'failed', failed);
END;
$$;

-- =====================================================
-- 9. HEALTH SNAPSHOT
-- =====================================================
CREATE OR REPLACE FUNCTION public.compute_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emails_per_hr numeric := 0;
  reply_rate_v numeric := 0;
  conversion_v numeric := 0;
  assignment_completion_v numeric := 0;
  payment_collection_v numeric := 0;
  v_sent int := 0;
  v_replies int := 0;
  v_demos_sent int := 0;
  v_deals_won int := 0;
  v_assigned int := 0;
  v_completed int := 0;
  v_invoiced numeric := 0;
  v_paid numeric := 0;
BEGIN
  -- emails sent in last hour
  SELECT COUNT(*) INTO emails_per_hr FROM public.email_queue
   WHERE status = 'sent' AND sent_at > now() - interval '1 hour';

  -- 7-day reply rate
  SELECT COUNT(*) INTO v_sent FROM public.email_queue
   WHERE status = 'sent' AND sent_at > now() - interval '7 days';
  SELECT COUNT(*) INTO v_replies FROM public.email_events
   WHERE event_type = 'replied' AND timestamp > now() - interval '7 days';
  IF v_sent > 0 THEN reply_rate_v := ROUND((v_replies::numeric / v_sent) * 100, 2); END IF;

  -- 30-day conversion: demos → deals won
  SELECT COUNT(*) INTO v_demos_sent FROM public.demo_access
   WHERE created_at > now() - interval '30 days';
  SELECT COUNT(*) INTO v_deals_won FROM public.deals
   WHERE status::text = 'WON' AND won_at > now() - interval '30 days';
  IF v_demos_sent > 0 THEN conversion_v := ROUND((v_deals_won::numeric / v_demos_sent) * 100, 2); END IF;

  -- assignment completion rate (last 30 days)
  SELECT COUNT(*) INTO v_assigned FROM public.assignments
   WHERE assigned_at > now() - interval '30 days';
  SELECT COUNT(*) INTO v_completed FROM public.assignments
   WHERE assigned_at > now() - interval '30 days' AND status::text = 'completed';
  IF v_assigned > 0 THEN assignment_completion_v := ROUND((v_completed::numeric / v_assigned) * 100, 2); END IF;

  -- payment collection rate (last 30 days)
  SELECT COALESCE(SUM(expected_amount),0) INTO v_invoiced FROM public.invoices
   WHERE issued_date > now() - interval '30 days';
  SELECT COALESCE(SUM(amount_received),0) INTO v_paid FROM public.payments
   WHERE received_at > now() - interval '30 days';
  IF v_invoiced > 0 THEN payment_collection_v := ROUND((v_paid / v_invoiced) * 100, 2); END IF;

  INSERT INTO public.system_health (metric_name, value) VALUES
    ('emails_sent_per_hour', emails_per_hr),
    ('reply_rate', reply_rate_v),
    ('conversion_rate', conversion_v),
    ('assignment_completion_rate', assignment_completion_v),
    ('payment_collection_rate', payment_collection_v);

  RETURN jsonb_build_object(
    'emails_per_hour', emails_per_hr,
    'reply_rate', reply_rate_v,
    'conversion_rate', conversion_v,
    'assignment_completion_rate', assignment_completion_v,
    'payment_collection_rate', payment_collection_v
  );
END;
$$;

-- =====================================================
-- 10. HEALTH SCORE VIEW (0–100, weighted)
-- =====================================================
CREATE OR REPLACE VIEW public.system_health_score AS
WITH latest AS (
  SELECT DISTINCT ON (metric_name) metric_name, value, timestamp
    FROM public.system_health
   ORDER BY metric_name, timestamp DESC
),
m AS (
  SELECT
    COALESCE(MAX(CASE WHEN metric_name = 'reply_rate' THEN value END), 0) AS reply_rate,
    COALESCE(MAX(CASE WHEN metric_name = 'conversion_rate' THEN value END), 0) AS conversion_rate,
    COALESCE(MAX(CASE WHEN metric_name = 'assignment_completion_rate' THEN value END), 0) AS assignment_rate,
    COALESCE(MAX(CASE WHEN metric_name = 'payment_collection_rate' THEN value END), 0) AS payment_rate,
    COALESCE(MAX(CASE WHEN metric_name = 'emails_sent_per_hour' THEN value END), 0) AS emails_per_hour
  FROM latest
),
critical_count AS (
  SELECT COUNT(*) AS n FROM public.system_events
   WHERE resolved = false AND severity IN ('critical','high')
)
SELECT
  GREATEST(0, LEAST(100,
    ROUND(
      (LEAST(100, m.reply_rate * 5) * 0.20)
    + (LEAST(100, m.conversion_rate * 10) * 0.20)
    + (m.assignment_rate * 0.25)
    + (m.payment_rate * 0.25)
    + (LEAST(100, m.emails_per_hour * 2) * 0.10)
    - (critical_count.n * 5)
    )::int
  )) AS health_score,
  m.reply_rate,
  m.conversion_rate,
  m.assignment_rate AS assignment_completion_rate,
  m.payment_rate AS payment_collection_rate,
  m.emails_per_hour AS emails_sent_per_hour,
  critical_count.n AS open_critical_events
FROM m, critical_count;

GRANT SELECT ON public.system_health_score TO authenticated;

-- =====================================================
-- 11. CRON JOBS
-- =====================================================
-- Anomaly detection every 10 minutes
SELECT cron.unschedule('detect-anomalies-10min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'detect-anomalies-10min'
);
SELECT cron.schedule(
  'detect-anomalies-10min',
  '*/10 * * * *',
  $$ SELECT public.detect_anomalies(); $$
);

-- Auto-resolution every hour
SELECT cron.unschedule('auto-resolve-events-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-resolve-events-hourly'
);
SELECT cron.schedule(
  'auto-resolve-events-hourly',
  '0 * * * *',
  $$ SELECT public.auto_resolve_system_events(); $$
);

-- Retry queue every 5 minutes
SELECT cron.unschedule('process-retry-queue-5min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-retry-queue-5min'
);
SELECT cron.schedule(
  'process-retry-queue-5min',
  '*/5 * * * *',
  $$ SELECT public.process_retry_queue(); $$
);

-- Health snapshot every 15 minutes
SELECT cron.unschedule('compute-system-health-15min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'compute-system-health-15min'
);
SELECT cron.schedule(
  'compute-system-health-15min',
  '*/15 * * * *',
  $$ SELECT public.compute_system_health(); $$
);