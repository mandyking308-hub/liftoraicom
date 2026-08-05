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
