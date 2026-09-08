# Smartlead outreach rollout

Status: implemented on `codex/smartlead-outreach-wiring`; not deployed, purchased or activated. No Apollo actions are part of this change.

## Result

SmartProspect supplies contacts to a Smartlead draft campaign. The founder maps that campaign to a Liftor business and imports its contacts into Liftor. Imports retain provider identities, existing profile information and opt-outs. They stop on unresolved records or failed checkpoints rather than silently skipping them.

For eligible contacts originating in Liftor, the Command Centre previews an explicit batch of up to 50 contacts and can transfer that batch into a mapped draft or paused Smartlead campaign. A durable claim precedes the provider POST. An uncertain provider result stays reserved until a campaign import reconciles it; there is no automatic POST retry or campaign launch.

Provider replies enter the current `communication_records` / `communication_threads` inbox with business attribution and readable message bodies. The integration deliberately avoids legacy tables whose triggers invoke the old AI reply engine. Unsubscribes and bounces preserve suppression and cancel queued local messages. Authenticated message-history reconciliation is also available in batches of five imported contacts. It must be run through a full cycle to collect new replies; no recurring schedule is installed.

The mailbox setup panel saves a plan against actual Liftor businesses and only reports a connection after a successful check. It does not buy domains, provision mailboxes or claim they are connected. Account checks paginate through the complete provider mailbox list and report an unknown result if pagination fails.

## Activation blockers

The connected Supabase account does not list Liftor project `oiwbletmjhrhqksosphi`. An earlier database read was denied. No alternate access path was used. Production schema, existing duplicates, secrets, deployed functions and actual Smartlead account state remain unverified. Connect the account that owns this project before database preflight or deployment.

The four sending businesses, their websites, sender identities, reply owners and domain choices have not been confirmed. Winnr mailboxes have not been purchased or connected. The setup panel records these decisions but cannot provision them through the available tools.

The existing webhook authentication contract is retained: a shared secret in `x-webhook-secret` or `x-smartlead-signature`. This is shared-secret comparison, not cryptographic signature verification. Smartlead support for configuring these headers has not been verified. Confirm a supported authenticated delivery method before registering the webhook; do not remove authentication to make delivery work. The authenticated history-sync endpoint is available for manual reconciliation in the meantime.

## Deployment order

1. In the authorised Liftor project, inspect the current schema and duplicate identities. The migration below aborts on duplicate normalized contact emails or duplicate provider lead identities. Resolve any conflicts deliberately before rerunning; the migration does not delete or merge existing records.
2. Apply `supabase/migrations/20260908124846_smartlead_outreach_wiring.sql`. This replaces the earlier prepared import-idempotency SQL note. It includes RLS for business setup, service-only invoker RPCs, identity constraints and event deduplication.
3. Deploy these functions with their shared modules: `smartlead-campaign-lead-import`, `smartlead-lead-push-preview`, `smartlead-lead-push-apply`, `smartlead-test-connection`, `smartlead-webhook`, `smartlead-ai-intake-apply`, and `smartlead-message-sync`. Use the checked-in `supabase/config.toml`; founder endpoints validate JWT and role internally as well.
4. Configure `SMARTLEAD_API_KEY` server-side. Keep `SMARTLEAD_LEAD_PUSH_ENABLED` and `SMARTLEAD_EVENT_APPLY_ENABLED` off until the relevant flow is verified. Configure `SMARTLEAD_WEBHOOK_SECRET` only with a supported authenticated delivery setup. No secret belongs in the frontend or repository.
5. Publish the frontend, then open `/founder/command-centre#smartlead-scale-setup-checklist`. Choose the intended businesses, save the mailbox plan, connect purchased accounts and run the connection check.
6. Map a draft Smartlead campaign to the correct Liftor business. Preview and import a known lead. Verify repeated import preserves identity and suppression. Test reply ingestion and duplicate delivery, confirming the message appears in `/founder/communications/received` for the correct business and no AI reply is sent.
7. Test an unsubscribe against a queued local message. For Liftor-originated transfers, enable the existing `smartlead_lead_push_gate` and that business's `external_provider_mutation_allowed` only when ready; these are also checked atomically at claim time. A transfer additionally needs the server flag, previewed contact IDs and the existing `PUSH SMARTLEAD LEADS` confirmation.
8. Assign warmed mailboxes, review the sequence, recipients, timezone and daily limits in Smartlead, then launch there. This code never starts a campaign. Initial emails and follow-ups share sending capacity.

`smartlead-ai-intake-apply` now replays persisted events without invoking AI; its existing `BUILD INTAKE ONLY` confirmation and event-apply server flag are required for writes. Webhooks remain log-only while event apply is off. Message-history sync defaults to preview mode and needs the same flag for writes.

## Mailbox purchasing plan

Published prices checked 8 September 2026:

| Service | Plan | Monthly price | Included capacity |
| --- | --- | --- | --- |
| [Smartlead](https://www.smartlead.ai/pricing) | Unlimited Smart | $174 | 150,000 campaign sends; 50,000 verified prospect emails |
| [Winnr](https://winnr.app/) | Enterprise | $189 | 200 mailboxes; 40 domain slots |
| Combined | | $363 | Domains, taxes and optional extras additional |

The working allocation is 50 mailboxes per business across four businesses, with 20 campaign emails per mailbox daily after warmup: 4,000 sends/day or 88,000 over 22 working days. This is a capacity calculation, not a deliverability or revenue promise. Winnr advises 2–4 weeks of warmup for new domains. Confirm the actual checkout terms and chosen domains before purchase.

## Verification

- 34 existing/extended import tests passed, including concurrent identity adoption, provider flags, nested lead IDs, errors and checkpoints.
- 22 integration tests passed. These execute the real migration in PGlite against a representative schema and cover identity constraints, role permissions, suppression, business ownership, event replay, queue cancellation, provider transfer outcomes, account pagination and message-history envelopes.
- Frontend TypeScript check passed and production Vite build passed. Existing bundle-size/dynamic-import warnings remain.
- `git diff --check` passed.
- Full Deno Edge type checking could not run: this environment refused the dependency download from `esm.sh`. This is still a deployment gate, not a passing check.
- No authenticated live Smartlead API calls, production database tests, live mailbox tests or full browser acceptance tests were performed. The representative database tests do not establish compatibility with uninspected production drift.
