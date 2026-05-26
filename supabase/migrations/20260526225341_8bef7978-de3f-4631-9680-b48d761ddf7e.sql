
CREATE TABLE public.identity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_email TEXT,
  primary_phone_summary TEXT,
  display_name TEXT,
  canonical_contact_id UUID,
  identity_status TEXT NOT NULL DEFAULT 'active',
  do_not_contact_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_ip_email ON public.identity_profiles(primary_email);
CREATE INDEX idx_ip_status ON public.identity_profiles(identity_status);
CREATE INDEX idx_ip_dnc ON public.identity_profiles(do_not_contact_global) WHERE do_not_contact_global = true;
GRANT SELECT, INSERT, UPDATE ON public.identity_profiles TO authenticated;
GRANT ALL ON public.identity_profiles TO service_role;
ALTER TABLE public.identity_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read identities" ON public.identity_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Authenticated insert identities" ON public.identity_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Founders update identities" ON public.identity_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.identity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_profile_id UUID NOT NULL REFERENCES public.identity_profiles(id) ON DELETE CASCADE,
  linked_table TEXT NOT NULL,
  linked_record_id UUID,
  linked_role TEXT NOT NULL DEFAULT 'other',
  business_id UUID,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  link_status TEXT NOT NULL DEFAULT 'suggested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_il_profile ON public.identity_links(identity_profile_id);
CREATE INDEX idx_il_role ON public.identity_links(linked_role);
CREATE INDEX idx_il_status ON public.identity_links(link_status);
GRANT SELECT, INSERT, UPDATE ON public.identity_links TO authenticated;
GRANT ALL ON public.identity_links TO service_role;
ALTER TABLE public.identity_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read links" ON public.identity_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Authenticated insert links" ON public.identity_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Founders update links" ON public.identity_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.duplicate_identity_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_profile_a_id UUID NOT NULL REFERENCES public.identity_profiles(id) ON DELETE CASCADE,
  identity_profile_b_id UUID NOT NULL REFERENCES public.identity_profiles(id) ON DELETE CASCADE,
  match_reason TEXT,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  merge_recommendation TEXT,
  merge_status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_dic_status ON public.duplicate_identity_candidates(merge_status);
CREATE INDEX idx_dic_a ON public.duplicate_identity_candidates(identity_profile_a_id);
CREATE INDEX idx_dic_b ON public.duplicate_identity_candidates(identity_profile_b_id);
GRANT SELECT, INSERT, UPDATE ON public.duplicate_identity_candidates TO authenticated;
GRANT ALL ON public.duplicate_identity_candidates TO service_role;
ALTER TABLE public.duplicate_identity_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read dupes" ON public.duplicate_identity_candidates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Authenticated insert dupes" ON public.duplicate_identity_candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Founders update dupes" ON public.duplicate_identity_candidates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.identity_merge_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duplicate_candidate_id UUID NOT NULL REFERENCES public.duplicate_identity_candidates(id) ON DELETE CASCADE,
  action_status TEXT NOT NULL DEFAULT 'draft',
  merge_summary TEXT,
  irreversible BOOLEAN NOT NULL DEFAULT true,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ima_candidate ON public.identity_merge_actions(duplicate_candidate_id);
CREATE INDEX idx_ima_status ON public.identity_merge_actions(action_status);
GRANT SELECT, INSERT, UPDATE ON public.identity_merge_actions TO authenticated;
GRANT ALL ON public.identity_merge_actions TO service_role;
ALTER TABLE public.identity_merge_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders read merges" ON public.identity_merge_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "Authenticated insert merges" ON public.identity_merge_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Founders update merges" ON public.identity_merge_actions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER trg_ip_updated BEFORE UPDATE ON public.identity_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_il_updated BEFORE UPDATE ON public.identity_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dic_updated BEFORE UPDATE ON public.duplicate_identity_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ima_updated BEFORE UPDATE ON public.identity_merge_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
