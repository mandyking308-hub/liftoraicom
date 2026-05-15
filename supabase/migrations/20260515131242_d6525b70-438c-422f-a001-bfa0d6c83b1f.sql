
CREATE TABLE IF NOT EXISTS public.ai_conversation_draft_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  contact_id uuid NULL,
  conversation_id uuid NULL,
  interaction_id uuid NULL,
  agent_task_id uuid NULL,
  detected_intent text NULL,
  intent_confidence numeric NULL,
  context_summary text NULL,
  customer_summary text NULL,
  recommended_reply_strategy text NULL,
  draft_subject text NULL,
  draft_body text NULL,
  tone_profile text DEFAULT 'warm_confident_concise',
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  compliance_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_review_required boolean NOT NULL DEFAULT true,
  send_allowed boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'draft',
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  rejected_at timestamptz NULL,
  rejection_reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acdr_status ON public.ai_conversation_draft_reviews(approval_status);
CREATE INDEX IF NOT EXISTS idx_acdr_contact ON public.ai_conversation_draft_reviews(contact_id);
CREATE INDEX IF NOT EXISTS idx_acdr_conv ON public.ai_conversation_draft_reviews(conversation_id);
CREATE INDEX IF NOT EXISTS idx_acdr_created ON public.ai_conversation_draft_reviews(created_at DESC);

ALTER TABLE public.ai_conversation_draft_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_admins_all_acdr" ON public.ai_conversation_draft_reviews;
CREATE POLICY "founders_admins_all_acdr" ON public.ai_conversation_draft_reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS trg_acdr_updated_at ON public.ai_conversation_draft_reviews;
CREATE TRIGGER trg_acdr_updated_at
  BEFORE UPDATE ON public.ai_conversation_draft_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ai_reply_tone_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tone_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NULL,
  style_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  forbidden_phrases jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_reply_tone_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_admins_all_artp" ON public.ai_reply_tone_profiles;
CREATE POLICY "founders_admins_all_artp" ON public.ai_reply_tone_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS trg_artp_updated_at ON public.ai_reply_tone_profiles;
CREATE TRIGGER trg_artp_updated_at
  BEFORE UPDATE ON public.ai_reply_tone_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_reply_tone_profiles (tone_key, label, description, style_rules, forbidden_phrases, required_checks) VALUES
  ('warm_confident_concise','Warm, confident, concise','Default Liftor tone. Friendly, direct, no fluff.', '{"max_sentences":6,"contractions":true,"avoid_jargon":true}'::jsonb, '["just checking in","circling back","per my last email"]'::jsonb, '["no_send_until_approved","compliance_footer_required"]'::jsonb),
  ('founder_personal','Founder personal','First-person Mandy voice for high-trust replies.', '{"first_person":true,"signoff":"— Mandy"}'::jsonb, '["our team will","we will get back"]'::jsonb, '["founder_review_required"]'::jsonb),
  ('neon_candy_creator_outreach','Neon Candy creator outreach','Energetic creator-brand outreach voice.', '{"emoji_allowed":true,"max_sentences":5}'::jsonb, '["dear sir","to whom it may concern"]'::jsonb, '["brand_match_check"]'::jsonb),
  ('professional_proposal_followup','Professional proposal follow-up','Crisp B2B follow-up referencing proposal.', '{"reference_proposal":true,"max_sentences":7}'::jsonb, '["just bumping","any update"]'::jsonb, '["proposal_link_required"]'::jsonb),
  ('finance_polite_chaser','Finance polite chaser','Polite payment chaser referencing invoice.', '{"reference_invoice":true,"polite":true}'::jsonb, '["pay now","overdue immediately"]'::jsonb, '["invoice_reference_required"]'::jsonb),
  ('supplier_instructional','Supplier instructional','Clear instructional voice for supplier ops.', '{"numbered_steps":true}'::jsonb, '["maybe","i think"]'::jsonb, '["supplier_scope_check"]'::jsonb),
  ('compliance_sensitive','Compliance sensitive','For unsubscribes, complaints, legal-adjacent.', '{"no_marketing":true,"acknowledge_request":true}'::jsonb, '["promotion","discount","offer"]'::jsonb, '["legal_review_recommended","no_marketing_content"]'::jsonb)
ON CONFLICT (tone_key) DO NOTHING;
