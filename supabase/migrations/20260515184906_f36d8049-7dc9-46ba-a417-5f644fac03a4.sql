
CREATE TABLE public.ai_prompt_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key text NOT NULL,
  agent_key text,
  business_id uuid,
  prompt_name text NOT NULL,
  prompt_purpose text,
  prompt_version text DEFAULT '1.0',
  prompt_status text DEFAULT 'active',
  prompt_body text,
  approved_by_founder boolean DEFAULT false,
  risk_level text DEFAULT 'medium',
  last_reviewed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.ai_draft_quality_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  agent_key text,
  source_table text,
  source_id uuid,
  draft_type text NOT NULL,
  quality_score numeric,
  grounding_score numeric,
  tone_score numeric,
  compliance_score numeric,
  customer_context_score numeric,
  unsupported_claims jsonb DEFAULT '[]'::jsonb,
  missing_context jsonb DEFAULT '[]'::jsonb,
  risk_flags jsonb DEFAULT '[]'::jsonb,
  recommended_fix text,
  founder_review_required boolean DEFAULT true,
  approved_for_customer_view boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_prompt_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_draft_quality_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prompt registry" ON public.ai_prompt_registry
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage draft quality reviews" ON public.ai_draft_quality_reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_ai_prompt_registry_updated_at
  BEFORE UPDATE ON public.ai_prompt_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_prompt_status ON public.ai_prompt_registry(prompt_status);
CREATE INDEX idx_prompt_key ON public.ai_prompt_registry(prompt_key);
CREATE INDEX idx_draft_review_created ON public.ai_draft_quality_reviews(created_at DESC);
CREATE INDEX idx_draft_review_founder ON public.ai_draft_quality_reviews(founder_review_required);
