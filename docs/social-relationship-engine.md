# Liftor Social Relationship Engine

Separate networking/conversation arm. Social Autopilot content generation and
Buffer publishing are untouched.

## Foundation (Stage 1)

**Data layer** — one production migration creates 18 `social_relationship_*`
tables (provider connections, accounts, capabilities, searches, profiles,
target lists, targets, action queue, conversations, messages, webhook events,
rate limits, suppressions, audit, policies, pauses, escalations, CRM links).
Every table has RLS enabled with founder/admin-only policies plus explicit
GRANTs; supporting indexes cover business scoping, due-queue scans, batch
lookups, conversation recency, suppression lookups and audit history.

**Idempotency claims** — `social_relationship_action_queue` carries a
`UNIQUE (business_id, idempotency_key)` constraint, and the security-definer
RPC `social_relationship_claim_action(p_action_id)` performs the transition to
`submitted` under a row lock. It returns `claimed`, `duplicate` (a matching
key is already submitted/completed/unknown — the action is cancelled),
`not_claimable` or `not_found`. EXECUTE is granted to `service_role` only, so
concurrent workers can never double-send.

**Shared logic** — `_shared/socialRelationshipLogic.ts` holds provider-neutral
types and pure safety logic (mode normalisation, `validateProviderBaseUrl`
HTTPS + allow-listed host validation, capability maps, pause resolution,
working hours, jitter, rate limits, idempotency key building, opt-out and
intent classification, escalation detection, health scoring).
`_shared/socialRelationshipProvider.ts` is the secure Unipile client (HTTPS and
host validated, secrets read server-side only, safe-off gates when unset).
Unit tests: `src/lib/__tests__/socialRelationshipEngine.test.ts` (32 tests,
fully mocked — no provider calls).

Buffer publishing and the Social Autopilot content pack generator are
untouched by this stage.

## Safety model (safe-off by default)
Policy modes: `test_only` (default) → `draft_actions` → `approval_required` →
`approved_batch_autopilot` → `paused`. Nothing external happens in the first two.

Every external action passes through one gate (`gateAction` → `evaluateAction`):
pause hierarchy (global > business > provider > account), verified provider
connection, declared account capability, real-account declaration, account
status/cooldown, suppression list, connect-then-DM permission, daily/weekly
limits, working hours, target approval, batch approval. Unsupported capabilities
are blocked — never simulated.

Rate limits, jitter delays, per-thread AI reply caps, opt-out auto-suppression
(cancels queued actions), escalation on legal/complaint/regulated/press/investor/
high-value language, and an emergency pause switch are all founder-configurable.

Ambiguous transport failures/timeouts are marked `submission_unknown` and raise
an escalation — never auto-retried. Only a real provider ID counts as a send.

## Provider architecture
`socialRelationshipProvider.ts` defines the neutral adapter. `UnipileAdapter` is
the live implementation (https-only, host allowlisted, secrets read server-side
from `UNIPILE_API_KEY` / `UNIPILE_DSN`). `ManyChatAdapter` declares all
relationship capabilities false — triggers only, manual fallback preserved.

## Secrets
`UNIPILE_API_KEY`, `UNIPILE_DSN`, `SOCIAL_RELATIONSHIP_WEBHOOK_SECRET`,
`SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET` — all in Project Settings → Secrets.
The webhook secret travels in a header, never a URL.

## Functions
`social-relationship-health`, `-provider`, `-discovery`, `-targets`, `-actions`,
`-inbox`, `-webhook` (public, secret-verified), `-maintenance` (cron secret).

## Founder UI
`/founder/social-relationships` — Overview, Provider connections, Discovery,
Target lists, Action queue, Unified inbox, Policies & safety. Linked from
Marketing Hub.

## QA
`npx vitest run` → 26 files, 330 tests passed (32 new engine tests).
Typecheck and production build clean. No real provider calls made in tests.

## Production QA repair pass (status contract, provider, webhook, isolation)

This pass fixed concrete runtime defects found after the first build. All
findings below were reproduced, fixed and covered by tests in
`src/lib/__tests__/socialRelationshipContract.test.ts`.

### 1. Single status vocabulary
The database CHECK constraints are the source of truth and are mirrored in
`socialRelationshipLogic.ts`:

`draft · blocked · pending_approval · ready · submitting · sent · accepted ·
replied · failed · retrying · submission_unknown · dead_letter · cancelled`

- Founder approval sets `ready` with `approved_at`.
- The runner selects `ready`/`retrying` with `approved_at` set and honours
  `not_before` / `scheduled_for`.
- The claim RPC atomically moves `ready|retrying → submitting` under
  `FOR UPDATE`; anything already submitted returns `duplicate`.
- Provider-confirmed success becomes `sent` (or `replied` / `accepted`).
- Retries are `retrying`; unresolved ambiguity is `submission_unknown`;
  `resolve_unknown` writes `sent` or `dead_letter`.
- Targets use `invited` / `in_conversation` (never `actioned`); accounts use
  `rate_limited` / `challenge` / `credentials` (never `restricted`).

A corrective migration rewrites any rows already written with the old values,
replaces the claim RPC, and widens the `conversations`, `suppressions` and
`crm_links` constraints the code legitimately needs.

### 2. Provider payloads
The Unipile client now has one request helper supporting JSON and
`multipart/form-data` (the boundary is left to `fetch`; content-type is only
set for JSON). `POST /api/v1/chats` sends `account_id`, `text` and repeated
`attendees_ids`; `POST /api/v1/chats/{id}/messages` sends `account_id` and
`text`. Every call has an `AbortController` timeout, parses `Retry-After`, and
sanitises errors so the API key and DSN can never leak.

### 3. Webhook security
Primary verification is Unipile HMAC: `Unipile-Signature: t=...,v0=...`,
HMAC-SHA256 over `${t}.${rawBody}`, rejecting anything older than 5 minutes.
The named shared-secret header remains an explicit fallback and is inactive
unless `SOCIAL_RELATIONSHIP_WEBHOOK_SECRET` is configured. Events are
deduplicated on the provider event/message id or a stable body hash, and only a
sanitised payload is stored.

Secrets: `UNIPILE_WEBHOOK_HMAC_SECRET` (preferred),
`SOCIAL_RELATIONSHIP_WEBHOOK_SECRET` (fallback).

### 4. Webhook registration
Registration uses the documented `POST /api/v2/webhooks/endpoints` route. The
callback URL is derived from our own functions host and re-validated: https
only, no query string, allowlisted host suffix.

### 5. Capability honesty
`follow` and `company_search` are declared **false** — there is no implemented
provider method, so those actions block visibly and the founder UI no longer
offers them. Instagram/Messenger are messaging-only (no search, no invite).

### 6. Business isolation
Every account, profile, target, conversation, message, capability and
suppression read/write is scoped by `business_id`. Account sync refuses to
attach an external account already bound to another business; the runner blocks
actions whose account/profile/target do not belong to the same business.

### 7. Safe-off, approval and confirmation
New accounts and policies stay `test_only`. Target approval alone is never
enough — an approved batch (`approved_at`) is also required. Manual dispatch,
live discovery search, real-account declaration, pause release and arming a
live mode all require the exact phrase **`SEND FOR REAL`**. Unattended
maintenance runs only under `approved_batch_autopilot` plus the scheduler
secret. No live search or send happens in `test_only` / `draft_actions` /
`paused`.

### 8. Idempotency and ambiguity
A transport timeout or 5xx after submission stays `submission_unknown` with the
claim retained, an open escalation and **no** automatic retry. Explicit
429/408 retries with backoff and `Retry-After`. `sent` is written only when a
real provider id is returned.

### 9. Limits and time
Daily/weekly windows follow the policy timezone (local calendar day and local
Monday), isolated per business + account + action type. A missing row means
zero usage, never zero allowance.

### 10. Inbound safety and CRM
Opt-out suppresses the profile immediately, cancels every cancellable queued
action for that conversation *and* profile, and marks the target suppressed.
Complaints, legal, safeguarding, regulated, high-value, press/investor and
uncertain messages never auto-reply — they escalate for founder approval. CRM
links are created only on founder action, deduplicated within the business,
with source attribution preserved.

### 11. Frontend honesty
Badges, counters and filters use the final vocabulary. Buttons are disabled
with a visible blocker when the mode or the confirmation phrase does not permit
the action. No placeholder success, no secrets rendered.

### 12. Validation
`bunx vitest run` — 376 tests pass (46 new contract/regression tests), TypeScript
typecheck clean, production build clean, plus a static grep contract check
across all `social_relationship` SQL and TypeScript status literals.
