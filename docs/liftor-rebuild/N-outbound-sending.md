# Section N — Outbound and sending architecture

## N1. The chain

```text
Apollo (discovery/enrichment, credit firewall)
  → Liftor canonical CRM (contacts / organisations / business_contact_relationships)
  → suppression + sendability (outboundSendability.ts, check_outreach_allowed, check_send_throttle)
  → portfolio ownership claim (one owner, 30-day cross-brand cooldown)
  → campaign mapping (outbound_provider_campaign_mappings)
  → lead mapping (outbound_provider_lead_mappings)
  → Smartlead campaign (delivery)
  → Winnr/GSM mailbox estate (the actual senders, warmed)
  → webhook events (outbound_provider_events) → CRM state update → audit trail
```

Every arrow can fail closed and several are gated (Section J). No arrow is currently proven end-to-end: see N6.

## N2. Estates

Two strictly separated sending estates, classified deterministically by `_shared/senderEstates.ts` / `gsmSenderEstate.ts`:

| Estate | Classification | Purpose | Live at audit |
|---|---|---|---|
| Shared commercial | `gsm` | portfolio cold outreach | 36 domains, 180 mailboxes |
| Global Health Access Trust | `ghat` | trust/charitable outreach, reputationally isolated | 3 domains, 20 mailboxes |
| Neon Candy | `external_non_gsm` | excluded from everything | not in this provider account |

Total live: **39 domains, 200 mailboxes, all active and warming**, all DNS/SPF/DKIM/DMARC verified.

Hard rules, covered by tests (`src/lib/__tests__/gsmSenderEstate.test.ts`):
- A GHAT address never classifies as GSM, and vice versa.
- GHAT mailboxes never count toward GSM capacity and are never selectable by GSM pool allocation.
- Neon Candy is always excluded.

## N3. Pools and allocation

`_shared/mailboxAllocator.ts` allocates from the GSM estate only: **Launch pool 30 / Evergreen pool 20 / quarantine**, thread-sticky (a conversation keeps its sender). A mailbox is not selectable unless SMTP + IMAP verified, Smartlead-connected, warm-up healthy and `health_score ≥ GSM_MIN_HEALTH_SCORE` (70).

## N4. Readiness state machine

`gsm_mailbox_readiness` (view) derives campaign-readiness from stored canonical state. A mailbox is `campaign_ready` only when **all** of: domain DNS verified; SMTP verified; IMAP verified; Smartlead connected; warm-up status healthy; health score ≥ 70; estate classification matches the requesting pool.

Current: **0 campaign-ready** — 190 of 200 mailboxes report "SMTP not verified" because they are not yet connected to Smartlead; the 10 connected trust mailboxes report "warming".

## N5. Mapping and event return

| Table | Purpose | Rows now |
|---|---|---|
| `outbound_provider_campaign_mappings` | Liftor campaign ↔ Smartlead campaign | 0 |
| `outbound_provider_lead_mappings` | Liftor contact ↔ Smartlead lead | 0 |
| `outbound_provider_events` | normalised replies/bounces/unsubscribes | 0 |

`smartlead-webhook` receives events (`verify_jwt=false`, secret-verified, fail-closed when `SMARTLEAD_WEBHOOK_SECRET` is absent), normalised by `_shared/smartleadEventNormalizer.ts` and deduped on provider event id. `smartlead-webhook-status` reports a boolean "secret configured", the persisted provider flag and observed event count — never the secret. `smartlead-send-dry-run` writes to `smartlead_send_dry_run_audit` and returns `BLOCKED, would_send=false` for any un-mapped link, with zero provider mutation.

Activation truth is tracked as a canonical **12-key checklist** (`smartleadActivationChecklist.ts`) persisted per business.

## N6. Pilot-first operating rule

**200 registered, warming mailboxes are inventory, not permission to use 200.**

Before any estate-wide activation, one pilot must pass, failing closed at any broken step:

1. one business, approved ICP/offer/copy
2. Apollo/data import under the credit firewall
3. canonical CRM person + organisation + business relationship
4. suppression and sendability checks
5. **1–2 selected sender mailboxes**, every other mailbox out of allocation
6. Smartlead campaign + lead mapping
7. actual delivery to **≤5 recipients**
8. reply / bounce / unsubscribe event return
9. CRM state update
10. complete audit trail

**No pilot has been sent or passed.** Founder live-launch approval remains a separate gate after a passing pilot, and estate-wide activation is a further gate after that.
