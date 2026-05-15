
CREATE TABLE public.knowledge_source_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  source_type text NOT NULL,
  source_title text NOT NULL,
  source_table text NULL,
  source_id uuid NULL,
  source_url text NULL,
  source_status text NOT NULL DEFAULT 'active',
  approval_status text NOT NULL DEFAULT 'unreviewed',
  freshness_status text NOT NULL DEFAULT 'unknown',
  reliability_score numeric NULL,
  customer_visible_allowed boolean NOT NULL DEFAULT false,
  agent_visible_allowed boolean NOT NULL DEFAULT true,
  internal_only boolean NOT NULL DEFAULT true,
  risk_level text NOT NULL DEFAULT 'medium',
  last_reviewed_at timestamptz NULL,
  review_due_at date NULL,
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_source_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage knowledge sources"
  ON public.knowledge_source_registry
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX idx_knowledge_source_registry_business ON public.knowledge_source_registry(business_id);
CREATE INDEX idx_knowledge_source_registry_status ON public.knowledge_source_registry(approval_status, freshness_status);
CREATE INDEX idx_knowledge_source_registry_review_due ON public.knowledge_source_registry(review_due_at);

CREATE TRIGGER trg_knowledge_source_registry_updated
  BEFORE UPDATE ON public.knowledge_source_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.knowledge_conflict_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  source_a_id uuid NULL REFERENCES public.knowledge_source_registry(id) ON DELETE SET NULL,
  source_b_id uuid NULL REFERENCES public.knowledge_source_registry(id) ON DELETE SET NULL,
  conflict_type text NOT NULL,
  conflict_summary text NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  founder_review_required boolean NOT NULL DEFAULT true,
  recommended_resolution text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_conflict_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage knowledge conflicts"
  ON public.knowledge_conflict_flags
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX idx_knowledge_conflict_flags_status ON public.knowledge_conflict_flags(status, severity);

CREATE TRIGGER trg_knowledge_conflict_flags_updated
  BEFORE UPDATE ON public.knowledge_conflict_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
