# Section R — Known gaps, contradictions, tech debt and security findings

Nothing in this section was repaired during the documentation job. Each item is evidence for a separate, approved change.

## R1. Security

| # | Finding | Evidence | Severity |
|---|---|---|---|
| S1 | `billionaire_institution_links` — RLS off, 0 policies | **FIXED (Stage 1, 21 Sep 2026)** — RLS enabled, founder/admin `ALL` policy, `anon` grants revoked, service-role retained. Live check: 0 public tables with RLS off | critical → closed |
| S2 | `philanthropic_institutions` — RLS off, 0 policies | **FIXED (Stage 1, 21 Sep 2026)** — same treatment | critical → closed |
| S3 | `billionaire_enrichment_batches` — RLS off, 0 policies | **FIXED (Stage 1, 21 Sep 2026)** — same treatment | warning → closed |
| S4 | `inbox_credentials` — RLS on with **no policy** (deny-by-default). Correct in effect but undocumented in-schema; a future permissive policy would silently expose mailbox credentials | `pg_policies` | note — **still open** |
| S5 | One Supabase project serves preview and production. There is no staging database; a preview mistake is a production mistake | project configuration | high — **still open** |
| S6 | 16 functions run with `verify_jwt = false`. Each one's own secret check is the only barrier | **MITIGATED (Stage 1)** — every one of the 16 now carries an explicit perimeter classification in `docs/liftor-rebuild/jwt-off-perimeter-inventory.json`, enforced by `scripts/check-jwt-off-perimeter.mjs`; a new `verify_jwt = false` function without a classification fails the check | structural risk — controlled |
| S7 | The three `customer-voice-*` receivers accepted **any anonymous caller** and wrote call logs and runtime events | **FIXED (Stage 1)** — `authenticateVoiceCaller` now requires `x-voice-webhook-secret` matching `CUSTOMER_VOICE_WEBHOOK_SECRET` and fails closed when the secret is unset | critical → closed |
| S8 | `outreach-send-worker` (SMTP-capable) created a service-role client with **no caller authorization** at all; only the `auto_send_enabled` flag stood between a caller and the send loop | **FIXED (Stage 1)** — founder/admin JWT or `CRON_SECRET` required before any privileged work | critical → closed |
| S9 | `outreach-send-draft` verified a session but **not a role** — any authenticated user could transmit an email over SMTP | **FIXED (Stage 1)** — founder/admin required before the transport is built | critical → closed |
| S10 | `internal-proposal-send` ran with the service role and **no caller check**, and marked proposals `sent` although it transmits nothing | **FIXED (Stage 1)** — founder/admin required; the proposal now moves to the new `prepared` state with `prepared_at`, and the timeline record is flagged `ignored_for_send_check` / `internal_proposal_prepared_not_transmitted` | critical → closed |
| S11 | Database linter reports 5 SECURITY DEFINER views, 3 functions without a fixed `search_path`, 3 extensions in `public`, and 405 SECURITY DEFINER functions executable by `anon`/`authenticated` | recorded, **not** repaired — pre-existing and unchanged by Stage 1; remediation is a separate approved stage because revoking EXECUTE broadly can break working RPC paths | high — **still open** |


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
| D2 | 945 page files vs **841** directly routed (the superseded figure of 32 was a generator import-resolution defect, `HISTORICAL_ONLY` — Section R7): the tab/panel convention is undocumented in code and easy to mis-navigate | maintainability |
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

## R6. Operator documentation coverage — CLOSED at source freeze `cf1c1373f3affdd66c17a53b97200ac06c3a878f`

| ID | Item | State | Evidence |
|---|---|---|---|
| R6.1 | 461 of 798 distinct founder routes had no operator entry and were accounted for only by module-family inventory | `HISTORICAL_ONLY` (recorded 17 September 2026, closed in the same audit) | superseded by Appendices V and W |
| R6.2 | Every one of the 798 distinct founder routes now resolves to exactly one terminal coverage state: **191 direct**, **607 inherited** (each naming its exact parent entry and route-to-parent relationship), **0 classified legacy/dead/diagnostic**, **0 uncovered**. "module-directory" and "inventory-only" no longer exist as coverage states. | closed | `validation-report.json` → `founder_route_coverage`, Appendix V §V2–V4 |
| R6.3 | 190 module families each have a generated operator entry (open-at route, what you see, controls, write posture, provider reach, approval phrase, empty/error states) | closed | Appendix W |
| R6.4 | Depth caveat: the 190 generated entries are evidence-derived from source, not hand-written prose. They state truthfully what each surface shows, writes and can reach; they are not narrative walkthroughs. Hand-written depth remains desirable for high-traffic modules. | open, low severity | Appendix W header |
| R6.5 | Sections 101–104 of the architecture manual remain historically accurate but need their superseding banners read first; a reader who skips the banner can still quote a stale estate figure. | open | `src/lib/manualArchitectureSync2026.ts` §101, §103/104 capacity note |

## R7. Figure provenance corrections (this audit)

| Claim | Old value | Current value | Cause |
|---|---|---|---|
| Non-internal triggers | 803 | **797** | the earlier catalog query omitted `n.nspname = 'public'`, so it also counted six Supabase-owned triggers in `auth`, `storage` and `cron`. Exact delta identified in Section F1.1; 797 + 6 = 803. Not a schema change. |
| Page files registered directly in the router | 32 | **841** | the earlier generator resolved only `@/`-prefixed imports; `src/App.tsx` imports pages with `./pages/...`, so relative imports were mis-counted as unrouted. Generator fixed (documentation tooling only); no route or page changed. |

Both old values are `HISTORICAL_ONLY` as of 17 September 2026 and must not be quoted as current.
