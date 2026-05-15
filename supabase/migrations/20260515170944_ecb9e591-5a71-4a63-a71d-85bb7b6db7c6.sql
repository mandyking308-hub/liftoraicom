
create table if not exists public.customer_success_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  deal_id uuid,
  plan_status text default 'active',
  customer_goal text,
  success_criteria jsonb default '[]'::jsonb,
  current_needs jsonb default '[]'::jsonb,
  risks jsonb default '[]'::jsonb,
  next_best_actions jsonb default '[]'::jsonb,
  follow_up_due_at timestamptz,
  owner_agent_key text default 'customer_success_agent',
  founder_review_required boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, contact_id)
);
alter table public.customer_success_plans enable row level security;
create policy "Founders manage success plans" on public.customer_success_plans
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'));

create table if not exists public.customer_package_catalog (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  package_key text not null,
  package_name text not null,
  package_type text not null,
  description text,
  target_customer text,
  pain_points_solved jsonb default '[]'::jsonb,
  included_features jsonb default '[]'::jsonb,
  price_min numeric,
  price_max numeric,
  recurring boolean default false,
  active boolean default true,
  founder_approval_required boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, package_key)
);
alter table public.customer_package_catalog enable row level security;
create policy "Founders manage package catalog" on public.customer_package_catalog
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'));

create table if not exists public.customer_upsell_recommendations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  package_id uuid references public.customer_package_catalog(id) on delete set null,
  recommendation_status text default 'pending',
  fit_score numeric,
  reason text,
  evidence jsonb default '[]'::jsonb,
  customer_need_matched text,
  suggested_timing text,
  suggested_message_angle text,
  risk_flags jsonb default '[]'::jsonb,
  founder_approval_required boolean default true,
  approved_at timestamptz,
  rejected_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.customer_upsell_recommendations enable row level security;
create policy "Founders manage upsell recs" on public.customer_upsell_recommendations
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'));

create index if not exists idx_csp_contact on public.customer_success_plans(contact_id);
create index if not exists idx_cur_contact on public.customer_upsell_recommendations(contact_id);

-- Seed Customer Success Agent
insert into public.ai_agent_roles (agent_key, agent_name, agent_category, description, primary_module, default_status,
  can_read_crm, can_read_conversations, can_read_finance, can_read_suppliers,
  can_call_external_providers, can_mutate_operational_data, can_send_email,
  can_create_proposals, can_create_deals, can_create_invoices,
  founder_approval_required, auto_action_allowed, risk_level)
values
  ('customer_success_agent','Customer Success Agent','customer_success',
   'Monitors satisfaction, builds success plans, recommends follow-up, recommends upsell/retention, flags unhappy customers. Never sends externally without founder approval.',
   'customer_success','preview',
   true, true, true, false,
   false, false, false,
   false, false, false,
   true, false, 'medium')
on conflict (agent_key) do nothing;
