
-- Legal document versions table
CREATE TABLE public.legal_document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_summary TEXT DEFAULT ''
);

ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read legal versions" ON public.legal_document_versions
  FOR SELECT TO public USING (true);

CREATE POLICY "Founders can manage legal versions" ON public.legal_document_versions
  FOR ALL TO public USING (has_role(auth.uid(), 'founder'::app_role));

-- Seed initial document versions
INSERT INTO public.legal_document_versions (document_name, version, change_summary) VALUES
  ('Terms of Service', '1.0', 'Initial version'),
  ('Privacy Policy', '1.0', 'Initial version'),
  ('Acceptable Use Policy', '1.0', 'Initial version'),
  ('AI Usage Policy', '1.0', 'Initial version'),
  ('Automation Safety Policy', '1.0', 'Initial version'),
  ('Security Policy', '1.0', 'Initial version'),
  ('Cookie Policy', '1.0', 'Initial version'),
  ('Data Processing Agreement', '1.0', 'Initial version');

-- User legal acceptance table
CREATE TABLE public.user_legal_acceptance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  privacy_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT ''
);

ALTER TABLE public.user_legal_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own acceptance" ON public.user_legal_acceptance
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own acceptance" ON public.user_legal_acceptance
  FOR SELECT TO public USING (auth.uid() = user_id);

CREATE POLICY "Founders can view all acceptances" ON public.user_legal_acceptance
  FOR SELECT TO public USING (has_role(auth.uid(), 'founder'::app_role));
