
-- 1) Fix invalid MIN(uuid) in supplier auto-assign trigger
CREATE OR REPLACE FUNCTION public.try_auto_assign_supplier_on_deal_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matches uuid[];
  picked_supplier uuid;
BEGIN
  IF NEW.status <> 'WON' OR OLD.status = 'WON' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.assignments WHERE deal_id = NEW.id) THEN RETURN NEW; END IF;

  SELECT array_agg(s.id ORDER BY s.id) INTO matches
    FROM public.suppliers s
    JOIN public.supplier_availability sa ON sa.supplier_id = s.id
   WHERE s.status = 'APPROVED'
     AND sa.status = 'available'
     AND (NEW.business_name = '' OR s.business_name = '' OR s.business_name = NEW.business_name)
     AND (
       COALESCE(array_length(NEW.required_skills, 1), 0) = 0
       OR s.skills && NEW.required_skills
     );

  IF matches IS NOT NULL AND array_length(matches, 1) = 1 THEN
    picked_supplier := matches[1];
    INSERT INTO public.assignments (supplier_id, deal_id, contact_id, business_name, status, auto_assigned, required_skills)
    VALUES (picked_supplier, NEW.id, NEW.contact_id, COALESCE(NEW.business_name,''), 'assigned', true, NEW.required_skills);
    INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
    VALUES ('assignment_auto_created',
            'Auto-assigned supplier to won deal ' || NEW.deal_name,
            'assignment', NEW.id);
  END IF;
  RETURN NEW;
END; $$;

-- 2) Make guards silently skip + log (RETURN NULL) instead of RAISE — so the activity_log row commits.
CREATE OR REPLACE FUNCTION public.guard_deal_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_feature_enabled('deals', NEW.business_name) THEN
    PERFORM public.log_feature_skip('deals', NEW.business_name, 'deal', NULL);
    RETURN NULL;  -- silently drop the insert
  END IF;
  RETURN NEW;
END;
$$;

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
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_demo_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_feature_enabled('demos', NEW.business_name) THEN
    PERFORM public.log_feature_skip('demos', NEW.business_name, 'demo_access', NULL);
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_assignment_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_feature_enabled('suppliers', NEW.business_name) THEN
    PERFORM public.log_feature_skip('suppliers', NEW.business_name, 'assignment', NULL);
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
