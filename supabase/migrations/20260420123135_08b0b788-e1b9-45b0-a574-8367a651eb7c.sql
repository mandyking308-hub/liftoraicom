CREATE OR REPLACE FUNCTION public.bump_rule_hit_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rule_id IS NOT NULL THEN
    UPDATE public.compliance_rules
       SET hit_count = hit_count + 1,
           last_hit_at = now()
     WHERE id = NEW.rule_id;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.stamp_compliance_event_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.resolved = true AND OLD.resolved = false THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
  ELSIF NEW.resolved = false AND OLD.resolved = true THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END; $$;