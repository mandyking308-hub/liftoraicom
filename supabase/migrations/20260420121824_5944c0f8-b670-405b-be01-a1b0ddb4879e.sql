-- 1. Schema additions
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS supplier_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_assignments_acknowledged ON public.assignments(acknowledged_at) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_score ON public.suppliers(supplier_score DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_last_activity ON public.suppliers(last_activity_at DESC);

-- 2. Acknowledgement + heartbeat inside supplier RPC (rebuild)
CREATE OR REPLACE FUNCTION public.supplier_update_assignment_status(
  _token text, _assignment_id uuid, _new_status text, _note text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  su public.supplier_users;
  a  public.assignments;
  target_status assignment_status;
BEGIN
  SELECT * INTO su FROM public.supplier_users
   WHERE access_token = _token AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_TOKEN');
  END IF;

  IF _new_status NOT IN ('in_progress','completed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS',
                              'allowed', jsonb_build_array('in_progress','completed'));
  END IF;
  target_status := _new_status::assignment_status;

  SELECT * INTO a FROM public.assignments
   WHERE id = _assignment_id AND supplier_id = su.supplier_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ASSIGNMENT_NOT_FOUND');
  END IF;
  IF a.status IN ('completed','failed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ASSIGNMENT_LOCKED', 'status', a.status);
  END IF;

  UPDATE public.assignments
     SET status = target_status,
         supplier_note = COALESCE(_note, supplier_note),
         acknowledged_at = COALESCE(acknowledged_at,
            CASE WHEN target_status = 'in_progress' THEN now() ELSE NULL END),
         updated_at = now()
   WHERE id = _assignment_id;

  -- Heartbeat
  UPDATE public.suppliers SET last_activity_at = now(), updated_at = now()
   WHERE id = su.supplier_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('supplier_status_update',
          'Supplier ' || COALESCE((SELECT name FROM public.suppliers WHERE id = su.supplier_id), su.email)
            || ' set assignment to ' || _new_status
            || COALESCE(' — ' || _note, ''),
          'assignment', _assignment_id);

  RETURN jsonb_build_object('ok', true, 'assignment_id', _assignment_id, 'status', _new_status);
END;
$function$;

-- 3. Heartbeat on login too
CREATE OR REPLACE FUNCTION public.supplier_login_with_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  su public.supplier_users;
  s  public.suppliers;
BEGIN
  SELECT * INTO su FROM public.supplier_users
   WHERE access_token = _token AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_TOKEN');
  END IF;

  SELECT * INTO s FROM public.suppliers WHERE id = su.supplier_id;
  IF NOT FOUND OR s.status NOT IN ('APPROVED','QUALIFIED','CONTACTED','NEW') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'SUPPLIER_INACTIVE');
  END IF;

  UPDATE public.supplier_users
     SET last_login_at = now(), updated_at = now()
   WHERE id = su.id;

  -- Heartbeat
  UPDATE public.suppliers SET last_activity_at = now(), updated_at = now()
   WHERE id = s.id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('supplier_portal_login',
          'Supplier portal login: ' || s.name,
          'supplier_user', su.id);

  RETURN jsonb_build_object(
    'ok', true,
    'supplier_user_id', su.id,
    'supplier_id', s.id,
    'supplier_name', s.name,
    'supplier_email', su.email,
    'business_name', s.business_name,
    'role', s.role,
    'status', s.status
  );
END;
$function$;

-- 4. Idle assignment flagger (cron-callable)
CREATE OR REPLACE FUNCTION public.flag_idle_assignments()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  WITH updated AS (
    UPDATE public.assignments
       SET sla_status = 'at_risk'
     WHERE status = 'assigned'
       AND acknowledged_at IS NULL
       AND assigned_at < (now() - interval '24 hours')
       AND sla_status NOT IN ('overdue','at_risk')
    RETURNING id, supplier_id, deal_id
  ),
  logged AS (
    INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
    SELECT 'assignment_idle_flag',
           'Assignment ' || u.id::text || ' idle 24h+ — supplier has not acknowledged',
           'assignment', u.id
      FROM updated u
    RETURNING 1
  )
  SELECT COUNT(*) INTO n FROM updated;
  RETURN n;
END;
$function$;

-- 5. Supplier performance score
CREATE OR REPLACE FUNCTION public.recompute_supplier_score(_supplier_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  total_finished int := 0;
  completed_n int := 0;
  failed_n int := 0;
  on_time_n int := 0;
  active_recent boolean := false;
  completion_pct numeric := 0;
  on_time_pct numeric := 0;
  failure_pct numeric := 0;
  score numeric := 50;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status IN ('completed','failed')),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status = 'completed'
                       AND expected_completion_date IS NOT NULL
                       AND completed_at::date <= expected_completion_date)
    INTO total_finished, completed_n, failed_n, on_time_n
  FROM public.assignments WHERE supplier_id = _supplier_id;

  SELECT (last_activity_at IS NOT NULL AND last_activity_at > now() - interval '30 days')
    INTO active_recent FROM public.suppliers WHERE id = _supplier_id;

  IF total_finished = 0 THEN
    score := 50; -- neutral until we have data
  ELSE
    completion_pct := (completed_n::numeric / total_finished) * 100;
    failure_pct    := (failed_n::numeric / total_finished) * 100;
    on_time_pct    := CASE WHEN completed_n > 0
                           THEN (on_time_n::numeric / completed_n) * 100
                           ELSE 0 END;
    score := (completion_pct * 0.5) + (on_time_pct * 0.3) - (failure_pct * 0.2);
    IF active_recent THEN score := score + 5; END IF;
  END IF;

  IF score < 0 THEN score := 0; END IF;
  IF score > 100 THEN score := 100; END IF;

  UPDATE public.suppliers
     SET supplier_score = ROUND(score)::int, updated_at = now()
   WHERE id = _supplier_id;

  RETURN ROUND(score)::int;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recompute_all_supplier_scores()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE n integer := 0; r record;
BEGIN
  FOR r IN SELECT id FROM public.suppliers LOOP
    PERFORM public.recompute_supplier_score(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;

-- Trigger: recompute supplier score whenever an assignment terminates
CREATE OR REPLACE FUNCTION public.trg_recompute_supplier_score_on_assignment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('completed','failed')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.recompute_supplier_score(NEW.supplier_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_assignment_score_recompute ON public.assignments;
CREATE TRIGGER trg_assignment_score_recompute
  AFTER INSERT OR UPDATE OF status ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_supplier_score_on_assignment();

-- 6. Reassignment suggestion (one best alternative)
CREATE OR REPLACE FUNCTION public.suggest_replacement_supplier(_assignment_id uuid)
RETURNS SETOF public.suppliers
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE a public.assignments;
BEGIN
  SELECT * INTO a FROM public.assignments WHERE id = _assignment_id;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT s.*
    FROM public.suppliers s
    JOIN public.supplier_availability sa ON sa.supplier_id = s.id
   WHERE s.status = 'APPROVED'
     AND sa.status = 'available'
     AND s.id <> a.supplier_id
     AND (a.business_name = '' OR s.business_name = '' OR s.business_name = a.business_name)
     AND (
       COALESCE(array_length(a.required_skills,1),0) = 0
       OR s.skills && a.required_skills
     )
   ORDER BY
     COALESCE(array_length(ARRAY(SELECT unnest(s.skills) INTERSECT SELECT unnest(a.required_skills)), 1), 0) DESC,
     s.supplier_score DESC,
     s.created_at ASC
   LIMIT 5;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.flag_idle_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_supplier_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_all_supplier_scores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_replacement_supplier(uuid) TO authenticated;