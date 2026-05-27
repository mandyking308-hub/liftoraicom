
CREATE TABLE public.policy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_type TEXT NOT NULL,
  archetype TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'UK',
  required BOOLEAN NOT NULL DEFAULT true,
  sensitivity TEXT NOT NULL DEFAULT 'standard',
  default_review_frequency_days INTEGER NOT NULL DEFAULT 365,
  template_summary TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_templates TO authenticated;
GRANT ALL ON public.policy_templates TO service_role;
ALTER TABLE public.policy_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_policy_templates" ON public.policy_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.policy_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'UK',
  legal_entity TEXT,
  policy_type TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'missing',
  last_reviewed_at TIMESTAMPTZ,
  next_review_due DATE,
  is_stale BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_requirements TO authenticated;
GRANT ALL ON public.policy_requirements TO service_role;
ALTER TABLE public.policy_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_policy_requirements" ON public.policy_requirements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.policy_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES public.policy_requirements(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  draft_summary TEXT NOT NULL,
  draft_body TEXT,
  sensitivity TEXT NOT NULL DEFAULT 'standard',
  requires_legal_review BOOLEAN NOT NULL DEFAULT true,
  legal_reviewed BOOLEAN NOT NULL DEFAULT false,
  publish_status TEXT NOT NULL DEFAULT 'pending_approval',
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_drafts TO authenticated;
GRANT ALL ON public.policy_drafts TO service_role;
ALTER TABLE public.policy_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_policy_drafts" ON public.policy_drafts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.policy_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES public.policy_drafts(id) ON DELETE CASCADE,
  approver_role TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'pending',
  decided_at TIMESTAMPTZ,
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_approvals TO authenticated;
GRANT ALL ON public.policy_approvals TO service_role;
ALTER TABLE public.policy_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_policy_approvals" ON public.policy_approvals FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.policy_public_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  public_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  publish_status TEXT NOT NULL DEFAULT 'not_published',
  last_published_version TEXT,
  last_published_at TIMESTAMPTZ,
  requires_external_publish BOOLEAN NOT NULL DEFAULT true,
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_public_pages TO authenticated;
GRANT ALL ON public.policy_public_pages TO service_role;
ALTER TABLE public.policy_public_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_policy_public_pages" ON public.policy_public_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.policy_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES public.policy_requirements(id) ON DELETE SET NULL,
  draft_id UUID REFERENCES public.policy_drafts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'policy_coverage_agent',
  detail TEXT,
  routed_to TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_review_events TO authenticated;
GRANT ALL ON public.policy_review_events TO service_role;
ALTER TABLE public.policy_review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_policy_review_events" ON public.policy_review_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
