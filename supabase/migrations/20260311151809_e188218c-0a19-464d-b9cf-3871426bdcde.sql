
-- Organisations table
CREATE TABLE public.organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text NOT NULL DEFAULT '',
  primary_contact text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage organisations" ON public.organisations FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Organisation members table
CREATE TABLE public.organisation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, user_id)
);

ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage org members" ON public.organisation_members FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "Members can view own org" ON public.organisation_members FOR SELECT USING (user_id = auth.uid());

-- Organisation documents table
CREATE TABLE public.organisation_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT NULL,
  category text NOT NULL DEFAULT 'General',
  uploaded_by text NOT NULL DEFAULT 'Liftor AI',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organisation_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage org documents" ON public.organisation_documents FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "Org members can view own org documents" ON public.organisation_documents FOR SELECT USING (
  organisation_id IN (SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid())
);

-- Add organisation_id to monitored_systems
ALTER TABLE public.monitored_systems ADD COLUMN organisation_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL;

-- Add organisation_id to profiles
ALTER TABLE public.profiles ADD COLUMN organisation_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL;

-- Storage bucket for org documents
INSERT INTO storage.buckets (id, name, public) VALUES ('organisation-documents', 'organisation-documents', false);

CREATE POLICY "Founders can manage org doc storage" ON storage.objects FOR ALL USING (bucket_id = 'organisation-documents' AND has_role(auth.uid(), 'founder'::app_role));

-- Updated at trigger
CREATE TRIGGER update_organisations_updated_at BEFORE UPDATE ON public.organisations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
