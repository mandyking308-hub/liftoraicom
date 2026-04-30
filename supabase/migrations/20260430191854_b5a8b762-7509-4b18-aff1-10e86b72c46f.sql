REVOKE ALL ON FUNCTION public.save_inbox_credentials(uuid,text,text,int,text,text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_inbox_credentials(uuid,text,text,int,text,text,text,text,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.save_inbox_credentials(uuid,text,text,int,text,text,text,text,text,text,text) FROM authenticated;
REVOKE ALL ON FUNCTION public.save_inbox_credentials(uuid,text,text,int,text,text,text,text,text,text,text) FROM sandbox_exec;
GRANT EXECUTE ON FUNCTION public.save_inbox_credentials(uuid,text,text,int,text,text,text,text,text,text,text) TO service_role;

REVOKE ALL ON FUNCTION public.get_inbox_credentials_for_send(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inbox_credentials_for_send(uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.get_inbox_credentials_for_send(uuid,text) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_inbox_credentials_for_send(uuid,text) FROM sandbox_exec;
GRANT EXECUTE ON FUNCTION public.get_inbox_credentials_for_send(uuid,text) TO service_role;