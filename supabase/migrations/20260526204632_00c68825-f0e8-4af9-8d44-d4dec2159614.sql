
CREATE TABLE public.kpi_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_code TEXT NOT NULL UNIQUE,
  kpi_name TEXT NOT NULL,
  kpi_category TEXT NOT NULL CHECK (kpi_category IN ('revenue','pipeline','customer','ai_cost','sales','delivery','support','finance','marketplace','portfolio','risk','other')),
  definition TEXT NOT NULL,
  source_of_truth_table TEXT,
  source_of_truth_field TEXT,
  calculation_logic_summary TEXT,
  confirmed_vs_estimated_rules TEXT,
  test_data_exclusion_rules TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_definitions TO authenticated;
GRANT ALL ON public.kpi_definitions TO service_role;
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read kpi_definitions" ON public.kpi_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write kpi_definitions" ON public.kpi_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.reporting_truth_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('confirmed_revenue','estimated_pipeline','test_data','active_customer','active_business','ai_cost','conversion','churn','marketplace_gmv','seller_payout','other')),
  rule_summary TEXT NOT NULL,
  source_priority_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusion_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reporting_truth_rules TO authenticated;
GRANT ALL ON public.reporting_truth_rules TO service_role;
ALTER TABLE public.reporting_truth_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read truth_rules" ON public.reporting_truth_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write truth_rules" ON public.reporting_truth_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.reporting_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('revenue_mismatch','pipeline_mismatch','test_data_leak','duplicate_metric','source_disagreement','missing_source','stale_snapshot','other')),
  source_a TEXT,
  source_b TEXT,
  conflict_summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  recommended_fix TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'open' CHECK (conflict_status IN ('open','review_required','resolved','ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reporting_conflicts TO authenticated;
GRANT ALL ON public.reporting_conflicts TO service_role;
ALTER TABLE public.reporting_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read conflicts" ON public.reporting_conflicts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write conflicts" ON public.reporting_conflicts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.reporting_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('daily','weekly','monthly','portfolio','module')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_from_rules_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reporting_snapshots TO authenticated;
GRANT ALL ON public.reporting_snapshots TO service_role;
ALTER TABLE public.reporting_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read snapshots" ON public.reporting_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write snapshots" ON public.reporting_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_kpi_definitions_updated_at BEFORE UPDATE ON public.kpi_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reporting_truth_rules_updated_at BEFORE UPDATE ON public.reporting_truth_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reporting_conflicts_updated_at BEFORE UPDATE ON public.reporting_conflicts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed KPI dictionary
INSERT INTO public.kpi_definitions (kpi_code, kpi_name, kpi_category, definition, source_of_truth_table, source_of_truth_field, calculation_logic_summary, confirmed_vs_estimated_rules, test_data_exclusion_rules) VALUES
('confirmed_revenue','Confirmed Revenue','revenue','Revenue with a verified payment, signed contract or explicit founder confirmation.','invoices','amount_paid','SUM(amount_paid) where status=paid OR contract.signed=true','Only confirmed sources. Pipeline expected revenue excluded.','Exclude rows where is_test_data=true or audit_metadata.label = LIVE_INTERNAL_TEST'),
('estimated_pipeline','Estimated Pipeline','pipeline','Weighted forecast of opportunities not yet won.','opportunities','expected_amount','SUM(expected_amount * win_probability) for open stages','Estimated only. Never blended into confirmed_revenue.','Exclude test pipeline rows'),
('gross_margin','Gross Margin','finance','(Revenue - direct cost) / Revenue.','finance_lines','margin','(confirmed_revenue - COGS - direct AI cost) / confirmed_revenue','Uses confirmed_revenue only.','Exclude test data'),
('ai_spend','AI Spend','ai_cost','Total spend on AI model usage and inference.','ai_usage_ledger','cost_amount','SUM(cost_amount) grouped by cost_basis (actual/estimated)','Split actual vs estimated by cost_basis field.','Exclude test runs'),
('ai_cost_per_approved_output','AI Cost per Approved Output','ai_cost','AI spend divided by approved outputs delivered.','ai_usage_ledger','cost_amount','ai_spend / count(approved outputs)','Confirmed: only outputs marked approved.','Exclude test outputs'),
('active_customers','Active Customers','customer','Customers with an active subscription, contract or recent paid invoice.','customers','status','COUNT(distinct customer where status=active and not internal)','Confirmed via paid invoice or signed contract.','Exclude internal/test contacts (is_test_data, internal flag)'),
('active_leads','Active Leads','sales','Leads in an open pipeline stage with activity in last 30 days.','leads','stage','COUNT(distinct lead where stage in open and last_activity within 30d)','Estimated value only.','Exclude test leads'),
('closed_won','Closed Won','sales','Opportunities marked won.','opportunities','stage','COUNT where stage=closed_won','Confirmed.','Exclude test'),
('closed_lost','Closed Lost','sales','Opportunities marked lost.','opportunities','stage','COUNT where stage=closed_lost','Confirmed.','Exclude test'),
('conversion_rate','Conversion Rate','sales','Closed won / (closed won + closed lost).','opportunities','stage','closed_won / (closed_won + closed_lost)','Confirmed.','Exclude test'),
('support_sla_breach','Support SLA Breach','support','Tickets that breached SLA target.','support_tickets','sla_breached','COUNT where sla_breached=true','Confirmed.','Exclude test tickets'),
('delivery_overdue','Delivery Overdue','delivery','Delivery tasks past due date and not completed.','delivery_tasks','due_at','COUNT where due_at<now() and status<>completed','Confirmed.','Exclude test'),
('marketplace_gmv','Marketplace GMV','marketplace','Gross merchandise value transacted through the marketplace.','marketplace_orders','order_total','SUM(order_total) for completed orders','Confirmed via order completion. Separate from platform revenue.','Exclude test orders'),
('marketplace_take_rate','Marketplace Take Rate','marketplace','Platform revenue / GMV.','marketplace_orders','platform_fee','SUM(platform_fee) / SUM(order_total)','Confirmed.','Exclude test'),
('active_sellers','Active Sellers','marketplace','Sellers with at least one sale in the period.','marketplace_sellers','status','COUNT(distinct seller with sale in period)','Confirmed.','Exclude test sellers'),
('active_buyers','Active Buyers','marketplace','Buyers with at least one purchase in the period.','marketplace_buyers','status','COUNT(distinct buyer with purchase in period)','Confirmed.','Exclude test buyers'),
('churn','Churn','customer','Customers lost in period / customers at start.','customers','churned_at','lost_customers / starting_customers','Confirmed via cancellation.','Exclude test'),
('renewal_rate','Renewal Rate','revenue','Renewed contracts / contracts up for renewal.','contracts','renewed_at','renewed / up_for_renewal','Confirmed via signed renewal.','Exclude test'),
('upgrade_revenue','Upgrade Revenue','revenue','New revenue from customer upgrades.','upgrade_opportunities','closed_amount','SUM(closed_amount) where status=won','Confirmed.','Exclude test'),
('portfolio_priority_score','Portfolio Priority Score','portfolio','Composite score guiding founder focus across businesses.','portfolio_prioritisation','priority_score','Weighted score across revenue, risk, momentum','Confirmed inputs only.','Exclude test businesses'),
('portfolio_risk_score','Portfolio Risk Score','risk','Composite risk score across businesses.','portfolio_risk','risk_score','Weighted risk dimensions','Confirmed inputs.','Exclude test'),
('exit_readiness_score','Exit Readiness Score','portfolio','Readiness for sale or acquisition.','exit_readiness','readiness_score','Archetype-specific weighted scorecard','Confirmed evidence required.','Exclude test');

-- Seed truth rules
INSERT INTO public.reporting_truth_rules (rule_name, rule_type, rule_summary, source_priority_order, exclusion_conditions) VALUES
('Confirmed revenue source priority','confirmed_revenue','Revenue is confirmed only via paid invoices, signed contracts or explicit founder confirmation. Pipeline never counts.','["invoices.paid","contracts.signed","manual_confirmation"]'::jsonb,'{"exclude":["is_test_data=true","audit_metadata.label=LIVE_INTERNAL_TEST"]}'::jsonb),
('Estimated pipeline isolation','estimated_pipeline','Pipeline is always reported separately from confirmed revenue. Never blended.','["opportunities","leads"]'::jsonb,'{"exclude":["is_test_data=true"]}'::jsonb),
('Test data exclusion','test_data','All metrics exclude rows where is_test_data=true or audit_metadata.label = LIVE_INTERNAL_TEST.','[]'::jsonb,'{"global":true}'::jsonb),
('Active customer definition','active_customer','A customer is active if they have an active subscription, an unexpired contract, or a paid invoice in the last 90 days. Internal/test contacts excluded.','["subscriptions","contracts","invoices"]'::jsonb,'{"exclude":["internal=true","is_test_data=true"]}'::jsonb),
('Active business definition','active_business','A business is active if it has a live status flag and at least one operational module connected.','["businesses.status","module_connectivity"]'::jsonb,'{"exclude":["is_test_data=true"]}'::jsonb),
('AI cost basis labelling','ai_cost','AI cost rows must declare cost_basis (actual or estimated). Estimated cost cannot be presented as confirmed spend.','["ai_usage_ledger"]'::jsonb,'{"require":["cost_basis"]}'::jsonb),
('Marketplace GMV vs revenue','marketplace_gmv','GMV (buyer payments) is reported separately from platform revenue (take rate) and from seller payouts.','["marketplace_orders","marketplace_fees","seller_payouts"]'::jsonb,'{"separation":true}'::jsonb),
('Seller payout isolation','seller_payout','Seller payouts are liabilities, never owner revenue.','["seller_payouts"]'::jsonb,'{"separation":true}'::jsonb);
