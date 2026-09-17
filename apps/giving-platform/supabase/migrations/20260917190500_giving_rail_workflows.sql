-- Giving Rail workflow functions and audit controls

-- Bootstrap a minimal profile record for each authenticated user.
create or replace function public.gr_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gr_profiles (user_id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger gr_on_auth_user_created
after insert on auth.users
for each row execute function public.gr_handle_new_user();

-- Atomic organisation creation: creates the organisation and owner membership in
-- one server-side transaction, avoiding an orphan onboarding record.
create or replace function public.gr_create_organization(
  p_kind public.gr_org_kind,
  p_legal_name text,
  p_registration_number text default null,
  p_country_code text default 'GB',
  p_website text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if length(trim(coalesce(p_legal_name, ''))) < 2 then
    raise exception 'Legal name is required';
  end if;
  if char_length(upper(p_country_code)) <> 2 then
    raise exception 'Country code must be ISO alpha-2';
  end if;

  insert into public.gr_organizations (
    kind, legal_name, registration_number, country_code, website, created_by
  ) values (
    p_kind, trim(p_legal_name), nullif(trim(coalesce(p_registration_number,'')), ''), upper(p_country_code), nullif(trim(coalesce(p_website,'')), ''), v_user
  ) returning id into v_org;

  insert into public.gr_organization_members (organization_id, user_id, role)
  values (v_org, v_user, 'owner');

  if p_kind = 'business' then
    insert into public.gr_business_profiles (organization_id) values (v_org);
  else
    insert into public.gr_charity_profiles (organization_id) values (v_org);
  end if;

  insert into public.gr_audit_log (actor_user_id, organization_id, entity_type, entity_id, action)
  values (v_user, v_org, 'organization', v_org::text, 'created');

  return v_org;
end;
$$;

grant execute on function public.gr_create_organization(public.gr_org_kind,text,text,text,text) to authenticated;

-- Every new campaign receives a pending approval record for the recipient
-- organisation. Business users cannot approve this row through RLS.
create or replace function public.gr_campaign_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gr_campaign_approvals (campaign_id, approving_organization_id, status)
  values (new.id, new.charity_organization_id, 'pending');

  insert into public.gr_campaign_events (
    campaign_id, actor_user_id, actor_organization_id, event_type, to_status
  ) values (
    new.id, new.created_by, new.business_organization_id, 'campaign_created', new.status
  );
  return new;
end;
$$;

create trigger gr_campaign_created
after insert on public.gr_campaigns
for each row execute function public.gr_campaign_bootstrap();

create or replace function public.gr_submit_campaign(p_campaign_id uuid)
returns public.gr_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.gr_campaigns;
begin
  select * into v_campaign from public.gr_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if not public.gr_has_org_role(v_campaign.business_organization_id, array['owner','admin','member']::public.gr_member_role[], v_user) then
    raise exception 'Not authorised for business organisation';
  end if;
  if v_campaign.status <> 'draft' then raise exception 'Only draft campaigns can be submitted'; end if;
  if v_campaign.jurisdiction_code <> 'GB' then raise exception 'This jurisdiction is not enabled for sales-linked campaign submission'; end if;
  if v_campaign.giving_basis <> 'direct_corporate' then
    if v_campaign.starts_on is null or v_campaign.ends_on is null or length(trim(coalesce(v_campaign.eligible_offer,''))) < 2 then
      raise exception 'Campaign dates and eligible offer are required';
    end if;
  end if;

  update public.gr_campaigns
  set status = 'submitted', submitted_at = now()
  where id = p_campaign_id
  returning * into v_campaign;

  insert into public.gr_campaign_events (campaign_id, actor_user_id, actor_organization_id, event_type, from_status, to_status)
  values (p_campaign_id, v_user, v_campaign.business_organization_id, 'campaign_submitted', 'draft', 'submitted');

  return v_campaign;
end;
$$;

grant execute on function public.gr_submit_campaign(uuid) to authenticated;

create or replace function public.gr_decide_campaign(
  p_campaign_id uuid,
  p_decision public.gr_approval_status,
  p_note text default null,
  p_approved_statement text default null,
  p_agreement_reference text default null
)
returns public.gr_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.gr_campaigns;
  v_from public.gr_campaign_status;
begin
  if p_decision not in ('approved','declined') then raise exception 'Decision must be approved or declined'; end if;

  select * into v_campaign from public.gr_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if not public.gr_has_org_role(v_campaign.charity_organization_id, array['owner','admin','reviewer']::public.gr_member_role[], v_user) then
    raise exception 'Not authorised for recipient organisation';
  end if;
  if v_campaign.status not in ('submitted','under_review') then raise exception 'Campaign is not awaiting recipient review'; end if;

  if p_decision = 'approved' and v_campaign.giving_basis <> 'direct_corporate' then
    if length(trim(coalesce(p_approved_statement,''))) < 10 then raise exception 'Approved public statement is required'; end if;
    if length(trim(coalesce(p_agreement_reference,''))) < 3 then raise exception 'Agreement reference is required'; end if;
  end if;

  update public.gr_campaign_approvals
  set status = p_decision,
      approved_by = v_user,
      decision_note = nullif(trim(coalesce(p_note,'')), ''),
      decided_at = now()
  where campaign_id = p_campaign_id and approving_organization_id = v_campaign.charity_organization_id;

  v_from := v_campaign.status;

  update public.gr_campaigns
  set status = case when p_decision = 'approved' then 'approved'::public.gr_campaign_status else 'declined'::public.gr_campaign_status end,
      approved_public_statement = case when p_decision = 'approved' then nullif(trim(coalesce(p_approved_statement,'')), '') else approved_public_statement end,
      agreement_reference = case when p_decision = 'approved' then nullif(trim(coalesce(p_agreement_reference,'')), '') else agreement_reference end,
      agreement_signed_at = case when p_decision = 'approved' then now() else agreement_signed_at end,
      approved_at = case when p_decision = 'approved' then now() else approved_at end
  where id = p_campaign_id
  returning * into v_campaign;

  insert into public.gr_campaign_events (campaign_id, actor_user_id, actor_organization_id, event_type, from_status, to_status, details)
  values (
    p_campaign_id,
    v_user,
    v_campaign.charity_organization_id,
    case when p_decision = 'approved' then 'campaign_approved' else 'campaign_declined' end,
    v_from,
    v_campaign.status,
    jsonb_build_object('decision_note', p_note, 'agreement_reference', p_agreement_reference)
  );

  return v_campaign;
end;
$$;

grant execute on function public.gr_decide_campaign(uuid,public.gr_approval_status,text,text,text) to authenticated;

-- Starting a public sales-linked promotion is a distinct action after approval.
create or replace function public.gr_start_campaign(p_campaign_id uuid)
returns public.gr_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.gr_campaigns;
begin
  select * into v_campaign from public.gr_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if not public.gr_has_org_role(v_campaign.business_organization_id, array['owner','admin']::public.gr_member_role[], v_user) then
    raise exception 'Not authorised';
  end if;
  if v_campaign.status <> 'approved' then raise exception 'Campaign must be approved before it can start'; end if;
  if v_campaign.giving_basis <> 'direct_corporate' and (v_campaign.agreement_reference is null or v_campaign.approved_public_statement is null) then
    raise exception 'Approved agreement and statement are required';
  end if;

  update public.gr_campaigns set status = 'live', live_at = now() where id = p_campaign_id returning * into v_campaign;
  insert into public.gr_campaign_events (campaign_id, actor_user_id, actor_organization_id, event_type, from_status, to_status)
  values (p_campaign_id, v_user, v_campaign.business_organization_id, 'campaign_started', 'approved', 'live');
  return v_campaign;
end;
$$;

grant execute on function public.gr_start_campaign(uuid) to authenticated;

create or replace function public.gr_submit_reconciliation(
  p_campaign_id uuid,
  p_final_sales bigint default null,
  p_final_revenue numeric default null,
  p_final_contribution numeric default null
)
returns public.gr_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.gr_campaigns;
begin
  select * into v_campaign from public.gr_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;
  if not public.gr_has_org_role(v_campaign.business_organization_id, array['owner','admin']::public.gr_member_role[], v_user) then
    raise exception 'Not authorised';
  end if;
  if v_campaign.status not in ('live','reconciliation_due') then raise exception 'Campaign is not ready for reconciliation'; end if;
  if p_final_contribution is null or p_final_contribution < 0 then raise exception 'Final contribution is required'; end if;

  update public.gr_campaigns
  set status = 'reconciliation_due',
      final_eligible_sales = p_final_sales,
      final_eligible_revenue = p_final_revenue,
      final_contribution = p_final_contribution
  where id = p_campaign_id
  returning * into v_campaign;

  insert into public.gr_campaign_events (campaign_id, actor_user_id, actor_organization_id, event_type, from_status, to_status, details)
  values (
    p_campaign_id, v_user, v_campaign.business_organization_id, 'reconciliation_submitted',
    'live', 'reconciliation_due',
    jsonb_build_object('final_sales',p_final_sales,'final_revenue',p_final_revenue,'final_contribution',p_final_contribution)
  );
  return v_campaign;
end;
$$;

grant execute on function public.gr_submit_reconciliation(uuid,bigint,numeric,numeric) to authenticated;

-- Payment webhooks / trusted server code call this function with the service
-- role. It intentionally is not granted to anon/authenticated users.
create or replace function public.gr_record_payment_and_settle(
  p_campaign_id uuid,
  p_provider text,
  p_provider_reference text,
  p_currency text,
  p_gross_amount numeric,
  p_provider_fee numeric,
  p_platform_fee numeric,
  p_charitable_amount numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.gr_campaigns;
  v_payment uuid;
begin
  select * into v_campaign from public.gr_campaigns where id = p_campaign_id for update;
  if not found then raise exception 'Campaign not found'; end if;

  insert into public.gr_payment_records (
    campaign_id, project_id, business_organization_id, recipient_organization_id,
    provider, provider_payment_reference, currency, gross_amount, provider_fee,
    platform_fee, charitable_amount, status, paid_at, metadata
  ) values (
    v_campaign.id, v_campaign.project_id, v_campaign.business_organization_id, v_campaign.charity_organization_id,
    p_provider, p_provider_reference, upper(p_currency), p_gross_amount, coalesce(p_provider_fee,0),
    coalesce(p_platform_fee,0), p_charitable_amount, 'paid', now(), coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (provider, provider_payment_reference) do update
    set status = 'paid', paid_at = coalesce(public.gr_payment_records.paid_at, now()), metadata = excluded.metadata
  returning id into v_payment;

  if v_campaign.status = 'reconciliation_due' and p_charitable_amount >= coalesce(v_campaign.final_contribution, 0) then
    update public.gr_campaigns set status = 'settled', settled_at = now() where id = v_campaign.id;
    insert into public.gr_campaign_events (campaign_id, event_type, from_status, to_status, details)
    values (v_campaign.id, 'campaign_settled', 'reconciliation_due', 'settled', jsonb_build_object('payment_id',v_payment,'charitable_amount',p_charitable_amount));
  end if;

  return v_payment;
end;
$$;

revoke all on function public.gr_record_payment_and_settle(uuid,text,text,text,numeric,numeric,numeric,numeric,jsonb) from public;

-- Do not let an ordinary client bypass the controlled campaign transition RPCs
-- by updating the status fields directly. These guards run even if a permissive
-- RLS policy matches the row.
create or replace function public.gr_guard_campaign_client_status()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     or new.approved_at is distinct from old.approved_at
     or new.approved_public_statement is distinct from old.approved_public_statement
     or new.agreement_reference is distinct from old.agreement_reference
     or new.agreement_signed_at is distinct from old.agreement_signed_at
     or new.live_at is distinct from old.live_at
     or new.settled_at is distinct from old.settled_at then
    -- Trusted SECURITY DEFINER functions execute as their owner and can set these
    -- fields; ordinary authenticated direct updates must not.
    if current_user in ('anon', 'authenticated') then
      raise exception 'Use the controlled campaign workflow functions';
    end if;
  end if;
  return new;
end;
$$;

create trigger gr_campaign_status_guard
before update on public.gr_campaigns
for each row execute function public.gr_guard_campaign_client_status();
