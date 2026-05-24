
-- 1. ai_usage_ledger
CREATE TABLE IF NOT EXISTS public.ai_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  agent_id UUID,
  task_id UUID,
  campaign_id UUID,
  workflow_id UUID,
  user_id UUID,
  action_type TEXT,
  task_category TEXT,
  model_used TEXT,
  model_provider TEXT,
  model_tier TEXT CHECK (model_tier IN ('no_ai','cheap','standard','premium','human_required')),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  prompt_purpose TEXT,
  input_summary TEXT,
  output_summary TEXT,
  status TEXT CHECK (status IN ('pending','completed','failed','skipped','blocked','human_review_required')),
  human_approved BOOLEAN DEFAULT false,
  revenue_linked_amount NUMERIC DEFAULT 0,
  pipeline_linked_amount NUMERIC DEFAULT 0,
  time_saved_minutes INTEGER DEFAULT 0,
  human_equivalent_cost NUMERIC DEFAULT 0,
  roi_score NUMERIC,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.ai_usage_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_ai_usage_ledger" ON public.ai_usage_ledger FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_usage_business ON public.ai_usage_ledger(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_agent ON public.ai_usage_ledger(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_campaign ON public.ai_usage_ledger(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_category ON public.ai_usage_ledger(task_category);
CREATE INDEX IF NOT EXISTS idx_ai_usage_status ON public.ai_usage_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON public.ai_usage_ledger(created_at DESC);

-- 2. ai_model_routing_rules
CREATE TABLE IF NOT EXISTS public.ai_model_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  task_category TEXT NOT NULL,
  action_type TEXT,
  default_model_tier TEXT CHECK (default_model_tier IN ('no_ai','cheap','standard','premium','human_required')),
  fallback_model_tier TEXT,
  max_cost_per_action NUMERIC,
  requires_human_approval BOOLEAN DEFAULT false,
  risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical')),
  active BOOLEAN DEFAULT true,
  rule_priority INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_model_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_ai_routing" ON public.ai_model_routing_rules FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_routing_business ON public.ai_model_routing_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_routing_category ON public.ai_model_routing_rules(task_category);

-- 3. ai_business_budgets
CREATE TABLE IF NOT EXISTS public.ai_business_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  daily_ai_budget NUMERIC DEFAULT 0,
  weekly_ai_budget NUMERIC DEFAULT 0,
  monthly_ai_budget NUMERIC DEFAULT 0,
  campaign_ai_budget NUMERIC DEFAULT 0,
  max_cost_per_lead NUMERIC DEFAULT 0,
  max_cost_per_opportunity NUMERIC DEFAULT 0,
  max_cost_per_customer NUMERIC DEFAULT 0,
  max_cost_per_content_asset NUMERIC DEFAULT 0,
  max_cost_per_agent_per_day NUMERIC DEFAULT 0,
  stop_when_budget_exceeded BOOLEAN DEFAULT true,
  require_founder_approval_when_exceeded BOOLEAN DEFAULT true,
  currency TEXT DEFAULT 'GBP',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_business_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_ai_budgets" ON public.ai_business_budgets FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_budgets_business ON public.ai_business_budgets(business_id);

-- 4. ai_agent_cost_controls
CREATE TABLE IF NOT EXISTS public.ai_agent_cost_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  business_id UUID,
  allowed_model_tiers TEXT[] DEFAULT '{}',
  default_model_tier TEXT,
  daily_spend_cap NUMERIC DEFAULT 0,
  weekly_spend_cap NUMERIC DEFAULT 0,
  monthly_spend_cap NUMERIC DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  max_actions_per_hour INTEGER DEFAULT 20,
  requires_human_approval BOOLEAN DEFAULT false,
  allowed_task_categories TEXT[] DEFAULT '{}',
  blocked_task_categories TEXT[] DEFAULT '{}',
  escalation_rules JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_cost_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_ai_agent_controls" ON public.ai_agent_cost_controls FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_agent_controls_agent ON public.ai_agent_cost_controls(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_controls_business ON public.ai_agent_cost_controls(business_id);

-- 5. ai_cost_alerts
CREATE TABLE IF NOT EXISTS public.ai_cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  agent_id UUID,
  campaign_id UUID,
  task_id UUID,
  alert_type TEXT,
  severity TEXT CHECK (severity IN ('info','warning','high','critical')),
  message TEXT NOT NULL,
  recommended_action TEXT,
  status TEXT CHECK (status IN ('open','acknowledged','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.ai_cost_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_ai_cost_alerts" ON public.ai_cost_alerts FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_alerts_business ON public.ai_cost_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_severity ON public.ai_cost_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_status ON public.ai_cost_alerts(status);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_created ON public.ai_cost_alerts(created_at DESC);

-- 6. ai_roi_snapshots
CREATE TABLE IF NOT EXISTS public.ai_roi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  agent_id UUID,
  campaign_id UUID,
  period_type TEXT CHECK (period_type IN ('daily','weekly','monthly','quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_ai_spend NUMERIC DEFAULT 0,
  estimated_human_cost_saved NUMERIC DEFAULT 0,
  net_saving NUMERIC DEFAULT 0,
  revenue_linked NUMERIC DEFAULT 0,
  pipeline_linked NUMERIC DEFAULT 0,
  ai_cost_to_revenue_ratio NUMERIC,
  ai_cost_to_pipeline_ratio NUMERIC,
  cost_per_lead NUMERIC,
  cost_per_opportunity NUMERIC,
  cost_per_sale NUMERIC,
  cost_per_content_asset NUMERIC,
  cost_per_customer_interaction NUMERIC,
  time_saved_minutes INTEGER DEFAULT 0,
  roi_score NUMERIC,
  roi_status TEXT CHECK (roi_status IN ('excellent','healthy','watch','poor','stop')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE public.ai_roi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_ai_roi" ON public.ai_roi_snapshots FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_roi_business ON public.ai_roi_snapshots(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_roi_period ON public.ai_roi_snapshots(period_start, period_end);

-- 7. ai_prompt_templates
CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  template_name TEXT NOT NULL,
  task_category TEXT NOT NULL,
  approved_prompt TEXT NOT NULL,
  model_tier TEXT CHECK (model_tier IN ('cheap','standard','premium')),
  active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  average_cost NUMERIC DEFAULT 0,
  average_roi_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_ai_prompt_templates" ON public.ai_prompt_templates FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_prompts_business ON public.ai_prompt_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON public.ai_prompt_templates(task_category);

-- 8. ai_cached_context_blocks
CREATE TABLE IF NOT EXISTS public.ai_cached_context_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  context_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_reference TEXT,
  last_verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_cached_context_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_ai_context" ON public.ai_cached_context_blocks FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_ai_context_business ON public.ai_cached_context_blocks(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_context_type ON public.ai_cached_context_blocks(context_type);

-- Seed default routing rules (one row per task category)
INSERT INTO public.ai_model_routing_rules (task_category, default_model_tier, fallback_model_tier, requires_human_approval, risk_level, rule_priority) VALUES
  ('email_classification','cheap','cheap',false,'low',100),
  ('crm_update','cheap','no_ai',false,'low',100),
  ('lead_scoring','cheap','standard',false,'low',100),
  ('social_caption','standard','cheap',false,'medium',100),
  ('campaign_copy','standard','cheap',true,'medium',100),
  ('email_reply_draft','standard','cheap',true,'medium',100),
  ('customer_support','standard','cheap',true,'medium',100),
  ('research_summary','standard','cheap',false,'medium',100),
  ('market_research','standard','cheap',false,'medium',100),
  ('competitor_analysis','standard','cheap',false,'medium',100),
  ('m_and_a_research','premium','standard',true,'high',100),
  ('valuation_analysis','premium','standard',true,'high',100),
  ('investor_analysis','premium','standard',true,'high',100),
  ('legal_sensitive','human_required',NULL,true,'critical',100),
  ('financial_sensitive','human_required',NULL,true,'critical',100),
  ('compliance_sensitive','human_required',NULL,true,'critical',100),
  ('founder_strategy','premium','standard',true,'high',100)
ON CONFLICT DO NOTHING;
