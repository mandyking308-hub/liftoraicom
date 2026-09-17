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

## Current post-purchase state — 11 September 2026 (historical snapshot)

Historical snapshot. **Superseded by the 17 September 2026 truth sync below.** At that date the
Winnr account and mailbox estate had been purchased but the GSM registry was deliberately empty
pending an authenticated provider sync. The only secure external credential required was
`WINNR_API_TOKEN`, stored as a server-side Edge Function secret and never in browser code, chat,
GitHub or the GSM database. That remains true.

Winnr sync reads the provider's current domains and email users and idempotently stores only
non-secret operational metadata. SMTP/IMAP passwords and API credentials are not persisted in
Liftor. Winnr warming is a separate founder-confirmed action and does not make a mailbox
campaign-ready by itself.

## Live estate — 17 September 2026 (current truth)

| Fact | Live value |
| --- | --- |
| Sending domains | 39 (39 DNS verified; SPF 39/39, DKIM 39/39, DMARC 39/39) |
| Mailboxes | 200 (all active, all warming) |
| GSM estate | 180 mailboxes / 36 domains |
| GHAT estate | 20 mailboxes / 3 domains |
| Smartlead-connected | 10 (GHAT only); GSM 0 |
| Campaign-ready mailboxes | 0 |
| Campaign mappings / lead mappings / provider events | 0 / 0 / 0 |
| Smartlead provider row | connected, healthy; `webhook_configured = false`; `warmup_status = not_configured` |

Warm-up state and health scores are ingested from the provider warm-up feed by `gsm-winnr-sync`,
which also refreshes canonical `readiness_state` after every apply.

## Pilot-first operating rule (mandatory)

**200 registered, warming mailboxes are inventory, not permission to use 200.** No estate-wide
activation is permitted until one tiny controlled pilot has been delivered and returned
successfully. The pilot allocates only a very small number of sender mailboxes and a tiny recipient
micro-batch; every other mailbox stays out of allocation and out of execution. The existing
micro-batch control caps Smartlead cold outreach at **≤5 recipients** — that is the preferred size
of the first proof, not a reason to connect all senders.

The pilot must prove, failing closed at any broken step: one business → approved ICP/offer/copy →
Apollo/data import → canonical CRM record plus business relationship → suppression and sendability
checks → selected sender mailbox(es) → Smartlead campaign and lead mapping → actual delivery →
reply/bounce/unsubscribe event return → CRM state update → audit trail.

No pilot has been sent and none has passed. Founder final live-launch approval remains a separate
gate after the pilot; estate-wide activation is a further gate after that.

## Capacity model

| Lane | Target | Use |
| --- | --- | --- |
| Launch | 30 mailboxes | temporarily lent to the business currently launching |
| Evergreen | 20 mailboxes | persistent capacity for portfolio businesses |
| Quarantine | 0 | mailboxes withdrawn from selection |

These are **allocation targets, not the size of the estate.** The live estate is 39 domains and 200
mailboxes (GSM 180 / GHAT 20); the actual count is taken only from the provider sync. The 30/20
constants in `src/lib/gsmSenderEstate.ts` therefore model a 50-mailbox allocation ceiling against a
180-mailbox GSM estate — stale modelling that under-allocates, recorded as a gap rather than a
safety defect. Sticky in-flight senders: an allocation flagged in-flight, or inside its sticky
window, is never reallocated. Releasing launch capacity cannot rewrite a live thread.

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

## GHAT estate (Global Health Access Trust) — 14 September 2026

`globalhealthaccesstrust.org`, `globalhealthaccesstrust.net` and `globalhealthaccesstrust.co` form a dedicated, segregated sending estate for Global Health Access
Trust (Winnr tag `GHAT-Outbound`). It is registered in the same physical registry tables with
`estate_classification = 'ghat'` and is never counted in the GSM capacity targets, never allocated from
the Launch/Evergreen lanes, and never selectable by `selectGsmMailboxes`.

Classification is deterministic and lives in `supabase/functions/_shared/senderEstates.ts`: the
address domain always wins over a stored column value or provider tag. `hello@neoncandy.online`
remains `external_non_gsm`.

Live state (17 September 2026): 3 GHAT domains (globalhealthaccesstrust.org/.net/.co), 20 mailboxes,
all warming; 10 connected to Smartlead with SMTP and IMAP healthy, 10 not yet connected;
0 campaign-ready, 0 campaigns, 0 sends, 0 lead pushes.
Founder view: `/founder/ghat-outbound`.

Readiness note: the health-score threshold only quarantines after warm-up completes; an unmeasured
score during warm-up reports `warming`, never `campaign_ready`.
