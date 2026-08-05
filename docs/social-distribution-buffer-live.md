# Social Distribution — Buffer live gateway

Final-mile distribution for the existing Liftor Social Autopilot. The content-pack
generator, approval flow, calendar, publish jobs, batches, audit log and manual CSV
export are unchanged; this layer only adds a real provider gateway behind them.

## Architecture

```
approved review ─▶ socialJobMaterialise ─▶ social_publish_jobs
                                            │
                       socialPayloadResolver│ (canonical caption + durable media)
                                            ▼
   social-distribution-dispatch-due ─▶ socialDistributionSubmit ─▶ Buffer GraphQL
   (cron, 5 min)                         │  atomic claim RPC        POST https://api.buffer.com
                                         ▼
   social-distribution-maintenance ─▶ retries + reconcile ─▶ social_publish_queue_audit
   (cron, 5 min, secret-only)                                (immutable, no secrets)
```

Key modules
- `supabase/functions/_shared/bufferClient.ts` — GraphQL transport, `channels`, `createPost`, bounded relay `posts` query, typed `MutationError` reading.
- `supabase/functions/_shared/socialDistributionLogic.ts` — pure logic: policy/channel mode resolution, asset union building, durable-URL rules, idempotency keys, due/retry/reconcile selection, retry classification, health state machine, provider-status allowlist.
- `supabase/functions/_shared/socialPayloadResolver.ts` — hydrates jobs from authoritative approved content.
- `supabase/functions/_shared/socialDistributionSubmit.ts` — per-job evaluation, claim, submit, failure handling.
- `supabase/functions/_shared/socialDistributionReconcile.ts` — bounded, business-scoped status reconciliation.
- `supabase/functions/_shared/socialDistributionAuto.ts` — approval-driven dispatch of an approved batch.
- Edge functions: `social-buffer-channel-sync`, `social-distribution-submit`, `social-distribution-dispatch-due`, `social-distribution-reconcile`, `social-distribution-maintenance`, `social-distribution-health`.

## Modes

Business/provider policy (`social_distribution_policies.policy_mode`):

| Mode | Behaviour |
| --- | --- |
| `test` (default) | OFF. Nothing is ever submitted. |
| `approval_required` | Founder-triggered manual submit only (confirmation phrase `DISTRIBUTE APPROVED BATCH`). |
| `draft_to_buffer` | Approved posts are sent to Buffer with `saveToDraft:true`. Stored as `distribution_status='draft_in_provider'` with the provider post ID and provider status. Never scheduled, never published, never counted as `posts_scheduled`. |
| `approved_batch_autopilot` | Approved posts are scheduled at their exact time (`mode: customScheduled`, `dueAt`). Requires a typed confirmation in the UI to arm. |
| `paused` | Hard stop. |

Per-channel mode (`social_business_channel_map.dispatch_mode`): `OFF` (default),
`DRAFT_TO_BUFFER`, `AUTO_SCHEDULE`. A `draft_to_buffer` policy forces the draft path on
every non-OFF channel; OFF channels always stay off. UI label: **Draft to Buffer**.

## Secrets (Edge Function environment only — never in browser code or table rows)

| Secret | Purpose | Required |
| --- | --- | --- |
| `BUFFER_API_KEY` | Bearer token for `https://api.buffer.com` | Yes |
| `BUFFER_ORGANIZATION_ID` | OPTIONAL fallback organisation, used only when `social_provider_connections.provider_organization_id` is empty | No |
| `SOCIAL_DISPATCH_SECRET` | Scheduler auth (`x-dispatch-secret`) for the dispatcher and the maintenance runner | Yes for unattended operation |
| `SOCIAL_DISPATCH_CRON_REGISTERED` | Single canonical schedule flag for BOTH cron hooks. Set to `true` only after both are registered | Yes for `LIVE` |

Secrets are never returned in API responses, UI or audit payloads.
`social-distribution-maintenance` accepts the scheduler secret **only** — a founder
browser token is rejected.

## Setup steps

1. Add `BUFFER_API_KEY` in Project Settings → Secrets. `BUFFER_ORGANIZATION_ID` is optional: the founder-selected organisation stored on the business connection row is always used first. No secret is ever stored in a normal database table.
2. Social Autopilot → Publishing → **Test connection**, pick the organisation.
3. **Sync channels** (dry-run preview first, then founder-confirmed sync).
4. Map channels to the business. Every channel starts at **OFF**.
5. Set the per-channel mode: `DRAFT_TO_BUFFER` or `AUTO_SCHEDULE`.
6. Unlock the execution gate and set the policy (`draft_to_buffer` first, `approved_batch_autopilot` later — the latter needs the typed phrase `DISTRIBUTE APPROVED BATCH`).
7. Register both cron hooks below, then set `SOCIAL_DISPATCH_SECRET` and `SOCIAL_DISPATCH_CRON_REGISTERED=true`.

## Scheduled jobs — CONFIGURATION REQUIRED (not registered yet)

Neither schedule is auto-created: registering them requires embedding the dispatch
secret in the cron body, which must not be committed to source control or a
migration. Until they exist, health reports
`ARMED — dispatcher_schedule_missing` / `ARMED — maintenance_schedule_missing`
(**CONFIGURATION REQUIRED**) and never claims LIVE.

Exact activation step — run once via the founder SQL console, replacing the two
placeholders:

```sql
select cron.schedule('social-distribution-dispatch-due', '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/social-distribution-dispatch-due',
       headers := '{"Content-Type":"application/json","x-dispatch-secret":"<SOCIAL_DISPATCH_SECRET>"}'::jsonb,
       body := '{}'::jsonb) $$);

select cron.schedule('social-distribution-maintenance', '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/social-distribution-maintenance',
       headers := '{"Content-Type":"application/json","x-dispatch-secret":"<SOCIAL_DISPATCH_SECRET>"}'::jsonb,
       body := '{}'::jsonb) $$);
```

Then set `SOCIAL_DISPATCH_CRON_REGISTERED=true` (single flag for both hooks).

Status in this project: **CONFIGURATION REQUIRED** — `pg_cron`, `pg_net` and Vault are
available, but no schedule and no `SOCIAL_DISPATCH_SECRET` exist yet. The secret is
supplied as an Edge Function secret and echoed only inside the protected cron header
above; it is never committed, never stored in an ordinary table and never returned by
any endpoint. Nothing here claims the cron is registered.

## Maintenance runner behaviour

Every run (bounded, max 10 businesses):
1. Honours global / provider / business kill switches — paused businesses are skipped.
2. Retries at most 10 due `retrying` jobs per business. `submission_unknown` is **never** auto-retried.
3. Reconciles at most 100 provider-side jobs per business (see reconciliation rules below).
4. Writes a heartbeat row in `social_distribution_dispatch_runs` with `trigger_source='scheduler_maintenance'` plus a `distribution_maintenance_run` audit entry.

## Reconciliation rules

- Relay `posts(input:{organizationId}, first:50, after:$cursor)` with `pageInfo { hasNextPage endCursor }`; hard caps of **2 pages / 100 posts** per run, stopping early once every wanted post ID is found. The organisation is the business connection row first, `BUFFER_ORGANIZATION_ID` second.
- `externalLink` is not requested on `posts` because the current schema does not accept it there; reconciliation therefore never stores an external URL.
- Only jobs of this business with a `provider_post_id`, and only channels mapped to this business.
- Explicit status allowlist: `sent`/`published` → `sent`; `scheduled`/`buffer`/`queued`/`pending` → `scheduled`; `draft` → `draft_in_provider`; `error`/`failed` → `failed`. Anything else is left unchanged and counted as `unknown_provider_status`.
- Buffer returns no permalink for the queried fields, so no external post URL is stored or invented.

## Health states

`NOT_CONFIGURED → CONNECTED → MAPPED → ARMED → LIVE`, plus `DEGRADED` and `BLOCKED`.
**LIVE requires** secrets, a tested connection with an organisation, mapped
auto-schedule channels, an unlocked gate, autopilot policy, **and** fresh
(<30 min) dispatcher *and* maintenance heartbeats with `SOCIAL_DISPATCH_CRON_REGISTERED=true`.
`draft_to_buffer` reports `ARMED — draft_to_buffer_mode` by design.

## Live-readiness checklist

- [ ] `BUFFER_API_KEY` set (`BUFFER_ORGANIZATION_ID` optional fallback only)
- [ ] Connection test green, organisation selected
- [ ] Channels synced, none disconnected/locked/paused
- [ ] Channels mapped and set to `AUTO_SCHEDULE`
- [ ] Execution gate unlocked, policy armed with the typed confirmation
- [ ] Media at stable public HTTPS URLs (signed/expiring URLs are blocked, never downgraded to text)
- [ ] Both cron hooks registered and `SOCIAL_DISPATCH_CRON_REGISTERED=true`
- [ ] Health shows **LIVE** with fresh dispatcher and maintenance heartbeats

## One-business low-risk proof procedure

1. Pick one business and map exactly one low-risk channel.
2. Set the policy to `draft_to_buffer` and unlock the gate.
3. Approve a single content pack; confirm a Buffer **draft** appears and the job shows `draft_in_provider` with a provider post ID.
4. Run `social-distribution-reconcile` and confirm the status stays `draft_in_provider` (no invented state).
5. Only then set the channel to `AUTO_SCHEDULE`, arm `approved_batch_autopilot` with the typed phrase, and approve one post with a `dueAt` at least an hour ahead.
6. Watch the dispatcher heartbeat and the scheduled post in Buffer; keep the kill switch one click away.

## Kill switch and rollback

- Distribution health panel → **Kill switch — this business** or **whole portfolio** (founder/admin RLS only). Writes `social_distribution_pauses`; every provider call, including maintenance and reconciliation, stops immediately. Queued content and schedules are preserved.
- Softer rollbacks: channels back to `OFF`, lock the execution gate, or set policy to `test` / `draft_to_buffer`.
- To undo posts already accepted by Buffer, remove them in Buffer — Liftor never deletes provider-side posts.

## Safety guarantees

- Only approved content is dispatched; approval is re-read from authoritative tables.
- Business scoping predicates on every mutation; cross-business content is blocked.
- Atomic claim RPC (`social_claim_distribution_job`) makes duplicate posting impossible.
- Transport-ambiguous failures become `submission_unknown` and are never auto-retried.
- Capped exponential backoff; hard errors go to `dead_letter`.
- Mixed link + media, non-HTTPS and signed/expiring media are blocked with precise reasons.
- Outreach email/SMS workflows are untouched.

## What remains manual

- Connecting the social accounts inside Buffer itself.
- Registering the two cron hooks and setting the registration flags (documented above).
- Mapping channels and arming each channel/business (deliberate founder actions).
- Analytics/metrics ingestion — reconciliation stores provider status only.

## Tests

`src/lib/__tests__/socialDistribution.test.ts`,
`socialDistributionAuto.test.ts`, `socialDistributionDispatcher.test.ts` and
`socialDistributionDraftAndMaintenance.test.ts` cover missing secrets,
disconnected/locked/paused channels, unmapped business, unapproved jobs, duplicate
dispatch, exact-time scheduling payloads, draft-to-Buffer (cannot publish), image/video
URL mapping, blocked expiring assets, typed Buffer `MutationError`, transient retry then
success, bounded reconciliation with unknown statuses, retry selection excluding
`submission_unknown`, kill switch, and health states. All Buffer calls are mocked — no
real post is ever sent.
