
CREATE TABLE IF NOT EXISTS public.revenue_operations_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  contact_id uuid NULL,
  deal_id uuid NULL,
  invoice_id uuid NULL,
  payment_id uuid NULL,
  supplier_id uuid NULL,
  assignment_id uuid NULL,
  review_type text NOT NULL,
  current_state text NULL,
  recommended_action text NULL,
  estimated_value numeric NULL,
  priority_level text NOT NULL DEFAULT 'normal',
  founder_review_required boolean NOT NULL DEFAULT true,
  apply_status text NOT NULL DEFAULT 'preview',
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_operations_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='revenue_operations_reviews' AND policyname='Founders/admins manage revenue ops reviews') THEN
    CREATE POLICY "Founders/admins manage revenue ops reviews"
      ON public.revenue_operations_reviews
      FOR ALL
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
      WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_revops_reviews_type ON public.revenue_operations_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_revops_reviews_apply_status ON public.revenue_operations_reviews(apply_status);
CREATE INDEX IF NOT EXISTS idx_revops_reviews_created ON public.revenue_operations_reviews(created_at DESC);

DROP TRIGGER IF EXISTS trg_revops_reviews_updated_at ON public.revenue_operations_reviews;
CREATE TRIGGER trg_revops_reviews_updated_at
BEFORE UPDATE ON public.revenue_operations_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
