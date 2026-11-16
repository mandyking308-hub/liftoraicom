# Liftor Unified Inbound — Durable Integration Evidence

**Date:** 16 November 2026  
**Base source:** `4d8dfd8a857101a39025c2a46424076ef0047926`  
**Scope:** real default-off receivers, review-only schema candidate, and disposable offline integration tests  
**Production/QA writes:** none  
**Deployment, publishing, cron, provider configuration, email, campaign, mailbox, DNS, or customer-data changes:** none

## 1. Status matrix

| State | Result | Evidence |
|---|---|---|
| **BUILT** | YES — source only | Real Kindnesss Edge receiver; Smartlead integration into its existing receiver; explicit legacy/Standard Webhooks verification; RPC-backed durable store; deterministic routing; corrected candidate SQL; actual sender-to-receiver and PostgreSQL tests. |
| **SOURCE TESTED** | YES | 93 test files passed, 1 database file skipped without its opt-in URL; **1,095 tests passed, 9 skipped**. Strict Deno checks passed. Touched-file ESLint passed. Automatic harness reported **build OK**. |
| **QA TESTED** | YES — disposable local PostgreSQL only | Fresh PostgreSQL 17.11 instance, minimal actual-schema fixture, candidate SQL, real RLS roles and RPCs: **9/9 tests passed**. Hosted QA was not touched and is **NOT RUN**. |
| **LIVE VERIFIED** | NO | No migration was applied, no function was deployed, no receiver flag was enabled, and no provider/site signed delivery was sent. Provider delivery and production behavior remain unverified. |

The previous Phase 1 UI at `/founder/communications/inbox` remains intact. This change adds the missing deployable adapters and executable verification; it does not activate them.

## 2. Actual production compatibility checks

Read-only schema inspection confirmed the candidate and adapters use existing fields and types:

- `outbound_provider_connections.settings` is `jsonb`; explicit `settings.webhook_protocol` can be configured later without a column change. Connection-owned `webhook_secret_ref`, `is_enabled`, `mutations_enabled`, and `inbound_receiver_enabled` remain enforced.
- `gsm_mailboxes` provides `id`, `email`, `provider_mailbox_id`, `smartlead_email_account_id`, `estate_classification`, `active`, `retired`, readiness, and provider-health fields.
- `gsm_mailbox_allocations` provides `mailbox_id`, `business_id`, `allocation_status`, and `thread_sticky`; provider mailbox identity is obtained by joining the mailbox row, not guessed from the allocation.
- Campaign mappings provide `provider_connection_id`, `provider_campaign_id`, `business_id`, `provider_type`, `mapping_status`, and `is_active`.
- Existing `founder_approval_items` and `communication_records` support founder-reviewed drafts with execution, automatic execution, and send permissions defaulting to false.

No production row was inserted, updated, or deleted. The production counts supplied in the request remain the operating baseline; this task did not re-present them as newly observed provider telemetry.

## 3. Implemented integration

### 3.1 Kindnesss signed first-party receiver

New files:

- `supabase/functions/kindnesss-enquiry-receiver/index.ts` — actual Edge entrypoint, disabled unless both `KINDNESSS_ENQUIRY_HANDOFF_ENABLED=true` and `UNIFIED_INBOUND_FANIN_ENABLED=true`.
- `supabase/functions/_shared/kindnesssUnifiedReceiver.ts` — reuses `authenticateAndValidate`, the existing 15-key `commercial_enquiry.submitted` validator, timestamp freshness, HMAC, and business UUID equality; creates a durable fan-in request with a UUID-only content reference.
- `supabase/functions/_shared/unifiedInboundStore.ts` — production RPC adapter for atomic claim and finalisation.

The receiver does not accept a business slug, infer a company from content, persist the enquiry body, create a CRM contact, send email, or call an external provider. Privacy/safeguarding content has no route into this commercial event protocol.

### 3.2 Actual Kindnesss sender contract fixture

`src/lib/__tests__/fixtures/kindnesss/liftor-outbound.server.ts` is a verbatim test fixture copied from the approved Kindnesss source snapshot at commit `76958eeb`.

- SHA-256: `1d55f40d7a0b5929ef23c7b128efddd50ad1798987273177ab65d83d1e55e8f3`
- It constructs the flat 15-key event, signs the exact `timestamp.rawBody` bytes, and emits `X-Liftor-Source`, `X-Liftor-Timestamp`, and `X-Liftor-Signature: sha256=<hex>`.
- The disposable integration test calls this real sender implementation and feeds its returned request body and headers into the real Liftor receiver. It also asserts the exact 15-key set and non-empty signature bytes.

This proves source-contract interoperability offline. It does not prove that the Kindnesss hosted worker is deployed, enabled, or has delivered an event.

### 3.3 Smartlead existing receiver integration

Changed files:

- `supabase/functions/_shared/smartleadWebhookAuth.ts`
- `supabase/functions/_shared/unifiedInboundSmartleadAdapter.ts`
- `supabase/functions/smartlead-webhook/index.ts`

Behavior:

1. The existing environment gate, enabled connection, inbound receiver gate, and connection-owned secret reference are checked before authentication.
2. `settings.webhook_protocol` must be exactly `legacy_hex` or `standard_webhooks`; missing or unknown values fail closed. There is no protocol inference, downgrade, or unsigned fallback.
3. Legacy mode retains `X-Smartlead-Signature: sha256=<hex>` raw-body HMAC verification. Standard mode uses `webhook-id`, `webhook-timestamp`, and `webhook-signature`, a `whsec_` base64 key, and `v1` signatures over `webhook-id.timestamp.rawBody`.
4. Standard mode enforces a five-minute timestamp window and uses `webhook-id` as the provider event/replay identity. Legacy retains its documented `X-Request-Id` identity; no undocumented timestamp freshness rule was invented for legacy mode.
5. Authentication completes before JSON parsing or CRM side effects.
6. When `UNIFIED_INBOUND_FANIN_ENABLED=true`, durable fan-in succeeds before the existing normalizer and CRM mutation. A unified store outage returns retryable 503 before CRM mutation.
7. Duplicate provider events retry unfinished fan-in without replaying CRM side effects. Recovery preserves whether the original normalized event was received or ignored.
8. Existing campaign, contact, suppression, and operational-mutation behavior remains in the existing receiver. No provider stop, sequence restart, or send is added.

The routing adapter maps only explicit sending-account fields to the original sender mailbox. It never treats the recipient contact as the sender and never extracts sender identity from message text.

## 4. Candidate SQL corrections and executable verification

`docs/candidates/unified-inbound-phase1-2026-11-16.sql` remains **review-only and unapplied**. It is not in `supabase/migrations`.

Corrections in this step:

- Idempotency is scoped by `(source, authenticated_business_id, idempotency_key)`, preventing equal provider IDs in different businesses from colliding.
- Atomic claim reclaims both expired processing leases and due retry rows; attempts remain capped at 1–6 and leases at 5–300 seconds.
- Duplicate claim returns the durable status. A `retry` duplicate remains HTTP 503 rather than being acknowledged as complete.
- Verified original sender may be filled once from NULL by the exact leased finaliser. Once set, replacement or erasure is rejected; cross-business assignment is rejected.
- Founder/admin can mark quarantine read; scoped business access remains enforced.
- Reply draft sender validation joins the allocation to the actual GSM mailbox and matches the provider mailbox ID as well as the authenticated business and exact sender address.
- RLS and definer functions preserve founder/admin portfolio visibility and business-scoped team isolation. No anonymous grants exist.

The disposable fixture `src/lib/__tests__/fixtures/unifiedInboundMinimalSchema.sql` reproduces the referenced current columns, role enum, grants, RLS helper, mailboxes, allocations, campaign mappings, approval table, and communications table. The candidate itself is executed against that fresh database, not replaced by a mock SQL engine.

## 5. Routing and safety behavior

Routing priority remains:

1. active, thread-sticky, business-scoped GSM mailbox allocation;
2. active business-scoped campaign mapping;
3. verified alias;
4. authenticated signed first-party site event.

Additional invariants:

- GHAT allocations are rejected for commercial fan-in even if an active allocation exists.
- Same-contact events in two businesses remain separate.
- Unknown or ambiguous mappings become founder-only quarantine, never another business.
- Receipts persist before processing; finalisation requires the exact lease token.
- Retry/dead-letter state is durable and duplicate delivery does not erase it.
- Draft creation requires a reviewed sender and approval item. `execution_enabled`, `auto_execute_allowed`, and `send_allowed` remain false; `sent_at` remains NULL.
- Authentic reply/opt-out blocks pending follow-ups internally. No Smartlead stop is claimed without exact provider read-back; no provider call was added.

## 6. Verification results

All times UTC on 16 November 2026.

| Check | Result |
|---|---|
| `bunx vitest run` | **PASS** — 93 files passed, 1 skipped; **1,095 passed, 9 skipped** at 15:23:58. The skipped file is the opt-in disposable PostgreSQL suite. |
| Fresh disposable PostgreSQL suite | **PASS** — **9/9** at 15:24:35, PostgreSQL 17.11, fresh data directory and candidate execution. |
| `deno check supabase/functions/kindnesss-enquiry-receiver/index.ts supabase/functions/smartlead-webhook/index.ts` | **PASS** — both real entrypoints and transitive shared modules. |
| Touched implementation/test ESLint | **PASS** — no errors. |
| Automatic build/typecheck harness | **PASS** — `build OK` at 15:23:12, 15:23:28, and 15:24:43. An earlier transient nested-Vite dependency error was removed by restoring the unchanged lockfile and clean generated dependencies; no Vite config or dependency manifest change remains. |
| `git diff --check` | **PASS**. |
| `package.json` / `bun.lock` changes | **NONE** — tests use the project's existing `postgres` client. |

### Disposable PostgreSQL scenarios executed

1. Actual Kindnesss sender bytes and headers → real receiver → SQL; exact 15-key event; successful durable receipt and routing.
2. Duplicate delivery idempotency, replay rejection, tampered body rejection, stale timestamp rejection, and wrong-tenant signature rejection.
3. Durable outage retry, capped retry state, and successful recovery without losing the receipt.
4. Same canonical contact in two businesses with the same idempotency key, with separate authenticated tenant receipts.
5. **200 synthetic GSM mailbox routes** through real allocation/mailbox SQL, preserving each exact original sender.
6. GHAT commercial-route rejection and wrong-original-sender quarantine.
7. Claim with NULL sender → one verified sender finalisation → later replacement/erasure and cross-business assignment rejected.
8. Real RLS: founder visibility, scoped team visibility, no anonymous/nil-permission access, and no cross-company visibility.
9. Approval-only reply draft with all execution/send permissions false and no sent timestamp.

No test sent external mail or called Smartlead, Winnr, Apollo, Kindnesss hosting, or any customer system.

## 7. Remaining activation prerequisites — not completed

1. Independently review and apply the candidate SQL in an isolated hosted QA migration test; production schema remains unchanged.
2. Deploy the two receivers only through a separately approved deployment step. Their environment flags remain unset/false.
3. Provision the real Kindnesss shared secret through protected secret settings on both sides; configure the actual Kindnesss worker destination and enable it only after a signed test delivery.
4. Set each Smartlead connection's explicit `webhook_protocol` to match its actual provider configuration and provision the corresponding connection-owned secret. Verify the exact secret version; never try both protocols as a fallback.
5. Use Smartlead's signed test-delivery mechanism and verify raw signature, timestamp, replay rejection, durable receipt, routing, and retry before enabling live inbound.
6. Separately validate and allocate one GSM commercial Smartlead sender with fresh provider health, warm-up, campaign readiness, and business scope. No allocation was created here.
7. Run the one-business Kindnesss pilot with synthetic or founder-approved test data first; confirm quarantine, reply drafts, approval, suppression, and provider read-back before any external response.
8. Keep GHAT, campaign sending, lead enrolment, cron, auto-reply, auto-stop, and external-action gates off unless separately approved and evidenced.

## 8. Final safety statement

This commit contains deployable but inactive source and offline evidence only. It does **not** establish provider delivery, sender readiness, campaign readiness, production schema compatibility, hosted QA acceptance, or live routing. No production or hosted QA database was changed, no secret was provisioned, no function was deployed, no app was published, no provider or mailbox setting was changed, and no email was sent.
