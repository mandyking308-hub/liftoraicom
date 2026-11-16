-- KND-003 LIFTOR PRIVACY METADATA RECEIVER — REVIEW ONLY, NOT APPLIED.
-- Dedicated privacy workstream: no commercial receipts, contacts, BCRs, sender identities,
-- requester identity, request details, notes, child data or external response capability.
-- Requires the existing public.businesses and public.data_privacy_requests tables.

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

create index kindnesss_privacy_delivery_request_idx
  on public.kindnesss_privacy_notification_deliveries (business_id, request_ref, received_at desc);
create index kindnesss_privacy_delivery_received_idx
  on public.kindnesss_privacy_notification_deliveries (received_at desc);

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

  return query select v_delivery_id, v_privacy_request_id, false;
end $$;

revoke all on function public.receive_kindnesss_privacy_notification(text,uuid,uuid,integer,text,timestamptz,text,uuid,text,timestamptz)
from public, anon, authenticated;
grant execute on function public.receive_kindnesss_privacy_notification(text,uuid,uuid,integer,text,timestamptz,text,uuid,text,timestamptz)
to service_role;
