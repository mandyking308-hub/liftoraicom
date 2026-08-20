ALTER FUNCTION public.rebuild_billionaire_coverage() SECURITY INVOKER;
DROP FUNCTION IF EXISTS public.assert_founder_or_service();