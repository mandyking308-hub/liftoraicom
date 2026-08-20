CREATE OR REPLACE FUNCTION public.assert_founder_or_service()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role)) THEN
    RAISE EXCEPTION 'not authorised';
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.assert_founder_or_service() FROM public;
GRANT EXECUTE ON FUNCTION public.assert_founder_or_service() TO authenticated, service_role;