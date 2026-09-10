ALTER FUNCTION public.claim_portfolio_contact(uuid, text, text, uuid, boolean, text) SECURITY INVOKER;
ALTER FUNCTION public.release_portfolio_contact(uuid, text, text) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.claim_portfolio_contact(uuid, text, text, uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_portfolio_contact(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_portfolio_contact(uuid, text, text, uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_portfolio_contact(uuid, text, text) TO authenticated, service_role;