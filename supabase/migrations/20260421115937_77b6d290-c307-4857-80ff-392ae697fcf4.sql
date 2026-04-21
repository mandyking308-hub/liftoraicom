
-- 1. Execution modes
CREATE TABLE IF NOT EXISTS public.system_execution_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_execution_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view execution modes"
  ON public.system_execution_modes FOR SELECT
  USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can manage execution modes"
  ON public.system_execution_modes FOR ALL
  USING (public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'founder'));

-- Only one default
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_execution_modes_one_default
  ON public.system_execution_modes ((1)) WHERE is_default = true;

-- 2. Feature flags
CREATE TABLE IF NOT EXISTS public.system_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  execution_mode_id uuid NOT NULL REFERENCES public.system_execution_modes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_mode_id, feature_name)
);

ALTER TABLE public.system_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view feature flags"
  ON public.system_feature_flags FOR SELECT
  USING (public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders can manage feature flags"
  ON public.system_feature_flags FOR ALL
  USING (public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'founder'));

-- 3. Add execution_mode_id to businesses (create table if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Founders can view businesses"
    ON public.businesses FOR SELECT
    USING (public.has_role(auth.uid(), 'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Founders can manage businesses"
    ON public.businesses FOR ALL
    USING (public.has_role(auth.uid(), 'founder'))
    WITH CHECK (public.has_role(auth.uid(), 'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS execution_mode_id uuid REFERENCES public.system_execution_modes(id) ON DELETE SET NULL;

-- 4. Seed default modes
INSERT INTO public.system_execution_modes (mode_name, description, is_default) VALUES
  ('sales', 'Full sales pipeline: outreach + proposals + deals + invoicing + suppliers', false),
  ('outreach', 'Outreach-only: lead generation and conversations, no deals/invoicing', true),
  ('hybrid', 'Outreach + proposals + demos, manual deal/invoice handling', false)
ON CONFLICT (mode_name) DO NOTHING;

-- 5. Seed feature flags per mode
WITH modes AS (SELECT id, mode_name FROM public.system_execution_modes)
INSERT INTO public.system_feature_flags (execution_mode_id, feature_name, enabled)
SELECT m.id, f.feature_name,
  CASE m.mode_name
    WHEN 'sales' THEN true
    WHEN 'outreach' THEN (f.feature_name IN ('outreach','demos'))
    WHEN 'hybrid' THEN (f.feature_name IN ('outreach','proposals','demos'))
  END
FROM modes m
CROSS JOIN (VALUES
  ('proposals'), ('deals'), ('invoicing'), ('suppliers'), ('outreach'), ('demos')
) AS f(feature_name)
ON CONFLICT (execution_mode_id, feature_name) DO NOTHING;

-- 6. Seed businesses + assignments
INSERT INTO public.businesses (name) VALUES ('Velocity'), ('FutureCandy')
ON CONFLICT (name) DO NOTHING;

UPDATE public.businesses SET execution_mode_id = (SELECT id FROM public.system_execution_modes WHERE mode_name = 'sales')
  WHERE name = 'Velocity';
UPDATE public.businesses SET execution_mode_id = (SELECT id FROM public.system_execution_modes WHERE mode_name = 'outreach')
  WHERE name = 'FutureCandy';

-- 7. Resolution + check functions
CREATE OR REPLACE FUNCTION public.get_active_execution_mode(_business_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT b.execution_mode_id FROM public.businesses b
       WHERE _business_name IS NOT NULL AND b.name = _business_name AND b.execution_mode_id IS NOT NULL LIMIT 1),
    (SELECT id FROM public.system_execution_modes WHERE is_default = true LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_feature_enabled(_feature_name text, _business_name text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mode_id uuid;
  _enabled boolean;
BEGIN
  _mode_id := public.get_active_execution_mode(_business_name);
  IF _mode_id IS NULL THEN
    RETURN true; -- fallback: no mode configured → keep existing behaviour
  END IF;
  SELECT enabled INTO _enabled
    FROM public.system_feature_flags
   WHERE execution_mode_id = _mode_id AND feature_name = _feature_name
   LIMIT 1;
  RETURN COALESCE(_enabled, true);
END;
$$;

-- 8. Logging helper for skipped actions
CREATE OR REPLACE FUNCTION public.log_feature_skip(_feature_name text, _business_name text, _entity_type text DEFAULT NULL, _entity_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id, business_name)
  VALUES (
    'feature_disabled',
    'Skipped ' || _feature_name || ' for business ' || COALESCE(_business_name, 'default') || ' — feature disabled by execution mode',
    _entity_type, _entity_id, COALESCE(_business_name, 'default')
  );
$$;

-- 9. Gate existing automations: deal creation, invoice automation, supplier assignment
-- Wrap handle_deal_won so it respects feature flags
CREATE OR REPLACE FUNCTION public.handle_deal_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'WON' AND (OLD.status IS NULL OR OLD.status <> 'WON') THEN
    -- Invoicing gate
    IF public.is_feature_enabled('invoicing', NEW.business_name) THEN
      BEGIN
        INSERT INTO public.invoices (deal_id, business_name, amount, currency, status)
        VALUES (NEW.id, NEW.business_name, NEW.estimated_value_max, NEW.currency, 'DRAFT');
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    ELSE
      PERFORM public.log_feature_skip('invoicing', NEW.business_name, 'deal', NEW.id);
    END IF;

    -- Lock contact as CLIENT (always)
    IF NEW.contact_id IS NOT NULL THEN
      UPDATE public.contacts SET status = 'CLIENT' WHERE id = NEW.contact_id;
    END IF;

    -- Supplier auto-assign gate
    IF public.is_feature_enabled('suppliers', NEW.business_name) THEN
      BEGIN
        PERFORM public.pick_supplier_for_deal(NEW.id);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    ELSE
      PERFORM public.log_feature_skip('suppliers', NEW.business_name, 'deal', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Gate deal creation entirely when 'deals' disabled
CREATE OR REPLACE FUNCTION public.guard_deal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_feature_enabled('deals', NEW.business_name) THEN
    PERFORM public.log_feature_skip('deals', NEW.business_name, 'deal', NULL);
    RAISE EXCEPTION 'Deals are disabled for business % under the current execution mode', NEW.business_name
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_deal_creation ON public.deals;
CREATE TRIGGER trg_guard_deal_creation
  BEFORE INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.guard_deal_creation();

-- Gate proposal creation
CREATE OR REPLACE FUNCTION public.guard_proposal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _biz text;
BEGIN
  SELECT assigned_business INTO _biz FROM public.contacts WHERE id = NEW.contact_id;
  IF NOT public.is_feature_enabled('proposals', _biz) THEN
    PERFORM public.log_feature_skip('proposals', _biz, 'internal_proposal', NULL);
    RAISE EXCEPTION 'Proposals are disabled for business % under the current execution mode', _biz
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_proposal_creation ON public.internal_proposals;
CREATE TRIGGER trg_guard_proposal_creation
  BEFORE INSERT ON public.internal_proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_proposal_creation();

-- Gate demo creation
CREATE OR REPLACE FUNCTION public.guard_demo_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_feature_enabled('demos', NEW.business_name) THEN
    PERFORM public.log_feature_skip('demos', NEW.business_name, 'demo_access', NULL);
    RAISE EXCEPTION 'Demos are disabled for business % under the current execution mode', NEW.business_name
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_demo_creation ON public.demo_access;
CREATE TRIGGER trg_guard_demo_creation
  BEFORE INSERT ON public.demo_access
  FOR EACH ROW EXECUTE FUNCTION public.guard_demo_creation();

-- Gate assignments (suppliers)
CREATE OR REPLACE FUNCTION public.guard_assignment_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_feature_enabled('suppliers', NEW.business_name) THEN
    PERFORM public.log_feature_skip('suppliers', NEW.business_name, 'assignment', NULL);
    RAISE EXCEPTION 'Supplier assignments are disabled for business % under the current execution mode', NEW.business_name
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_assignment_creation ON public.assignments;
CREATE TRIGGER trg_guard_assignment_creation
  BEFORE INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.guard_assignment_creation();
