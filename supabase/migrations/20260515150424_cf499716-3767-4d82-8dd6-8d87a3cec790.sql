-- ============================================================
-- SUPPORTED LANGUAGES
-- ============================================================
CREATE TABLE public.supported_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code text NOT NULL UNIQUE,
  language_name text NOT NULL,
  native_name text,
  script text,
  rtl boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  founder_review_required boolean NOT NULL DEFAULT true,
  auto_draft_allowed boolean NOT NULL DEFAULT true,
  auto_send_allowed boolean NOT NULL DEFAULT false,
  risk_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins view supported languages"
  ON public.supported_languages FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Founders/admins manage supported languages"
  ON public.supported_languages FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_supported_languages_updated_at
  BEFORE UPDATE ON public.supported_languages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.supported_languages
  (language_code, language_name, native_name, script, rtl, founder_review_required, auto_draft_allowed, auto_send_allowed, risk_notes)
VALUES
  ('en','English','English','Latin',false,false,true,false,null),
  ('fr','French','Français','Latin',false,true,true,false,'Formal register expected for B2B.'),
  ('es','Spanish','Español','Latin',false,true,true,false,'Regional variants (ES vs LATAM).'),
  ('pt','Portuguese','Português','Latin',false,true,true,false,'PT-BR vs PT-PT differ.'),
  ('de','German','Deutsch','Latin',false,true,true,false,'Formal Sie/du distinction.'),
  ('it','Italian','Italiano','Latin',false,true,true,false,null),
  ('nl','Dutch','Nederlands','Latin',false,true,true,false,null),
  ('ar','Arabic','العربية','Arabic',true,true,true,false,'RTL script. Modern Standard vs dialects.'),
  ('hi','Hindi','हिन्दी','Devanagari',false,true,true,false,'Code-mixing with English common.'),
  ('ur','Urdu','اردو','Arabic',true,true,true,false,'RTL script. Formal register required.'),
  ('zh','Chinese','中文','Han',false,true,true,false,'Simplified vs Traditional. High-risk for nuance.'),
  ('ja','Japanese','日本語','Japanese',false,true,true,false,'Keigo / honorifics critical.'),
  ('ko','Korean','한국어','Hangul',false,true,true,false,'Honorifics critical.'),
  ('tr','Turkish','Türkçe','Latin',false,true,true,false,null),
  ('el','Greek','Ελληνικά','Greek',false,true,true,false,null),
  ('ru','Russian','Русский','Cyrillic',false,true,true,false,'Compliance/sanctions risk.'),
  ('pl','Polish','Polski','Latin',false,true,true,false,null);

-- ============================================================
-- MULTILINGUAL INTERACTION REVIEWS
-- ============================================================
CREATE TABLE public.multilingual_interaction_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  conversation_id uuid,
  interaction_id uuid,
  source_language text,
  detected_language_confidence numeric,
  founder_summary_english text,
  original_text text,
  translated_text_english text,
  intent_detected text,
  cultural_tone_notes text,
  recommended_response_language text,
  draft_response_original_language text,
  draft_response_english_back_translation text,
  founder_review_required boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'draft',
  send_allowed boolean NOT NULL DEFAULT false,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_multilingual_reviews_recent
  ON public.multilingual_interaction_reviews (created_at DESC);
CREATE INDEX idx_multilingual_reviews_business
  ON public.multilingual_interaction_reviews (business_id, created_at DESC);
CREATE INDEX idx_multilingual_reviews_status
  ON public.multilingual_interaction_reviews (approval_status);

ALTER TABLE public.multilingual_interaction_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins view multilingual reviews"
  ON public.multilingual_interaction_reviews FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Founders/admins manage multilingual reviews"
  ON public.multilingual_interaction_reviews FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_multilingual_reviews_updated_at
  BEFORE UPDATE ON public.multilingual_interaction_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();