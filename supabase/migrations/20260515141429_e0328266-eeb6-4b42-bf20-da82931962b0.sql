
CREATE TABLE public.business_knowledge_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  profile_status text NOT NULL DEFAULT 'draft',
  business_summary text,
  offer_summary text,
  target_customer text,
  ideal_customer_profile text,
  pain_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  value_propositions jsonb NOT NULL DEFAULT '[]'::jsonb,
  proof_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  common_objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_tone text,
  forbidden_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_disclaimers jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposal_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  outreach_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  compliance_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_knowledge_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_title text NOT NULL,
  asset_content text,
  source_url text,
  source_file_id text,
  status text NOT NULL DEFAULT 'active',
  agent_visible boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bk_assets_business ON public.business_knowledge_assets(business_id);
CREATE INDEX idx_bk_assets_type ON public.business_knowledge_assets(asset_type);

ALTER TABLE public.business_knowledge_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_knowledge_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage knowledge profiles"
  ON public.business_knowledge_profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage knowledge assets"
  ON public.business_knowledge_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_bk_profiles_updated
  BEFORE UPDATE ON public.business_knowledge_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_bk_assets_updated
  BEFORE UPDATE ON public.business_knowledge_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.business_knowledge_profiles (business_id, profile_status, business_summary, metadata)
SELECT id, 'draft', 'Neon Candy — knowledge brain seeded; awaiting founder population.', '{"seeded": true}'::jsonb
FROM public.businesses WHERE name = 'Neon Candy'
ON CONFLICT (business_id) DO NOTHING;
