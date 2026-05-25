
CREATE TABLE public.founder_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL DEFAULT 'weekly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_status TEXT NOT NULL DEFAULT 'draft',
  executive_summary TEXT,
  key_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  key_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions_needed JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.founder_report_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.founder_reports(id) ON DELETE CASCADE,
  business_id UUID,
  item_type TEXT NOT NULL DEFAULT 'metric',
  item_summary TEXT NOT NULL,
  metric_value NUMERIC(18,4),
  priority TEXT NOT NULL DEFAULT 'medium',
  action_required BOOLEAN NOT NULL DEFAULT false,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_report_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage reports" ON public.founder_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage report items" ON public.founder_report_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_founder_reports_updated_at
  BEFORE UPDATE ON public.founder_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_founder_reports_type_period ON public.founder_reports(report_type, period_end DESC);
CREATE INDEX idx_founder_reports_status ON public.founder_reports(report_status);
CREATE INDEX idx_founder_report_items_report ON public.founder_report_items(report_id, item_type);
CREATE INDEX idx_founder_report_items_action ON public.founder_report_items(action_required);
