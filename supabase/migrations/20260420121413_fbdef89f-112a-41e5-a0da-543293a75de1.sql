-- 1. SUPPLIERS: skills + tags
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags   text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_suppliers_skills ON public.suppliers USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_suppliers_tags   ON public.suppliers USING GIN(tags);

-- 2. DEALS: required_skills (so matching can be skill-aware)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS required_skills text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_deals_required_skills ON public.deals USING GIN(required_skills);

-- 3. ASSIGNMENTS: SLA + confirmation + finance link + per-assignment skills
DO $$ BEGIN
  CREATE TYPE public.assignment_sla_status AS ENUM ('on_track','at_risk','overdue','n_a');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS expected_completion_date date,
  ADD COLUMN IF NOT EXISTS sla_status public.assignment_sla_status NOT NULL DEFAULT 'n_a',
  ADD COLUMN IF NOT EXISTS completion_confirmed_by_founder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS required_skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requires_finance_action boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_assignments_finance ON public.assignments(requires_finance_action) WHERE requires_finance_action = true;
CREATE INDEX IF NOT EXISTS idx_assignments_sla ON public.assignments(sla_status) WHERE sla_status IN ('at_risk','overdue');

-- 4. SLA recompute helper + trigger
CREATE OR REPLACE FUNCTION public.compute_assignment_sla(_expected date, _status assignment_status)
RETURNS public.assignment_sla_status
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _status IN ('completed','failed') THEN 'n_a'::public.assignment_sla_status
    WHEN _expected IS NULL THEN 'n_a'::public.assignment_sla_status
    WHEN _expected < CURRENT_DATE THEN 'overdue'::public.assignment_sla_status
    WHEN _expected <= CURRENT_DATE + INTERVAL '2 days' THEN 'at_risk'::public.assignment_sla_status
    ELSE 'on_track'::public.assignment_sla_status
  END;
$$;

CREATE OR REPLACE FUNCTION public.set_assignment_sla()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.sla_status := public.compute_assignment_sla(NEW.expected_completion_date, NEW.status);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_assignment_sla ON public.assignments;
CREATE TRIGGER trg_assignment_sla
  BEFORE INSERT OR UPDATE OF expected_completion_date, status ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_assignment_sla();

-- Nightly batch refresh (callable from cron later)
CREATE OR REPLACE FUNCTION public.refresh_all_assignment_sla()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.assignments
     SET sla_status = public.compute_assignment_sla(expected_completion_date, status)
   WHERE sla_status IS DISTINCT FROM public.compute_assignment_sla(expected_completion_date, status);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

-- 5. CAPACITY-AWARE availability sync (replaces previous version)
CREATE OR REPLACE FUNCTION public.sync_supplier_availability_from_assignment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  active_count integer;
  cap integer;
  is_overridden boolean;
  sup_id uuid := COALESCE(NEW.supplier_id, OLD.supplier_id);
BEGIN
  SELECT manual_override, COALESCE(capacity, 1)
    INTO is_overridden, cap
    FROM public.supplier_availability WHERE supplier_id = sup_id;

  SELECT COUNT(*) INTO active_count
    FROM public.assignments
   WHERE supplier_id = sup_id AND status IN ('assigned','in_progress');

  IF NOT COALESCE(is_overridden, false) THEN
    UPDATE public.supplier_availability
       SET status = CASE WHEN active_count >= COALESCE(cap,1)
                         THEN 'busy'::supplier_availability_status
                         ELSE 'available'::supplier_availability_status END,
           updated_at = now()
     WHERE supplier_id = sup_id;
  END IF;

  -- Lifecycle stamps
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' AND NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
      VALUES ('assignment_completed',
              'Supplier marked assignment ' || NEW.id::text || ' completed (awaiting founder confirmation)',
              'assignment', NEW.id);
    END IF;
    IF NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed' THEN
      NEW.failed_at := COALESCE(NEW.failed_at, now());
      INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
      VALUES ('assignment_failed',
              'Assignment failed for deal ' || NEW.deal_id::text || ' — re-assignment suggested',
              'assignment', NEW.id);
      INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
      VALUES ('reassignment_suggested',
              'Supplier ' || NEW.supplier_id::text || ' freed up after failure on deal ' || NEW.deal_id::text,
              'assignment', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END; $$;

-- 6. SKILL-AWARE eligible suppliers (replaces previous version)
CREATE OR REPLACE FUNCTION public.eligible_suppliers_for_deal(_deal_id uuid)
RETURNS SETOF public.suppliers
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.*
    FROM public.suppliers s
    JOIN public.supplier_availability sa ON sa.supplier_id = s.id
    JOIN public.deals d ON d.id = _deal_id
   WHERE s.status = 'APPROVED'
     AND sa.status = 'available'
     AND (d.business_name = '' OR s.business_name = '' OR s.business_name = d.business_name)
     AND (
       COALESCE(array_length(d.required_skills, 1), 0) = 0
       OR s.skills && d.required_skills
     )
   ORDER BY
     -- prefer suppliers matching MORE required skills
     COALESCE(array_length(ARRAY(SELECT unnest(s.skills) INTERSECT SELECT unnest(d.required_skills)), 1), 0) DESC,
     s.created_at ASC;
$$;

-- 7. Auto-assign now also respects skill match
CREATE OR REPLACE FUNCTION public.try_auto_assign_supplier_on_deal_won()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  match_count integer;
  picked_supplier uuid;
BEGIN
  IF NEW.status <> 'WON' OR OLD.status = 'WON' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.assignments WHERE deal_id = NEW.id) THEN RETURN NEW; END IF;

  SELECT COUNT(*), MIN(s.id) INTO match_count, picked_supplier
    FROM public.suppliers s
    JOIN public.supplier_availability sa ON sa.supplier_id = s.id
   WHERE s.status = 'APPROVED'
     AND sa.status = 'available'
     AND (NEW.business_name = '' OR s.business_name = '' OR s.business_name = NEW.business_name)
     AND (
       COALESCE(array_length(NEW.required_skills, 1), 0) = 0
       OR s.skills && NEW.required_skills
     );

  IF match_count = 1 AND picked_supplier IS NOT NULL THEN
    INSERT INTO public.assignments (supplier_id, deal_id, contact_id, business_name, status, auto_assigned, required_skills)
    VALUES (picked_supplier, NEW.id, NEW.contact_id, COALESCE(NEW.business_name,''), 'assigned', true, NEW.required_skills);
    INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
    VALUES ('assignment_auto_created',
            'Auto-assigned supplier to won deal ' || NEW.deal_name,
            'assignment', NEW.id);
  END IF;
  RETURN NEW;
END; $$;

-- 8. Founder confirmation RPC (delivery confirmation loop + finance link)
CREATE OR REPLACE FUNCTION public.founder_confirm_assignment(_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.assignments;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT * INTO a FROM public.assignments WHERE id = _assignment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  END IF;
  IF a.status <> 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_COMPLETED', 'status', a.status);
  END IF;
  IF a.completion_confirmed_by_founder THEN
    RETURN jsonb_build_object('ok', true, 'already_confirmed', true);
  END IF;

  UPDATE public.assignments
     SET completion_confirmed_by_founder = true,
         confirmed_at = now(),
         requires_finance_action = true,
         updated_at = now()
   WHERE id = _assignment_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('assignment_ready_for_billing',
          'Assignment ' || _assignment_id::text || ' confirmed complete by founder — finance action required',
          'assignment', _assignment_id);

  RETURN jsonb_build_object('ok', true, 'assignment_id', _assignment_id);
END; $$;

GRANT EXECUTE ON FUNCTION public.founder_confirm_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_all_assignment_sla() TO authenticated;