-- Giving Rail core production schema
-- 17 September 2026
--
-- This migration is designed for a dedicated Supabase project. It separates
-- organisations, membership/authority, verification, campaigns, payments,
-- projects and volunteer records. Payment and verification writes are kept
-- server-side by default; public clients do not receive direct mutation access.

create extension if not exists pgcrypto;

create type public.gr_org_kind as enum ('business', 'charity', 'nonprofit');
create type public.gr_org_status as enum ('onboarding', 'active', 'suspended', 'closed');
create type public.gr_member_role as enum ('owner', 'admin', 'member', 'reviewer');
create type public.gr_verification_status as enum ('not_started', 'pending', 'verified', 'failed', 'expired');
create type public.gr_payment_status as enum ('not_connected', 'pending', 'connected', 'restricted', 'disabled');
create type public.gr_project_status as enum ('draft', 'review', 'published', 'paused', 'closed');
create type public.gr_campaign_status as enum ('draft', 'submitted', 'under_review', 'approved', 'live', 'reconciliation_due', 'settled', 'closed', 'suspended', 'declined');
create type public.gr_giving_basis as enum ('fixed_per_sale', 'percentage_of_sales', 'fixed_campaign', 'direct_corporate');
create type public.gr_approval_status as enum ('pending', 'approved', 'declined', 'revoked');
create type public.gr_volunteer_status as enum ('draft', 'published', 'paused', 'closed');
create type public.gr_application_status as enum ('submitted', 'reviewing', 'shortlisted', 'approved', 'declined', 'withdrawn', 'assigned', 'completed');
create type public.gr_payment_record_status as enum ('created', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'disputed');
create type public.gr_complaint_status as enum ('received', 'triage', 'investigating', 'resolved', 'closed');

create table public.gr_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gr_organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.gr_org_kind not null,
  legal_name text not null,
  trading_name text,
  registration_number text,
  country_code text not null default 'GB' check (char_length(country_code) = 2),
  website text,
  status public.gr_org_status not null default 'onboarding',
  verification_status public.gr_verification_status not null default 'not_started',
  payment_status public.gr_payment_status not null default 'not_connected',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, registration_number)
);

create table public.gr_organization_members (
  organization_id uuid not null references public.gr_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.gr_member_role not null default 'member',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.gr_business_profiles (
  organization_id uuid primary key references public.gr_organizations(id) on delete cascade,
  sector text,
  employee_band text,
  giving_goals text,
  public_summary text,
  updated_at timestamptz not null default now()
);

create table public.gr_charity_profiles (
  organization_id uuid primary key references public.gr_organizations(id) on delete cascade,
  cause text,
  public_summary text,
  public_slug text unique,
  accepts_business_giving boolean not null default false,
  accepts_volunteers boolean not null default false,
  verification_completed_at timestamptz,
  verification_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.gr_verification_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.gr_organizations(id) on delete cascade,
  check_type text not null check (check_type in ('registration', 'authority', 'sanctions', 'fraud_risk', 'payment_destination', 'manual_review')),
  status public.gr_verification_status not null default 'pending',
  provider text,
  provider_reference text,
  evidence jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.gr_projects (
  id uuid primary key default gen_random_uuid(),
  charity_organization_id uuid not null references public.gr_organizations(id) on delete restrict,
  slug text unique,
  title text not null,
  summary text not null default '',
  description text not null default '',
  country_code text,
  geography text,
  theme text,
  currency text not null default 'GBP' check (char_length(currency) = 3),
  target_amount numeric(14,2) check (target_amount is null or target_amount >= 0),
  received_amount numeric(14,2) not null default 0 check (received_amount >= 0),
  status public.gr_project_status not null default 'draft',
  evidence_summary text,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gr_project_follows (
  project_id uuid not null references public.gr_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.gr_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_organization_id uuid not null references public.gr_organizations(id) on delete restrict,
  charity_organization_id uuid not null references public.gr_organizations(id) on delete restrict,
  project_id uuid references public.gr_projects(id) on delete set null,
  title text,
  jurisdiction_code text not null default 'GB',
  giving_basis public.gr_giving_basis not null,
  contribution_value numeric(14,4) not null check (contribution_value >= 0),
  eligible_offer text,
  expected_eligible_sales bigint check (expected_eligible_sales is null or expected_eligible_sales >= 0),
  expected_eligible_revenue numeric(14,2) check (expected_eligible_revenue is null or expected_eligible_revenue >= 0),
  expected_contribution numeric(14,2) check (expected_contribution is null or expected_contribution >= 0),
  final_eligible_sales bigint check (final_eligible_sales is null or final_eligible_sales >= 0),
  final_eligible_revenue numeric(14,2) check (final_eligible_revenue is null or final_eligible_revenue >= 0),
  final_contribution numeric(14,2) check (final_contribution is null or final_contribution >= 0),
  starts_on date,
  ends_on date,
  public_statement_draft text,
  approved_public_statement text,
  agreement_reference text unique,
  agreement_signed_at timestamptz,
  status public.gr_campaign_status not null default 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  live_at timestamptz,
  settled_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.gr_campaign_approvals (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.gr_campaigns(id) on delete cascade,
  approving_organization_id uuid not null references public.gr_organizations(id) on delete restrict,
  status public.gr_approval_status not null default 'pending',
  approved_by uuid references auth.users(id),
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, approving_organization_id)
);

create table public.gr_campaign_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.gr_campaigns(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  actor_organization_id uuid references public.gr_organizations(id),
  event_type text not null,
  from_status public.gr_campaign_status,
  to_status public.gr_campaign_status,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.gr_payment_records (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.gr_campaigns(id) on delete set null,
  project_id uuid references public.gr_projects(id) on delete set null,
  business_organization_id uuid references public.gr_organizations(id) on delete set null,
  recipient_organization_id uuid not null references public.gr_organizations(id) on delete restrict,
  provider text not null,
  provider_payment_reference text not null,
  currency text not null default 'GBP' check (char_length(currency) = 3),
  gross_amount numeric(14,2) not null check (gross_amount >= 0),
  provider_fee numeric(14,2) not null default 0 check (provider_fee >= 0),
  platform_fee numeric(14,2) not null default 0 check (platform_fee >= 0),
  charitable_amount numeric(14,2) not null check (charitable_amount >= 0),
  status public.gr_payment_record_status not null default 'created',
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_reference)
);

create table public.gr_volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.gr_organizations(id) on delete cascade,
  project_id uuid references public.gr_projects(id) on delete set null,
  title text not null,
  description text not null default '',
  skills text[] not null default '{}',
  location text,
  time_commitment text,
  safeguarding_level text not null default 'standard',
  status public.gr_volunteer_status not null default 'draft',
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gr_volunteer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  availability text,
  location text,
  updated_at timestamptz not null default now()
);

create table public.gr_volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.gr_volunteer_opportunities(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  status public.gr_application_status not null default 'submitted',
  applicant_note text,
  reviewer_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, applicant_user_id)
);

create table public.gr_pilot_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organization text,
  role text,
  source text not null default 'website',
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.gr_complaints (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  complainant_user_id uuid references auth.users(id),
  complainant_email text,
  category text not null,
  subject text not null,
  details text not null,
  organization_id uuid references public.gr_organizations(id) on delete set null,
  campaign_id uuid references public.gr_campaigns(id) on delete set null,
  status public.gr_complaint_status not null default 'received',
  assigned_to uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gr_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  organization_id uuid references public.gr_organizations(id),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for common workspace and public discovery paths.
create index gr_org_members_user_idx on public.gr_organization_members(user_id);
create index gr_org_kind_status_idx on public.gr_organizations(kind, status);
create index gr_projects_charity_status_idx on public.gr_projects(charity_organization_id, status);
create index gr_campaign_business_status_idx on public.gr_campaigns(business_organization_id, status);
create index gr_campaign_charity_status_idx on public.gr_campaigns(charity_organization_id, status);
create index gr_campaign_project_idx on public.gr_campaigns(project_id) where project_id is not null;
create index gr_campaign_events_campaign_idx on public.gr_campaign_events(campaign_id, created_at desc);
create index gr_payment_recipient_idx on public.gr_payment_records(recipient_organization_id, created_at desc);
create index gr_volunteer_org_status_idx on public.gr_volunteer_opportunities(organization_id, status);
create index gr_volunteer_applicant_idx on public.gr_volunteer_applications(applicant_user_id, created_at desc);
create index gr_complaints_status_idx on public.gr_complaints(status, created_at desc);

-- Timestamp maintenance.
create or replace function public.gr_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger gr_profiles_updated before update on public.gr_profiles for each row execute function public.gr_set_updated_at();
create trigger gr_org_updated before update on public.gr_organizations for each row execute function public.gr_set_updated_at();
create trigger gr_business_updated before update on public.gr_business_profiles for each row execute function public.gr_set_updated_at();
create trigger gr_charity_updated before update on public.gr_charity_profiles for each row execute function public.gr_set_updated_at();
create trigger gr_projects_updated before update on public.gr_projects for each row execute function public.gr_set_updated_at();
create trigger gr_campaigns_updated before update on public.gr_campaigns for each row execute function public.gr_set_updated_at();
create trigger gr_payment_updated before update on public.gr_payment_records for each row execute function public.gr_set_updated_at();
create trigger gr_volunteer_opportunities_updated before update on public.gr_volunteer_opportunities for each row execute function public.gr_set_updated_at();
create trigger gr_volunteer_profiles_updated before update on public.gr_volunteer_profiles for each row execute function public.gr_set_updated_at();
create trigger gr_volunteer_applications_updated before update on public.gr_volunteer_applications for each row execute function public.gr_set_updated_at();
create trigger gr_complaints_updated before update on public.gr_complaints for each row execute function public.gr_set_updated_at();

-- Membership helpers are SECURITY DEFINER to avoid recursive RLS checks on the
-- membership table. They expose only booleans/role values and pin search_path.
create or replace function public.gr_is_org_member(org_id uuid, candidate uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gr_organization_members m
    where m.organization_id = org_id and m.user_id = candidate
  );
$$;

create or replace function public.gr_has_org_role(org_id uuid, allowed public.gr_member_role[], candidate uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.gr_organization_members m
    where m.organization_id = org_id and m.user_id = candidate and m.role = any(allowed)
  );
$$;

revoke all on function public.gr_is_org_member(uuid, uuid) from public;
revoke all on function public.gr_has_org_role(uuid, public.gr_member_role[], uuid) from public;
grant execute on function public.gr_is_org_member(uuid, uuid) to authenticated;
grant execute on function public.gr_has_org_role(uuid, public.gr_member_role[], uuid) to authenticated;

-- RLS is mandatory on every client-facing table.
alter table public.gr_profiles enable row level security;
alter table public.gr_organizations enable row level security;
alter table public.gr_organization_members enable row level security;
alter table public.gr_business_profiles enable row level security;
alter table public.gr_charity_profiles enable row level security;
alter table public.gr_verification_checks enable row level security;
alter table public.gr_projects enable row level security;
alter table public.gr_project_follows enable row level security;
alter table public.gr_campaigns enable row level security;
alter table public.gr_campaign_approvals enable row level security;
alter table public.gr_campaign_events enable row level security;
alter table public.gr_payment_records enable row level security;
alter table public.gr_volunteer_opportunities enable row level security;
alter table public.gr_volunteer_profiles enable row level security;
alter table public.gr_volunteer_applications enable row level security;
alter table public.gr_pilot_leads enable row level security;
alter table public.gr_complaints enable row level security;
alter table public.gr_audit_log enable row level security;

-- Profiles.
create policy "profiles read own" on public.gr_profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles insert own" on public.gr_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles update own" on public.gr_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Organisation read/write. Verified active charities/nonprofits are public;
-- businesses remain visible only to their members and server-side workflows.
create policy "public verified charity organizations" on public.gr_organizations for select to anon, authenticated
using (kind in ('charity','nonprofit') and status = 'active' and verification_status = 'verified');
create policy "members read organizations" on public.gr_organizations for select to authenticated using (public.gr_is_org_member(id));
create policy "users create organizations" on public.gr_organizations for insert to authenticated with check (created_by = auth.uid());
create policy "org admins update organizations" on public.gr_organizations for update to authenticated
using (public.gr_has_org_role(id, array['owner','admin']::public.gr_member_role[]))
with check (public.gr_has_org_role(id, array['owner','admin']::public.gr_member_role[]));

create policy "members read memberships" on public.gr_organization_members for select to authenticated using (public.gr_is_org_member(organization_id));
create policy "creator adds initial owner membership" on public.gr_organization_members for insert to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (select 1 from public.gr_organizations o where o.id = organization_id and o.created_by = auth.uid())
);
create policy "org admins add memberships" on public.gr_organization_members for insert to authenticated
with check (public.gr_has_org_role(organization_id, array['owner','admin']::public.gr_member_role[]));
create policy "org owners update memberships" on public.gr_organization_members for update to authenticated
using (public.gr_has_org_role(organization_id, array['owner']::public.gr_member_role[]))
with check (public.gr_has_org_role(organization_id, array['owner']::public.gr_member_role[]));
create policy "org owners delete memberships" on public.gr_organization_members for delete to authenticated
using (public.gr_has_org_role(organization_id, array['owner']::public.gr_member_role[]));

create policy "business members read profile" on public.gr_business_profiles for select to authenticated using (public.gr_is_org_member(organization_id));
create policy "business admins insert profile" on public.gr_business_profiles for insert to authenticated with check (public.gr_has_org_role(organization_id, array['owner','admin']::public.gr_member_role[]));
create policy "business admins update profile" on public.gr_business_profiles for update to authenticated using (public.gr_has_org_role(organization_id, array['owner','admin']::public.gr_member_role[])) with check (public.gr_has_org_role(organization_id, array['owner','admin']::public.gr_member_role[]));

create policy "public verified charity profiles" on public.gr_charity_profiles for select to anon, authenticated
using (exists (select 1 from public.gr_organizations o where o.id = organization_id and o.status = 'active' and o.verification_status = 'verified'));
create policy "charity members read profile" on public.gr_charity_profiles for select to authenticated using (public.gr_is_org_member(organization_id));
create policy "charity admins insert profile" on public.gr_charity_profiles for insert to authenticated with check (public.gr_has_org_role(organization_id, array['owner','admin']::public.gr_member_role[]));
create policy "charity admins update profile" on public.gr_charity_profiles for update to authenticated using (public.gr_has_org_role(organization_id, array['owner','admin']::public.gr_member_role[])) with check (public.gr_has_org_role(organization_id, array['owner','admin']::public.gr_member_role[]));

-- Verification results may be viewed by organisation admins but may only be
-- written by trusted server-side/admin paths using the service role.
create policy "org admins read verification" on public.gr_verification_checks for select to authenticated
using (public.gr_has_org_role(organization_id, array['owner','admin']::public.gr_member_role[]));

-- Projects.
create policy "public published projects" on public.gr_projects for select to anon, authenticated
using (
  status = 'published'
  and exists (select 1 from public.gr_organizations o where o.id = charity_organization_id and o.status = 'active' and o.verification_status = 'verified')
);
create policy "charity members read projects" on public.gr_projects for select to authenticated using (public.gr_is_org_member(charity_organization_id));
create policy "charity admins create projects" on public.gr_projects for insert to authenticated with check (created_by = auth.uid() and public.gr_has_org_role(charity_organization_id, array['owner','admin','member']::public.gr_member_role[]));
create policy "charity members update projects" on public.gr_projects for update to authenticated using (public.gr_has_org_role(charity_organization_id, array['owner','admin','member']::public.gr_member_role[])) with check (public.gr_has_org_role(charity_organization_id, array['owner','admin','member']::public.gr_member_role[]));

create policy "users read own follows" on public.gr_project_follows for select to authenticated using (user_id = auth.uid());
create policy "users create own follows" on public.gr_project_follows for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own follows" on public.gr_project_follows for delete to authenticated using (user_id = auth.uid());

-- Campaigns are visible to the two participating organisations. Business users
-- can draft/submit; they cannot approve their own campaign. Charity approval
-- records are controlled separately and production state transitions should be
-- enforced by an RPC/edge function before external launch.
create policy "campaign participants read" on public.gr_campaigns for select to authenticated
using (public.gr_is_org_member(business_organization_id) or public.gr_is_org_member(charity_organization_id));
create policy "business members create campaigns" on public.gr_campaigns for insert to authenticated
with check (created_by = auth.uid() and public.gr_has_org_role(business_organization_id, array['owner','admin','member']::public.gr_member_role[]));
create policy "business members update draft campaigns" on public.gr_campaigns for update to authenticated
using (status in ('draft','submitted') and public.gr_has_org_role(business_organization_id, array['owner','admin','member']::public.gr_member_role[]))
with check (public.gr_has_org_role(business_organization_id, array['owner','admin','member']::public.gr_member_role[]));

create policy "campaign participants read approvals" on public.gr_campaign_approvals for select to authenticated
using (exists (select 1 from public.gr_campaigns c where c.id = campaign_id and (public.gr_is_org_member(c.business_organization_id) or public.gr_is_org_member(c.charity_organization_id))));
create policy "charity admins decide approval" on public.gr_campaign_approvals for update to authenticated
using (public.gr_has_org_role(approving_organization_id, array['owner','admin','reviewer']::public.gr_member_role[]))
with check (public.gr_has_org_role(approving_organization_id, array['owner','admin','reviewer']::public.gr_member_role[]));

create policy "campaign participants read events" on public.gr_campaign_events for select to authenticated
using (exists (select 1 from public.gr_campaigns c where c.id = campaign_id and (public.gr_is_org_member(c.business_organization_id) or public.gr_is_org_member(c.charity_organization_id))));

-- Payment records are server-created. Participants may read the resulting
-- record, but clients receive no insert/update/delete policy.
create policy "payment participants read" on public.gr_payment_records for select to authenticated
using (
  (business_organization_id is not null and public.gr_is_org_member(business_organization_id))
  or public.gr_is_org_member(recipient_organization_id)
);

-- Volunteer opportunities and applications.
create policy "public volunteer opportunities" on public.gr_volunteer_opportunities for select to anon, authenticated
using (status = 'published' and exists (select 1 from public.gr_organizations o where o.id = organization_id and o.status = 'active' and o.verification_status = 'verified'));
create policy "org members read volunteer opportunities" on public.gr_volunteer_opportunities for select to authenticated using (public.gr_is_org_member(organization_id));
create policy "org members create volunteer opportunities" on public.gr_volunteer_opportunities for insert to authenticated with check (created_by = auth.uid() and public.gr_has_org_role(organization_id, array['owner','admin','member']::public.gr_member_role[]));
create policy "org members update volunteer opportunities" on public.gr_volunteer_opportunities for update to authenticated using (public.gr_has_org_role(organization_id, array['owner','admin','member']::public.gr_member_role[])) with check (public.gr_has_org_role(organization_id, array['owner','admin','member']::public.gr_member_role[]));

create policy "volunteers read own profile" on public.gr_volunteer_profiles for select to authenticated using (user_id = auth.uid());
create policy "volunteers insert own profile" on public.gr_volunteer_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "volunteers update own profile" on public.gr_volunteer_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "volunteers read own applications" on public.gr_volunteer_applications for select to authenticated using (applicant_user_id = auth.uid());
create policy "opportunity org reads applications" on public.gr_volunteer_applications for select to authenticated
using (exists (select 1 from public.gr_volunteer_opportunities v where v.id = opportunity_id and public.gr_is_org_member(v.organization_id)));
create policy "volunteers apply" on public.gr_volunteer_applications for insert to authenticated with check (applicant_user_id = auth.uid());
create policy "volunteers update own pending applications" on public.gr_volunteer_applications for update to authenticated
using (applicant_user_id = auth.uid() and status in ('submitted','withdrawn'))
with check (applicant_user_id = auth.uid());
create policy "opportunity org reviews applications" on public.gr_volunteer_applications for update to authenticated
using (exists (select 1 from public.gr_volunteer_opportunities v where v.id = opportunity_id and public.gr_has_org_role(v.organization_id, array['owner','admin','member']::public.gr_member_role[])))
with check (exists (select 1 from public.gr_volunteer_opportunities v where v.id = opportunity_id and public.gr_has_org_role(v.organization_id, array['owner','admin','member']::public.gr_member_role[])));

-- Pilot leads and complaints intentionally receive no anonymous direct-insert
-- policy. Production public forms should call rate-limited edge functions with
-- bot protection / validation, which insert via the service role.
create policy "users read own complaints" on public.gr_complaints for select to authenticated using (complainant_user_id = auth.uid());
create policy "org members read related complaints" on public.gr_complaints for select to authenticated using (organization_id is not null and public.gr_is_org_member(organization_id));

-- Audit logs are server-written; organisation members can read entries related
-- to their organisation. No client mutation policy is granted.
create policy "org admins read audit" on public.gr_audit_log for select to authenticated
using (organization_id is not null and public.gr_has_org_role(organization_id, array['owner','admin','reviewer']::public.gr_member_role[]));

-- Grants remain conservative. RLS still applies to these client roles.
grant usage on schema public to anon, authenticated;
grant select on public.gr_organizations, public.gr_charity_profiles, public.gr_projects, public.gr_volunteer_opportunities to anon;
grant select, insert, update, delete on public.gr_profiles, public.gr_organizations, public.gr_organization_members, public.gr_business_profiles, public.gr_charity_profiles, public.gr_projects, public.gr_project_follows, public.gr_campaigns, public.gr_campaign_approvals, public.gr_volunteer_opportunities, public.gr_volunteer_profiles, public.gr_volunteer_applications to authenticated;
grant select on public.gr_verification_checks, public.gr_campaign_events, public.gr_payment_records, public.gr_complaints, public.gr_audit_log to authenticated;

comment on table public.gr_payment_records is 'Server-written payment ledger. Do not expose direct client inserts; use regulated provider webhooks / trusted edge functions.';
comment on table public.gr_verification_checks is 'Verification evidence and decisions. Direct writes are reserved for trusted server/admin workflows.';
comment on table public.gr_pilot_leads is 'Public lead capture target. Insert through a rate-limited server function rather than direct anonymous table access.';
