-- Pre-seed demo events for any existing active demos so dashboards show life from day one
DO $$
DECLARE
  d RECORD;
BEGIN
  FOR d IN SELECT id FROM public.demo_access WHERE status = 'active' LOOP
    -- Only seed if no events exist yet
    IF NOT EXISTS (SELECT 1 FROM public.demo_events WHERE demo_id = d.id) THEN
      INSERT INTO public.demo_events (demo_id, event_type, metadata, session_duration_seconds, timestamp)
      VALUES
        (d.id, 'session_start', '{"seed": true}'::jsonb, 0, now() - interval '2 days'),
        (d.id, 'feature_used', '{"seed": true, "feature": "dashboard"}'::jsonb, 0, now() - interval '2 days' + interval '12 seconds'),
        (d.id, 'feature_used', '{"seed": true, "feature": "proposals"}'::jsonb, 0, now() - interval '2 days' + interval '48 seconds'),
        (d.id, 'session_end', '{"seed": true}'::jsonb, 95, now() - interval '2 days' + interval '95 seconds');
    END IF;
  END LOOP;
END $$;