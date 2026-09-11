# GSM Outbound Infrastructure

Supporting note. The canonical sources are the Full Technical Manual Section 103
(`src/lib/manualArchitectureSync2026.ts`) and User Manual Section 114
(`src/lib/liftorUserManualContent.ts`). This document references them and does not compete with them.

## Architecture

```text
Apollo (data only)
    -> Liftor (system of record + command centre)
        -> Smartlead (campaign execution + sender rotation)
            -> GSM / Winnr sender estate
```

Global Solutions Management LLC owns one shared portfolio sending estate. Portfolio businesses
borrow capacity; they never own mailbox estates.

## Current post-purchase state — 11 September 2026

The Winnr account and mailbox estate have now been purchased. The live GSM registry deliberately
remains empty until the provider estate is authenticated and synced; Liftor must not invent mailbox
or domain rows from the planned capacity. The only secure external credential required for this step
is `WINNR_API_TOKEN`, stored as a server-side Edge Function secret and never in browser code, chat,
GitHub or the GSM database.

Winnr sync reads the provider's current domains and email users and idempotently stores only
non-secret operational metadata. SMTP/IMAP passwords and API credentials are not persisted in
Liftor. Winnr warming is a separate founder-confirmed action and does not make a mailbox
campaign-ready by itself.

## Capacity model

| Lane | Target | Use |
| --- | --- | --- |
| Launch | 30 mailboxes | temporarily lent to the business currently launching |
| Evergreen | 20 mailboxes | persistent capacity for portfolio businesses |
| Quarantine | 0 | mailboxes withdrawn from selection |

The targets describe the desired 50-mailbox operating model; the actual estate count is taken only
from the provider sync. Sticky in-flight senders: an allocation flagged in-flight, or inside its
sticky window, is never reallocated. Releasing launch capacity cannot rewrite a live thread.

## Readiness

`supabase/functions/_shared/gsmSenderEstate.ts` — pure, deterministic, no I/O. States:
`provisioned_pending`, `dns_pending`, `smtp_failed`, `imap_failed`, `smartlead_disconnected`,
`warming`, `campaign_ready`, `quarantined`, `retired`. `evaluateSenderInfrastructureReadiness` is
the canonical source of the education gate's `sender_infrastructure_ready` boolean.

A mailbox is not campaign-ready until SMTP and IMAP are healthy, Smartlead is connected, warm-up
is complete, its health threshold is met, and it is neither quarantined nor retired.

## Registry

`gsm_sending_domains`, `gsm_mailboxes`, `gsm_sender_pools`, `gsm_mailbox_allocations`,
`gsm_provider_sync_runs`. Founder/admin RLS. **No plaintext secrets** — SMTP/IMAP passwords, Winnr
tokens and Smartlead keys are never stored in these tables; `stripSecretFields` removes
credential-shaped keys before every write.

## Providers

- `gsm-winnr-sync` — read-only test + idempotent purchased-estate registry sync. Current Winnr API
  paths are isolated in `_shared/winnrClient.ts` (`/domains`, `/email-users`, `/warming`,
  `/warming/overview`, `/warming/enable`, `/warming/enable-async`, `/export`). Warming is an
  explicit founder-confirmed mutation for already-synced GSM mailboxes only. This endpoint never
  purchases new infrastructure and never returns or stores provider credentials.
- `gsm-smartlead-mailbox-sync` — read-only `GET /email-accounts` using the server-side
  `SMARTLEAD_API_KEY`, mapped onto existing GSM mailboxes by Smartlead account id or email. Preview
  separates matched rows from unmatched provider accounts. It creates no campaigns, sends no mail,
  and creates no GSM mailbox rows. A Smartlead warm-up-enabled signal means `warming`, never
  `campaign_ready`.

## Exclusion

`hello@neoncandy.online` / `neoncandy.online` are `external_non_gsm` and can never be counted or
allocated in the GSM estate.

## Post-purchase completion sequence

1. Create a Winnr read/write API token in Winnr Settings → API Keys and store it only as the
   server-side secret `WINNR_API_TOKEN`.
2. Run Winnr **Test** and **Preview Sync** from `/founder/gsm-outbound`; confirm provider counts and
   Neon Candy exclusion.
3. Apply the idempotent registry sync. Actual domain/mailbox counts now become authoritative.
4. Start Winnr warming on the synced GSM estate with founder confirmation. For new domains the
   guarded default is 15 warm-up emails/day with Winnr's slow ramp profile.
5. Sync the same mailbox accounts from Smartlead and confirm SMTP/IMAP/provider identity matching.
6. Populate Launch / Evergreen allocation only from mailboxes that satisfy the readiness engine.
7. Configure/verify campaign webhooks when the first Smartlead provider campaign is mapped.
8. Run Liftor's zero-send dry-run. Live campaign approval and sending remain separate founder gates.
