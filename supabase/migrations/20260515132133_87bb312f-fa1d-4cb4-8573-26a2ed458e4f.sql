
CREATE TABLE IF NOT EXISTS public.commercial_handoff_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  contact_id uuid NULL,
  conversation_id uuid NULL,
  interaction_id uuid NULL,
  approval_item_id uuid NULL,
  handoff_type text NOT NULL,
  qualification_summary text NULL,
  detected_need text NULL,
  proposed_offer text NULL,
  proposed_next_step text NULL,
  estimated_value_min numeric NULL,
  estimated_value_max numeric NULL,
  proposal_allowed boolean NOT NULL DEFAULT false,
  demo_allowed boolean NOT NULL DEFAULT false,
  deal_allowed boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  apply_status text NOT NULL DEFAULT 'preview',
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chr_status ON public.commercial_handoff_reviews(apply_status);
CREATE INDEX IF NOT EXISTS idx_chr_type ON public.commercial_handoff_reviews(handoff_type);
CREATE INDEX IF NOT EXISTS idx_chr_contact ON public.commercial_handoff_reviews(contact_id);
CREATE INDEX IF NOT EXISTS idx_chr_created ON public.commercial_handoff_reviews(created_at DESC);

ALTER TABLE public.commercial_handoff_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_admins_all_chr" ON public.commercial_handoff_reviews;
CREATE POLICY "founders_admins_all_chr" ON public.commercial_handoff_reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS trg_chr_updated_at ON public.commercial_handoff_reviews;
CREATE TRIGGER trg_chr_updated_at
  BEFORE UPDATE ON public.commercial_handoff_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
