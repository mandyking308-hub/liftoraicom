# Section R — Known gaps, contradictions, tech debt and security findings

Nothing in this section was repaired during the documentation job. Each item is evidence for a separate, approved change.

## R1. Security

| # | Finding | Evidence | Severity |
|---|---|---|---|
| S1 | `billionaire_institution_links` — RLS off, 0 policies: wealth-relationship data on private individuals readable by anyone with the anon key | `pg_class.relrowsecurity = false` | critical |
| S2 | `philanthropic_institutions` — RLS off, 0 policies: institution and principal contact data publicly readable | same | critical |
| S3 | `billionaire_enrichment_batches` — RLS off, 0 policies | same | warning |
| S4 | `inbox_credentials` — RLS on with **no policy** (deny-by-default). Correct in effect but undocumented in-schema; a future permissive policy would silently expose mailbox credentials | `pg_policies` | note |
| S5 | One Supabase project serves preview and production. There is no staging database; a preview mistake is a production mistake | project configuration | high |
| S6 | 16 functions run with `verify_jwt = false`. Each one's own secret check is the only barrier; a future function added to that list without a check would be open to the internet | `supabase/config.toml` | structural risk |

## R2. Manual contradictions found and resolved by this manual

| Contradiction | Resolution |
|---|---|
| User Manual described a "live-first / no readiness gate" flow beside `LOCKED_BY_DESIGN` lifecycle pages | Section M states one rule: internal activation first, readiness computed, micro-batch before scale. The live-first wording is superseded |
| Slim Manual said 200 mailboxes reconciled in one place and "0 registered GSM mailboxes" in a later Sending Estate paragraph | Section Q3 is the single statement: 39 domains / 200 mailboxes / 180 GSM / 20 GHAT |
| Legacy "8 domains / 2 inboxes" and "0 domains / 0 mailboxes" states quoted as current | All such statements are historical; the only current estate figures are in Q3 |
| "Every public table has RLS" | False. 1,109 of 1,112. Sections B5.1 and F5 |
| SME Giving Rail (the freeze commit) absent from all manuals | Documented in Section K7 |
| Apollo described as portfolio-wide | Only Neon Candy verified (Q5) |
| "40 businesses configured" | 14 rows in `businesses` (Q1) |
| `contacts.assigned_business` single-business model | Superseded by `business_contact_relationships` (K1) |
| Healthcare overlay read as a product | Readiness overlay only, NOT LIVE (K9) |
| IONOS as the cold-outreach lane | Superseded by the Smartlead/Winnr two-lane model (N) |

## R3. Code ↔ live-state conflicts

1. `crm_accounts` is referenced as a planned object in `src/lib/crm/portfolioCrmModel.ts`; no such table exists. Prospect organisation context currently lives on the contact plus pool membership.
2. Some acceptance functions mention `OPENAI_API_KEY`; the runtime AI path is the Lovable gateway only.
3. Scheduled-job frequencies are provider-side and not encoded in the repository, so the code cannot tell you when anything runs.
4. Several provider adapters are deliberate safe-off shells (social viral/Tubular, `social-engagement-provider-event-receiver`). A reader could mistake the file's existence for a working integration.
5. NeonCandy execution lane is parked by founder decision but retained intact in code.

## R4. Architecture and tech debt

| # | Item | Impact |
|---|---|---|
| D1 | 876 routes and 945 page files in one router with no code-splitting — a single very large JS chunk; public visitors download founder surfaces | performance + exposure surface |
| D2 | 945 page files vs 32 directly routed: the tab/panel convention is undocumented in code and easy to mis-navigate | maintainability |
| D3 | Duplicate/overlapping routes exist in `App.tsx` (previously observed); the later registration silently wins | correctness |
| D4 | Some pages/engines are unreachable from any route (dead code in the bundle) | bloat, false confidence |
| D5 | 620 edge functions with substantial copy-paste between families; a safety fix must be applied N times | safety drift |
| D6 | 442 migrations with no squashed baseline — a rebuild replays the whole history | rebuild time |
| D7 | Lint debt is material; `npm run lint` is not a release gate | quality |
| D8 | Playwright configured but not run in CI | no UI regression safety |
| D9 | No RLS tests; policy regressions are invisible to CI | security |
| D10 | AI layer effectively untested at volume (6 live requests) | unknown cost/throughput behaviour |

## R5. Operational gaps

1. No proven outbound pilot (Section N6) — the single biggest unknown in the platform.
2. Smartlead webhook unconfigured → event return path unproven.
3. 190 mailboxes warmed but unconnected: inventory without a delivery path.
4. Apollo per-business configuration absent.
5. Education portfolio has 0 contacts in scope; four campaign shells exist but nothing is loaded.
