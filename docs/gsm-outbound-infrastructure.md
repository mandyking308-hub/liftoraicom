# GSM Outbound Infrastructure

Supporting note. The canonical sources are the Full Technical Manual Section 103
(`src/lib/manualArchitectureSync2026.ts`) and User Manual Section 114
(`src/lib/liftorUserManualContent.ts`). This document references them and does not compete with them.

## Architecture

```text
Apollo (data only)
    -> Liftor (system of record + command centre)
        -> Smartlead (campaign execution + sender rotation)
            -> GSM / Winnr sender estate (up to 10 domains, ~50 mailboxes)
```

Global Solutions Management LLC owns one shared portfolio sending estate. Portfolio businesses
borrow capacity; they never own mailbox estates.

## Capacity model

| Lane | Target | Use |
| --- | --- | --- |
| Launch | 30 mailboxes | temporarily lent to the business currently launching |
| Evergreen | 20 mailboxes | persistent, initially 5 each for Billy and the Wild Forest, Aurelia, Kindnesss, Kingsbridge Global |
| Quarantine | 0 | mailboxes withdrawn from selection |

Sticky in-flight senders: an allocation flagged in-flight, or inside its sticky window, is never
reallocated. Releasing launch capacity cannot rewrite a live thread.

## Readiness

`supabase/functions/_shared/gsmSenderEstate.ts` — pure, deterministic, no I/O. States:
`provisioned_pending`, `dns_pending`, `smtp_failed`, `imap_failed`, `smartlead_disconnected`,
`warming`, `campaign_ready`, `quarantined`, `retired`. `evaluateSenderInfrastructureReadiness` is
the canonical source of the education gate's `sender_infrastructure_ready` boolean.

## Registry

`gsm_sending_domains`, `gsm_mailboxes`, `gsm_sender_pools`, `gsm_mailbox_allocations`,
`gsm_provider_sync_runs`. Founder/admin RLS. **No plaintext secrets** — SMTP/IMAP passwords, Winnr
tokens and Smartlead keys are never stored in these tables; `stripSecretFields` removes
credential-shaped keys before every write.

## Providers

- `gsm-winnr-sync` — read-only test + idempotent registry sync. All endpoint paths live in
  `_shared/winnrClient.ts`. Mutation paths are preview-by-default and additionally require an
  explicit external-action confirmation; provisioning is disabled in this release.
- `gsm-smartlead-mailbox-sync` — read-only `GET /email-accounts`, mapped onto existing GSM mailboxes
  by Smartlead account id or email. No campaigns, no sends, no new mailbox rows.

## Exclusion

`hello@neoncandy.online` / `neoncandy.online` are `external_non_gsm` and can never be counted or
allocated in the GSM estate.

## Onboarding steps for the founder

1. Create the GSM Winnr account.
2. Add `WINNR_API_TOKEN` as a server secret.
3. Buy and verify up to 10 GSM sending domains.
4. Provision ~50 mailboxes, start warmup.
5. Sync into the registry (`/founder/gsm-outbound`).
6. Connect them in Smartlead and sync account status.
7. Allocate Launch 30 / Evergreen 20.
8. Sender readiness becomes true only then. Founder send approval remains a separate gate.
