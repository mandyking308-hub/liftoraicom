CREATE TABLE public.ai_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_usage_ledger_id uuid NOT NULL,
  business_id uuid,
  agent_id uuid,
  campaign_id uuid,
  task_category text,
  output_quality_score numeric,
  usefulness_score numeric,
  accuracy_score numeric,
  brand_fit_score numeric,
  risk_score numeric,
  founder_rating numeric,
  feedback_label text,
  approved_without_edit boolean NOT NULL DEFAULT false,
  edited_before_approval boolean NOT NULL DEFAULT false,
  rejected boolean NOT NULL DEFAULT false,
  rejection_reason text,
  edit_summary text,
  notes text,
  prompt_template_id uuid,
  model_tier text,
  model_provider text,
  model_used text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aiqs_ledger ON public.ai_quality_scores(ai_usage_ledger_id);
CREATE INDEX idx_aiqs_business ON public.ai_quality_scores(business_id);
CREATE INDEX idx_aiqs_agent ON public.ai_quality_scores(agent_id);
CREATE INDEX idx_aiqs_campaign ON public.ai_quality_scores(campaign_id);
CREATE INDEX idx_aiqs_task_category ON public.ai_quality_scores(task_category);
CREATE INDEX idx_aiqs_template ON public.ai_quality_scores(prompt_template_id);
CREATE INDEX idx_aiqs_created_at ON public.ai_quality_scores(created_at);

ALTER TABLE public.ai_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all quality scores"
  ON public.ai_quality_scores FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert quality scores"
  ON public.ai_quality_scores FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update quality scores"
  ON public.ai_quality_scores FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete quality scores"
  ON public.ai_quality_scores FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));