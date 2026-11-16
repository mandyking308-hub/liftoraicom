-- KND-003 LIFTOR PRIVACY METADATA RECEIVER — REVIEW ONLY, NOT APPLIED.
-- Dedicated privacy workstream: no commercial receipts, contacts, BCRs, sender identities,
-- requester identity, request details, notes, child data or external response capability.
-- Requires the existing public.businesses, public.data_privacy_requests and public.user_roles tables.

create table public.kindnesss_privacy_request_links (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'kindnesss'),
  business_id uuid not null references public.businesses(id) on delete restrict,
  request_ref uuid not null,
  privacy_request_id uuid not null unique references public.data_privacy_requests(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint kindnesss_privacy_request_link_unique unique (source, business_id, request_ref)
);
grant select on public.kindnesss_privacy_request_links to authenticated;
grant select, insert on public.kindnesss_privacy_request_links to service_role;
alter table public.kindnesss_privacy_request_links enable row level security;
create policy "founder admin read Kindnesss privacy request links"
on public.kindnesss_privacy_request_links for select to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));

create table public.kindnesss_privacy_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'kindnesss'),
  business_id uuid not null references public.businesses(id) on delete restrict,
  event_id uuid not null,
  schema_version smallint not null check (schema_version = 1),
  event_type text not null check (event_type = 'privacy_request.notification'),
  occurred_at timestamptz not null,
  kind text not null check (kind in ('new_request', 'overdue')),
  request_ref uuid not null,
  request_type text not null check (request_type in (
    'access', 'correction', 'deletion', 'restriction_objection',
    'stop_child_collection', 'withdraw_consent', 'billing_data', 'other'
  )),
  due_at timestamptz not null,
  privacy_request_id uuid not null references public.data_privacy_requests(id) on delete restrict,
  received_at timestamptz not null default now(),
  constraint kindnesss_privacy_delivery_unique unique (source, business_id, event_id)
);
grant select on public.kindnesss_privacy_notification_deliveries to authenticated;
grant select, insert on public.kindnesss_privacy_notification_deliveries to service_role;
alter table public.kindnesss_privacy_notification_deliveries enable row level security;
create policy "founder admin read Kindnesss privacy deliveries"
on public.kindnesss_privacy_notification_deliveries for select to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));

-- Mutable Liftor-internal work tracking is separate from immutable delivery receipts.
-- It deliberately has no identity-verification, requester-approval or canonical closure field.
create table public.kindnesss_privacy_case_operations (
  privacy_request_id uuid primary key references public.data_privacy_requests(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  owner_user_id uuid,
  operational_status text not null default 'unacknowledged' check (operational_status in (
    'unacknowledged', 'acknowledged', 'in_progress', 'waiting_on_kindnesss', 'blocked'
  )),
  operator_acknowledged_at timestamptz,
  operator_acknowledged_by uuid,
  due_at timestamptz not null,
  last_delivery_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint kindnesss_privacy_operator_ack_consistency check (
    (operational_status = 'unacknowledged' and operator_acknowledged_at is null and operator_acknowledged_by is null)
    or (operational_status <> 'unacknowledged' and operator_acknowledged_at is not null and operator_acknowledged_by is not null)
  )
);
grant select on public.kindnesss_privacy_case_operations to authenticated;
grant select, insert, update on public.kindnesss_privacy_case_operations to service_role;
alter table public.kindnesss_privacy_case_operations enable row level security;
create policy "founder admin read Kindnesss privacy operations"
on public.kindnesss_privacy_case_operations for select to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));

create index kindnesss_privacy_delivery_request_idx
  on public.kindnesss_privacy_notification_deliveries (business_id, request_ref, received_at desc);
create index kindnesss_privacy_delivery_received_idx
  on public.kindnesss_privacy_notification_deliveries (received_at desc);
create index kindnesss_privacy_operations_due_idx
  on public.kindnesss_privacy_case_operations (business_id, operational_status, due_at);

create or replace function public.kindnesss_privacy_metadata_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Kindnesss privacy delivery metadata is immutable';
end $$;

create trigger kindnesss_privacy_links_immutable
before update or delete on public.kindnesss_privacy_request_links
for each row execute function public.kindnesss_privacy_metadata_immutable();
create trigger kindnesss_privacy_deliveries_immutable
before update or delete on public.kindnesss_privacy_notification_deliveries
for each row execute function public.kindnesss_privacy_metadata_immutable();

-- Liftor can triage work but cannot take over Kindnesss requester/child-case authority.
create or replace function public.kindnesss_privacy_case_authority_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.request_source = 'kindnesss_privacy_metadata' then
      raise exception 'Kindnesss authoritative privacy cases cannot be deleted in Liftor';
    end if;
    return old;
  end if;
  if old.request_source = 'kindnesss_privacy_metadata' and (
    new.business_id is distinct from old.business_id
    or new.contact_id is distinct from old.contact_id
    or new.request_type is distinct from old.request_type
    or new.request_status is distinct from old.request_status
    or new.request_source is distinct from old.request_source
    or new.request_summary is distinct from old.request_summary
    or new.due_date is distinct from old.due_date
    or new.completed_at is distinct from old.completed_at
    or new.metadata is distinct from old.metadata
  ) then
    raise exception 'Kindnesss admin authority required for case status, identity, scope or closure changes';
  end if;
  return new;
end $$;

create trigger kindnesss_privacy_case_authority_guard
before update or delete on public.data_privacy_requests
for each row execute function public.kindnesss_privacy_case_authority_guard();

-- One transaction creates/reuses the founder workstream case and records each delivery.
-- A per-business advisory lock makes duplicate events and same-request events deterministic.
-- Delivery never resolves, completes, approves or externally responds to the privacy case.
create or replace function public.receive_kindnesss_privacy_notification(
  _source text,
  _business_id uuid,
  _event_id uuid,
  _schema_version integer,
  _event_type text,
  _occurred_at timestamptz,
  _kind text,
  _request_ref uuid,
  _request_type text,
  _due_at timestamptz
) returns table(delivery_id uuid, privacy_request_id uuid, duplicate boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_delivery_id uuid;
  v_privacy_request_id uuid;
begin
  if _source <> 'kindnesss'
    or _business_id <> '640de582-a112-4d16-a221-03c27f00c6ec'::uuid
    or _schema_version <> 1
    or _event_type <> 'privacy_request.notification'
    or _kind not in ('new_request', 'overdue')
    or _request_type not in (
      'access', 'correction', 'deletion', 'restriction_objection',
      'stop_child_collection', 'withdraw_consent', 'billing_data', 'other'
    )
    or _event_id is null or _request_ref is null or _occurred_at is null or _due_at is null then
    raise exception 'invalid privacy notification metadata';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = _business_id and b.portfolio_status = 'active' and b.archived_at is null
  ) then
    raise exception 'active Kindnesss business scope required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(_source || ':' || _business_id::text, 0));

  select d.id, d.privacy_request_id into v_delivery_id, v_privacy_request_id
  from public.kindnesss_privacy_notification_deliveries d
  where d.source = _source and d.business_id = _business_id and d.event_id = _event_id;
  if found then
    return query select v_delivery_id, v_privacy_request_id, true;
    return;
  end if;

  select l.privacy_request_id into v_privacy_request_id
  from public.kindnesss_privacy_request_links l
  where l.source = _source and l.business_id = _business_id and l.request_ref = _request_ref;
  if not found then
    insert into public.data_privacy_requests (
      business_id, contact_id, request_type, request_status, request_source,
      request_summary, due_date, founder_review_required, legal_review_recommended,
      completed_at, metadata
    ) values (
      _business_id, null, _request_type, 'received', 'kindnesss_privacy_metadata',
      null, (_due_at at time zone 'UTC')::date, true, true,
      null, jsonb_build_object(
        'external_request_ref', _request_ref::text,
        'transfer_mode', 'metadata_only',
        'source', _source
      )
    ) returning id into v_privacy_request_id;

    insert into public.kindnesss_privacy_request_links (
      source, business_id, request_ref, privacy_request_id
    ) values (_source, _business_id, _request_ref, v_privacy_request_id);
  end if;

  insert into public.kindnesss_privacy_notification_deliveries (
    source, business_id, event_id, schema_version, event_type, occurred_at,
    kind, request_ref, request_type, due_at, privacy_request_id
  ) values (
    _source, _business_id, _event_id, _schema_version, _event_type, _occurred_at,
    _kind, _request_ref, _request_type, _due_at, v_privacy_request_id
  ) returning id into v_delivery_id;

  insert into public.kindnesss_privacy_case_operations (
    privacy_request_id, business_id, operational_status, due_at, last_delivery_at
  ) values (
    v_privacy_request_id, _business_id, 'unacknowledged', _due_at, now()
  ) on conflict on constraint kindnesss_privacy_case_operations_pkey do update set
    due_at = excluded.due_at,
    last_delivery_at = excluded.last_delivery_at;

  return query select v_delivery_id, v_privacy_request_id, false;
end $$;

revoke all on function public.receive_kindnesss_privacy_notification(text,uuid,uuid,integer,text,timestamptz,text,uuid,text,timestamptz)
from public, anon, authenticated;
grant execute on function public.receive_kindnesss_privacy_notification(text,uuid,uuid,integer,text,timestamptz,text,uuid,text,timestamptz)
to service_role;

-- Explicit founder/admin human triage with compare-and-set protection.
-- No parameter can approve/reject the requester, verify identity or close the canonical case.
create or replace function public.review_kindnesss_privacy_case_operations(
  _privacy_request_id uuid,
  _owner_user_id uuid,
  _operational_status text,
  _expected_updated_at timestamptz
) returns setof public.kindnesss_privacy_case_operations
language plpgsql security definer set search_path = public as $$
declare
  v_operation public.kindnesss_privacy_case_operations%rowtype;
begin
  if auth.uid() is null or not (
    public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin')
  ) then
    raise exception 'founder or admin privacy review required' using errcode = '42501';
  end if;
  if _operational_status not in (
    'unacknowledged', 'acknowledged', 'in_progress', 'waiting_on_kindnesss', 'blocked'
  ) then
    raise exception 'Kindnesss admin authority required for approval, identity verification or closure';
  end if;
  if _owner_user_id is null or not (
    public.has_role(_owner_user_id, 'founder') or public.has_role(_owner_user_id, 'admin')
  ) then
    raise exception 'privacy owner must be a founder or admin';
  end if;
  if _expected_updated_at is null then
    raise exception 'privacy operation compare-and-set token required';
  end if;

  select o.* into v_operation
  from public.kindnesss_privacy_case_operations o
  join public.data_privacy_requests r on r.id = o.privacy_request_id
  where o.privacy_request_id = _privacy_request_id
    and o.business_id = '640de582-a112-4d16-a221-03c27f00c6ec'::uuid
    and r.business_id = o.business_id
    and r.request_source = 'kindnesss_privacy_metadata'
  for update of o;
  if not found then
    raise exception 'Kindnesss privacy operation not found';
  end if;
  if v_operation.updated_at <> _expected_updated_at then
    raise exception 'stale privacy operation review; refresh before saving';
  end if;

  update public.kindnesss_privacy_case_operations o
  set owner_user_id = _owner_user_id,
      operational_status = _operational_status,
      operator_acknowledged_at = case
        when _operational_status = 'unacknowledged' then null
        else coalesce(o.operator_acknowledged_at, now())
      end,
      operator_acknowledged_by = case
        when _operational_status = 'unacknowledged' then null
        else coalesce(o.operator_acknowledged_by, auth.uid())
      end,
      updated_at = now(),
      updated_by = auth.uid()
  where o.privacy_request_id = _privacy_request_id
  returning o.* into v_operation;

  return next v_operation;
end $$;

revoke all on function public.review_kindnesss_privacy_case_operations(uuid,uuid,text,timestamptz)
from public, anon;
grant execute on function public.review_kindnesss_privacy_case_operations(uuid,uuid,text,timestamptz)
to authenticated, service_role;
