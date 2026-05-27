
CREATE TABLE public.voc_feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  source TEXT NOT NULL,
  channel TEXT,
  customer_label TEXT,
  contact_id UUID,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  theme TEXT,
  summary TEXT NOT NULL,
  raw_excerpt TEXT,
  related_deal_id UUID,
  related_ticket_id UUID,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.voc_feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  mention_count INTEGER NOT NULL DEFAULT 1,
  customer_impact TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'captured',
  recommended_next_step TEXT,
  requires_product_review BOOLEAN NOT NULL DEFAULT true,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.voc_testimonial_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  customer_label TEXT,
  quote TEXT NOT NULL,
  context TEXT,
  strength_score INTEGER NOT NULL DEFAULT 0,
  ask_status TEXT NOT NULL DEFAULT 'pending_review',
  requires_external_ask BOOLEAN NOT NULL DEFAULT true,
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.voc_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  customer_label TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  platform TEXT,
  draft_subject TEXT,
  draft_body TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  requires_external_send BOOLEAN NOT NULL DEFAULT true,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.voc_churn_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  customer_label TEXT,
  reason_category TEXT NOT NULL,
  primary_cause TEXT NOT NULL,
  detail TEXT,
  revenue_impact NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  recoverable BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'captured',
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.voc_pmf_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  segment TEXT,
  signal_type TEXT NOT NULL,
  very_disappointed_pct NUMERIC(5,2),
  nps_score NUMERIC(5,2),
  sample_size INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  watch BOOLEAN NOT NULL DEFAULT false,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.voc_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  topic TEXT NOT NULL,
  insight TEXT NOT NULL,
  recommendation TEXT,
  confidence NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  source_count INTEGER NOT NULL DEFAULT 0,
  founder_decision TEXT,
  applied BOOLEAN NOT NULL DEFAULT false,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voc_feedback_records TO authenticated;
GRANT ALL ON public.voc_feedback_records TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voc_feature_requests TO authenticated;
GRANT ALL ON public.voc_feature_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voc_testimonial_candidates TO authenticated;
GRANT ALL ON public.voc_testimonial_candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voc_review_requests TO authenticated;
GRANT ALL ON public.voc_review_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voc_churn_reasons TO authenticated;
GRANT ALL ON public.voc_churn_reasons TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voc_pmf_signals TO authenticated;
GRANT ALL ON public.voc_pmf_signals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voc_insights TO authenticated;
GRANT ALL ON public.voc_insights TO service_role;

ALTER TABLE public.voc_feedback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voc_feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voc_testimonial_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voc_review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voc_churn_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voc_pmf_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voc_insights ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'voc_feedback_records',
    'voc_feature_requests',
    'voc_testimonial_candidates',
    'voc_review_requests',
    'voc_churn_reasons',
    'voc_pmf_signals',
    'voc_insights'
  ]) LOOP
    EXECUTE format($f$
      CREATE POLICY "Founders manage %1$I"
      ON public.%1$I
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
    $f$, t);
  END LOOP;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'voc_feedback_records',
    'voc_feature_requests',
    'voc_testimonial_candidates',
    'voc_review_requests',
    'voc_churn_reasons',
    'voc_pmf_signals',
    'voc_insights'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$I_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

CREATE INDEX idx_voc_feedback_sentiment ON public.voc_feedback_records(sentiment);
CREATE INDEX idx_voc_feedback_source ON public.voc_feedback_records(source);
CREATE INDEX idx_voc_feature_status ON public.voc_feature_requests(status);
CREATE INDEX idx_voc_testimonial_status ON public.voc_testimonial_candidates(ask_status);
CREATE INDEX idx_voc_review_status ON public.voc_review_requests(approval_status);
CREATE INDEX idx_voc_churn_status ON public.voc_churn_reasons(status);
CREATE INDEX idx_voc_pmf_watch ON public.voc_pmf_signals(watch);
