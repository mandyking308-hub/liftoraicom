
create table if not exists public.customer_memory_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  profile_status text default 'active',
  customer_summary text,
  relationship_summary text,
  known_needs jsonb default '[]'::jsonb,
  known_pain_points jsonb default '[]'::jsonb,
  preferences jsonb default '[]'::jsonb,
  objections jsonb default '[]'::jsonb,
  buying_signals jsonb default '[]'::jsonb,
  support_history_summary text,
  proposal_history_summary text,
  demo_history_summary text,
  deal_history_summary text,
  invoice_payment_summary text,
  satisfaction_summary text,
  upsell_interest_summary text,
  competitor_context jsonb default '[]'::jsonb,
  risk_flags jsonb default '[]'::jsonb,
  last_refreshed_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, contact_id)
);

alter table public.customer_memory_profiles enable row level security;
create policy "Founders manage customer memory" on public.customer_memory_profiles
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'));

create index if not exists idx_cmp_contact on public.customer_memory_profiles(contact_id);
create index if not exists idx_cmp_business on public.customer_memory_profiles(business_id);

create table if not exists public.response_context_checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  conversation_id uuid,
  interaction_id uuid,
  draft_id uuid,
  agent_key text,
  action_type text not null,
  crm_history_checked boolean default false,
  customer_memory_checked boolean default false,
  survey_feedback_checked boolean default false,
  proposal_history_checked boolean default false,
  demo_history_checked boolean default false,
  deal_finance_checked boolean default false,
  support_history_checked boolean default false,
  compliance_checked boolean default false,
  risk_checked boolean default false,
  context_quality_score numeric,
  context_summary text,
  missing_context jsonb default '[]'::jsonb,
  blockers jsonb default '[]'::jsonb,
  allowed_to_draft boolean default false,
  allowed_to_send boolean default false,
  founder_review_required boolean default true,
  created_at timestamptz default now()
);

alter table public.response_context_checks enable row level security;
create policy "Founders manage context checks" on public.response_context_checks
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'));

create index if not exists idx_rcc_contact on public.response_context_checks(contact_id);
create index if not exists idx_rcc_action on public.response_context_checks(action_type);
