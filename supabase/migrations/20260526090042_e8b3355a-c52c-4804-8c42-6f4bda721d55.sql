
CREATE TABLE public.exit_metric_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  archetype_code TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL CHECK (metric_category IN (
    'revenue','retention','growth','margin','customer','marketplace','product','ip','compliance','operations','other'
  )),
  description TEXT,
  buyer_importance_score INTEGER NOT NULL DEFAULT 5 CHECK (buyer_importance_score BETWEEN 1 AND 10),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (archetype_code, metric_name)
);

CREATE TABLE public.business_exit_metric_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  metric_template_id UUID REFERENCES public.exit_metric_templates(id) ON DELETE CASCADE,
  metric_value NUMERIC,
  metric_status TEXT NOT NULL DEFAULT 'missing' CHECK (metric_status IN ('missing','estimated','confirmed','watch','strong')),
  evidence_source TEXT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.business_exit_readiness_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  score_period_start DATE,
  score_period_end DATE,
  revenue_quality_score NUMERIC,
  growth_score NUMERIC,
  margin_score NUMERIC,
  defensibility_score NUMERIC,
  operations_score NUMERIC,
  compliance_score NUMERIC,
  buyer_fit_score NUMERIC,
  data_room_score NUMERIC,
  total_exit_readiness_score NUMERIC,
  recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.exit_metric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_exit_metric_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_exit_readiness_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage exit_metric_templates" ON public.exit_metric_templates
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage business_exit_metric_values" ON public.business_exit_metric_values
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage business_exit_readiness_scores" ON public.business_exit_readiness_scores
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_exit_metric_templates_updated_at
  BEFORE UPDATE ON public.exit_metric_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_exit_metric_values_updated_at
  BEFORE UPDATE ON public.business_exit_metric_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_exit_metric_templates_archetype ON public.exit_metric_templates(archetype_code);
CREATE INDEX idx_business_exit_values_business ON public.business_exit_metric_values(business_id);
CREATE INDEX idx_business_exit_values_template ON public.business_exit_metric_values(metric_template_id);
CREATE INDEX idx_business_exit_readiness_business ON public.business_exit_readiness_scores(business_id);

INSERT INTO public.exit_metric_templates (archetype_code, metric_name, metric_category, description, buyer_importance_score) VALUES
  ('saas','MRR','revenue','Monthly recurring revenue',10),
  ('saas','ARR','revenue','Annual recurring revenue',10),
  ('saas','Churn','retention','Logo and revenue churn',10),
  ('saas','CAC','growth','Customer acquisition cost',8),
  ('saas','LTV','customer','Customer lifetime value',9),
  ('saas','Activation rate','product','% of signups reaching activation',7),
  ('saas','Support burden','operations','Tickets per active account',6),
  ('marketplace','GMV','revenue','Gross merchandise volume',10),
  ('marketplace','Take rate','margin','Platform take rate %',9),
  ('marketplace','Active buyers','customer','Active buyers in period',8),
  ('marketplace','Active sellers','marketplace','Active sellers in period',8),
  ('marketplace','Liquidity','marketplace','Time-to-match / fill rate',9),
  ('marketplace','Match rate','marketplace','% of demand matched',8),
  ('marketplace','Repeat rate','retention','Repeat buyer / seller rate',8),
  ('ecommerce','Revenue','revenue','Net revenue',9),
  ('ecommerce','Margin','margin','Contribution / gross margin',9),
  ('ecommerce','Repeat purchase','retention','Repeat purchase rate',8),
  ('ecommerce','Fulfilment reliability','operations','On-time / accurate fulfilment',7),
  ('ecommerce','Return rate','operations','% of orders returned',6),
  ('service','Recurring revenue','revenue','Retainer / recurring revenue',9),
  ('service','EBITDA','margin','Operating profitability',10),
  ('service','Client concentration','customer','Top-client revenue share',8),
  ('service','Delivery process','operations','Documented delivery system',8),
  ('service','Team dependency','operations','Founder/key-person dependency',9),
  ('media','Audience','customer','Audience size & reach',8),
  ('media','Catalogue','ip','Catalogue size & evergreen %',7),
  ('media','Rights ownership','ip','Owned vs licensed rights',9),
  ('media','Licensing revenue','revenue','Licensing & sync revenue',8),
  ('media','Engagement','customer','Engagement rate',7),
  ('lead_gen','Lead quality','product','Verified lead quality score',9),
  ('lead_gen','Buyer relationships','customer','Active buyer accounts',9),
  ('lead_gen','Compliance','compliance','Consent / regulatory compliance',10),
  ('lead_gen','Revenue per lead','revenue','RPL across buyer base',8),
  ('course','Members','customer','Active members',8),
  ('course','Completion','product','Course completion rate',7),
  ('course','Engagement','customer','Weekly active member rate',7),
  ('course','Churn','retention','Member churn',9),
  ('course','Renewal','retention','Renewal / resubscription rate',9);
