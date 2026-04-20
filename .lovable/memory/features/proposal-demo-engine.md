---
name: Proposal + Demo Access Engine
description: Founder-side internal proposals tied to QUALIFIED contacts, with AI generation, public view/accept tokens, optional sandbox demo provisioning, demo usage tracking, and auto deal/invoice creation on accept.
type: feature
---

**Tables (founder-only RLS):**
- `internal_proposals` — contact_id (must be QUALIFIED), deal_id, business_name, title, AI body (suggested_solution, scope, timeline, cost range/breakdown, architecture_components, ROI fields), status (draft/sent/viewed/accepted/rejected/expired), include_demo, view_token + accept_token (unique 24-byte hex), version.
- `internal_proposal_versions` — append-only snapshot per save, changed_by.
- `demo_access` — contact_id, proposal_id (nullable), business_name, demo_token (unique), status (active/expired/revoked), expires_at (default now+7d), access_count, high_intent (auto-flips at access_count >= 2), last_accessed_at.
- `demo_events` — demo_id, event_type (view/login/feature_used/session_start/session_end), metadata jsonb, timestamp.

**Token-based public RPCs (security definer):**
- `get_proposal_by_token(_token)` — returns proposal by view_token OR accept_token; auto-flips status sent→viewed on first view.
- `accept_proposal_by_token(_token)` — flips proposal accepted, creates a `WON` deal (existing `handle_deal_won` trigger then auto-creates the invoice and locks contact as CLIENT).
- `log_demo_event(_token, _event_type, _metadata)` — validates active+not-expired, inserts event, bumps access_count, sets high_intent at ≥2 accesses.
- `expire_demos()` — flips active demos past expiry to `expired`; expires unaccepted proposals after 30 days. Scheduled daily via pg_cron (`expire-demos-daily` at 03:00 UTC).

**Edge functions:**
- `internal-proposal-generate` (POST `{contact_id, include_demo, ...}`) — enforces contact.status = QUALIFIED; reuses Lovable AI Gateway `google/gemini-2.5-flash` with the same `suggest_proposal` tool schema as the public generator; saves a `draft` proposal + version snapshot; provisions a `demo_access` row when `include_demo=true`.
- `internal-proposal-send` (POST `{proposal_id}`) — composes plain-text email (proposal URL, accept URL, demo URL+expiry if any), inserts into `communications` (existing `handle_new_communication` trigger updates `last_contacted_at`), flips status to `sent`. Uses `PUBLIC_BASE_URL` env (defaults to https://liftorai.com).

**Founder UI:**
- `/founder/internal-proposals` — list + 4 stat cards (Total, Sent/Viewed, Accepted, Active Demos); modal generates from a QUALIFIED contact with optional demo toggle.
- `/founder/internal-proposals/:id` — full proposal detail, copy-able view/accept/demo URLs, Send/Accept/Reject controls.
- `/founder/demos` — Active Demos, Events (7d), High Intent, Conversion %; per-demo revoke.

**Public pages:**
- `/proposals/view/:token` — branded proposal view (auto-marks viewed); shows "Live Demo Access" block when a demo exists; CTA → accept.
- `/proposals/accept/:token` — confirm+accept screen; calls `accept_proposal_by_token` (creates WON deal → triggers existing invoice automation → contact → CLIENT).
- `/demo/:token` — static sandbox UI with illustrative data only (no real client data ever rendered). Logs a `view` event on load; rejects expired/revoked tokens.

**Hard rules:**
- Proposals can only be generated for `contacts.status = 'QUALIFIED'`.
- Demo content is fully static/illustrative — no production data ever exposed.
- Tokens are 24-byte hex (gen_random_bytes), unique-indexed.
- Acceptance always routes through `accept_proposal_by_token` so deal/invoice/contact-as-CLIENT chain runs atomically.
- High-intent flag auto-sets at access_count ≥ 2 (signal for future priority engine).