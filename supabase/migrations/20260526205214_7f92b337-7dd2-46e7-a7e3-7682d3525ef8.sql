
CREATE TABLE public.portal_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('customer','seller','partner','adviser','document_upload','support','marketplace','other')),
  portal_name TEXT NOT NULL,
  portal_status TEXT NOT NULL DEFAULT 'internal_only' CHECK (portal_status IN ('draft','internal_only','approval_required','live','paused','retired')),
  public_url TEXT,
  access_mode TEXT NOT NULL DEFAULT 'disabled' CHECK (access_mode IN ('invite_only','magic_link','account_login','manual','disabled')),
  requires_founder_approval_for_invites BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_profiles TO authenticated;
GRANT ALL ON public.portal_profiles TO service_role;
ALTER TABLE public.portal_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read portal_profiles" ON public.portal_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write portal_profiles" ON public.portal_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.portal_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_profile_id UUID NOT NULL REFERENCES public.portal_profiles(id) ON DELETE CASCADE,
  business_id UUID,
  contact_id UUID,
  seller_id UUID,
  partner_id UUID,
  adviser_id UUID,
  email TEXT NOT NULL,
  display_name TEXT,
  portal_role TEXT NOT NULL CHECK (portal_role IN ('customer','seller','partner','adviser','uploader','read_only','admin_limited')),
  access_status TEXT NOT NULL DEFAULT 'draft' CHECK (access_status IN ('draft','invited','active','suspended','revoked','expired')),
  invited_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_users TO authenticated;
GRANT ALL ON public.portal_users TO service_role;
ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read portal_users" ON public.portal_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write portal_users" ON public.portal_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.portal_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_profile_id UUID NOT NULL REFERENCES public.portal_profiles(id) ON DELETE CASCADE,
  business_id UUID,
  invitee_email TEXT NOT NULL,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('customer','seller','partner','adviser','upload_request')),
  invite_status TEXT NOT NULL DEFAULT 'draft' CHECK (invite_status IN ('draft','approval_required','approved','sent','accepted','expired','revoked','cancelled')),
  invite_token_hash TEXT,
  expires_at TIMESTAMPTZ,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  founder_approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_invites TO authenticated;
GRANT ALL ON public.portal_invites TO service_role;
ALTER TABLE public.portal_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read portal_invites" ON public.portal_invites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write portal_invites" ON public.portal_invites FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.portal_access_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_profile_id UUID REFERENCES public.portal_profiles(id) ON DELETE CASCADE,
  portal_user_id UUID REFERENCES public.portal_users(id) ON DELETE SET NULL,
  business_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN ('invite_created','invite_sent','login','upload','download','view','access_revoked','suspicious','expired')),
  event_summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','low','medium','high','critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_access_events TO authenticated;
GRANT ALL ON public.portal_access_events TO service_role;
ALTER TABLE public.portal_access_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read portal_access_events" ON public.portal_access_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write portal_access_events" ON public.portal_access_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_portal_profiles_updated_at BEFORE UPDATE ON public.portal_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portal_users_updated_at BEFORE UPDATE ON public.portal_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portal_invites_updated_at BEFORE UPDATE ON public.portal_invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
