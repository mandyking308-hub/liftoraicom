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
                            social_publish_queue_audit (immutable, no secrets)
```

Key modules
- `supabase/functions/_shared/bufferClient.ts` — GraphQL transport, `channels` query, `createPost` mutation, typed `MutationError` reading.
- `supabase/functions/_shared/socialDistributionLogic.ts` — pure logic: asset union building, durable-URL rules, idempotency keys, due-job selection, retry/backoff classification, health state machine.
- `supabase/functions/_shared/socialPayloadResolver.ts` — hydrates jobs (including legacy `{source, source_id}` pointers) from authoritative approved content.
- `supabase/functions/_shared/socialDistributionSubmit.ts` — per-job evaluation, claim, submit, failure handling.
- `supabase/functions/_shared/socialDistributionAuto.ts` — approval-driven dispatch of an approved batch.
- Edge functions: `social-buffer-channels-sync`, `social-distribution-submit`, `social-distribution-dispatch-due`, `social-distribution-reconcile`, `social-distribution-health`.

## Secrets (Edge Function environment only — never in browser code or table rows)

| Secret | Purpose | Required |
| --- | --- | --- |
| `BUFFER_API_KEY` | Bearer token for `https://api.buffer.com` | Yes |
| `BUFFER_ORGANIZATION_ID` | Default Buffer organisation for channel sync | Yes |
| `SOCIAL_DISPATCH_SECRET` | Scheduler → `social-distribution-dispatch-due` auth (`x-dispatch-secret`) | Recommended |
| `SOCIAL_DISPATCH_SCHEDULE_REGISTERED` | Set to `true` only after the cron hook below exists | Yes for `LIVE` |

Secrets are never returned in API responses, UI or audit payloads.

## Setup steps

1. Add `BUFFER_API_KEY` and `BUFFER_ORGANIZATION_ID` in Project Settings → Secrets.
2. Social Autopilot → Publishing → **Test connection**, pick the organisation.
3. **Sync channels** (dry-run preview first, then founder-confirmed sync).
4. Map channels to the business. Every channel starts at **OFF**.
5. Set the per-channel mode: `DRAFT_TO_BUFFER` (Buffer drafts only) or `AUTO_SCHEDULE` (exact-time scheduling).
6. Set the distribution policy to `approved_batch_autopilot` and unlock the execution gate.
7. Register the dispatcher cron (below) and set `SOCIAL_DISPATCH_SECRET` + `SOCIAL_DISPATCH_SCHEDULE_REGISTERED=true`.

## Dispatcher cron hook (CONFIGURATION REQUIRED until run)

The scheduled invocation is not auto-created. Until it exists, health reports
`ARMED — dispatcher_schedule_missing (CONFIGURATION REQUIRED)`; it never claims LIVE.

```sql
select cron.schedule(
  'social-distribution-dispatch-due',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/social-distribution-dispatch-due',
       headers := '{"Content-Type":"application/json","x-dispatch-secret":"<SOCIAL_DISPATCH_SECRET>"}'::jsonb,
       body := '{}'::jsonb) $$
);
```

## Live-readiness checklist

- [ ] `BUFFER_API_KEY` / `BUFFER_ORGANIZATION_ID` set
- [ ] Connection test green, organisation selected
- [ ] Channels synced, none disconnected/locked/paused
- [ ] Channels mapped to the business and set to `AUTO_SCHEDULE`
- [ ] Execution gate unlocked, policy `approved_batch_autopilot`
- [ ] Media stored at stable public HTTPS URLs (signed/expiring URLs are blocked, never downgraded to text)
- [ ] Cron registered and `SOCIAL_DISPATCH_SCHEDULE_REGISTERED=true`
- [ ] Health shows **LIVE** with a fresh heartbeat

## Kill switch and rollback

- Distribution health panel → **Kill switch — this business** or **whole portfolio**. Writes `social_distribution_pauses`; every provider call stops immediately, queued content and schedules are preserved.
- Softer rollbacks: set channels back to `OFF`, lock the execution gate, or set policy to `test`.
- To undo posts already accepted by Buffer, remove them in Buffer — Liftor never deletes provider-side posts.

## Safety guarantees

- Only approved content is dispatched; approval is re-read from authoritative tables, never trusted from the caller.
- Business scoping predicates on every mutation; cross-business content is blocked.
- Atomic claim RPC (`social_claim_distribution_job`) makes duplicate posting impossible.
- Transport-ambiguous failures become `submission_unknown` and are never blindly retried.
- Capped exponential backoff, hard errors go to `dead_letter` with a founder alert.
- Mixed link + media, non-HTTPS and signed/expiring media are blocked with precise reasons.
- Outreach email/SMS workflows are untouched.

## What remains manual

- Connecting the social accounts inside Buffer itself.
- Registering the cron hook and confirming the schedule flag.
- Mapping channels and arming each channel/business (deliberate founder actions).
- Analytics/metrics ingestion — the reconciler stores status and external post URL; metrics are a later phase.

## Tests

`src/lib/__tests__/socialDistributionAuto.test.ts` and
`src/lib/__tests__/socialDistributionDispatcher.test.ts` cover missing secrets,
disconnected/locked/paused channels, unmapped business, unapproved jobs, duplicate
dispatch, exact-time scheduling payloads, image/video URL mapping, blocked expiring
assets, typed Buffer `MutationError`, transient retry then success, kill switch and
draft vs auto-schedule modes. All Buffer calls are mocked — no real post is ever sent.
