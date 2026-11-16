# KND-003 Liftor Privacy Metadata Handoff — Evidence

**Date:** 16 November 2026
**Original Liftor base:** `45e2c093663d5794283a44f1ae89cb33c861d839`
**Receiver checkpoint continued:** `47cbc5670c649fd2030aa930637edfb03861dfec`
**Kindnesss source snapshot:** `cc3fca932f07060bae77603c16c9c233cc1ca4a6`
**Scope:** separate source-only privacy receiver, review-only SQL, dedicated founder/admin operations queue, and isolated tests
**Production/hosted-QA writes, deployments, publishing, external sends, DNS/provider/campaign changes:** none

## 1. Required status matrix

| State | Result | Evidence |
|---|---|---|
| **BUILT** | YES — source only | Default-off `kindnesss-privacy-receiver`; raw-byte dedicated-secret HMAC; exact ten-field validation; atomic durable receipt/case RPC; immutable metadata deliveries; separate founder/admin ownership, acknowledgement, triage and visual due-alert queue; Kindnesss-only authority guard. |
| **SOURCE TESTED** | YES | Complete suite: **1,110 passed, 20 skipped**, across **96 passed and 2 opt-in skipped files**. Deno receiver check passed. Touched-file ESLint completed with **0 errors and 1 non-blocking Fast Refresh warning**. `git diff --check`, shell syntax check and automatic build/typecheck passed. |
| **DISPOSABLE QA TESTED** | YES — local only | Fresh disposable PostgreSQL 17.11: **11/11 scenarios passed**, executing the actual candidate SQL, RPCs, constraints, triggers, compare-and-set behavior and RLS. |
| **HOSTED QA** | **NOT RUN** | No hosted-QA migration, function deployment, secret, receiver flag, worker configuration or signed request was used. |
| **LIVE VERIFIED** | **NO** | The candidate is not applied, the receiver is not deployed/enabled, Kindnesss has not delivered a live privacy event, and no active privacy monitoring is claimed. |

## 2. Exact Kindnesss sender compatibility

The verbatim sender fixture is:

- `src/lib/__tests__/fixtures/kindnesss/liftor-privacy-outbound.server.ts`
- Source: Kindnesss `src/lib/liftor-privacy-outbound.server.ts` at `cc3fca932f07060bae77603c16c9c233cc1ca4a6`.
- SHA-256 (both copies): `24719b0e32a52d3d9409172ec19670b0eeb139391fc82ad54fc0002a69778902`.
- The receiver test now asserts this exact fixture hash.
- Its imported commercial fixture was also byte-identical to the same Kindnesss snapshot.
- Reviewed worker source SHA-256: `13814edd0b4a4623da0bae2a654ba3c72856a41302b7b7726eb622266297ca10` (`liftor-privacy-worker.server.ts`).

The actual sender builder creates exactly ten keys:

`schema_version,event_type,event_id,source,business_id,occurred_at,kind,request_ref,request_type,due_at`.

The receiver verifies `sha256=HMAC-SHA256(privacySecret, timestamp + "." + event_id + "." + RAW_BODY)` using the raw request bytes before decoding JSON. It requires the exact source, event type, event ID headers, active Kindnesss business UUID, canonical ISO timestamps, ±300-second clock skew, allowlisted kind/request type, UUID event/request references, and no additional keys. The privacy secret must be at least 32 characters and cannot equal the configured commercial handoff secret.

Invalid signatures and moved event IDs return 401. Storage failure returns retryable 503. A new committed receipt returns 202; an existing `(source,business_id,event_id)` returns 200 only after reading the durable receipt. Disabled/missing/shared-secret configuration fails closed. No payload, database error, secret, requester identity or note text is logged.

## 3. Implemented files

### Receiver and production store

- `supabase/functions/kindnesss-privacy-receiver/index.ts` — actual entrypoint; `KINDNESSS_PRIVACY_RECEIVER_ENABLED=true` is required. Commercial flags do not enable it.
- `supabase/functions/_shared/kindnesssPrivacyHandoff.ts` — raw-byte HMAC, constant-time comparison, timestamp/header/schema/tenant validation and exact key allowlist.
- `supabase/functions/_shared/kindnesssPrivacyReceiver.ts` — durable-first response behavior and no-send boundary.
- `supabase/functions/_shared/kindnesssPrivacyStore.ts` — service-role RPC adapter for `receive_kindnesss_privacy_notification`; no arbitrary SQL or CRM writes.
- No commercial or Smartlead Edge function was changed by the operations-queue continuation.

### Review-only schema

`docs/candidates/kindnesss-privacy-handoff-2026-11-16.sql` is deliberately outside `supabase/migrations` and was not applied to live or hosted QA.

- `kindnesss_privacy_notification_deliveries`: one immutable row per independent event ID, unique on `(source,business_id,event_id)`; only opaque request/event references and approved metadata.
- `kindnesss_privacy_request_links`: unique `(source,business_id,request_ref)` mapping to one existing `data_privacy_requests` case; multiple `new_request`/`overdue` deliveries retain separate event IDs but share the case.
- `kindnesss_privacy_case_operations`: one mutable Liftor-internal operations row per case, with founder/admin owner, `unacknowledged|acknowledged|in_progress|waiting_on_kindnesss|blocked` status, operator acknowledgement time/actor, due time and last delivery. It has no requester approval, identity-verification or canonical closure field.
- Atomic `receive_kindnesss_privacy_notification` RPC: validates the active business again, serializes same-business receipt creation, finds/creates the case and link, inserts the immutable delivery, and creates/updates the operations projection in one transaction. Duplicate deliveries do not create another receipt or change operator acknowledgement.
- `review_kindnesss_privacy_case_operations` RPC: explicit founder/admin human triage only, with a full-precision `updated_at` compare-and-set token and privileged-owner validation. Anonymous and commercial-team callers are rejected; authenticated direct table writes are denied.
- `kindnesss_privacy_case_authority_guard`: prevents Liftor updates to Kindnesss-sourced case status, requester/contact fields, scope, summary, due date, completion or source metadata, and prevents deletion. Approval, identity verification and closure remain Kindnesss-admin-only and have no Liftor action.
- New case fields remain `contact_id=NULL`, `request_summary=NULL`, `request_status='received'`, `completed_at=NULL`, with founder and legal review required. Delivery does not resolve or complete the case.
- Founder/admin-only RLS and SELECT policies cover all three new tables. Anonymous and commercial-team roles receive no access policy. Receipt RPC execution is service-role-only; triage RPC execution requires an authenticated founder/admin check.
- Append-only triggers reject delivery/link updates and deletes. No contact or business-contact-relationship creation exists.

### Separate Communications Centre privacy operations queue

- `src/pages/founder/communications/Privacy.tsx` and `/founder/communications/privacy` provide the dedicated queue, reference-only review, owner assignment, triage status and visual due alerts. `FounderRoute` remains the route guard.
- `src/lib/kindnesssPrivacyOperations.ts` reads only the privacy deliveries, operations projection and existing privacy-case status. Missing/inconsistent schema returns **Not activated / Unverified**, never reassuring zeros.
- Delivery acknowledgement, operator acknowledgement and Kindnesss authoritative status are shown as three separate concepts. Saving triage does not change the canonical Kindnesss case or contact a requester.
- Due alerts are computed visually from stored due timestamps. No cron, email alert or external notification is registered.
- `src/lib/unifiedInbox.ts` no longer reads privacy cases or creates privacy rows for the commercial inbox. It retains only the separate privacy-source diagnostic. `filterInboxRows` also excludes any privacy row defensively.
- `src/pages/founder/communications/Inbox.tsx` links to the separate queue and contains no privacy delivery rows or sales reply path for them.
- Privacy does not enter CRM contacts, commercial handoff receipts, marketing automation, customer queues, sales replies, GHAT routing or the existing 40-company commercial routing.

## 4. Verification results

All final checks ran on 16 November 2026 UTC.

| Check | Exact result |
|---|---|
| Complete `bunx vitest run` | **PASS — 96 files passed, 2 skipped; 1,110 tests passed, 20 skipped** at 16:01:27. Skips are the 11 privacy and 9 unified-inbound opt-in disposable PostgreSQL tests in the normal no-database run. |
| `./scripts/test-kindnesss-privacy-isolated.sh` | **PASS — 11/11** at 16:01:01, using a fresh local disposable PostgreSQL 17.11 database. |
| `deno check supabase/functions/kindnesss-privacy-receiver/index.ts` | **PASS**, including transitive shared modules. |
| Touched implementation/test ESLint | **0 errors, 1 warning** — the existing `react-refresh/only-export-components` warning for shared communications navigation exports. |
| `bash -n scripts/test-kindnesss-privacy-isolated.sh` | **PASS**. |
| Automatic build/typecheck harness | **PASS — `build OK` at 16:02:38**. The final literal-type correction was included. |
| `git diff --check` | **PASS**. |
| Dependency manifests | **UNCHANGED**; tests use the existing `postgres` client. |

During finalization, the disposable suite caught a PL/pgSQL ambiguity in the new operations upsert; it was corrected to use the explicit primary-key constraint and rerun. A test-client timestamp serializer also truncated microseconds, so test SQL now passes compare-and-set tokens through text to preserve full precision. The production candidate compare-and-set behavior was then proved with stale-token rejection.

### Disposable PostgreSQL scenarios

1. Actual Kindnesss ten-key sender bytes and correct HMAC → real Liftor receiver → durable delivery, unacknowledged operations row and NULL-contact/NULL-summary founder case.
2. Twelve concurrent identical deliveries → one 202, eleven 200 responses, one delivery and one case.
3. Wrong secret, stale timestamp, body tamper, wrong source, wrong business and added requester/child fields rejected with zero writes.
4. Database outage → 503 and zero rows; same-event retry → 202; later duplicate → 200 without another row.
5. Concurrent `new_request` and `overdue` event IDs for one request reference → two deliveries linked to one still-`received`, unresolved case.
6. Other-business and inactive-Kindnesss attempts rejected without cross-tenant writes.
7. Founder/admin reads allowed; commercial team sees zero through RLS; anonymous reads and authenticated direct writes denied.
8. Delivery/link update and delete attempts rejected; the privacy case remains unresolved.
9. Founder operator assignment/acknowledgement succeeds; commercial-team caller, non-privileged owner, `closed` status, direct canonical completion and case deletion are rejected.
10. Full-precision compare-and-set succeeds; stale token fails; later overdue delivery updates due/last-delivery metadata while preserving operator ownership/status; duplicate adds nothing.
11. Direct authenticated operations-table updates are denied even for a founder; changes require the reviewed RPC.

No test sent email, called a provider, contacted Kindnesss hosting, wrote to live/hosted QA, or used real customer information.

### Reproducible offline commands

```bash
bunx vitest run
./scripts/test-kindnesss-privacy-isolated.sh
deno check supabase/functions/kindnesss-privacy-receiver/index.ts
bash -n scripts/test-kindnesss-privacy-isolated.sh
git diff --check
```

The isolated runner accepts an optional Vitest name filter, for example:

```bash
./scripts/test-kindnesss-privacy-isolated.sh -t "separates delivery and operator acknowledgement"
```

It creates and removes a temporary local PostgreSQL cluster, uses an existing unprivileged local UID/GID, and never targets hosted QA or production.

## 5. Activation prerequisites — all still pending

1. Owner review and apply the Kindnesss **20261116b, 20261116c, 20261116d and 20261116e** pending migrations in their required order after their isolated migration/RLS checks.
2. Independently review and apply `docs/candidates/kindnesss-privacy-handoff-2026-11-16.sql` in isolated hosted QA, then production only through a separately approved migration step. This review now includes operator ownership/triage and the Kindnesss-authority guard.
3. Provision a dedicated privacy signing secret securely on both Kindnesss and Liftor; it must differ from the commercial secret. Configure the exact Liftor receiver URL on Kindnesss and the protected Kindnesss worker token. Do not place secrets in source or chat.
4. Deploy the Liftor receiver through a separately approved step, keep `KINDNESSS_PRIVACY_RECEIVER_ENABLED` unset/false until configuration and signed testing are ready, and only then enable the dedicated Kindnesss privacy worker.
5. Send a synthetic signed request in hosted QA and prove 202 durable storage, same-event 200 dedupe, independent new/overdue linkage, founder-only visibility, operator triage compare-and-set, retry behavior and absence of PII before any live notification.
6. Confirm authorised Kindnesss-admin procedures for identity verification, requester approval/rejection and canonical closure. Liftor must remain tracking-only and must not infer closure from delivery or operator acknowledgement.
7. Keep commercial enquiry ingestion, CRM promotion, external responses, campaigns, mail sends, GHAT and KND-004 work separate and unchanged.

## 6. Final safety statement

This is deployable but inactive source plus offline evidence. It does **not** establish hosted schema compatibility, deployed receiver availability, live Kindnesss delivery, active privacy monitoring, case resolution, or operational readiness. No live/QA database was changed, no app/function was deliberately deployed or published, no secret was provisioned, no cron/provider setting was changed, and no email or external request was sent.
