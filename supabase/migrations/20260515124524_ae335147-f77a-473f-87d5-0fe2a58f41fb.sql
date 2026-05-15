CREATE TABLE IF NOT EXISTS public.crm_conversation_bridge_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid REFERENCES public.crm_interaction_ledger(id) ON DELETE CASCADE,
  business_id uuid,
  contact_id uuid,
  conversation_id uuid,
  proposed_communication_direction text,
  proposed_communication_type text,
  proposed_conversation_action text NOT NULL DEFAULT 'none',
  proposed_subject text,
  proposed_body_preview text,
  detected_intent text,
  confidence numeric,
  founder_review_required boolean NOT NULL DEFAULT true,
  apply_status text NOT NULL DEFAULT 'preview',
  apply_blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ccbr_interaction ON public.crm_conversation_bridge_reviews(interaction_id);
CREATE INDEX IF NOT EXISTS idx_ccbr_contact ON public.crm_conversation_bridge_reviews(contact_id);
CREATE INDEX IF NOT EXISTS idx_ccbr_business ON public.crm_conversation_bridge_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_ccbr_conversation ON public.crm_conversation_bridge_reviews(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ccbr_apply_status ON public.crm_conversation_bridge_reviews(apply_status);

ALTER TABLE public.crm_conversation_bridge_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read bridge reviews"
ON public.crm_conversation_bridge_reviews FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders/admins manage bridge reviews"
ON public.crm_conversation_bridge_reviews FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_ccbr_updated_at
BEFORE UPDATE ON public.crm_conversation_bridge_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();