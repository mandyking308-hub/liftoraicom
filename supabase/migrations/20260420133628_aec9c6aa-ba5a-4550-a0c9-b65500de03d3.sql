CREATE OR REPLACE FUNCTION public.auto_resolve_system_events()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  resolved_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT se.id, se.entity_id FROM public.system_events se
     WHERE se.event_type = 'email_queue_stuck' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.email_queue
                WHERE id = r.entity_id
                  AND (status IN ('sent','blocked','failed') OR scheduled_at > now())) THEN
      UPDATE public.system_events SET resolved = true, resolved_at = now(),
             resolution_note = 'Queue item progressed' WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT se.id, se.entity_id FROM public.system_events se
     WHERE se.event_type = 'assignment_idle' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.assignments
                WHERE id = r.entity_id
                  AND (updated_at > now() - interval '6 hours'
                       OR status::text IN ('completed','failed'))) THEN
      UPDATE public.system_events SET resolved = true, resolved_at = now(),
             resolution_note = 'Assignment progressed' WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT se.id, se.entity_id FROM public.system_events se
     WHERE se.event_type = 'invoice_overdue_14d' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.invoices
                WHERE id = r.entity_id AND status = 'PAID') THEN
      UPDATE public.system_events SET resolved = true, resolved_at = now(),
             resolution_note = 'Invoice paid' WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT se.id, se.entity_id, se.entity_type FROM public.system_events se
     WHERE se.event_type = 'compliance_score_high' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.compliance_scores
                WHERE entity_id = r.entity_id
                  AND entity_type::text = r.entity_type
                  AND score <= 70) THEN
      UPDATE public.system_events SET resolved = true, resolved_at = now(),
             resolution_note = 'Compliance score recovered' WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT se.id, se.entity_id FROM public.system_events se
     WHERE se.event_type = 'inbox_reputation_critical' AND se.resolved = false
  LOOP
    IF EXISTS (SELECT 1 FROM public.inboxes
                WHERE id = r.entity_id AND reputation_score >= 40) THEN
      UPDATE public.system_events SET resolved = true, resolved_at = now(),
             resolution_note = 'Inbox reputation recovered' WHERE id = r.id;
      resolved_count := resolved_count + 1;
    END IF;
  END LOOP;

  RETURN resolved_count;
END; $$;