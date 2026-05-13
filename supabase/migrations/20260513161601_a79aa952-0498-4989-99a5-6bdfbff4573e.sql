-- READ-ONLY safety helper for outreach brake verification.
-- Returns only a minimal cron summary; performs no writes; cannot modify cron.
CREATE OR REPLACE FUNCTION public.get_outreach_send_cron_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_readable boolean := false;
  v_active_count int := 0;
  v_disabled_count int := 0;
  v_active_names text[] := ARRAY[]::text[];
  v_all_matching text[] := ARRAY[]::text[];
BEGIN
  BEGIN
    SELECT
      COUNT(*) FILTER (WHERE active = true AND command ILIKE '%outreach-send-worker%'),
      COUNT(*) FILTER (WHERE active = false AND command ILIKE '%outreach-send-worker%'),
      COALESCE(ARRAY_AGG(jobname) FILTER (WHERE active = true AND command ILIKE '%outreach-send-worker%'), ARRAY[]::text[]),
      COALESCE(ARRAY_AGG(jobname) FILTER (WHERE command ILIKE '%outreach-send-worker%'), ARRAY[]::text[])
    INTO v_active_count, v_disabled_count, v_active_names, v_all_matching
    FROM cron.job;
    v_readable := true;
  EXCEPTION WHEN OTHERS THEN
    v_readable := false;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'cron_readable', v_readable,
    'active_sender_found', v_active_count > 0,
    'active_sender_count', v_active_count,
    'disabled_sender_count', v_disabled_count,
    'matching_job_names', v_all_matching,
    'active_job_names', v_active_names,
    'checked_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_outreach_send_cron_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_outreach_send_cron_status() FROM anon;
REVOKE ALL ON FUNCTION public.get_outreach_send_cron_status() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_outreach_send_cron_status() TO service_role;