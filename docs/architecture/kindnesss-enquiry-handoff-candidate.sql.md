# REVIEW-ONLY CANDIDATE migration — Kindnesss enquiry inbound handoff

Status: NOT APPLIED anywhere. Requires founder approval. Revised 14 Oct 2026 for atomic claim.
Runtime handler: `supabase/functions/_shared/kindnesssEnquiryReceiver.ts` (no entrypoint deployed).

```sql
create table public.inbound_handoff_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  source text not null check (source in ('kindnesss')),
  idempotency_key text not null,
  source_event_id uuid not null,
  source_enquiry_id uuid not null,
  route text check (route in ('conversation','quarantine')),
  quarantine_reason text,
  contact_id uuid,
  business_contact_relationship_id uuid,
  contact_email_normalised text not null,
  organisation_name text, role_title text, country text, enquiry_type text,
  message text,
  consent_contact boolean not null,
  status text not null default 'received' check (status in ('received','processed','failed','dead_letter')),
  attempts int not null default 1,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint inbound_handoff_events_idem unique (business_id, idempotency_key)
);
grant select on public.inbound_handoff_events to authenticated;
grant all on public.inbound_handoff_events to service_role;
alter table public.inbound_handoff_events enable row level security;
create policy "founder/admin read only" on public.inbound_handoff_events
  for select to authenticated using (public._is_founder_or_admin(auth.uid()));

-- Atomic claim used by HandoffStore.claim (service role only).
create or replace function public.claim_inbound_handoff(
  _business_id uuid, _key text, _event_id uuid, _enquiry_id uuid, _email text,
  _org text, _role text, _country text, _type text, _message text, _consent boolean, _max_attempts int)
returns table(record_id uuid, state text, attempts int, status text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  insert into inbound_handoff_events as e (business_id, source, idempotency_key, source_event_id, source_enquiry_id,
    contact_email_normalised, organisation_name, role_title, country, enquiry_type, message, consent_contact)
  values (_business_id, 'kindnesss', _key, _event_id, _enquiry_id, _email, _org, _role, _country, _type, _message, _consent)
  on conflict on constraint inbound_handoff_events_idem do update
    set attempts = e.attempts + 1, status = 'received', last_error = null
    where e.status = 'failed' and e.attempts < _max_attempts
  returning e.id, 'claimed'::text, e.attempts, e.status;
  if not found then
    return query select e.id, 'duplicate'::text, e.attempts, e.status from inbound_handoff_events e
      where e.business_id = _business_id and e.idempotency_key = _key;
  end if;
end $$;
revoke all on function public.claim_inbound_handoff from public, anon, authenticated;
grant execute on function public.claim_inbound_handoff to service_role;
```

Audit rows go to existing `activity_log` (no new audit table).
Contact lookup: exact `lower(contacts.email)` join `business_contact_relationships` where `business_id = <mapped>`; >1 row ⇒ ambiguous ⇒ quarantine.

Secret (not created): `KINDNESSS_HANDOFF_SIGNING_SECRET`. Flag (not set): `KINDNESSS_HANDOFF_RECEIVER_ENABLED`.
