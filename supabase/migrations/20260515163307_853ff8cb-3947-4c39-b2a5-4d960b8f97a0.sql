
CREATE TABLE public.support_knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  article_type text NOT NULL,
  title text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'draft',
  audience text NOT NULL DEFAULT 'customer',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  agent_visible boolean NOT NULL DEFAULT true,
  approved boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_interaction_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  conversation_id uuid,
  interaction_id uuid,
  support_category text,
  urgency text NOT NULL DEFAULT 'normal',
  customer_question text,
  suggested_answer text,
  knowledge_article_id uuid REFERENCES public.support_knowledge_articles(id) ON DELETE SET NULL,
  escalation_required boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  send_allowed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ska_business ON public.support_knowledge_articles(business_id);
CREATE INDEX idx_ska_type ON public.support_knowledge_articles(article_type);
CREATE INDEX idx_sir_business ON public.support_interaction_reviews(business_id);
CREATE INDEX idx_sir_status ON public.support_interaction_reviews(status);

ALTER TABLE public.support_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_interaction_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders manage support_knowledge_articles"
  ON public.support_knowledge_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "founders manage support_interaction_reviews"
  ON public.support_interaction_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_ska_updated_at
  BEFORE UPDATE ON public.support_knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sir_updated_at
  BEFORE UPDATE ON public.support_interaction_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
