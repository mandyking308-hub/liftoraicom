
CREATE TABLE public.knowledge_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  source_type TEXT NOT NULL DEFAULT 'manual',
  title TEXT NOT NULL,
  summary TEXT,
  trust_level TEXT NOT NULL DEFAULT 'medium',
  source_url TEXT,
  file_reference TEXT,
  last_verified_at TIMESTAMPTZ,
  verified_by TEXT,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  conflict_type TEXT NOT NULL DEFAULT 'other',
  source_a_id UUID REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  source_b_id UUID REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  conflict_summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  resolution_status TEXT NOT NULL DEFAULT 'open',
  resolved_value TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.approved_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  product_id UUID,
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL DEFAULT 'benefit',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  evidence_source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage knowledge sources" ON public.knowledge_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage knowledge conflicts" ON public.knowledge_conflicts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage approved claims" ON public.approved_claims
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_knowledge_sources_updated_at
  BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_conflicts_updated_at
  BEFORE UPDATE ON public.knowledge_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approved_claims_updated_at
  BEFORE UPDATE ON public.approved_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_kg_sources_trust ON public.knowledge_sources(trust_level);
CREATE INDEX idx_kg_sources_type ON public.knowledge_sources(source_type);
CREATE INDEX idx_kg_sources_active ON public.knowledge_sources(active);
CREATE INDEX idx_kg_conflicts_status ON public.knowledge_conflicts(resolution_status);
CREATE INDEX idx_kg_conflicts_type ON public.knowledge_conflicts(conflict_type);
CREATE INDEX idx_kg_claims_status ON public.approved_claims(approval_status);
CREATE INDEX idx_kg_claims_product ON public.approved_claims(product_id);
