# Manual Architecture Reconciliation — 13 October 2026

**Change type:** documentation-only reconciliation (no runtime behaviour, route, schema, RLS, gate, provider, campaign or sender change)
**Code HEAD inspected:** `0f074fbde60e9a9a5f752eb90687f2d738829360` (Rebuild Manual catalogue freeze remains `cf1c1373…` — see "Coverage" below)
**Live data re-read:** 13 Oct 2026 ~09:50 UTC, read-only queries against the Liftor database. Provider figures come from the 13 Oct 09:16 UTC read-only Winnr test / Smartlead GET diagnostic and the 13 Oct 09:50 UTC Smartlead REST poll snapshot. No provider call was made for this reconciliation.

## Status vocabulary used everywhere in this delta
- **IMPLEMENTED CODE** — exists in the repository; says nothing about live use.
- **LIVE CONFIGURED & PROVIDER-VERIFIED** — present in the live database AND confirmed by a provider read.
- **HISTORICAL ONLY** — true at a dated point; not current.
- **TARGET FUTURE BEHAVIOUR** — intended design; not enabled.
- **UNVERIFIED / BLOCKED** — not proven, or gated off.

## Direction (TARGET FUTURE BEHAVIOUR)
Liftor is the central multi-tenant control plane, portfolio CRM and AI intelligence layer for repeatable multi-business onboarding and a compliant, largely autonomous end-to-end journey: prospect → compliant outreach → reply/conversation → AI qualification → demo → policy-approved proposal/checkout/payment → onboarding → service → renewal. Routine steps run automatically **only after** their policy, readiness, compliance and execution gates are approved. Humans handle exceptions (customer request, custom terms, large value, legal/compliance, complaints, low confidence, payment failures). **Present state: gated and draft. None of this journey is externally activated.**

## Verified live state — 13 October 2026
| Fact | Value | Class |
|---|---|---|
| Businesses | 1 active (Kindnesss `640de582-a112-4d16-a221-03c27f00c6ec`), 14 `legacy_prelaunch` incl. an older Kindnesss, Neon Candy, Aurelia, Billy and the Wild Forest, Kingsbridge Global — all rows/IDs preserved | LIVE |
| Kindnesss linked contacts | 30; all `qualification=needs_review`, `campaign_eligible=false`, `sendable_status=needs_review`, `compliance_status=pending_review`; lawful basis blank 27, `legitimate_interests_provisional` 3 | LIVE |
| Eligible to send | **0** | LIVE |
| Smartlead campaign 4103531 | `DRAFTED`, 6 leads (all not started), 0 sent / 0 replies / 0 bounces / 0 unsubscribes, cap 3/day, tracking off, HTML mode, 2 GSM senders attached (snapshot 13 Oct 09:50 UTC) | LIVE + PROVIDER (REST poll) |
| Campaign / lead mapping | 1 outbound campaign mapping, inactive; 0 lead mappings | LIVE |
| Mailboxes (Liftor registry) | 180 GSM + 20 GHAT, all active, SMTP ok / IMAP ok, `warmup_status=warming`, `readiness_state=warming`, 0 campaign-ready | LIVE |
| Smartlead warm-up (provider) | 13 Oct GET checked only the first 100 accounts: 0 with warm-up enabled. The two chosen GSM senders were not individually proven | UNVERIFIED |
| GHAT | charitable estate — never usable for Kindnesss commercial mail | RULE |
| External gates | `smartlead_campaign_start_gate`, `smartlead_lead_push_gate`, `native_email_send_gate`, `smartlead_webhook_create_gate` all **OFF** (re-read 13 Oct) | LIVE |
| Business outbound connection | configured, `is_enabled=false`, `mutations_enabled=false`, `inbound_receiver_enabled=false` | LIVE |
| Webhook | provider webhook 902244 registered; signing secret not provisioned; signed receiver acceptance **not proven**. `webhook_configured=true` is not proof | BLOCKED |
| Event return fallback | scoped 10-minute REST poll into `smartlead_*` snapshot tables is succeeding | LIVE |
| Apollo | paid enrichment off, hard limit 0; no paid reveal performed | LIVE |

## Superseded statements now labelled HISTORICAL ONLY
- "Neon Candy is the active test business" (User Manual §3, Slim Manual, Section Q5) — Neon Candy is `legacy_prelaunch`.
- "Smartlead webhook not configured / 0 campaign links / 10 GHAT connected" (Section Q4, 17 Sep) — now 200 connected, webhook registered but unsigned, one inactive mapping, draft campaign 4103531.
- "14 businesses" as an active count — 14 are archived; 1 is active.
- Kindnesss 25–50-recipient education campaign shell — the current first-send policy is **≤5**.
- Business technical manuals saying "no Smartlead campaign ID" — draft 4103531 now exists (Kindnesss only).

## Surfaces updated in this reconciliation
- Full Technical Manual: `src/lib/manualArchitectureSync2026.ts` → v6.10, new Section 107.
- Rebuild Manual: `docs/liftor-rebuild/Q-live-state-snapshot.md` — Section Q8 dated delta appended; Q1–Q7 labelled 17 Sep historical.
- User Manual: `src/lib/liftorUserManualContent.ts` → v1.20 (business-selector correction, new §36); `docs/liftor-founder-user-guide.md` dated delta.
- Business Manuals: all 12 files under `docs/business-manuals/**` — dated status delta appended; product text untouched.
- Slim Mandy Manual: `src/lib/slimMandyManualContent.ts` → v1.14; download filename now matches the version.
- Manuals Hub hierarchy panel: pointer to Section 107.
- Database documentation records: four `manual_update_drafts` applied, `manual_source_layers` versions/review dates, one `manual_versions` row, one `build_log_entries` row. The 13 Oct addendum `manual_pages` row and all 130 older pages left unchanged.

## Coverage (honest)
`scripts/check-rebuild-manual-consistency.mjs` reports pre-existing drift since the 17 Sep freeze: route catalogue (880 registered vs 876 documented), 3 founder routes without operator entries, 4 pages, 5 edge functions (`customer-product-account-claim`, `customer-success-standard-enqueue`, `customer-success-standard-run`, `gsm-smartlead-onboard`, `smartlead-campaign-sync`), 11 migrations and 125 manifest paths not catalogued. The generated catalogues (Sections C/D/H/G/manifest) were **not** regenerated in this pass, so they remain a 17 Sep snapshot. Do not call every route/table "documented current" until a regeneration at a new freeze SHA.

## Blockers to the Kindnesss first pilot (≤5 recipients, 1–2 GSM senders)
1. 0 eligible contacts: record-level lawful basis (27 blank, 3 provisional), country/subscriber type, source evidence.
2. No approved copy — founder rejected the earlier copy; draft `f120d6f2…` is unapproved and not loaded.
3. Opt-out rendering and business postal/contact details not verified in a real received message.
4. Sender warm-up for the two chosen GSM accounts not proven at the provider; Liftor shows `warming`, 0 campaign-ready.
5. Campaign mapping inactive, 0 lead mappings; campaign holds 6 leads where the pilot is ≤5 cleared.
6. Webhook signing secret absent; signed event return unproven (REST polling works as fallback).
7. Four gates OFF and outbound connection disabled — correctly, until 1–6 are resolved and the founder approves launch.
