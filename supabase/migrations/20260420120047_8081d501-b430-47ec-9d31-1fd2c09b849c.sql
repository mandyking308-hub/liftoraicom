-- =========================================================
-- PROCUREMENT / RECRUITMENT ENGINE
-- =========================================================

-- Enums
CREATE TYPE public.supplier_status AS ENUM ('NEW','CONTACTED','QUALIFIED','APPROVED','REJECTED','INACTIVE');
CREATE TYPE public.supplier_pipeline_stage AS ENUM ('sourced','contacted','responded','evaluated','approved','rejected');
CREATE TYPE public.supplier_availability_status AS ENUM ('available','busy','unavailable');
CREATE TYPE public.assignment_status AS ENUM ('assigned','in_progress','completed','failed');

-- =========================================================
-- 1. suppliers
-- =========================================================
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  company text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  status public.supplier_status NOT NULL DEFAULT 'NEW',
  source text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_suppliers_email_unique ON public.suppliers (lower(email));
CREATE INDEX idx_suppliers_status ON public.suppliers (status);
CREATE INDEX idx_suppliers_business ON public.suppliers (business_name);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage suppliers"
  ON public.suppliers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. supplier_pipeline
-- =========================================================
CREATE TABLE public.supplier_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  stage public.supplier_pipeline_stage NOT NULL DEFAULT 'sourced',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplier_pipeline_supplier ON public.supplier_pipeline (supplier_id);
CREATE INDEX idx_supplier_pipeline_stage ON public.supplier_pipeline (stage);

ALTER TABLE public.supplier_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage supplier_pipeline"
  ON public.supplier_pipeline FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_supplier_pipeline_updated_at
  BEFORE UPDATE ON public.supplier_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. supplier_availability
-- =========================================================
CREATE TABLE public.supplier_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL UNIQUE REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status public.supplier_availability_status NOT NULL DEFAULT 'available',
  capacity integer,
  manual_override boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplier_availability_status ON public.supplier_availability (status);

ALTER TABLE public.supplier_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage supplier_availability"
  ON public.supplier_availability FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_supplier_availability_updated_at
  BEFORE UPDATE ON public.supplier_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. assignments
-- =========================================================
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_name text NOT NULL DEFAULT '',
  status public.assignment_status NOT NULL DEFAULT 'assigned',
  notes text NOT NULL DEFAULT '',
  auto_assigned boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assignments_supplier ON public.assignments (supplier_id);
CREATE INDEX idx_assignments_deal ON public.assignments (deal_id);
CREATE INDEX idx_assignments_status ON public.assignments (status);
-- Prevent more than one ACTIVE assignment per deal+supplier pair
CREATE UNIQUE INDEX idx_assignments_active_unique
  ON public.assignments (deal_id, supplier_id)
  WHERE status IN ('assigned','in_progress');

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assignments"
  ON public.assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- TRIGGER: only APPROVED suppliers can be assigned
-- =========================================================
CREATE OR REPLACE FUNCTION public.guard_assignment_supplier_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.suppliers%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.suppliers WHERE id = NEW.supplier_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supplier % not found', NEW.supplier_id;
  END IF;
  IF s.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Supplier % is not APPROVED (status: %)', NEW.supplier_id, s.status;
  END IF;
  -- Stamp business_name from supplier if blank
  IF COALESCE(NEW.business_name,'') = '' THEN
    NEW.business_name := COALESCE(s.business_name,'');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_assignment_guard
  BEFORE INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_supplier_approved();

-- =========================================================
-- TRIGGER: new supplier → seed pipeline + availability
-- =========================================================
CREATE OR REPLACE FUNCTION public.seed_supplier_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.supplier_pipeline (supplier_id, stage)
  VALUES (NEW.id, 'sourced');

  INSERT INTO public.supplier_availability (supplier_id, status)
  VALUES (NEW.id, 'available');

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('supplier_added', 'New supplier sourced: ' || COALESCE(NEW.name, NEW.email), 'supplier', NEW.id);

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_supplier_seed_records
  AFTER INSERT ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.seed_supplier_records();

-- =========================================================
-- TRIGGER: supplier status changes → advance pipeline + log
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_supplier_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    UPDATE public.supplier_pipeline
       SET stage = 'approved', updated_at = now()
     WHERE supplier_id = NEW.id;
    INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
    VALUES ('supplier_approved', 'Supplier approved: ' || COALESCE(NEW.name, NEW.email), 'supplier', NEW.id);

  ELSIF NEW.status = 'REJECTED' AND OLD.status <> 'REJECTED' THEN
    NEW.rejected_at := COALESCE(NEW.rejected_at, now());
    UPDATE public.supplier_pipeline
       SET stage = 'rejected', updated_at = now()
     WHERE supplier_id = NEW.id;
    INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
    VALUES ('supplier_rejected', 'Supplier rejected: ' || COALESCE(NEW.name, NEW.email), 'supplier', NEW.id);

  ELSIF NEW.status = 'CONTACTED' AND OLD.status = 'NEW' THEN
    UPDATE public.supplier_pipeline
       SET stage = 'contacted', updated_at = now()
     WHERE supplier_id = NEW.id AND stage IN ('sourced');

  ELSIF NEW.status = 'QUALIFIED' THEN
    UPDATE public.supplier_pipeline
       SET stage = 'evaluated', updated_at = now()
     WHERE supplier_id = NEW.id AND stage NOT IN ('approved','rejected');
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_supplier_status_change
  BEFORE UPDATE OF status ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.handle_supplier_status_change();

-- =========================================================
-- TRIGGER: assignment lifecycle → availability sync (with manual override respect)
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_supplier_availability_from_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active boolean;
  is_overridden boolean;
BEGIN
  SELECT manual_override INTO is_overridden
    FROM public.supplier_availability WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id);

  -- Recompute "has any active assignment"
  SELECT EXISTS(
    SELECT 1 FROM public.assignments
     WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
       AND status IN ('assigned','in_progress')
  ) INTO has_active;

  -- Only auto-update availability if no manual override
  IF NOT COALESCE(is_overridden, false) THEN
    UPDATE public.supplier_availability
       SET status = CASE WHEN has_active THEN 'busy'::supplier_availability_status
                         ELSE 'available'::supplier_availability_status END,
           updated_at = now()
     WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id);
  END IF;

  -- Stamp lifecycle timestamps
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' AND NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
      INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
      VALUES ('assignment_completed', 'Assignment completed for deal ' || NEW.deal_id::text, 'assignment', NEW.id);
    END IF;
    IF NEW.status = 'failed' AND OLD.status IS DISTINCT FROM 'failed' THEN
      NEW.failed_at := COALESCE(NEW.failed_at, now());
      INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
      VALUES ('assignment_failed', 'Assignment failed for deal ' || NEW.deal_id::text, 'assignment', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- BEFORE UPDATE: stamp timestamps + then resync availability after the row settles
CREATE TRIGGER trg_assignment_lifecycle_before
  BEFORE UPDATE OF status ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_availability_from_assignment();

CREATE TRIGGER trg_assignment_lifecycle_after_insert
  AFTER INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_availability_from_assignment();

CREATE TRIGGER trg_assignment_lifecycle_after_update
  AFTER UPDATE OF status ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_supplier_availability_from_assignment();

-- =========================================================
-- TRIGGER: when manual_override flips off, resync from assignments
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_availability_override_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active boolean;
BEGIN
  IF NEW.manual_override = false AND OLD.manual_override = true THEN
    SELECT EXISTS(
      SELECT 1 FROM public.assignments
       WHERE supplier_id = NEW.supplier_id
         AND status IN ('assigned','in_progress')
    ) INTO has_active;
    NEW.status := CASE WHEN has_active THEN 'busy'::supplier_availability_status
                       ELSE 'available'::supplier_availability_status END;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_availability_override_change
  BEFORE UPDATE OF manual_override ON public.supplier_availability
  FOR EACH ROW EXECUTE FUNCTION public.handle_availability_override_change();

-- =========================================================
-- AUTO-ASSIGN ON DEAL WON (if exactly one match)
-- =========================================================
CREATE OR REPLACE FUNCTION public.try_auto_assign_supplier_on_deal_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_count integer;
  picked_supplier uuid;
BEGIN
  IF NEW.status <> 'WON' OR OLD.status = 'WON' THEN
    RETURN NEW;
  END IF;

  -- Skip if an assignment already exists for this deal
  IF EXISTS (SELECT 1 FROM public.assignments WHERE deal_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), MIN(s.id)
    INTO match_count, picked_supplier
    FROM public.suppliers s
    JOIN public.supplier_availability sa ON sa.supplier_id = s.id
   WHERE s.status = 'APPROVED'
     AND sa.status = 'available'
     AND (
       NEW.business_name = '' OR s.business_name = '' OR s.business_name = NEW.business_name
     );

  IF match_count = 1 AND picked_supplier IS NOT NULL THEN
    INSERT INTO public.assignments (supplier_id, deal_id, contact_id, business_name, status, auto_assigned)
    VALUES (picked_supplier, NEW.id, NEW.contact_id, COALESCE(NEW.business_name,''), 'assigned', true);

    INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
    VALUES ('assignment_auto_created',
            'Auto-assigned supplier to won deal ' || NEW.deal_name,
            'assignment', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_deal_won_auto_assign
  AFTER UPDATE OF status ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.try_auto_assign_supplier_on_deal_won();

-- =========================================================
-- HELPER: list eligible suppliers for a given deal
-- =========================================================
CREATE OR REPLACE FUNCTION public.eligible_suppliers_for_deal(_deal_id uuid)
RETURNS SETOF public.suppliers
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
    FROM public.suppliers s
    JOIN public.supplier_availability sa ON sa.supplier_id = s.id
    JOIN public.deals d ON d.id = _deal_id
   WHERE s.status = 'APPROVED'
     AND sa.status = 'available'
     AND (d.business_name = '' OR s.business_name = '' OR s.business_name = d.business_name)
   ORDER BY s.created_at ASC;
$$;