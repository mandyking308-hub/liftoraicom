-- Disposable PostgreSQL fixture only. Never run against live or QA.
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
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.businesses to authenticated;
grant all on public.businesses to service_role;

create table public.data_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  request_type text not null,
  request_status text not null default 'received',
  request_source text,
  request_summary text,
  due_date date,
  founder_review_required boolean not null default true,
  legal_review_recommended boolean not null default true,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.data_privacy_requests to authenticated;
grant all on public.data_privacy_requests to service_role;
alter table public.data_privacy_requests enable row level security;
create policy "founder admin manage privacy requests" on public.data_privacy_requests for all to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));
