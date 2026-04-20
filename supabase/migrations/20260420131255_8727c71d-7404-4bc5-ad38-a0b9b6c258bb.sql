-- Fix view: enforce caller's RLS, not creator's
DROP VIEW IF EXISTS public.system_health_score;
CREATE VIEW public.system_health_score
WITH (security_invoker = true) AS
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

-- Tighten insert policies — restrict to service role / founder
DROP POLICY IF EXISTS "Service role inserts system_events" ON public.system_events;
CREATE POLICY "Service role and founder insert system_events"
  ON public.system_events FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.has_role(auth.uid(), 'founder')
  );

DROP POLICY IF EXISTS "Service role inserts system_health" ON public.system_health;
CREATE POLICY "Service role inserts system_health"
  ON public.system_health FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Replace permissive ALL policy on retry_queue with explicit per-op policies
DROP POLICY IF EXISTS "Service role manages retry_queue" ON public.retry_queue;

CREATE POLICY "Service role inserts retry_queue"
  ON public.retry_queue FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates retry_queue"
  ON public.retry_queue FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role deletes retry_queue"
  ON public.retry_queue FOR DELETE
  USING (auth.role() = 'service_role');