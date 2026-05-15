
CREATE TABLE public.competitor_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  website_url text,
  social_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  market_category text,
  offer_summary text,
  pricing_notes text,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  differentiation_notes text,
  status text NOT NULL DEFAULT 'watching',
  source_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.competitor_learning_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  competitor_id uuid REFERENCES public.competitor_business_profiles(id) ON DELETE SET NULL,
  insight_type text NOT NULL,
  insight_title text NOT NULL,
  insight_summary text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_response text,
  recommended_offer_change text,
  recommended_content_angle text,
  recommended_sales_angle text,
  risk_level text NOT NULL DEFAULT 'medium',
  founder_review_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_learning_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage competitor profiles"
  ON public.competitor_business_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage competitor insights"
  ON public.competitor_learning_insights
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_competitor_business_profiles_updated_at
  BEFORE UPDATE ON public.competitor_business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitor_learning_insights_updated_at
  BEFORE UPDATE ON public.competitor_learning_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_competitor_profiles_business ON public.competitor_business_profiles(business_id);
CREATE INDEX idx_competitor_insights_business ON public.competitor_learning_insights(business_id);
CREATE INDEX idx_competitor_insights_competitor ON public.competitor_learning_insights(competitor_id);
CREATE INDEX idx_competitor_insights_status ON public.competitor_learning_insights(status);
