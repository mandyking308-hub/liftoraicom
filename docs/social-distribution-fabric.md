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
- Endpoint `https://api.buffer.com` (override via `BUFFER_GRAPHQL_URL`), `Authorization: Bearer <BUFFER_API_KEY>` server-side only.
- `createPost` input: `channelId`, `text`, `schedulingType: automatic`, `mode: customScheduled`, ISO `dueAt`, and `assets`. **No `organizationId`** — the organisation ID is only used for organisation/channel discovery and querying.
- `assets` is an ordered union list, one supported key per item: `{ image: { url } }`, `{ video: { url, metadata? } }`, `{ document: { url, title? } }`, `{ link: { url, title? } }`. Asset kind is derived only from an explicit type, MIME type, or file extension; anything unknown blocks the job with `unsupported_media_type` — never guessed. A link asset is never mixed with image/video/document assets: if a job has both a `link_url` and media, the canonical resolver blocks it with `mixed_link_and_media_unsupported`, and a non-HTTPS/unusable link blocks with `invalid_link_url`. Preview shows the blocker and `provider_input` is `null`.
- Reconciliation uses the relay connection `posts(input:{organizationId}, first, after) { pageInfo { hasNextPage endCursor } edges { node { id status dueAt channelId } } }`. It is live: `social-distribution-reconcile` walks at most 5 pages of 100, touches only this business's jobs that carry a `provider_post_id` on channels mapped to this business, maps an explicit status allowlist (`sent`/`published` → sent, `scheduled`/`buffer`/`queued`/`pending` → scheduled, `draft` → draft_in_provider, `error`/`failed` → failed) and leaves any other status unchanged and audited. Buffer returns no permalink for these fields, so no external URL is ever stored or invented.
- Both top-level GraphQL errors and typed `MutationError` responses are handled. A job is only marked `scheduled`/`sent` when Buffer returns a real post ID.

**Approval-driven autopilot (event-driven, not a button)**
- `social-approval-batch-decision-apply` is the authoritative server-side approval completion path. After a batch is successfully approved it calls `autoDispatchApprovedBatch` (`_shared/socialDistributionAuto.ts`) server-side.
- Auto-dispatch runs **only** when the business/provider policy is `approved_batch_autopilot` (exact-time scheduling) or `draft_to_buffer` (Buffer drafts only, never scheduled or published) and no emergency pause is active. `test`, `approval_required` and `paused` never auto-submit.
- Unattended retries and reconciliation run in `social-distribution-maintenance` (scheduler secret only). See `docs/social-distribution-buffer-live.md`.
- It reuses the identical gate, mapping, pause, approval, idempotency, validation and audit checks as manual dispatch. The founder's batch approval is the authorisation event, so no confirmation phrase applies on this route; the manual `social-distribution-submit` route still requires `DISTRIBUTE APPROVED BATCH`.
- Audit entries: `approval_batch_approved` (policy mode, pause state, whether auto-dispatch ran) and `approval_auto_dispatch` (eligible / submitted / blocked / failed / duplicate counts and job IDs).
- **Submission is not publication.** Auto-dispatch schedules the post inside Buffer; Buffer performs the actual timed publish later at `dueAt`. Liftor only records `sent` from real provider data.

**Idempotency**
- Claims go through the security-definer RPC `social_claim_distribution_job(job, business, key, channel)`, which updates exactly one unclaimed, unsent job and returns whether the claim succeeded. Zero-row updates can no longer be mistaken for success, so simultaneous clicks or repeated approval events cannot both call Buffer.

**UI** — added to the existing Social Publishing dashboard (`/founder/social-autopilot/publishing`): connection status (never the key), Test connection, organisation selector, Sync channels, per-business channel mapping with network badges and disconnected/locked/paused flags, policy mode switch, Emergency Pause/Resume with confirmation, Distribution Preview with blockers, Approve & Distribute Batch, status totals (blocked / ready / submitting / scheduled / sent / failed / retrying / dead-letter), job-level provider ID/status/error, Retry and Reconcile. CSV/manual export panels are untouched.

**Tests** — `src/lib/__tests__/socialDistribution.test.ts` (19 tests, passing) covers idempotency stability, locked gate, test-mode default, missing/cross-business channel mapping, disconnected/locked/paused channels, duplicate click (`already_submitted`), invalid/expired media, unsupported/unknown media types, image and video asset shapes, past `dueAt`, transient retry backoff, hard-failure classification, the posts connection parser, and auto-dispatch policy gating (test / approval_required / paused blocked, autopilot allowed).

## What remains blocked (external steps only)

Nothing publishes today. To go live for one business:
1. Create/connect the channels in a Buffer account.
2. Generate a Buffer API key.
3. Add the secret `BUFFER_API_KEY` in Project Settings → Secrets.
4. Test connection, select the organisation, Sync channels.
5. Map the channels to the business.
6. Unlock a `social_provider_execution_gates` row for provider `buffer`, and move the business policy off `test`.
7. Prove with one private/low-risk scheduled post before enabling `approved_batch_autopilot`.

## Final correctness pass (end-to-end last mile)

**Approval batch vs publish queue batch.** `social_approval_batches.id` and
`social_publish_queue_batches.id` are separate domains and are no longer
interchangeable. `autoDispatchApprovedBatch` takes `approval_batch_id`
(audit/reference only) and `publish_queue_batch_id` (a real job filter).
Approval-driven runs scope jobs by the approved `review_ids` /
`approval_review_id`; `queue_batch_id` is used only when the caller supplies a
genuine publish queue batch ID. Both IDs are audited separately.

**Canonical payload resolver** (`_shared/socialPayloadResolver.ts`) is the one
source of the final post for preview, manual submit, retry and auto-dispatch:
variant → content item → calendar item, with `business_id` equality enforced on
every joined row, live re-checks of publish readiness / compliance / quality /
approval, `social_assets` rights (revoked, expired, consent, commercial/public
use, cross-business), and text composed only from the approved caption + CTA +
hashtags. Legacy pointer-only payloads (`{ source, source_id }`) hydrate
automatically; new jobs store an immutable `snapshot_version: 1` payload.
Preview returns the exact `provider_input` that is submitted — no drift.

**Approval verification** is read from `social_approval_reviews`
(`review_status='approved'`, `decided_at` present, no `approval_blockers`,
risk not high/critical, same business). `provider_locked` / `queued` / merely
having an `approval_review_id` is never treated as approval.

**Jobs for approved items.** If approved review items have no publish job,
`materialiseJobsForReviews` creates them server-side reusing the existing
`socialPublishLogic` eligibility + idempotency key. Results report
`approved_items`, `jobs_existing`, `jobs_created`, `jobs_eligible`,
`submitted`, `blocked`, `failed`, `duplicate`, `unknown`, and the explicit
error `no_publish_jobs_for_approved_items`.

**Reconciliation** maps only proven statuses (`sent`, `error`, `scheduled`).
Anything else leaves Liftor unchanged and is counted/audited as
`unknown_provider_status`.

**Duplicate-post safety.** Failures are classified by phase: preflight and
explicit provider responses (429, 4xx, GraphQL MutationError) are safe — the
claim is released for retry. Transport failures (timeout/connection loss) and
5xx are ambiguous: the job becomes `submission_unknown`, the idempotency claim
is retained, nothing auto-retries, and reconciliation or founder review
resolves it.

**Final guards.** A non-empty external Buffer channel ID is required
immediately before `createPost`; endpoint stays `https://api.buffer.com`; the
asset union format is unchanged; `organizationId` is not in `CreatePostInput`;
link assets are never mixed with image/video/document assets; preview shows
blockers instead of silently dropping unsupported media. Legacy jobs whose `publish_payload` holds only `{source, source_id}` are hydrated via a fixed allowlist (`content_item`, `content_variant`, `calendar_item`); any other source blocks with `unsupported_legacy_source`. Snapshot jobs resolve media via `payload.asset_id` and block with `snapshot_asset_reference_missing` rather than sending text-only.
