# Liftor Unified Inbound Portfolio Communications — Phase 1 evidence

- **Date:** 16 November 2026
- **Starting revision:** `931709d3310f550f0e7017cd4db588e6f5a7a787`
- **Scope:** source and isolated tests only
- **Runtime status:** existing live/QA data and provider configuration unchanged; no deployment or publication performed
- **Architecture authority:** `docs/architecture/unified-inbound-portfolio-2026-10-13.md` and `AGENTS.md` were read before implementation

## 1. Safety boundary and baseline

The owner-supplied 16 November baseline is a 200-mailbox Winnr estate comprising 180 GSM commercial and 20 GHAT charitable mailboxes, zero GSM mailbox allocations, 17 legacy `inbound_messages`, zero `multi_channel_inbound_events`, zero `outbound_provider_events`, and zero inbound-enabled Smartlead connections. Those counts were **not independently refreshed** in this task because the instruction prohibited live/QA database changes and limited work to source and isolated tests. The new UI reads actual counts when opened; it does not embed this baseline as company or mailbox truth.

No SQL was executed against live or QA. No rows were inserted, updated or deleted. No company list, customer data, mailbox, DNS, campaign, cron, provider, signing secret, external-action gate or send setting was changed. No edge function was deployed and no application was published.

## 2. Exact source edits

### Founder read-only inbox

- `src/pages/founder/communications/Inbox.tsx` — new founder/admin Unified Inbox with:
  - actual business-registry filter, source filter and all/unassigned/needs-review/failed/quarantine views;
  - channel/source, original mailbox identity where recorded, thread/reference, status, reply/opt-out flags and age;
  - visible-record, actual new-in-24-hours, needs-review, failed and quarantine counts;
  - explicit **Unread: Not tracked**, because existing sources have no common read state;
  - per-source not-configured/unverified/sync-missing diagnostics and failed/retry/dead-letter fields;
  - actual GSM/GHAT/allocation counts when readable, with GHAT explicitly excluded;
  - founder-only quarantine inspection without unscoped content drill-down;
  - registry-verified business drill-down with references rather than raw message bodies;
  - privacy cases represented by request reference/type/status only;
  - local-only reply review, escalation categories, original-sender check and a disabled persistence button;
  - existing `communication_records` draft/approval-required records shown read-only.
- `src/lib/unifiedInbox.ts` — new read-only adapter and view model over existing `businesses`, `communication_records`, `communication_threads`, `communication_thread_messages`, `communication_safety_flags`, `inbound_messages`, `inboxes`, `outbound_provider_events`, `outbound_provider_connections`, `outbound_provider_mailbox_mappings`, `multi_channel_inbound_events`, `communication_channels`, `data_privacy_requests`, `gsm_mailboxes` and `gsm_mailbox_allocations`. It also attempts to read the existing candidate `inbound_handoff_events`; a missing table is reported as unverified/sync missing, never as a healthy zero.
  - No raw `body_text`, `body_html`, `message_text`, `raw_payload`, sender name or privacy request summary is selected.
  - No analytics event or sender/child-data logging was added.
  - Founder/admin visibility and future business-scoped team visibility are pure, tested decisions.
- `src/pages/founder/communications/_shared.tsx` — added **Unified Inbox** to the existing communications navigation; retained Overview, Ledger, By contact, By business, Drafts, Received and Settings. Replaced the broad “Live logging” badge with “Existing records.”
- `src/App.tsx` — added `/founder/communications/inbox` behind the existing `FounderRoute`; no public or customer route was added.

### Disabled durable fan-in candidate

- `supabase/functions/_shared/unifiedInboundFanIn.ts` — new pure processing core; **no edge-function entrypoint imports it**. It provides:
  - exact `true` feature-flag check before any store call;
  - authenticated-input requirement before any store call;
  - source/site/provider event idempotency keys;
  - durable-first atomic claim port, lease token, bounded exponential retry and dead letter;
  - deterministic routing priority: allocated mailbox → verified campaign → verified alias → signed first-party form;
  - fail-closed ambiguous, missing, mismatched and GHAT routes into founder quarantine;
  - business-scoped thread keys, original sender preservation and monotonic out-of-order thread projection;
  - no AI/body/name/contact-based business inference and no provider/network/send call.
- `supabase/functions/_shared/unifiedInboundSafety.ts` — new pure safety contract:
  - reuses `deriveContactMutation` from `smartleadEventNormalizer.ts` for authentic reply, unsubscribe and bounce decisions;
  - blocks internal pending follow-ups immediately in the decision model;
  - requires same-business/campaign/lead/contact, read-back-verified, zero-pending-follow-up acknowledgement before provider stop can be claimed;
  - selects only the original sticky, allocated, active, fresh, healthy, campaign-ready GSM mailbox; no fallback sender and no GHAT;
  - requires human approval or a separately approved prior policy plus existing send gates before an external response decision can be allowed;
  - forces unknown, complaint, privacy and safeguarding cases to human escalation.
- `supabase/functions/_shared/unifiedPrivacyTransfer.ts` — independent metadata-only privacy contract for the existing `data_privacy_requests` model. Only source, business ID, request ID, request type and submitted time are accepted. It emits `contact_id=null` and `request_summary=null`; unexpected identity/detail fields are rejected.

### Review-only SQL candidate

- `docs/candidates/unified-inbound-phase1-2026-11-16.sql` — new **unapplied** candidate, deliberately outside `supabase/migrations`:
  - `unified_inbound_receipts`: immutable source evidence, scoped route/thread/sender, read/reply/opt-out/internal-block state, leased attempts, retry and dead letter;
  - `unified_inbound_team_members`: explicit business/user assignments, with no `auth.users` foreign key;
  - `unified_inbound_provider_acks`: exact provider read-back evidence; verified acknowledgement requires zero pending follow-ups;
  - explicit authenticated/service-role grants for every new public table, RLS enabled, no anonymous grant;
  - founder/admin cross-business read and business-scoped team read; nullable quarantine business is founder/admin-only;
  - atomic insert-or-reclaim RPC with unique source/idempotency key and stale-lease protection;
  - immutable receipt-evidence trigger;
  - read-state RPC with business access check;
  - review-draft RPC reusing `founder_approval_items` and `communication_records`, with `execution_enabled=false`, `auto_execute_allowed=false` and `send_allowed=false`;
  - draft RPC requires verified receipt scope and the original fresh/healthy/campaign-ready sticky GSM allocation, and rejects privacy/safeguarding content;
  - no provider HTTP call, queue insertion, campaign mutation, cron or send function.

### Tests and project records

- `src/lib/__tests__/unifiedInboundFanIn.test.ts` — 18 isolated contracts.
- `src/lib/__tests__/unifiedInbox.test.ts` — 6 view/isolation contracts.
- `src/lib/__tests__/unifiedInboundCandidateSchema.test.ts` — 6 static candidate/boundary contracts.
- `src/pages/founder/communications/__tests__/Inbox.test.tsx` — 4 founder UI contracts with mocked data.
- `roadmap.md` — Phase 1 task tracking.
- `AGENTS.md` — records that Phase 1 is read-only and durable fan-in remains disabled pending separate review.

## 3. Current state versus new source state

| Area | Existing state preserved | New source-only state |
|---|---|---|
| Founder communications | Existing ledger, received, drafts and settings | Added a unified cross-business read-only inbox under the same guarded navigation |
| Legacy IMAP | Existing `inbound_messages` and inbox polling remain in place | Legacy rows and polling health are visible, not hidden or migrated |
| Multi-channel | Existing tables and manual/legacy paths remain | Existing events and channel configuration are included with truthful health |
| Smartlead | Signed, default-off receiver and scoped normalizer unchanged | Existing provider events are displayed; future fan-in core remains unconnected |
| Kindnesss handoff | Existing signed commercial-enquiry helper/receiver candidate unchanged | Existing receipts are shown if readable; missing schema is unverified, not zero/healthy |
| Business registry | No company records changed | Filters and drill-down use actual returned business IDs/names |
| GSM/GHAT | No mailbox/allocation/provider changes | Actual counts shown; GHAT excluded from commercial route and reply sender |
| Drafts | Existing communications and founder approval models unchanged | Existing drafts shown; new local preview cannot save; candidate RPC remains pending |
| Privacy | Existing protected `data_privacy_requests` unchanged | Reference-only display and independent metadata-only contract |
| Runtime activation | Existing flags/gates unchanged | No new endpoint, environment setting, cron, deployment or publication |

## 4. Existing stop-on-reply finding

`supabase/functions/_shared/smartleadEventNormalizer.ts` already records:

- `reply_received`: `last_replied_at`, `opens_conversation=true`, transition `reply_opens_conversation_and_stops_automation`;
- `lead_unsubscribed`: canonical unsubscribe/global suppression/do-not-contact fields;
- non-soft `email_bounced`: canonical hard-bounce/global suppression/do-not-contact fields.

`supabase/functions/smartlead-webhook/index.ts` applies those mutations to the canonical contact and business-contact relationship only after signed connection verification and exact scoped attribution. For a reply it moves the relationship to engaged and sets `campaign_eligible=false`; for unsubscribe/hard bounce it applies do-not-contact and campaign ineligibility. It does **not** call Smartlead to stop a sequence and does **not** read back remote pending steps. Therefore Liftor must not claim that Smartlead follow-ups were stopped remotely. The new safety contract reuses the existing mutation decision and adds the internal pending-follow-up block plus exact future acknowledgement requirement; it does not modify the live receiver or initiate a provider stop.

## 5. Verification results

### Focused isolated tests

Command:

```text
bunx vitest run src/lib/__tests__/unifiedInboundFanIn.test.ts src/lib/__tests__/unifiedInbox.test.ts src/lib/__tests__/unifiedInboundCandidateSchema.test.ts src/pages/founder/communications/__tests__/Inbox.test.tsx
```

**PASS — 4 files, 34 tests**, 16 November 2026 14:51 UTC.

Coverage includes:

- 200 distinct GSM mailboxes fan into one logical view with correct business, original sender and thread;
- one canonical contact replying to two businesses remains in separate business threads;
- 100-business deterministic isolation;
- routing priority and high-priority mismatch quarantine;
- signed first-party Kindnesss commercial form idempotency;
- GHAT exclusion;
- concurrent duplicate delivery producing one receipt;
- spoofed/unauthenticated input rejected with no writes;
- disabled flag producing no writes;
- unknown mapping assigned to founder quarantine, never another business;
- transient routing/provider outage recovery on the same durable receipt;
- leased retries and eventual dead letter;
- out-of-order reply/opt-out projection converging without reopening follow-ups;
- internal stop-on-reply blocker with provider stop unverified by default;
- wrong-tenant provider acknowledgement rejected and exact read-back accepted;
- original-sender selection, stale/unallocated/GHAT sender rejection;
- no external response without approval, scope, sender and existing gates;
- metadata-only privacy transfer and identity/detail rejection;
- actual new-24-hour counting and absent common unread state;
- scoped team visibility and founder-only quarantine;
- registry-verified drill-down and local-only UI review with no send path.

### Complete existing suite

Command: `bunx vitest run`

**PASS — 92 test files, 1,088 tests**, final run 16 November 2026 14:51 UTC. This includes the existing Smartlead normalizer, receiver boundary, tenant isolation, Kindnesss handoff and email-history tests. React Router future-flag warnings were emitted; they are non-failing existing warnings.

### Automatic typecheck/build

The preview harness’s automatic check initially identified two TypeScript issues; both were corrected. Latest observed entry:

```text
=== build 2026-11-16T14:51:37Z ===
build OK
```

No manual deployment or publication followed.

### Touched-file lint

Command: `bunx eslint` on the changed TypeScript/TSX files and `src/App.tsx`.

**PASS with 0 errors.** One existing `react-refresh/only-export-components` warning remains in `communications/_shared.tsx`, which already exports navigation and helper components. `git diff --check` passed.

### Not run / not proved

- Candidate SQL was **not executed or validated against a PostgreSQL database**; only static contracts ran.
- Real PostgREST/RLS behavior, migration compatibility and concurrent database performance are **unverified**.
- No authenticated browser check against live data was performed, consistent with the source/isolated-test-only scope.
- No real signed Smartlead or Kindnesss event, provider outage, remote stop, mailbox reply or external response was exercised.
- No real 200-mailbox or 100-business database load test was run; those fan-in/isolation cases are synthetic in-memory contracts.

## 6. Feature gates and pending activation

| Control | State after this source patch |
|---|---|
| `SMARTLEAD_WEBHOOK_RECEIVER_ENABLED` | Unchanged; existing receiver remains default-off and signed-only |
| Smartlead connection `inbound_receiver_enabled` | Unchanged; no connection enabled |
| Smartlead webhook signing secret | Not provisioned or verified by this task; unsigned input remains rejected |
| `KINDNESSS_HANDOFF_RECEIVER_ENABLED` | Unchanged; no new entrypoint added |
| `KINDNESSS_HANDOFF_SIGNING_SECRET` | Not created or read |
| `UNIFIED_INBOUND_FANIN_ENABLED` | Referenced only by the pure candidate; no environment/config value set; anything other than exact `true` performs no writes |
| Durable unified schema | Pending in `docs/candidates`; not applied |
| Unified fan-in adapter/endpoint | Not implemented/deployed; pure core has no entrypoint |
| Reply draft persistence | Disabled in UI; candidate RPC not applied |
| External replies / auto-send | Not implemented or activated; existing approval and send gates unchanged |
| Cron / background retries | None registered |
| Publishing / deployment | None |

## 7. Step-by-step future Kindnesss/GSM integration rehearsal

This is a **plan only**, not executed. Each stage must stop on failure. Live external actions require separate explicit approval.

1. **Isolated QA first:** review and apply the candidate only to a disposable/isolated QA schema. Run migration checks, concurrent claim tests, immutable-evidence tests and founder/admin/team/anon RLS tests. Do not start with production.
2. **Read actual registry scope:** at rehearsal time read the active Kindnesss business ID from `businesses`; do not infer it from a name or copy it from documentation. Verify the selected business is the intended active record and preserve archived records.
3. **Select exactly one real GSM mailbox:** read `gsm_mailboxes`, `gsm_mailbox_allocations` and the provider mailbox mapping. Require GSM estate, active/not retired, exact Kindnesss allocation, sticky thread, healthy provider state, campaign-ready status and a fresh provider check under 24 hours. Exclude all GHAT rows. If no mailbox qualifies, stop.
4. **Verify campaign/connection scope:** require the exact business-owned Smartlead connection, verified campaign mapping, canonical campaign ownership and DRAFTED/PAUSED remote state. Do not add leads, start a campaign or change sender settings.
5. **Verify authentication independently:** provision the connection-owned signing secret through secure secret settings, never chat/source. Prove invalid, missing, replayed, stale and cross-tenant signatures fail before enabling any receiver in QA.
6. **Install the QA adapter:** connect the existing signed Smartlead receiver to the atomic claim/finalise RPCs behind `UNIFIED_INBOUND_FANIN_ENABLED`. Keep the flag off until the adapter passes synthetic contract tests with the real QA schema.
7. **Synthetic signed receipt:** submit a synthetic reply event with a unique provider event ID and protected content reference. Verify one immutable receipt, actual Kindnesss business, original GSM mailbox and stable thread. Repeat concurrently and confirm one receipt.
8. **Negative routing rehearsal:** test unknown mailbox, ambiguous mapping, wrong business, wrong campaign, missing alias, GHAT and sender mismatch. Every case must be founder-only quarantine with no commercial CRM promotion.
9. **Kindnesss first-party handoff:** separately prove the signed `commercial_enquiries` sender saves locally during Liftor downtime, retries with the same site event ID, and delivers once after recovery. Reject child/guardian/private content before durable commercial ingestion.
10. **Reply/opt-out internal block:** with an authentic synthetic reply and then opt-out, verify `internal_followup_blocked_at`, monotonic reply/opt-out flags and no pending internal follow-up decision. Do not state that Smartlead stopped remotely.
11. **Provider read-back:** only after a separately approved provider-safe stop/read-back adapter exists, require exact business/campaign/lead/contact acknowledgement with `readback_verified=true` and `pending_followups=0`. Store the acknowledgement; any mismatch leaves provider stop unverified.
12. **Controlled real mailbox check:** after explicit approval for an external test, use one controlled test recipient and the one verified GSM mailbox while the campaign remains paused. Send no campaign sequence. Verify the real signed reply event, sender/thread preservation, no GHAT mixing, no cross-business visibility and no unintended send.
13. **Draft approval rehearsal:** create a human-reviewed draft through the candidate RPC. Confirm the existing approval item and communication record have all execution/send switches false. Do not invoke an external send path.
14. **Failure and recovery:** simulate provider timeout, stale lease, duplicate retry and dead letter. Confirm alarms/diagnostics show actual failure and that recovery does not duplicate receipts or thread state.
15. **Limited founder UI acceptance:** verify actual new/unread counts after read-state activation, source last-event times, quarantine, retry/dead-letter diagnostics, privacy reference-only display and business-scoped team isolation.
16. **Production decision:** only after QA evidence, security review and founder approval consider a production migration and a single-source enablement. Keep all other sources and external sending off. Reconcile and monitor before any expansion.

## 8. Incomplete controls / honest remainder

- No live durable fan-in is active; the new core is not connected to the existing Smartlead or Kindnesss runtime receivers.
- The candidate schema and RLS require real database migration and isolation testing before use.
- The existing internal reply/opt-out decision is not yet wired to cancel every pending queue/sequence representation. Future activation must enumerate and block each internal pending-follow-up path transactionally.
- No provider-side stop adapter or verified acknowledgement reader exists; remote Smartlead stopping remains unproved.
- The new UI cannot persist drafts, assign quarantine, mark read or create approval items until the reviewed schema/adapter is enabled. Its compose area is intentionally local-only.
- Unread is not inferred from existing records. Accurate unread counts require the pending `read_at` state and UI activation.
- Legacy rows do not share one complete canonical thread/mailbox metadata model; missing values remain “Not recorded” or quarantined rather than inferred.
- Source “last sync” is based on actual available event/poll timestamps; a row timestamp is not presented as proof of current provider health.
- Signing secret availability, actual signed delivery, provider webhook configuration and one-mailbox end-to-end delivery remain unverified.
- No external response, marketing auto-reply, campaign activation, provider mutation or unattended follow-up stop/start was introduced.

## 9. Targeted QA correction following independent review

- **QA base revision:** `227f6723a092087bad3b19fa5068318b1fc0e15c`
- **Scope:** source, review-only SQL and isolated tests only. No production/QA database statement, deployment, publication, email access/send or provider change occurred.

### 9.1 Sender-evidence trigger/finaliser contradiction

The independent finding was correct. The original `unified_inbound_receipt_immutable` trigger rejected every change to `original_sender_mailbox`, while `finalise_unified_inbound_receipt` used `coalesce(_original_sender_mailbox, r.original_sender_mailbox)`. A durable claim that correctly saved NULL before routing could therefore never be finalised with the verified original sender.

`docs/candidates/unified-inbound-phase1-2026-11-16.sql` now implements a narrow write-once transition:

- NULL may become a verified sender only during `finalise_unified_inbound_receipt`, after the exact receipt ID, source and unexpired lease token have been locked and checked.
- Transaction-local settings connect the trigger exception to that exact finalisation; they disappear at commit or rollback. A direct NULL-to-sender update without this evidence remains rejected.
- The transition requires a processed route, route evidence, a thread key and `business_id = authenticated_business_id`; a different business is rejected rather than assigned.
- Once non-NULL, the sender cannot be replaced or erased. Finalisation preserves the existing value and explicitly rejects a conflicting supplied value.
- Finalisation clears the lease, so replaying the same finaliser fails as a stale lease. The source event, authenticated business and other receipt evidence remain immutable.

`src/lib/__tests__/unifiedInboundCandidateSchema.test.ts` adds the regression contract for claim NULL → verified sender finalise, the single permitted transition, exact lease/source/business binding, stale-lease closure and rejection of later replacement. This is a **static source contract**, not proof of PostgreSQL execution.

**UNVERIFIED:** the candidate was not executed. Actual PL/pgSQL behavior, trigger interaction, transaction-local settings, locking, concurrency, constraints, grants and RLS remain unverified until this candidate and a claim/finalise/replay/replacement regression are run in a disposable isolated PostgreSQL migration test. No live or QA schema was used.

### 9.2 Smartlead Standard Webhooks protocol blocker

The official Smartlead documentation at https://helpcenter.smartlead.ai/en/articles/470-secure-your-smartlead-webhooks-with-signing-hmac was read on 16 November 2026. It specifies Standard Webhooks headers `webhook-id`, `webhook-timestamp` and `webhook-signature`, a `whsec_` base64 key and `v1` signatures. The Standard Webhooks specification was also checked for the signed content and header contract.

The mismatch is confirmed in current source:

- `supabase/functions/_shared/smartleadWebhookAuth.ts` verifies only legacy `X-Smartlead-Signature: sha256=<hex>` using the literal secret and raw-body HMAC.
- `supabase/functions/smartlead-webhook/index.ts` reads only `x-smartlead-signature` and prefers `x-request-id` for retry idempotency.

The active receiver and authentication helper were deliberately **not modified**. `docs/candidates/smartlead-standard-webhooks-compatibility-2026-11-16.md` now provides the separate-review implementation and activation checklist. `src/lib/__tests__/fixtures/smartleadStandardWebhookContract.ts` and `src/lib/__tests__/smartleadStandardWebhookCompatibility.test.ts` provide a deterministic synthetic `v1` fixture; its signature is independently recomputed and the unchanged legacy verifier is required to reject it.

**Activation remains blocked** until a separately reviewed receiver implementation passes isolated negative/rotation/replay/tenant tests and a signed Smartlead **Send Test** delivery is verified against the exact saved receiver URL. No unsigned, legacy-header or alternate-protocol fallback is authorised by this patch.

### 9.3 QA verification results

- Focused command: `bunx vitest run` on the four original Unified Inbox suites, the new Standard Webhooks contract, `worker3ProviderCore` and `worker3SmartleadReceiverBoundary`.
- **PASS — 7 files, 53 tests**, 16 November 2026 15:04 UTC. Existing React Router future-flag warnings were non-failing.
- Complete suite: `bunx vitest run` — **PASS — 93 files, 1,092 tests**, 16 November 2026 15:05 UTC.
- Touched-file ESLint — **PASS, 0 errors/warnings** for the changed test and fixture TypeScript files.
- `git diff --check` — **PASS**.
- Automatic preview build/typecheck — latest observed entry `=== build 2026-11-16T15:06:48Z === build OK`.
- Active receiver diff check for `smartleadWebhookAuth.ts` and `smartlead-webhook/index.ts` — **empty; both unchanged**.
- No real signed delivery, schema execution, provider interaction or runtime deployment was performed.
