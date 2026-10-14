# REVIEW-ONLY CANDIDATE migration — Kindnesss enquiry inbound handoff

Status: NOT APPLIED. Do not run on any hosted database without founder approval and review.
Date: 14 Oct 2026. Decision core: `src/lib/inbound/kindnesssEnquiryHandoff.ts` (offline-tested).

```sql
-- Durable first write; exact idempotency per business. No child/private fields exist by design.
create table public.inbound_handoff_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  source text not null check (source in ('kindnesss')),
  idempotency_key text not null,
  source_event_id uuid not null,
  source_enquiry_id uuid not null,
  route text not null check (route in ('conversation','quarantine')),
  quarantine_reason text,
  contact_id uuid,
  business_contact_relationship_id uuid,
  contact_email_normalised text not null,
  organisation_name text, role_title text, country text, enquiry_type text,
  message text,
  consent_contact boolean not null,
  status text not null default 'received' check (status in ('received','processed','failed','dead_letter')),
  attempts int not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (business_id, idempotency_key)
);
alter table public.inbound_handoff_events enable row level security;
revoke all on public.inbound_handoff_events from anon, authenticated;
grant select on public.inbound_handoff_events to authenticated;
create policy "founder/admin read only" on public.inbound_handoff_events
  for select to authenticated using (public._is_founder_or_admin(auth.uid()));
-- Writes only via service role inside the (future) receiver. No insert/update policy for clients.
```

Secret (not created): `KINDNESSS_HANDOFF_SIGNING_SECRET` (≥32 random bytes, shared with Kindnesss sender only).
Flag (not set): `KINDNESSS_HANDOFF_RECEIVER_ENABLED` — receiver must return 503 unless exactly `true`.
No edge function receiver has been created; it will be added only after approval.
