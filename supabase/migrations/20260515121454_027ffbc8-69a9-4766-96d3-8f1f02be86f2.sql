CREATE TABLE IF NOT EXISTS public.provider_event_intake_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id uuid REFERENCES public.outbound_provider_events(id) ON DELETE CASCADE,
  provider_type text NOT NULL DEFAULT 'smartlead',
  normalized_event_type text,
  contact_id uuid,
  business_id uuid,
  campaign_id uuid,
  provider_campaign_id text,
  contact_email text,
  detected_intent text,
  confidence numeric,
  recommended_action text,
  founder_review_required boolean NOT NULL DEFAULT true,
  apply_status text NOT NULL DEFAULT 'preview',
  ai_draft_allowed boolean NOT NULL DEFAULT false,
  outbound_send_allowed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peir_event ON public.provider_event_intake_reviews(provider_event_id);
CREATE INDEX IF NOT EXISTS idx_peir_status ON public.provider_event_intake_reviews(apply_status, created_at DESC);

ALTER TABLE public.provider_event_intake_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins can read intake reviews"
  ON public.provider_event_intake_reviews FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders/admins can insert intake reviews"
  ON public.provider_event_intake_reviews FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders/admins can update intake reviews"
  ON public.provider_event_intake_reviews FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_peir_updated_at
  BEFORE UPDATE ON public.provider_event_intake_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();