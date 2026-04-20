ALTER VIEW public.high_priority_contacts SET (security_invoker = true);
ALTER VIEW public.high_priority_deals SET (security_invoker = true);
ALTER VIEW public.at_risk_assignments SET (security_invoker = true);
ALTER VIEW public.hot_conversations SET (security_invoker = true);

-- Re-declare the two trigger functions with explicit search_path (defensive)
CREATE OR REPLACE FUNCTION public.trg_priority_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recalculate_priority('deal', NEW.id);
  IF NEW.contact_id IS NOT NULL THEN
    PERFORM public.recalculate_priority('contact', NEW.contact_id);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_priority_from_compliance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  IF NEW.entity_type::text IN ('contact','deal','assignment','conversation') THEN
    PERFORM public.recalculate_priority(NEW.entity_type::text::public.priority_entity_type, NEW.entity_id);
  END IF;
  RETURN NEW;
END; $$;