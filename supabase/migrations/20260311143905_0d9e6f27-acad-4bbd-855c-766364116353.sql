
-- Partner applications table
CREATE TABLE public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_email text NOT NULL,
  partner_type text NOT NULL DEFAULT 'agency',
  project_description text,
  status text NOT NULL DEFAULT 'pending',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit partner application" ON public.partner_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Founders can view all applications" ON public.partner_applications FOR SELECT USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can update applications" ON public.partner_applications FOR UPDATE USING (public.has_role(auth.uid(), 'founder'));

-- Opportunities table
CREATE TABLE public.partner_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  industry text NOT NULL DEFAULT '',
  project_description text NOT NULL DEFAULT '',
  estimated_scope text,
  timeline text,
  primary_contact text,
  status text NOT NULL DEFAULT 'new_submission',
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own opportunities" ON public.partner_opportunities FOR SELECT USING (partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Partners can insert opportunities" ON public.partner_opportunities FOR INSERT WITH CHECK (partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND public.has_role(auth.uid(), 'partner'));
CREATE POLICY "Partners can update own opportunities" ON public.partner_opportunities FOR UPDATE USING (partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND public.has_role(auth.uid(), 'partner'));
CREATE POLICY "Founders can view all opportunities" ON public.partner_opportunities FOR SELECT USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can update opportunities" ON public.partner_opportunities FOR UPDATE USING (public.has_role(auth.uid(), 'founder'));

-- Partner messages
CREATE TABLE public.partner_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.partner_opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own opportunity messages" ON public.partner_messages FOR SELECT USING (opportunity_id IN (SELECT id FROM public.partner_opportunities WHERE partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Partners can send messages" ON public.partner_messages FOR INSERT WITH CHECK (auth.uid() = user_id AND opportunity_id IN (SELECT id FROM public.partner_opportunities WHERE partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can view all partner messages" ON public.partner_messages FOR SELECT USING (public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders can send partner messages" ON public.partner_messages FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'founder'));

-- Partner documents
CREATE TABLE public.partner_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.partner_opportunities(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  uploaded_by text NOT NULL DEFAULT 'Partner',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners can view own documents" ON public.partner_documents FOR SELECT USING (opportunity_id IN (SELECT id FROM public.partner_opportunities WHERE partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Partners can upload documents" ON public.partner_documents FOR INSERT WITH CHECK (opportunity_id IN (SELECT id FROM public.partner_opportunities WHERE partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can view all partner documents" ON public.partner_documents FOR SELECT USING (public.has_role(auth.uid(), 'founder'));

-- Partners can view linked projects
CREATE POLICY "Partners can view linked projects" ON public.projects FOR SELECT USING (id IN (SELECT project_id FROM public.partner_opportunities WHERE partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND project_id IS NOT NULL));
CREATE POLICY "Partners can view linked project milestones" ON public.project_milestones FOR SELECT USING (project_id IN (SELECT project_id FROM public.partner_opportunities WHERE partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND project_id IS NOT NULL));
CREATE POLICY "Partners can view linked project updates" ON public.project_updates FOR SELECT USING (project_id IN (SELECT project_id FROM public.partner_opportunities WHERE partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND project_id IS NOT NULL));
CREATE POLICY "Partners can view linked project stages" ON public.project_stages FOR SELECT USING (project_id IN (SELECT project_id FROM public.partner_opportunities WHERE partner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND project_id IS NOT NULL));

-- Triggers
CREATE TRIGGER update_partner_opportunities_updated_at BEFORE UPDATE ON public.partner_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_applications_updated_at BEFORE UPDATE ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activity log trigger
CREATE OR REPLACE FUNCTION public.log_new_opportunity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('opportunity_submitted', 'New partner opportunity: ' || NEW.company_name, 'opportunity', NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_new_opportunity AFTER INSERT ON public.partner_opportunities FOR EACH ROW EXECUTE FUNCTION public.log_new_opportunity();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('partner-documents', 'partner-documents', false);
CREATE POLICY "Partners can upload to partner-documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'partner-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Partners can view partner-documents" ON storage.objects FOR SELECT USING (bucket_id = 'partner-documents' AND auth.role() = 'authenticated');
