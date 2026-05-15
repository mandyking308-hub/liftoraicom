
-- Link audit table
create table if not exists public.command_centre_link_audit (
  id uuid primary key default gen_random_uuid(),
  audit_scope text not null,
  source_component text,
  source_section text,
  link_label text,
  target_route text,
  target_anchor text,
  target_module_key text,
  link_type text default 'internal_route',
  expected_to_exist boolean default true,
  route_exists boolean default false,
  component_exists boolean default false,
  permission_required boolean default true,
  opens_in_command_centre boolean default false,
  opens_external boolean default false,
  status text default 'not_checked',
  blocker text,
  recommended_fix text,
  metadata jsonb default '{}'::jsonb,
  checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.command_centre_link_audit enable row level security;

create policy "Founders manage link audit" on public.command_centre_link_audit
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'founder'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'founder'));

create index if not exists idx_cc_link_audit_scope on public.command_centre_link_audit(audit_scope);
create index if not exists idx_cc_link_audit_status on public.command_centre_link_audit(status);

-- Journey steps table
create table if not exists public.command_centre_customer_journey_steps (
  id uuid primary key default gen_random_uuid(),
  step_key text not null unique,
  step_label text not null,
  step_order integer not null,
  journey_stage_group text not null,
  description text,
  primary_module_key text,
  primary_route text,
  command_centre_anchor text,
  owner_agent_key text,
  business_scoped boolean default true,
  external_action_risk boolean default false,
  founder_approval_required boolean default true,
  enabled boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.command_centre_customer_journey_steps enable row level security;

create policy "Founders manage journey steps" on public.command_centre_customer_journey_steps
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'founder'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'founder'));

create policy "Authenticated read journey steps" on public.command_centre_customer_journey_steps
  for select to authenticated using (true);

-- Seed 31 ordered steps
insert into public.command_centre_customer_journey_steps
  (step_key, step_label, step_order, journey_stage_group, primary_module_key, primary_route, command_centre_anchor, owner_agent_key, external_action_risk, founder_approval_required)
values
  ('source_candidates','Source candidates',1,'sourcing','apollo_pull','/founder/apollo','sec-sourcing','source_agent',true,true),
  ('lead_quality','Lead quality scoring',2,'sourcing','lead_quality','/founder/lead-quality','sec-sourcing','quality_agent',false,false),
  ('reveal_or_import','Reveal / import contacts',3,'sourcing','apollo_reveal','/founder/apollo','sec-sourcing','source_agent',true,true),
  ('promote_to_crm','Promote to CRM',4,'crm','crm_promote','/founder/crm','sec-crm','crm_agent',false,true),
  ('compliance_check','Compliance check',5,'compliance','compliance','/founder/compliance','sec-compliance','compliance_agent',false,true),
  ('campaign_or_channel_routing','Campaign / channel routing',6,'outreach','outbound_lanes','/founder/integrations','sec-outbound','router_agent',true,true),
  ('outreach_or_social_touch','Outreach / social touch',7,'outreach','smartlead','/founder/integrations','sec-outbound','outreach_agent',true,true),
  ('reply_or_engagement','Reply / engagement',8,'engagement','social_engagement','/founder/conversations','sec-engagement','engagement_agent',false,false),
  ('crm_interaction_capture','CRM interaction capture',9,'crm','crm_ledger','/founder/crm','sec-crm','crm_agent',false,false),
  ('conversation_created','Conversation created',10,'engagement','conversations','/founder/conversations','sec-engagement','conversation_agent',false,false),
  ('ai_intent_classification','AI intent classification',11,'ai_agents','ai_orchestrator','/founder/agents','sec-agents','intent_agent',false,false),
  ('ai_draft_or_next_action','AI draft / next action',12,'ai_agents','ai_drafting','/founder/agents','sec-agents','drafting_agent',false,true),
  ('founder_approval','Founder approval',13,'approvals','founder_approvals','/founder/approvals','sec-approvals','founder',false,true),
  ('approved_action_execution','Approved action execution',14,'approvals','approved_actions','/founder/approvals','sec-approvals','executor_agent',true,true),
  ('proposal_ready','Proposal ready',15,'commercial','proposals','/founder/proposals','sec-commercial','proposal_agent',false,true),
  ('proposal_created','Proposal created',16,'commercial','proposals','/founder/proposals','sec-commercial','proposal_agent',false,true),
  ('proposal_sent_or_shared','Proposal sent / shared',17,'commercial','proposals','/founder/proposals','sec-commercial','proposal_agent',true,true),
  ('proposal_viewed_or_accepted','Proposal viewed / accepted',18,'commercial','proposals','/founder/proposals','sec-commercial','proposal_agent',false,false),
  ('demo_ready','Demo ready',19,'commercial','demos','/founder/demos','sec-commercial','demo_agent',false,true),
  ('demo_access_created','Demo access created',20,'commercial','demos','/founder/demos','sec-commercial','demo_agent',false,true),
  ('demo_viewed_or_completed','Demo viewed / completed',21,'commercial','demos','/founder/demos','sec-commercial','demo_agent',false,false),
  ('deal_ready','Deal ready',22,'commercial','deals','/founder/deals','sec-commercial','deal_agent',false,true),
  ('deal_created_or_updated','Deal created / updated',23,'commercial','deals','/founder/deals','sec-commercial','deal_agent',false,true),
  ('invoice_ready','Invoice ready',24,'finance','invoices','/founder/invoices','sec-finance','finance_agent',false,true),
  ('invoice_created','Invoice created',25,'finance','invoices','/founder/invoices','sec-finance','finance_agent',false,true),
  ('invoice_sent_or_paid','Invoice sent / paid',26,'finance','payments','/founder/payments','sec-finance','finance_agent',true,true),
  ('supplier_or_delivery_needed','Supplier / delivery needed',27,'delivery','suppliers','/founder/suppliers','sec-delivery','supplier_agent',false,true),
  ('supplier_assigned','Supplier assigned',28,'delivery','assignments','/founder/assignments','sec-delivery','supplier_agent',false,true),
  ('assignment_completed','Assignment completed',29,'delivery','assignments','/founder/assignments','sec-delivery','supplier_agent',false,false),
  ('learning_signal_captured','Learning signal captured',30,'learning','learning_optimisation','/founder/optimisation','sec-learning','learning_agent',false,false),
  ('customer_retention_or_next_campaign','Customer retention / next campaign',31,'retention','marketing_funnel','/founder/marketing','sec-marketing','retention_agent',false,true)
on conflict (step_key) do nothing;
