# Section Q — Live state snapshot (17 September 2026)

Read-only facts from the production database and the provider APIs. **Separate from code capability.** Everything in Sections A–P describes what the system *can* do; this section is what is *true*.

## Q1. Runtime posture

| Fact | Value |
|---|---|
| Runtime mode | `LIVE_INTERNAL_TEST` (set 27 May 2026, `system_mode_ledger`) |
| Execution modes defined | `sales`, `outreach` (default), `hybrid` |
| External action gates | 19 rows, **all `enabled = false`** |
| AI kill switch | `global_ai_paused = false`, `simulation_mode = false` |
| Businesses | 14 rows (the platform is built to onboard far more; **do not claim 40 are configured**) |

## Q2. Database

1,112 public tables · 26 views · 390 functions · 1,520 policies · 803 triggers · 2,774 indexes · 934 foreign keys · **3 tables with RLS off** (Section F5).

## Q3. Sending estate (Winnr)

| Fact | Value |
|---|---|
| Plan | enterprise, active |
| Domains | 39, all DNS verified, SPF 39/39, DKIM 39/39, DMARC 39/39 |
| Mailboxes | 200, all active |
| Warming | 200 of 200 |
| Shared commercial (GSM) | 180 mailboxes across 36 domains |
| Trust (GHAT) | 20 mailboxes across 3 domains |
| Neon Candy | not present in this provider account |

## Q4. Smartlead

| Fact | Value |
|---|---|
| Provider row | connected / healthy |
| Mailboxes connected | 10 (GHAT only). GSM connected: 0 |
| Webhook configured | **false** |
| Provider warm-up status row | `not_configured` |
| Campaign mappings / lead mappings / events | 0 / 0 / 0 |
| Mailboxes campaign-ready | **0** |

## Q5. Apollo

Infrastructure built; the only active verified connection row is **Neon Candy** (search/enrichment status ok). Apollo is not configured business-by-business across the portfolio. All three Apollo gates disabled. Credit firewall live in Postgres.

## Q6. Data volumes worth knowing

| Table | Rows |
|---|---|
| `relationship_intelligence_contacts` | 428 |
| `ai_gateway_requests` | 6 |
| Education contacts in scope | 0 |

## Q7. Unresolved blockers to outbound

1. 190 of 200 mailboxes are not connected to Smartlead → 0 campaign-ready.
2. Smartlead webhook not configured → no event return path proven.
3. No campaign mapping, no lead mapping, no delivered message, no returned event — **no pilot has been sent or passed**.
4. Apollo not configured per business.
5. Three RLS-off tables (data exposure, not an outbound blocker).
6. Founder live-launch approval not given, and correctly still a separate gate.
