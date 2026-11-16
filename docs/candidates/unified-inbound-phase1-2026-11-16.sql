-- REVIEW-ONLY CANDIDATE — NOT APPLIED TO LIVE OR QA.
-- Unified inbound portfolio communications, Phase 1, 16 Nov 2026.
-- Apply only after founder review, isolated migration testing and an explicit
-- implementation approval. No receiver, cron, provider or send gate is enabled
-- by this file. Existing Smartlead/Kindnesss receivers remain the authentication
-- boundary; this schema is their future durable fan-in store.

create table public.unified_inbound_team_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
grant select, insert, update, delete on public.unified_inbound_team_members to authenticated;
grant all on public.unified_inbound_team_members to service_role;
alter table public.unified_inbound_team_members enable row level security;
create policy "founder admin manage unified inbox team"
on public.unified_inbound_team_members for all to authenticated
using (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'));
create policy "members read own unified inbox assignments"
on public.unified_inbound_team_members for select to authenticated
using (user_id = auth.uid());

create or replace function public.unified_inbound_has_business_access(_business_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select _business_id is not null and (
    public.has_role(auth.uid(), 'founder') or
    public.has_role(auth.uid(), 'admin') or
    exists (
      select 1 from public.unified_inbound_team_members m
      where m.business_id = _business_id and m.user_id = auth.uid()
    )
  )
$$;
revoke all on function public.unified_inbound_has_business_access(uuid) from public, anon;
grant execute on function public.unified_inbound_has_business_access(uuid) to authenticated, service_role;

create table public.unified_inbound_receipts (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('smartlead', 'kindnesss_commercial')),
  source_event_id text not null,
  idempotency_key text not null,
  authenticated_business_id uuid not null references public.businesses(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete restrict,
  event_kind text not null check (event_kind in ('reply_received','lead_unsubscribed','email_bounced','commercial_enquiry','other')),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  content_reference text,
  contact_id uuid,
  source_mailbox_id text,
  original_sender_mailbox text,
  route_evidence text check (route_evidence is null or route_evidence in ('allocated_mailbox','verified_campaign','verified_alias','signed_first_party_form')),
  thread_key text,
  status text not null default 'processing' check (status in ('processing','processed','quarantine','retry','dead_letter')),
  quarantine_reason text,
  attempts integer not null default 1 check (attempts between 1 and 6),
  lease_token uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz,
  last_error_code text,
  processed_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  opt_out_at timestamptz,
  internal_followup_blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unified_inbound_receipts_idem unique (source, idempotency_key),
  constraint unified_inbound_receipts_thread_business_key unique (business_id, thread_key, source_event_id),
  constraint unified_inbound_receipts_quarantine_unscoped check (status <> 'quarantine' or business_id is null),
  constraint unified_inbound_receipts_routed_scoped check (status <> 'processed' or (business_id is not null and thread_key is not null)),
  constraint unified_inbound_receipts_reference_only check (content_reference is null or length(content_reference) <= 1000)
);
grant select on public.unified_inbound_receipts to authenticated;
grant all on public.unified_inbound_receipts to service_role;
alter table public.unified_inbound_receipts enable row level security;
create policy "founder admin and scoped team read unified receipts"
on public.unified_inbound_receipts for select to authenticated
using (
  (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin'))
  or (business_id is not null and public.unified_inbound_has_business_access(business_id))
);
create index unified_inbound_receipts_business_received
  on public.unified_inbound_receipts (business_id, received_at desc);
create index unified_inbound_receipts_retry
  on public.unified_inbound_receipts (status, next_attempt_at, lease_until);
create index unified_inbound_receipts_quarantine
  on public.unified_inbound_receipts (status, received_at desc) where status = 'quarantine';

create or replace function public.unified_inbound_receipt_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.source is distinct from new.source
    or old.source_event_id is distinct from new.source_event_id
    or old.idempotency_key is distinct from new.idempotency_key
    or old.authenticated_business_id is distinct from new.authenticated_business_id
    or old.event_kind is distinct from new.event_kind
    or old.occurred_at is distinct from new.occurred_at
    or old.received_at is distinct from new.received_at
    or old.content_reference is distinct from new.content_reference
    or old.contact_id is distinct from new.contact_id
    or old.source_mailbox_id is distinct from new.source_mailbox_id
    or old.original_sender_mailbox is distinct from new.original_sender_mailbox then
    raise exception 'immutable inbound receipt evidence';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger unified_inbound_receipt_immutable
before update on public.unified_inbound_receipts
for each row execute function public.unified_inbound_receipt_immutable();

create table public.unified_inbound_provider_acks (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null unique references public.unified_inbound_receipts(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  provider text not null check (provider = 'smartlead'),
  provider_campaign_id text not null,
  provider_lead_id text not null,
  contact_id uuid not null,
  readback_verified boolean not null default false,
  pending_followups integer not null check (pending_followups >= 0),
  checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint unified_inbound_ack_requires_exact_readback
    check (readback_verified = false or pending_followups = 0)
);
grant select on public.unified_inbound_provider_acks to authenticated;
grant all on public.unified_inbound_provider_acks to service_role;
alter table public.unified_inbound_provider_acks enable row level security;
create policy "founder admin and scoped team read provider acknowledgements"
on public.unified_inbound_provider_acks for select to authenticated
using (public.unified_inbound_has_business_access(business_id));
create index unified_inbound_provider_acks_scope
  on public.unified_inbound_provider_acks (business_id, provider_campaign_id, provider_lead_id, contact_id);

-- Atomic insert-or-reclaim. The unique constraint handles concurrent delivery;
-- lease token prevents a stale worker finalising a reclaimed receipt.
create or replace function public.claim_unified_inbound_receipt(
  _source text,
  _source_event_id text,
  _idempotency_key text,
  _authenticated_business_id uuid,
  _event_kind text,
  _occurred_at timestamptz,
  _content_reference text,
  _contact_id uuid,
  _source_mailbox_id text,
  _original_sender_mailbox text,
  _lease_seconds integer,
  _max_attempts integer
) returns table(receipt_id uuid, state text, attempts integer, lease_token uuid)
language plpgsql security definer set search_path = public as $$
begin
  if _lease_seconds < 5 or _lease_seconds > 300 or _max_attempts < 1 or _max_attempts > 6 then
    raise exception 'invalid lease or attempt policy';
  end if;
  return query
  insert into public.unified_inbound_receipts as r (
    source, source_event_id, idempotency_key, authenticated_business_id,
    event_kind, occurred_at, content_reference, contact_id, source_mailbox_id,
    original_sender_mailbox, status, attempts, lease_token, lease_until
  ) values (
    _source, _source_event_id, _idempotency_key, _authenticated_business_id,
    _event_kind, _occurred_at, _content_reference, _contact_id, _source_mailbox_id,
    _original_sender_mailbox, 'processing', 1, gen_random_uuid(), now() + make_interval(secs => _lease_seconds)
  )
  on conflict on constraint unified_inbound_receipts_idem do update set
    attempts = r.attempts + 1,
    status = 'processing',
    lease_token = gen_random_uuid(),
    lease_until = now() + make_interval(secs => _lease_seconds),
    next_attempt_at = null,
    last_error_code = null
  where r.attempts < _max_attempts
    and r.lease_until <= now()
    and (r.status = 'processing' or (r.status = 'retry' and r.next_attempt_at <= now()))
  returning r.id, 'claimed'::text, r.attempts, r.lease_token;
  if not found then
    return query select r.id, 'duplicate'::text, r.attempts, r.lease_token
      from public.unified_inbound_receipts r
      where r.source = _source and r.idempotency_key = _idempotency_key;
  end if;
end $$;
revoke all on function public.claim_unified_inbound_receipt(text,text,text,uuid,text,timestamptz,text,uuid,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.claim_unified_inbound_receipt(text,text,text,uuid,text,timestamptz,text,uuid,text,text,integer,integer) to service_role;

create or replace function public.finalise_unified_inbound_receipt(
  _receipt_id uuid,
  _lease_token uuid,
  _status text,
  _business_id uuid,
  _route_evidence text,
  _thread_key text,
  _original_sender_mailbox text,
  _quarantine_reason text,
  _next_attempt_at timestamptz,
  _error_code text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.unified_inbound_receipts r set
    status = _status,
    business_id = _business_id,
    route_evidence = _route_evidence,
    thread_key = _thread_key,
    original_sender_mailbox = coalesce(_original_sender_mailbox, r.original_sender_mailbox),
    quarantine_reason = _quarantine_reason,
    next_attempt_at = _next_attempt_at,
    last_error_code = _error_code,
    lease_until = null,
    processed_at = case when _status in ('processed','quarantine','dead_letter') then now() else null end,
    replied_at = case when r.event_kind = 'reply_received' then coalesce(r.replied_at, r.occurred_at) else r.replied_at end,
    opt_out_at = case when r.event_kind = 'lead_unsubscribed' then coalesce(r.opt_out_at, r.occurred_at) else r.opt_out_at end,
    internal_followup_blocked_at = case
      when r.event_kind in ('reply_received','lead_unsubscribed','email_bounced') then coalesce(r.internal_followup_blocked_at, now())
      else r.internal_followup_blocked_at end
  where r.id = _receipt_id and r.lease_token = _lease_token and r.lease_until > now();
  if not found then raise exception 'stale or missing receipt lease'; end if;
end $$;
revoke all on function public.finalise_unified_inbound_receipt(uuid,uuid,text,uuid,text,text,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.finalise_unified_inbound_receipt(uuid,uuid,text,uuid,text,text,text,text,timestamptz,text) to service_role;

create or replace function public.mark_unified_inbound_read(_receipt_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.unified_inbound_receipts r set read_at = coalesce(read_at, now())
  where r.id = _receipt_id and public.unified_inbound_has_business_access(r.business_id);
  if not found then raise exception 'receipt not found or inaccessible'; end if;
end $$;
revoke all on function public.mark_unified_inbound_read(uuid) from public, anon;
grant execute on function public.mark_unified_inbound_read(uuid) to authenticated;

-- Existing communication_records + founder_approval_items are reused. This RPC
-- creates a review draft only: send_allowed, execution and auto-execution remain
-- false. It does not call Smartlead, enqueue email, or change any existing gate.
create or replace function public.create_unified_inbound_reply_draft(
  _receipt_id uuid,
  _business_id uuid,
  _mailbox_id uuid,
  _subject text,
  _body text
) returns table(communication_record_id uuid, approval_item_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  r public.unified_inbound_receipts%rowtype;
  m public.gsm_mailboxes%rowtype;
  a public.gsm_mailbox_allocations%rowtype;
  v_approval uuid;
  v_record uuid;
begin
  if not (public.has_role(auth.uid(), 'founder') or public.has_role(auth.uid(), 'admin')) then
    raise exception 'founder or admin required';
  end if;
  if _subject is null or char_length(_subject) > 300 or _body is null or char_length(_body) not between 1 and 10000 then
    raise exception 'invalid draft';
  end if;
  if _subject || ' ' || _body ~* '(dsar|gdpr|privacy request|safeguard|pupil|child|guardian|date of birth|kindness passport)' then
    raise exception 'privacy or safeguarding content must use independent human handling';
  end if;
  select * into r from public.unified_inbound_receipts where id = _receipt_id for update;
  if not found or r.status <> 'processed' or r.business_id is distinct from _business_id then
    raise exception 'verified business-scoped receipt required';
  end if;
  select * into m from public.gsm_mailboxes where id = _mailbox_id;
  if not found or m.estate_classification <> 'gsm' or not m.active or m.retired
    or m.readiness_state <> 'campaign_ready' or m.provider_health <> 'healthy'
    or m.last_provider_check_at is null or m.last_provider_check_at < now() - interval '24 hours'
    or m.last_provider_check_at > now()
    or lower(m.email) <> lower(r.original_sender_mailbox)
    or r.source_mailbox_id is distinct from _mailbox_id::text then
    raise exception 'original fresh healthy campaign-ready GSM sender required';
  end if;
  select * into a from public.gsm_mailbox_allocations
    where mailbox_id = _mailbox_id and business_id = _business_id
      and allocation_status = 'active' and thread_sticky = true;
  if not found then raise exception 'sticky original sender allocation required'; end if;

  insert into public.founder_approval_items (
    business_id, approval_type, source_system, source_table, source_id,
    contact_id, title, summary, draft_subject, draft_body,
    priority_level, status, execution_enabled, auto_execute_allowed, send_allowed,
    metadata
  ) values (
    _business_id, 'ai_reply_draft', 'unified_inbox', 'unified_inbound_receipts', r.id,
    r.contact_id, 'Unified inbox reply approval', 'Human approval required; no external action enabled.',
    _subject, _body, 'high', 'pending', false, false, false,
    jsonb_build_object('thread_key', r.thread_key, 'mailbox_id', _mailbox_id, 'phase', 1)
  ) returning id into v_approval;

  insert into public.communication_records (
    business_id, contact_id, channel, direction, communication_status,
    subject, summary, content_reference, external_provider, approval_item_id,
    audit_metadata
  ) values (
    _business_id, r.contact_id, 'email', 'outbound', 'approval_required',
    _subject, 'Reply draft awaiting founder approval; not sent.', r.content_reference,
    case when r.source = 'smartlead' then 'smartlead' else null end, v_approval,
    jsonb_build_object('thread_key', r.thread_key, 'mailbox_id', _mailbox_id, 'receipt_id', r.id, 'auto_send', false)
  ) returning id into v_record;
  return query select v_record, v_approval;
end $$;
revoke all on function public.create_unified_inbound_reply_draft(uuid,uuid,uuid,text,text) from public, anon;
grant execute on function public.create_unified_inbound_reply_draft(uuid,uuid,uuid,text,text) to authenticated;

-- Privacy requests continue to use existing public.data_privacy_requests.
-- Future authenticated metadata-only adapter must set contact_id=NULL,
-- request_summary=NULL, request_source='kindnesss_metadata_only', and metadata
-- containing only external_request_id, submitted_at and transfer_mode. No child,
-- guardian, requester identity, free text or commercial CRM promotion is allowed.
