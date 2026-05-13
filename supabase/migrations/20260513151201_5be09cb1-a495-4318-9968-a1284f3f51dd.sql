-- Emergency outreach brake.

-- 1. Unschedule the outreach-send-worker cron jobs.
DO $$
DECLARE
  j RECORD;
BEGIN
  FOR j IN
    SELECT jobid, jobname, command
    FROM cron.job
    WHERE jobname = 'outreach-send-worker-2min'
       OR command ILIKE '%outreach-send-worker%'
  LOOP
    PERFORM cron.unschedule(j.jobid);
    RAISE NOTICE 'Unscheduled cron job % (jobid=%)', j.jobname, j.jobid;
  END LOOP;
END $$;

-- 2. Real global auto-send kill switch.
INSERT INTO public.system_settings (key, value, updated_at)
VALUES ('auto_send_enabled', to_jsonb(false), now())
ON CONFLICT (key) DO UPDATE
SET value = to_jsonb(false),
    updated_at = now();

-- 3. Audit row.
INSERT INTO public.system_events (event_type, severity, message, metadata, created_at)
VALUES (
  'auto_send_kill_switch_engaged',
  'critical',
  'Emergency brake engaged: outreach-send-worker cron unscheduled and auto_send_enabled forced to false.',
  jsonb_build_object(
    'reason', 'Live-fire incident 13 May 15:00 UTC — 3 emails auto-sent before kill-switch existed.',
    'cron_action', 'unscheduled outreach-send-worker-2min and any other job referencing outreach-send-worker',
    'flag_key', 'auto_send_enabled',
    'flag_value', false,
    'fail_closed', true,
    'source', 'emergency_brake_migration',
    'effect', 'outreach-send-worker now exits with blocked_by_auto_send_disabled before any queue selection or SMTP'
  ),
  now()
);