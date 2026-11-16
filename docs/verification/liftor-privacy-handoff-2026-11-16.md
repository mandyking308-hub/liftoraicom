# KND-003 Liftor Privacy Metadata Handoff — Evidence

**Date:** 16 November 2026
**Liftor base source:** `45e2c093663d5794283a44f1ae89cb33c861d839`
**Kindnesss source snapshot:** `cc3fca932f07060bae77603c16c9c233cc1ca4a6`
**Scope:** separate source-only privacy receiver, review-only SQL, reference-only founder UI, and isolated tests
**Production/hosted-QA writes, deployments, publishing, external sends, DNS/provider/campaign changes:** none

## 1. Required status matrix

| State | Result | Evidence |
|---|---|---|
| **BUILT** | YES — source only | Real default-off `kindnesss-privacy-receiver` Edge entrypoint; raw-byte dedicated-secret HMAC authentication; exact ten-field validation; atomic RPC store; founder-only delivery/link candidate; existing privacy-case creation with NULL contact/summary; Communications Centre references and unavailable diagnostics. |
| **SOURCE TESTED** | YES | **1,102 tests passed, 17 skipped** across 94 passed and 2 opt-in skipped files. Focused receiver/UI tests: **17/17 passed**. Deno check, full TypeScript check, touched-file ESLint, diff check, and automatic build passed. |
| **HOSTED QA** | **NOT RUN** | No hosted-QA migration, function deployment, secret, receiver flag, worker configuration or signed request was used. Only a fresh local disposable PostgreSQL 17.11 database was tested: **8/8 scenarios passed**. |
| **LIVE VERIFIED** | **NO** | The candidate is not applied, the receiver is not deployed/enabled, Kindnesss has not delivered a live privacy event, and no active privacy monitoring is claimed. |

## 2. Exact Kindnesss sender compatibility

The verbatim sender fixture is:

- `src/lib/__tests__/fixtures/kindnesss/liftor-privacy-outbound.server.ts`
- Source: Kindnesss `src/lib/liftor-privacy-outbound.server.ts` at `cc3fca932f07060bae77603c16c9c233cc1ca4a6`.
- SHA-256 (both copies): `24719b0e32a52d3d9409172ec19670b0eeb139391fc82ad54fc0002a69778902`.
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

### Review-only schema

`docs/candidates/kindnesss-privacy-handoff-2026-11-16.sql` is deliberately outside `supabase/migrations` and was not applied to live or hosted QA.

- `kindnesss_privacy_notification_deliveries`: one immutable row per independent event ID, unique on `(source,business_id,event_id)`; only opaque request/event references and approved metadata.
- `kindnesss_privacy_request_links`: unique `(source,business_id,request_ref)` mapping to one existing `data_privacy_requests` case; multiple `new_request`/`overdue` deliveries retain separate event IDs but share the case.
- Atomic `receive_kindnesss_privacy_notification` RPC: validates the active business again, serializes same-business receipt creation, finds/creates the case and link, then inserts the immutable delivery in one transaction.
- New case fields remain `contact_id=NULL`, `request_summary=NULL`, `request_status='received'`, `completed_at=NULL`, with founder and legal review required. Delivery does not resolve or complete the case.
- Founder/admin-only RLS and SELECT policy on both new tables. Anonymous and commercial-team roles receive no access policy; authenticated roles cannot insert directly. RPC execution is revoked from public/anon/authenticated and granted only to service_role.
- Append-only triggers reject delivery/link updates and deletes. The founder workstream case remains separately reviewable; no contact or business-contact-relationship creation exists.

### Communications Centre privacy lane

- `src/lib/unifiedInbox.ts` reads only delivery references and approved metadata from the candidate table, plus the existing privacy cases. Privacy rows remain `source='privacy'`, not Sales or commercial handoff.
- The `Kindnesss privacy metadata` diagnostic reports **Unverified** when the candidate is unavailable and **Not configured** when no deliveries exist. It explicitly says zero deliveries is not proof that no requests exist. Retry/failed/dead-letter values remain `Unverified`, because the Kindnesss outbox owns those states.
- Business-scoped commercial teams cannot see privacy rows in the view model even when assigned the same business; founder/admin visibility remains.
- `src/pages/founder/communications/Inbox.tsx` retains reference-only drill-down with no commercial reply editor or send action for privacy rows.

## 4. Verification results

All checks ran on 16 November 2026 UTC.

| Check | Exact result |
|---|---|
| Focused `kindnesssPrivacyReceiver`, `unifiedInbox`, and Communications `Inbox` tests | **PASS — 17/17** at 15:40:41. |
| Fresh disposable PostgreSQL candidate suite | **PASS — 8/8** at 15:41:05, PostgreSQL 17.11. Actual candidate SQL, RPC, constraints, triggers and RLS executed. |
| Complete `bunx vitest run` | **PASS — 94 files passed, 2 skipped; 1,102 tests passed, 17 skipped** at 15:41:21. Skips are the opt-in disposable PostgreSQL files in the normal no-database run. |
| `deno check supabase/functions/kindnesss-privacy-receiver/index.ts` | **PASS**, including transitive shared modules; rerun after final fixes. |
| `oj typecheck -b --noEmit` | **PASS**. |
| Touched implementation/test ESLint | **PASS**, no errors. |
| Automatic build/typecheck harness | **PASS — `build OK` at 15:40:59**. Earlier transient TypeScript narrowing/test-header errors were corrected and rechecked. |
| `git diff --check` | **PASS**. |
| Dependency manifests | **UNCHANGED**; tests use the existing `postgres` client. |

### Disposable PostgreSQL scenarios

1. Actual Kindnesss ten-key sender bytes and correct HMAC → real Liftor receiver → durable delivery and NULL-contact/NULL-summary founder case.
2. Twelve concurrent identical deliveries → one 202, eleven 200 responses, one delivery and one case.
3. Wrong secret, stale timestamp, body tamper, wrong source, wrong business and added requester/child fields rejected with zero writes.
4. Database outage → 503 and zero rows; same-event retry → 202; later duplicate → 200 without another row.
5. Concurrent `new_request` and `overdue` event IDs for one request reference → two deliveries linked to one still-`received`, unresolved case.
6. Other-business and inactive-Kindnesss attempts rejected without cross-tenant writes.
7. Founder/admin reads allowed; commercial team sees zero through RLS; anonymous reads and authenticated direct writes denied.
8. Delivery/link update and delete attempts rejected; the privacy case remains unresolved.

No test sent email, called a provider, contacted Kindnesss hosting, wrote to live/hosted QA, or used real customer information.

## 5. Activation prerequisites — all still pending

1. Owner review and apply the Kindnesss **20261116b, 20261116c, 20261116d and 20261116e** pending migrations in their required order after their isolated migration/RLS checks.
2. Independently review and apply `docs/candidates/kindnesss-privacy-handoff-2026-11-16.sql` in isolated hosted QA, then production only through a separately approved migration step.
3. Provision a dedicated privacy signing secret securely on both Kindnesss and Liftor; it must differ from the commercial secret. Configure the exact Liftor receiver URL on Kindnesss and the protected Kindnesss worker token. Do not place secrets in source or chat.
4. Deploy the Liftor receiver through a separately approved step, keep `KINDNESSS_PRIVACY_RECEIVER_ENABLED` unset/false until configuration and signed testing are ready, and only then enable the dedicated Kindnesss privacy worker.
5. Send a synthetic signed request and prove 202 durable storage, same-event 200 dedupe, independent new/overdue linkage, founder-only visibility, retry behavior and absence of PII before any live notification.
6. Keep commercial enquiry ingestion, CRM promotion, external responses, campaigns, mail sends and KND-004 work separate and unchanged.

## 6. Final safety statement

This is deployable but inactive source plus offline evidence. It does **not** establish hosted schema compatibility, deployed receiver availability, live Kindnesss delivery, active privacy monitoring, case resolution, or operational readiness. No live/QA database was changed, no app/function was deliberately deployed or published, no secret was provisioned, and no email or external request was sent.
