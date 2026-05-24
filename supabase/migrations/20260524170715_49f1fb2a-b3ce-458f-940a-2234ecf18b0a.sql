
-- =========================================================================
-- Carrier-grade controls layer for Liftor Portfolio & Exit Architecture
-- =========================================================================

-- helper: assume has_role(uuid, app_role) exists and 'admin' app_role exists.

-- 1) LIFECYCLE STATE MACHINE -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_lifecycle_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id uuid NOT NULL REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text,
  requested_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ma_lifecycle_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  required_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_founder_approval boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_stage, to_stage)
);

-- 2) KPI DICTIONARY --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_kpi_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_name text NOT NULL UNIQUE,
  definition text NOT NULL,
  formula text,
  source_table text,
  source_field text,
  update_frequency text, -- daily, weekly, monthly, quarterly, on_event
  owner text,
  ai_estimate_allowed boolean NOT NULL DEFAULT false,
  human_confirmation_required boolean NOT NULL DEFAULT true,
  confidence_rules text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) PROMPT / AI VERSION CONTROL + CHALLENGE -------------------------------
CREATE TABLE IF NOT EXISTS public.ma_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name text NOT NULL,
  version text NOT NULL,
  purpose text,
  model text,
  provider text,
  active boolean NOT NULL DEFAULT false,
  prompt_body text,
  changed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prompt_name, version)
);

ALTER TABLE public.ma_ai_recommendations
  ADD COLUMN IF NOT EXISTS prompt_version_id uuid REFERENCES public.ma_prompt_versions(id),
  ADD COLUMN IF NOT EXISTS data_snapshot_at timestamptz,
  ADD COLUMN IF NOT EXISTS freshness_score numeric,
  ADD COLUMN IF NOT EXISTS challenge jsonb;

-- 4) COST + BUDGETS --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_cost_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id uuid REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  category text NOT NULL, -- ai_runs, data_enrichment, paid_connector, outreach, import, human_oversight, adviser, operating, recommendation
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  incurred_at timestamptz NOT NULL DEFAULT now(),
  source text,
  related_recommendation_id uuid REFERENCES public.ma_ai_recommendations(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ma_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id uuid REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'asset', -- asset or global
  category text NOT NULL, -- monthly_asset, data_api, outreach, adviser, human_oversight
  monthly_budget numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) DATA CLASSIFICATION ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_data_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL, -- sources, companies, investors, adviser_notes, buyer_notes, data_room_items, files, recommendations
  record_id uuid NOT NULL,
  classification text NOT NULL, -- public, internal, confidential, highly_confidential, personal_data, adviser_privileged, paid_source_restricted, do_not_export
  do_not_export boolean NOT NULL DEFAULT false,
  set_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (record_type, record_id, classification)
);

-- 6) BACKUP / EXPORT LOG ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_backup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- backup, export, restore, rollback
  status text NOT NULL DEFAULT 'completed',
  location_note text,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- 7) ALERTS / EXCEPTIONS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status text NOT NULL DEFAULT 'open', -- open, acknowledged, resolved, dismissed
  owner uuid,
  due_date timestamptz,
  portfolio_asset_id uuid REFERENCES public.ma_portfolio_assets(id) ON DELETE SET NULL,
  related_record_type text,
  related_record_id uuid,
  recommended_action text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8) WORKLOAD CAPACITY -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_workload_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  active_assets integer NOT NULL DEFAULT 0,
  pending_founder_approvals integer NOT NULL DEFAULT 0,
  pending_adviser_reviews integer NOT NULL DEFAULT 0,
  weekly_oversight_hours_required numeric NOT NULL DEFAULT 0,
  weekly_oversight_hours_capacity numeric NOT NULL DEFAULT 0,
  overdue_decisions integer NOT NULL DEFAULT 0,
  high_risk_escalations integer NOT NULL DEFAULT 0,
  manual_tasks_open integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9) DATA ROOM POLICY ENHANCEMENTS ----------------------------------------
ALTER TABLE public.ma_data_room_items
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS doc_version text,
  ADD COLUMN IF NOT EXISTS buyer_safe boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS adviser_reviewed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS missing_evidence_notes text,
  ADD COLUMN IF NOT EXISTS expiry_at timestamptz;

-- 10) MOCK BUYER DILIGENCE -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_mock_diligence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id uuid NOT NULL REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  run_by uuid,
  ai_model text,
  prompt_version_id uuid REFERENCES public.ma_prompt_versions(id),
  red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  buyer_objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  valuation_weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  urgent_fixes jsonb NOT NULL DEFAULT '[]'::jsonb,
  cleanup_plan_30d jsonb NOT NULL DEFAULT '[]'::jsonb,
  readiness_score numeric,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11) AGENT CONTRACTS ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_agent_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL UNIQUE,
  data_received text,
  actions_allowed text,
  actions_prohibited text,
  approval_requirements text,
  output_expected text,
  completion_criteria text,
  escalation_rules text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12) CAPITAL ALLOCATION ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_capital_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_asset_id uuid NOT NULL UNIQUE REFERENCES public.ma_portfolio_assets(id) ON DELETE CASCADE,
  monthly_budget numeric DEFAULT 0,
  human_oversight_budget numeric DEFAULT 0,
  adviser_budget numeric DEFAULT 0,
  outreach_budget numeric DEFAULT 0,
  data_api_budget numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  priority_score numeric DEFAULT 0,
  resource_recommendation text, -- increase, hold, reduce, park, kill, adviser_review
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 13) DO NOT BUILD PATTERN LIBRARY ----------------------------------------
CREATE TABLE IF NOT EXISTS public.ma_do_not_build_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  reason text NOT NULL,
  examples text,
  severity text NOT NULL DEFAULT 'high', -- low, medium, high, blocker
  active boolean NOT NULL DEFAULT true,
  added_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- RLS: admin-only across the board
-- =========================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ma_lifecycle_transitions','ma_lifecycle_gates','ma_kpi_dictionary',
    'ma_prompt_versions','ma_cost_entries','ma_budgets',
    'ma_data_classifications','ma_backup_events','ma_alerts',
    'ma_workload_capacity','ma_mock_diligence_runs','ma_agent_contracts',
    'ma_capital_allocation','ma_do_not_build_patterns'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "admins manage %1$s" ON public.%1$I;$p$, t);
    EXECUTE format($p$CREATE POLICY "admins manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));$p$, t);
  END LOOP;
END $$;

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ma_lifecycle_transitions','ma_lifecycle_gates','ma_kpi_dictionary',
    'ma_prompt_versions','ma_budgets','ma_data_classifications',
    'ma_alerts','ma_workload_capacity','ma_agent_contracts',
    'ma_capital_allocation','ma_do_not_build_patterns'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- seed default lifecycle gates
INSERT INTO public.ma_lifecycle_gates (from_stage,to_stage,required_evidence,requires_founder_approval,notes) VALUES
('idea','validate','["target_customer","buyer_thesis","source_signal","initial_buildability_score"]'::jsonb,true,'Idea → Validate'),
('validate','build','["distribution_path","lovable_buildability_score","liftor_operability_score","legal_ip_safety_check","ninety_day_proof_target"]'::jsonb,true,'Validate → Build'),
('build','launch','["website_or_app_ready","inbox_and_crm_setup","offer_and_pricing","approval_rules","data_room_folder"]'::jsonb,true,'Build → Launch'),
('launch','operate','["live_tracking","execution_targets","reporting","compliance_rules"]'::jsonb,true,'Launch → Operate'),
('operate','scale','["revenue_or_proof_signal","capacity_check","positive_execution_score"]'::jsonb,true,'Operate → Scale'),
('scale','warm_buyers','["buyer_map","valuation_target","data_room_readiness_threshold"]'::jsonb,true,'Scale → Warm buyers'),
('warm_buyers','sale_prep','["adviser_engaged","cim_drafted","data_room_complete"]'::jsonb,true,'Warm buyers → Sale prep'),
('sale_prep','sale_process','["nda_template","buyer_shortlist","valuation_range"]'::jsonb,true,'Sale prep → Sale process'),
('sale_process','sold','["signed_spa","funds_received"]'::jsonb,true,'Sale process → Sold'),
('any','parked','["decision_memory"]'::jsonb,true,'Park'),
('any','killed','["decision_memory"]'::jsonb,true,'Kill')
ON CONFLICT (from_stage,to_stage) DO NOTHING;

-- seed KPI dictionary
INSERT INTO public.ma_kpi_dictionary (kpi_name,definition,formula,source_table,source_field,update_frequency,owner,ai_estimate_allowed,human_confirmation_required,confidence_rules) VALUES
('monthly_revenue','Recognised revenue in current month','sum(invoices.amount) for month','ma_portfolio_assets','current_monthly_revenue','monthly','Founder',false,true,'Must reconcile with finance source'),
('annual_revenue','Recognised revenue trailing 12 months','sum last 12 months','ma_portfolio_assets','current_annual_revenue','monthly','Founder',false,true,'Reconcile to bank/finance'),
('monthly_profit','Revenue minus operating costs for month',NULL,'ma_portfolio_assets','current_monthly_profit','monthly','Founder',false,true,'Confirmed by founder'),
('annual_profit','Trailing 12-month profit',NULL,'ma_portfolio_assets','current_annual_profit','monthly','Founder',false,true,'Confirmed by founder'),
('pipeline_value','Weighted CRM pipeline','sum(stage*probability)','ma_portfolio_assets','current_pipeline_value','weekly','Founder',true,true,'AI estimate flagged'),
('qualified_leads','Leads meeting qualification rules',NULL,'crm_contacts',NULL,'weekly','CRM Agent',true,false,'AI may estimate from CRM tags'),
('outreach_volume','Outreach attempts in period',NULL,'outreach_logs',NULL,'weekly','Outreach Agent',true,false,'Auto from logs'),
('conversion_rate','Qualified→won %',NULL,'crm_contacts',NULL,'monthly','Founder',true,true,'Confirmed at month close'),
('buyer_warmth','Buyer engagement score 0–100',NULL,'ma_buyer_matches',NULL,'monthly','Founder',true,true,'AI estimate, founder confirms'),
('exit_readiness','Composite exit readiness 0–100',NULL,'ma_portfolio_assets','exit_readiness_score','monthly','Founder',true,true,'Composite from sub-scores'),
('data_room_readiness','% data-room items complete and buyer-safe',NULL,'ma_data_room_items',NULL,'weekly','Data Room Agent',true,true,'Adviser review required for >80'),
('founder_dependency','How dependent ops are on founder 0–100',NULL,'ma_portfolio_assets','founder_dependency_score','monthly','Founder',true,true,'Founder confirms'),
('liftor_operability','How well Liftor can operate without founder',NULL,'ma_portfolio_assets','liftor_operability_score','monthly','Founder',true,true,'Founder confirms'),
('buildability_score','Estimated buildability inside Lovable/no-code',NULL,'ma_build_candidates',NULL,'per_candidate','Founder',true,true,'AI may estimate'),
('valuation_multiple','Applied multiple for sector',NULL,'ma_valuation_benchmarks',NULL,'quarterly','Adviser',true,true,'Adviser review required'),
('target_exit_gap','Target exit value − implied current value',NULL,'ma_portfolio_assets',NULL,'quarterly','Founder',true,true,'Composite'),
('human_oversight_load','Weekly human oversight hours required',NULL,'ma_workload_capacity','weekly_oversight_hours_required','weekly','Founder',true,true,'Confirmed weekly')
ON CONFLICT (kpi_name) DO NOTHING;

-- seed Do-Not-Build library
INSERT INTO public.ma_do_not_build_patterns (category,reason,examples,severity) VALUES
('warehouse_heavy','Requires physical warehousing — outside operating model','3PL-required ecommerce','blocker'),
('manufacturing_heavy','Capex and supply-chain risk','Hardware production','blocker'),
('heavy_inventory','Working-capital trap','Stocked retail','high'),
('fashion_with_stock','Designer underwear / fashion needing stock or manufacturing unless asset-light test only','Owned-stock apparel','high'),
('moonshots','Rockets / aerospace / multi-year R&D','Launch vehicles','blocker'),
('deep_hardware','Long hardware dev cycles','Custom silicon','blocker'),
('heavily_regulated_no_adviser','Regulated industries without adviser approval','Banking, pharma','blocker'),
('large_team_pre_revenue','Needs large team before revenue','Enterprise platform with no GTM','high'),
('not_buildable_lovable','Cannot be built inside Lovable / no-code / light tools','Native mobile-only OS features','high'),
('no_distribution_path','No clear distribution path','Pure brand play with no channel','high'),
('no_buyer_thesis','No identifiable acquirer profile','Vague consumer app','high'),
('high_ip_copy_risk','High legal/IP copy risk','Clone of protected product','blocker')
ON CONFLICT DO NOTHING;

-- seed agent contracts
INSERT INTO public.ma_agent_contracts (agent_name,data_received,actions_allowed,actions_prohibited,approval_requirements,output_expected,completion_criteria,escalation_rules) VALUES
('Outreach Agent','ICP, target list, message templates','Draft outreach, queue sends, log activity','Send external messages without founder approval','Founder approval per send batch','Drafts + send logs','Batch approved and logged','Escalate to founder on bounce rate >10%'),
('CRM Agent','Contact records, pipeline rules','Create/update contacts, move stages, log notes','Delete records, share externally','Founder approval for deletions','Updated CRM + change log','All updates audited','Escalate stuck-stage contacts after SLA'),
('Inbox Agent','Inbox messages, classification rules','Tag, route, draft replies','Send replies without approval','Founder approval per reply','Triaged inbox + drafts','Inbox zero or routed','Escalate VIPs immediately'),
('Content Agent','Briefs, brand rules','Draft content','Publish externally without approval','Founder approval per publish','Drafts ready for review','Approved and scheduled','Escalate brand/legal risk'),
('Reporting Agent','KPI data','Generate reports','Send reports externally without approval','Founder approval for external distribution','Reports + dashboards','Reports delivered','Escalate KPI breaches'),
('Compliance Agent','Policies, logs','Run checks, flag risks','Resolve compliance issues without human','Founder approval to close findings','Findings + actions','All criticals reviewed','Escalate critical findings same day'),
('Buyer Warm-Up Agent','Buyer profiles, signals, NDA templates','Draft warm-up notes, log interactions','Initiate buyer contact without approval','Founder approval per outreach','Warm-up plan + drafts','Founder-approved touch sent','Escalate buyer responses'),
('Data Room Agent','Data room items, classification rules','Curate folders, request docs, flag gaps','Share with buyers without approval','Founder + adviser approval for share','Updated data room + gap list','Items adviser-reviewed','Escalate missing critical docs'),
('Founder Approval Agent','Pending decisions, SLAs','Surface decisions, summarise context','Approve decisions on founder''s behalf','N/A — surfaces only','Decision queue','Decisions actioned within SLA','Escalate overdue items')
ON CONFLICT (agent_name) DO NOTHING;

-- seed initial prompt versions
INSERT INTO public.ma_prompt_versions (prompt_name,version,purpose,model,provider,active,notes) VALUES
('portfolio_briefing','v1','Generate portfolio-wide briefing','google/gemini-2.5-pro','lovable_ai_gateway',true,'Initial prompt'),
('asset_analysis','v1','Per-asset deep dive','google/gemini-2.5-pro','lovable_ai_gateway',true,'Initial prompt'),
('build_memo','v1','Quarterly build candidate memo','google/gemini-2.5-pro','lovable_ai_gateway',true,'Initial prompt'),
('mock_buyer_diligence','v1','Mock buyer diligence review','google/gemini-2.5-pro','lovable_ai_gateway',true,'Initial prompt'),
('challenge_mode','v1','Adversarial challenge of any recommendation','google/gemini-2.5-pro','lovable_ai_gateway',true,'Initial prompt')
ON CONFLICT (prompt_name,version) DO NOTHING;
