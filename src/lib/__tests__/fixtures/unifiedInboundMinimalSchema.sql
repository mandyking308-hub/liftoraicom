-- Disposable PostgreSQL fixture only. Never run against live or QA.
-- Columns used by the candidate mirror the read-only production schema audit on 16 Nov 2026.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then execute 'create role anon nologin'; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'create role authenticated nologin'; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then execute 'create role service_role nologin bypassrls'; end if;
end $$;

create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'founder', 'client');
  end if;
end $$;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  portfolio_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.businesses to authenticated;
grant all on public.businesses to service_role;

create table public.gsm_mailboxes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  provider_mailbox_id text,
  smartlead_email_account_id text,
  provider_health text not null default 'unknown',
  readiness_state text not null default 'warming',
  retired boolean not null default false,
  active boolean not null default true,
  estate_classification text not null default 'gsm',
  last_provider_check_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.gsm_mailboxes to authenticated;
grant all on public.gsm_mailboxes to service_role;
alter table public.gsm_mailboxes enable row level security;
create policy "founders read gsm mailboxes" on public.gsm_mailboxes for select to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));

create table public.gsm_mailbox_allocations (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.gsm_mailboxes(id),
  pool_id uuid not null,
  business_id uuid references public.businesses(id),
  liftor_campaign_id uuid,
  provider_campaign_id text,
  allocation_status text not null default 'active',
  thread_sticky boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  allocated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.gsm_mailbox_allocations to authenticated;
grant all on public.gsm_mailbox_allocations to service_role;
alter table public.gsm_mailbox_allocations enable row level security;
create policy "founders read gsm allocations" on public.gsm_mailbox_allocations for select to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));

create table public.outbound_provider_campaign_mappings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id),
  provider_connection_id uuid,
  provider_type text not null default 'smartlead',
  provider_campaign_id text,
  mapping_status text not null default 'unmapped',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.outbound_provider_campaign_mappings to authenticated;
grant all on public.outbound_provider_campaign_mappings to service_role;

create table public.founder_approval_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  approval_type text not null,
  source_system text,
  source_table text,
  source_id uuid,
  contact_id uuid,
  title text not null,
  summary text,
  draft_subject text,
  draft_body text,
  priority_level text not null default 'normal',
  risk_flags jsonb not null default '[]'::jsonb,
  compliance_flags jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  execution_enabled boolean not null default false,
  auto_execute_allowed boolean not null default false,
  send_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.founder_approval_items to authenticated;
grant all on public.founder_approval_items to service_role;
alter table public.founder_approval_items enable row level security;
create policy "founders manage approvals" on public.founder_approval_items for all to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));

create table public.communication_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  channel text not null check (channel in ('email','voice','sms','whatsapp','social_dm','support_portal','seller_portal','partner_portal','adviser','manual','other')),
  direction text not null check (direction in ('inbound','outbound','internal_note')),
  communication_status text not null default 'draft' check (communication_status in ('draft','approval_required','approved','sent','received','failed','blocked','cancelled','logged')),
  subject text,
  summary text,
  content_reference text,
  external_provider text,
  approval_item_id uuid,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  audit_metadata jsonb not null default '{}'::jsonb
);
grant select, insert, update on public.communication_records to authenticated;
grant all on public.communication_records to service_role;
alter table public.communication_records enable row level security;
create policy "founders read communications" on public.communication_records for select to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));
create policy "founders insert communications" on public.communication_records for insert to authenticated
with check (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));
