# Section O — Scheduled jobs, workers and webhook receivers

## O1. Public / JWT-disabled endpoints (16, exhaustive)

These are the only edge functions with `verify_jwt = false` in `supabase/config.toml`. Each must carry its own check; the posture column states what the audited code actually does.

| Function | Kind | Posture |
|---|---|---|
| `smartlead-webhook` | provider webhook | requires `SMARTLEAD_WEBHOOK_SECRET`; fails closed and returns a disabled acknowledgement when unconfigured; dedupes events |
| `stripe-webhook` | provider webhook | Stripe signature verification with `STRIPE_WEBHOOK_SECRET` |
| `outreach-inbound-webhook` | inbound mail | `OUTREACH_WEBHOOK_SECRET` |
| `outreach-inbound-poll` | scheduled poll | `CRON_SECRET` + `CRON_ENABLED` |
| `outreach-test-imap` | diagnostic | server-side credentials only; read-only IMAP test |
| `social-relationship-webhook` | provider webhook | `UNIPILE_WEBHOOK_HMAC_SECRET` / `SOCIAL_RELATIONSHIP_WEBHOOK_SECRET` |
| `social-relationship-maintenance` | scheduled | `SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET` |
| `social-distribution-dispatch-due` | scheduled dispatch | `SOCIAL_DISPATCH_SECRET`; gated by `SOCIAL_DISPATCH_CRON_REGISTERED` |
| `social-distribution-maintenance` | scheduled | `SOCIAL_DISPATCH_SECRET` |
| `customer-voice-inbound-webhook` | voice provider | provider secret |
| `customer-voice-call-status-webhook` | voice provider | provider secret |
| `customer-voice-transcript-ingest` | voice provider | provider secret |
| `pr-gmail-oauth-callback` | OAuth redirect | state check, exchanges code server-side |
| `compliance-approve` | tokenised approval link | single-use token |
| `unsubscribe-contact` | public unsubscribe | must stay public by law; writes suppression only |
| `autopilot-orchestrator` | scheduler entrypoint | `CRON_SECRET` + `CRON_ENABLED`; all downstream actions still gated |

## O2. Scheduled work

Cron-guarded functions (`CRON_SECRET` / `CRON_ENABLED`): `autopilot-orchestrator`, `liftor-master-dry-run`, `outreach-inbound-poll`. Social dispatch runs on `SOCIAL_DISPATCH_SECRET` and only when `SOCIAL_DISPATCH_CRON_REGISTERED` is set.

`scheduled_jobs` tables record intended jobs and last-run state. **Schedule frequencies are not encoded in the repository** — they are configured provider-side. Do not infer a cadence from the code; read the job rows.

## O3. Event normalisation and queues

- `_shared/smartleadEventNormalizer.ts` maps provider payloads to `outbound_provider_events` with dedupe on provider event id.
- Reply handling: `apply_reply_stop_suppression`, `cancel_queue_on_reply`, `cancel_queue_on_inbound_comm` stop queued sends the moment a human replies.
- Send throttling and ramp: `check_send_throttle`, `enforce_inbox_ramp`, `bump_inbox_send_count`, `assign_inbox_for_contact`.
- Retry/escalation: `retry_*` tables, `escalate_retry_failure`.
- Worker surfaces (`/worker/**`) provide human task queues with `current_worker_id()` scoping.

## O4. Locks

`ai_concurrency_leases` + `acquire_ai_lease` / `cleanup_stale_ai_leases` prevent concurrent AI runs exceeding an agent's `max_concurrency`. Apollo operation keys prevent duplicate paid runs. Smartlead import idempotency keys prevent duplicate imports.
