# Liftor Activation Plan — Sliced Rollout

This is too large to ship safely in one pass. Proposing controlled slices that keep real guardrails intact while removing artificial restrictions. Each slice lands independently and is verifiable in the Command Centre before the next begins.

## Already shipped
- Slice 1: Controlled LIVE activation + 12 readiness checks (with corrected send-cap detection).
- Slice 2: Proof-send edge function (`controlled-proof-send`) — auth bug fixed, structured errors, redeployed.

## Slice 3 — LIVE Execution Unlock (next, recommended)
Make Controlled LIVE actually flip the execution switch.
- Audit `outreach-send-worker`, `outreach-inbound-poll`, `process-email-queue` and any other workers for `system_mode === 'live'` gates.
- Remove "TEST mode" early-exits, but keep all compliance/throttle/cap RPCs (`check_outreach_allowed`, `check_send_throttle`, suppression/reply-stop/duplicate triggers).
- Ensure inbound polling, AI draft creation, and follow-up scheduling are not extra-gated by anything beyond `system_mode`.
- Add a single "Execution status" panel on the Command Centre showing: mode, worker last-run, inbound last-run, AI drafts queue depth, follow-ups scheduled.

Acceptance: in LIVE, scheduled cron worker drains eligible queue rows respecting only real guardrails. In TEST, sends are still blocked.

## Slice 4 — Capacity Model (replaces hardcoded caps)
- Build a `get_business_capacity(business_id)` SQL function returning per-inbox + summed business hourly/daily capacity, current usage, provider-block state, warmup state, reputation state.
- Rip out any hardcoded "10/day" or "1-send" constants in the worker / UI that are not read from `inboxes.hourly_send_limit` / `daily_send_limit` / warmup / `provider_blocked_until`.
- Capacity card on Command Centre: live numbers + bottleneck message ("Capacity bottleneck: only one active inbox is available").
- Worker stops on real provider cap; rotates to other live-ready inboxes if available.

Acceptance: raising/lowering `daily_send_limit` on an inbox immediately changes effective capacity; nothing else artificially caps it.

## Slice 5 — Proof-only Restriction Removal
- After Slice 3 is verified, the `controlled-proof-send` function stays for founder-initiated single sends, but `outreach-send-worker` is no longer artificially limited to `max=1`. Worker batch size returns to existing `email_send_state.batch_size` (or capacity-derived value).
- Add explicit founder toggle: "Proof-only mode" (default OFF after first successful proof) so this is an audit-traceable choice, not a hidden block.

## Slice 6 — Agent Workstream Wiring
Each agent gets a real edge function trigger / scheduled run + activity logging. Order:
1. Lead Source → CRM → Outreach (lead pipeline)
2. Email + Inbox + Conversation (send/reply loop) — most already wired, just verify and surface
3. Proposal → Demo → Deal → Finance → Supplier (revenue pipeline)
4. Compliance + Oversight + Revenue (cross-cutting reporters)

Each agent card on Command Centre: status, last run, last action, current blocker, next action — pulled from `agent_activity_logs` / `system_events`. AI replies/proposals stay in approval queue.

## Slice 7 — Stale Blocker Cleanup in UI
- Filter the 109 already-cancelled simulated follow-up rows out of "current blockers" views; keep them visible only under "History / Repair completed".
- Current-blocker list pulls only: unresolved `system_events`, failed readiness checks, generic contacts needing review, capacity exhausted, provider blocks.

## Slice 8 — Revenue Workstream Tab
- New tab on Command Centre: Lead Pool → Contacts → Outreach → Sent → Replies → AI Drafts → Approved → Proposals → Demos → Deals → Invoices → Payments → Revenue.
- Each stage: count, agent owner, blocker, next action, revenue potential where present.
- Empty states show plain English ("No revenue yet — next profit action is to convert warm replies into proposal-ready leads.") — no fake numbers.

## Technical notes
- All gating lives in DB triggers + RPCs; Slice 3+ keeps them in place. Removal is only of `if (mode !== 'live') return early;` style early-exits and hardcoded numeric constants in worker/UI.
- Service-role key paths unchanged; founder JWT continues to authorise UI actions.
- No schema changes in Slice 3; Slice 4 adds one read-only function. Later slices may add a `proof_only_mode` row in `system_settings` (no schema change).
- Every removal will be paired with a logged `system_events` audit row so the change itself is traceable.

## What I need from you
Confirm this slicing, and tell me to start with **Slice 3 — LIVE Execution Unlock**. I will not touch Slices 4–8 until 3 is verified in your Command Centre.
