
ALTER FUNCTION public.country_to_timezone(text) SET search_path = public;
ALTER FUNCTION public.resolve_contact_timezone(uuid) SET search_path = public;
ALTER FUNCTION public.inbox_warmup_limit(uuid) SET search_path = public;
ALTER FUNCTION public.domain_for_inbox(uuid) SET search_path = public;
ALTER FUNCTION public.next_valid_send_time(uuid, timestamptz) SET search_path = public;
