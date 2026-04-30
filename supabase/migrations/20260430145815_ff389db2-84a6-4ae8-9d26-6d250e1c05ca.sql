
-- Initialize outbound provider config flags
INSERT INTO public.system_settings (key, value)
VALUES ('outbound_provider_configured', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value)
VALUES ('outbound_provider_test_passed_at', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Helper: snapshot of outbound sending readiness for the UI
CREATE OR REPLACE FUNCTION public.get_outbound_status()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'system_mode', public.get_system_mode(),
    'provider_configured', COALESCE(
      (SELECT value FROM public.system_settings WHERE key='outbound_provider_configured'),
      'false'::jsonb
    )::boolean,
    'test_passed_at', (
      SELECT value FROM public.system_settings WHERE key='outbound_provider_test_passed_at'
    ),
    'simulated', (public.get_system_mode() <> 'live')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_outbound_status() TO authenticated, service_role, anon;

-- Harden set_system_mode: reject 'live' until real outbound provider configured + tested
CREATE OR REPLACE FUNCTION public.set_system_mode(_mode text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_old text;
  v_configured boolean;
  v_test_passed timestamptz;
BEGIN
  IF _mode NOT IN ('test','live') THEN
    RAISE EXCEPTION 'invalid mode %, must be test or live', _mode;
  END IF;

  IF _mode = 'live' THEN
    SELECT COALESCE((value)::boolean, false)
      INTO v_configured
      FROM public.system_settings
     WHERE key='outbound_provider_configured';

    SELECT NULLIF(value #>> '{}', '')::timestamptz
      INTO v_test_passed
      FROM public.system_settings
     WHERE key='outbound_provider_test_passed_at';

    IF NOT COALESCE(v_configured, false) OR v_test_passed IS NULL THEN
      RAISE EXCEPTION
        'Cannot switch system_mode to live: outbound email provider is not configured or has not passed a real test send. The outreach worker is currently in simulated mode.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  v_old := public.get_system_mode();
  INSERT INTO public.system_settings(key,value,updated_at)
  VALUES ('system_mode', to_jsonb(_mode), now())
  ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();

  INSERT INTO public.activity_log(event_type,description,entity_type,entity_id)
  VALUES ('system_mode_changed', format('System mode switched from %s to %s', v_old, _mode), 'system', NULL);

  INSERT INTO public.system_events(event_type, severity, message, metadata)
  VALUES ('system_mode_changed',
          CASE WHEN _mode='live' THEN 'high'::system_event_severity ELSE 'medium'::system_event_severity END,
          format('System mode is now %s', _mode),
          jsonb_build_object('previous_mode', v_old, 'new_mode', _mode));

  RETURN _mode;
END;
$$;

REVOKE ALL ON FUNCTION public.set_system_mode(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_system_mode(text) TO authenticated, service_role;
