# Social Distribution Fabric (Buffer v1)

Final-mile distribution added **inside** the existing Social Autopilot. The social brain,
content factory, approvals, calendar, publish jobs, provider router, audit trail and
CSV/manual exports are unchanged and remain the fallback path.

## What is now built

**Database (migration applied)**
- `social_provider_connections`: `provider_organization_id`, `provider_organization_name`, `connection_mode` (defaults to `test`), `last_channel_sync_at`.
- `social_provider_channels`: channels discovered from Buffer (service, display name, avatar, external link, `isQueuePaused` / `isDisconnected` / `isLocked`), unique per provider+organisation+channel.
- `social_business_channel_map`: one business → many channels, unique per business+channel, active flag.
- `social_distribution_policies`: per business/provider mode — `test` (default), `approval_required`, `approved_batch_autopilot`, `paused`; `allow_share_now` defaults false.
- `social_distribution_pauses`: emergency pause at `global`, `business` or `provider` scope.
- `social_publish_jobs` extended: `distribution_status`, `distribution_idempotency_key` (unique index), `mapped_channel_id`, `provider_post_id`, `provider_status`, `provider_response_summary`, `attempt_count`, `next_retry_at`, `last_error`, `submitted_at`, `published_at`, `dead_letter_reason`, `dead_lettered_at`.
- All new tables are founder/admin only via `has_role`, with service-role access for edge functions. Every connection test, channel sync, block, submit, failure, dead letter and reconcile writes to `social_publish_queue_audit`.

**Edge functions**
- `social-buffer-connection-test` — checks `BUFFER_API_KEY`, runs `account { organizations }`, returns sanitised orgs (owner email masked).
- `social-buffer-channel-sync` — `GetChannels($organizationId: OrganizationId!)`, upserts channel metadata. No secrets returned.
- `social-distribution-preview` — per-job dry run: which jobs would submit, to which channel, and every blocker. No provider call.
- `social-distribution-submit` — founder/admin only, confirmation phrase `DISTRIBUTE APPROVED BATCH`. Enforces business ownership, connection, organisation, mapped+active channel, approval, execution gate, emergency pause, policy mode, content validation, future `dueAt`, durable HTTPS media, and idempotency-key claim **before** calling Buffer.
- `social-distribution-reconcile` — reads Buffer posts for the organisation and updates Liftor statuses only from real provider data.
- `social-distribution-retry` — retries only transient failures, honouring exponential backoff (60s base, ×2, 1h cap, 5 attempts); hard auth/validation errors go straight to dead letter.

**Buffer usage**
- Endpoint `https://api.buffer.com/graphql` (override via `BUFFER_GRAPHQL_URL`), `Authorization: Bearer <BUFFER_API_KEY>` server-side only.
- `createPost` input: `schedulingType: automatic`, `mode: customScheduled`, ISO `dueAt`, `text`, `channelId`, and the current `assets: [{ source: { url } }]` format. `shareNow` only when explicitly selected *and* the policy allows it. `linkAttachment` is never mixed with non-empty assets.
- Both top-level GraphQL errors and typed `MutationError` responses are handled. A job is only marked `scheduled`/`sent` when Buffer returns a real post ID.

**UI** — added to the existing Social Publishing dashboard (`/founder/social-autopilot/publishing`): connection status (never the key), Test connection, organisation selector, Sync channels, per-business channel mapping with network badges and disconnected/locked/paused flags, policy mode switch, Emergency Pause/Resume with confirmation, Distribution Preview with blockers, Approve & Distribute Batch, status totals (blocked / ready / submitting / scheduled / sent / failed / retrying / dead-letter), job-level provider ID/status/error, Retry and Reconcile. CSV/manual export panels are untouched.

**Tests** — `src/lib/__tests__/socialDistribution.test.ts` (14 tests, passing) covers idempotency stability, locked gate, test-mode default, missing/cross-business channel mapping, disconnected/locked/paused channels, duplicate click (`already_submitted`), invalid/expired media, past `dueAt`, transient retry backoff and hard-failure classification.

## What remains blocked (external steps only)

Nothing publishes today. To go live for one business:
1. Create/connect the channels in a Buffer account.
2. Generate a Buffer API key.
3. Add the secret `BUFFER_API_KEY` in Project Settings → Secrets.
4. Test connection, select the organisation, Sync channels.
5. Map the channels to the business.
6. Unlock a `social_provider_execution_gates` row for provider `buffer`, and move the business policy off `test`.
7. Prove with one private/low-risk scheduled post before enabling `approved_batch_autopilot`.
