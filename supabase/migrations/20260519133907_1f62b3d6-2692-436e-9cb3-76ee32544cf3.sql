
-- Helper: ensure has_role exists (assumed)
CREATE TABLE IF NOT EXISTS public.social_keyword_trigger_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  rule_name text not null,
  keyword text not null,
  keyword_normalized text,
  platform text not null,
  trigger_type text not null,
  rule_status text default 'draft',
  campaign_plan_id uuid references public.social_campaign_plans(id) on delete set null,
  content_item_id uuid references public.social_content_items(id) on delete set null,
  calendar_item_id uuid references public.social_calendar_items(id) on delete set null,
  flow_id uuid,
  public_reply_required boolean default true,
  dm_flow_required boolean default true,
  founder_approval_required boolean default true,
  compliance_review_required boolean default false,
  risk_level text default 'low',
  notes text,
  is_test_data boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.social_dm_flow_blueprints (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  flow_name text not null,
  flow_type text not null,
  flow_status text default 'draft',
  platform text not null,
  keyword_rule_id uuid references public.social_keyword_trigger_rules(id) on delete set null,
  campaign_plan_id uuid references public.social_campaign_plans(id) on delete set null,
  primary_goal text,
  target_audience text,
  public_reply_text text,
  dm_opening_text text,
  button_label text,
  button_url text,
  follow_up_question text,
  qualification_questions jsonb default '[]'::jsonb,
  routing_rules jsonb default '{}'::jsonb,
  escalation_rules jsonb default '{}'::jsonb,
  stop_conditions jsonb default '{}'::jsonb,
  compliance_warnings text[] default '{}',
  risk_flags text[] default '{}',
  approval_status text default 'draft',
  founder_notes text,
  is_test_data boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.social_dm_flow_steps (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  flow_id uuid not null references public.social_dm_flow_blueprints(id) on delete cascade,
  step_order integer not null default 0,
  step_type text not null,
  step_name text,
  message_text text,
  button_label text,
  button_url text,
  expected_response_type text,
  routing_condition text,
  next_step_id uuid,
  escalation_required boolean default false,
  founder_review_required boolean default true,
  status text default 'draft',
  is_test_data boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.social_manychat_manual_exports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  export_name text not null,
  export_status text default 'draft',
  platform text not null,
  flow_id uuid references public.social_dm_flow_blueprints(id) on delete set null,
  keyword_rule_id uuid references public.social_keyword_trigger_rules(id) on delete set null,
  export_payload jsonb default '{}'::jsonb,
  setup_instructions text,
  copy_blocks jsonb default '[]'::jsonb,
  checklist jsonb default '[]'::jsonb,
  validation_status text default 'not_checked',
  validation_errors text[] default '{}',
  validation_warnings text[] default '{}',
  manual_setup_status text default 'not_configured',
  confirmed_live_at timestamptz,
  confirmed_live_by text,
  founder_notes text,
  is_test_data boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.social_engagement_flow_audit (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  keyword_rule_id uuid references public.social_keyword_trigger_rules(id) on delete set null,
  flow_id uuid references public.social_dm_flow_blueprints(id) on delete set null,
  export_id uuid references public.social_manychat_manual_exports(id) on delete set null,
  action text not null,
  action_status text default 'recorded',
  before_json jsonb default '{}'::jsonb,
  after_json jsonb default '{}'::jsonb,
  result_json jsonb default '{}'::jsonb,
  provider_calls integer default 0,
  dms_sent integer default 0,
  comments_sent integer default 0,
  flows_created_externally integer default 0,
  error_message text,
  created_by text,
  is_test_data boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Extend existing tables
ALTER TABLE public.social_campaign_plans
  ADD COLUMN IF NOT EXISTS keyword_flow_id uuid,
  ADD COLUMN IF NOT EXISTS dm_flow_id uuid,
  ADD COLUMN IF NOT EXISTS engagement_flow_status text default 'not_configured';

ALTER TABLE public.social_content_items
  ADD COLUMN IF NOT EXISTS keyword_trigger text,
  ADD COLUMN IF NOT EXISTS dm_flow_id uuid,
  ADD COLUMN IF NOT EXISTS engagement_flow_status text default 'not_configured';

ALTER TABLE public.social_calendar_items
  ADD COLUMN IF NOT EXISTS keyword_trigger text,
  ADD COLUMN IF NOT EXISTS dm_flow_id uuid,
  ADD COLUMN IF NOT EXISTS engagement_flow_status text default 'not_configured';

-- RLS
ALTER TABLE public.social_keyword_trigger_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_dm_flow_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_dm_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_manychat_manual_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_engagement_flow_audit ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'social_keyword_trigger_rules',
    'social_dm_flow_blueprints',
    'social_dm_flow_steps',
    'social_manychat_manual_exports',
    'social_engagement_flow_audit'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_founder_all', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))$f$, t || '_founder_all', t);
  END LOOP;
END$$;

CREATE INDEX IF NOT EXISTS idx_skt_business ON public.social_keyword_trigger_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_sdfb_business ON public.social_dm_flow_blueprints(business_id);
CREATE INDEX IF NOT EXISTS idx_sdfs_flow ON public.social_dm_flow_steps(flow_id);
CREATE INDEX IF NOT EXISTS idx_smme_business ON public.social_manychat_manual_exports(business_id);
CREATE INDEX IF NOT EXISTS idx_sefa_business ON public.social_engagement_flow_audit(business_id);
