-- 1. supplier_users table
CREATE TABLE public.supplier_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  auth_user_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_supplier_users_supplier ON public.supplier_users(supplier_id);
CREATE INDEX idx_supplier_users_token ON public.supplier_users(access_token) WHERE active = true;

ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage supplier users"
  ON public.supplier_users FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_supplier_users_updated_at
  BEFORE UPDATE ON public.supplier_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. share_contact_details flag on assignments (founder picks per assignment)
ALTER TABLE public.assignments
  ADD COLUMN share_contact_details BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN supplier_note TEXT NOT NULL DEFAULT '';

-- 3. RPC: validate token, return supplier core info
CREATE OR REPLACE FUNCTION public.supplier_login_with_token(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  su public.supplier_users;
  s public.suppliers;
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
$$;

-- 4. RPC: list assignments visible to this supplier (limited fields)
CREATE OR REPLACE FUNCTION public.supplier_list_assignments(_token TEXT)
RETURNS TABLE(
  id UUID,
  deal_id UUID,
  deal_name TEXT,
  business_name TEXT,
  contact_name TEXT,
  contact_company TEXT,
  contact_email TEXT,
  status assignment_status,
  share_contact_details BOOLEAN,
  supplier_note TEXT,
  notes TEXT,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  su public.supplier_users;
BEGIN
  SELECT * INTO su FROM public.supplier_users
   WHERE access_token = _token AND active = true LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT a.id, a.deal_id, d.deal_name, a.business_name,
         c.name AS contact_name,
         c.company AS contact_company,
         CASE WHEN a.share_contact_details THEN c.email ELSE '' END AS contact_email,
         a.status, a.share_contact_details, a.supplier_note, a.notes,
         a.assigned_at, a.started_at, a.completed_at
    FROM public.assignments a
    LEFT JOIN public.deals d ON d.id = a.deal_id
    LEFT JOIN public.contacts c ON c.id = a.contact_id
   WHERE a.supplier_id = su.supplier_id
   ORDER BY
     CASE a.status WHEN 'in_progress' THEN 1 WHEN 'assigned' THEN 2
                   WHEN 'completed' THEN 3 WHEN 'failed' THEN 4 END,
     a.assigned_at DESC;
END;
$$;

-- 5. RPC: supplier updates assignment status (only in_progress or completed)
CREATE OR REPLACE FUNCTION public.supplier_update_assignment_status(
  _token TEXT,
  _assignment_id UUID,
  _new_status TEXT,
  _note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  su public.supplier_users;
  a public.assignments;
  target_status assignment_status;
BEGIN
  SELECT * INTO su FROM public.supplier_users
   WHERE access_token = _token AND active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_TOKEN');
  END IF;

  IF _new_status NOT IN ('in_progress', 'completed') THEN
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
         updated_at = now()
   WHERE id = _assignment_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('supplier_status_update',
          'Supplier ' || COALESCE((SELECT name FROM public.suppliers WHERE id = su.supplier_id), su.email)
            || ' set assignment to ' || _new_status
            || COALESCE(' — ' || _note, ''),
          'assignment', _assignment_id);

  RETURN jsonb_build_object('ok', true, 'assignment_id', _assignment_id, 'status', _new_status);
END;
$$;

-- 6. RPC: founder dashboard supplier-portal stats (last 24h)
CREATE OR REPLACE FUNCTION public.supplier_portal_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_24h int;
  updates_24h int;
  total_completed int;
  total_finished int;
  completion_rate numeric;
BEGIN
  SELECT COUNT(*) INTO active_24h
    FROM public.supplier_users
   WHERE last_login_at > now() - interval '24 hours';

  SELECT COUNT(*) INTO updates_24h
    FROM public.activity_log
   WHERE event_type = 'supplier_status_update'
     AND created_at > now() - interval '24 hours';

  SELECT COUNT(*) FILTER (WHERE status = 'completed'),
         COUNT(*) FILTER (WHERE status IN ('completed','failed'))
    INTO total_completed, total_finished
    FROM public.assignments;

  completion_rate := CASE WHEN total_finished > 0
                          THEN ROUND((total_completed::numeric / total_finished) * 100, 1)
                          ELSE 0 END;

  RETURN jsonb_build_object(
    'active_suppliers_24h', active_24h,
    'updates_24h', updates_24h,
    'completion_rate', completion_rate,
    'completed_total', total_completed
  );
END;
$$;

-- 7. Grant execute on supplier portal RPCs to anon (token-gated, no Supabase Auth required)
GRANT EXECUTE ON FUNCTION public.supplier_login_with_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_list_assignments(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_update_assignment_status(TEXT, UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_portal_stats() TO authenticated;