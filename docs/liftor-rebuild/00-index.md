# Liftor Rebuild Manual — canonical current-state technical specification

**source_freeze_sha:** `cf1c1373f3affdd66c17a53b97200ac06c3a878f` — the single canonical audit source for this manual and for every generated catalog, coverage manifest and validation report in this folder. Lovable HEAD and GitHub `main` were independently rechecked and matched at this SHA, and the runtime source tree (`src/**`, `supabase/**`, `apps/**`, `.github/**`) is byte-identical to it at the documentation commit (`git diff cf1c1373 -- src supabase apps .github` is empty).

**documentation_commit:** recorded in `docs/liftor-rebuild/DOCUMENTATION-COMMIT.md` and in the final audit report. It is deliberately **not** embedded inside the generated files: a commit cannot contain its own hash, so a generated file that claimed to would be lying. The chain is: source frozen at `source_freeze_sha` → documentation regenerated from exactly that tree → documentation commit created on top of it, changing documentation files only.

**Superseded coverage targets (`HISTORICAL_ONLY`):** `4fc7f388943cc8e70d47d50247f240c8b25a140a` (founder SME sales-linked giving rail MVP), `f565c09876a5cfe0207dc31981ad026073508a55` (Giving Rail production backend), `08d8e89274b6f04ff3a306ff0f55bb59d7ea5cf1` and `a513cacffe2a1064a5ea172c9170c46a55c51b8e` (earlier generation stamps). All are ancestors of the freeze SHA; none is a current coverage target.

**Audit date:** 17 September 2026.
**Status:** current-state rebuild specification. No history, no diary. Superseded material lives in the Build Log and in dated `docs/*` reports, which remain untouched historical evidence.

## Truth labels — use these, never "ready", "working" or "complete"

| Label | Meaning |
|---|---|
| `BUILT_IN_CODE` | the code exists and compiles. Nothing more. |
| `LIVE_CONFIGURED` | configured in the live database or at the provider, verified read-only |
| `END_TO_END_PROVED` | a real run completed and the result was observed. Rare in Liftor today. |
| `BLOCKED` | deliberately prevented by a gate, flag or missing approval |
| `FAIL_CLOSED` | on error or missing configuration it refuses rather than proceeding |
| `PARTIAL` | some of the path is proved, the rest is not — state which part |
| `DEAD_OR_UNREACHABLE` | present in the repository but not reachable from any route or caller |
| `HISTORICAL_ONLY` | true on its date, not current; retained as evidence |
| `UNKNOWN — NOT VERIFIED` | not checked in this audit. Say this instead of guessing. |

## Audit boundary — no source divergence

Sections A–U are written against the working tree at `08d8e89274b6f04ff3a306ff0f55bb59d7ea5cf1`; there is no gap between the
documented tree and the audited tree. The whole `apps/giving-platform` standalone product, its three
`gr_*` migrations, its `gr-public-intake` edge function and
`.github/workflows/giving-platform-quality.yml` are present in the tree and documented in **Section U**,
not read from history. Liftor core (`src/**`, `supabase/functions/**`, `supabase/migrations/**`)
is unchanged by that product.

If HEAD advances again, regenerate the catalogs (`node scripts/generate-rebuild-manual-catalogs.mjs`)
and restate the SHA here before treating this manual as current. The stamped SHA is the commit the
generator read; any commit created after it in the same documentation pass contains documentation
files only and changes no source under `src/**`, `supabase/**` or `apps/**`.

## Reading rule

One current statement per fact. If a sentence in this manual conflicts with an older dated document, **this manual is correct for current state** and the dated document is historical evidence of what was true on its date.

Capability is not permission. A file existing, a function deploying and a provider being reachable are three different facts, and none of them means an action is switched on. Section J and Section Q are the only places that state what is actually enabled.

## Structure

| Section | File | Contents |
|---|---|---|
| A | [A-repository-build.md](./A-repository-build.md) | Repository, build tooling, dependencies, folder map, commands, deployment |
| B | [B-auth-roles-rls.md](./B-auth-roles-rls.md) | Auth, roles, route guards, tenancy, RLS model |
| C | [C-route-catalog.md](./C-route-catalog.md) | **Generated.** Every registered route, guard, page, source file |
| D | [D-page-surface-catalog.md](./D-page-surface-catalog.md) | **Generated.** Every page file, its edge-function calls, tables, writes, confirmation phrases |
| E | [E-component-service-catalog.md](./E-component-service-catalog.md) | **Generated.** Components, engines/helpers, hooks and contexts |
| F | [F-database-rebuild-spec.md](./F-database-rebuild-spec.md) | Schema by domain, views, RPCs, triggers, indexes, RLS model and findings |
| G | [G-migration-map.md](./G-migration-map.md) | **Generated.** All 442 migrations and the objects each establishes |
| H | [H-edge-function-catalog.md](./H-edge-function-catalog.md) | **Generated.** All 620 edge functions: auth, hosts, writes, gates, helpers |
| I | [I-provider-map.md](./I-provider-map.md) | Apollo, Smartlead, Winnr, mail, AI gateway, social, Stripe, voice |
| J | [J-external-action-safety.md](./J-external-action-safety.md) | Gate rows, confirmation phrases, batch caps, fail-closed paths |
| K | [K-data-model-flows.md](./K-data-model-flows.md) | CRM/RI identity model and end-to-end flows |
| L | [L-ai-architecture.md](./L-ai-architecture.md) | Gateway, agents, budgets, leases, kill switch |
| M | [M-business-lifecycle.md](./M-business-lifecycle.md) | Setup tunnel → micro-batch → channel execution |
| N | [N-outbound-sending.md](./N-outbound-sending.md) | Apollo → Liftor → Smartlead → Winnr estate and readiness state machine |
| O | [O-jobs-webhooks.md](./O-jobs-webhooks.md) | Scheduled jobs, workers, webhook receivers, event normalisation |
| P | [P-tests-ci.md](./P-tests-ci.md) | Test suites, acceptance functions, CI — and what they do not prove |
| Q | [Q-live-state-snapshot.md](./Q-live-state-snapshot.md) | Read-only live database/provider truth, separated from code capability |
| R | [R-known-gaps.md](./R-known-gaps.md) | Contradictions, tech debt, security findings |
| S | [S-disaster-recovery-runbook.md](./S-disaster-recovery-runbook.md) | Blank repo + blank database → working Liftor |
| T | [T-traceability.md](./T-traceability.md) | Subsystem → files/tables/routes/functions map |
| U | [U-standalone-apps.md](./U-standalone-apps.md) | Standalone Giving Rail platform, separated from Liftor core and GHAT |
| V | [V-user-manual-coverage.md](./V-user-manual-coverage.md) | **Generated.** Every founder route → direct / inherited / classified operator coverage, route-by-route |
| W | [W-module-operator-entries.md](./W-module-operator-entries.md) | **Generated.** One operator entry per founder module family (190) |
| — | [source-coverage-manifest.md](./source-coverage-manifest.md) | Every tracked file mapped to a section (+ `.json` twin) |
| — | [validation-report.json](./validation-report.json) | Machine-checkable counts behind the coverage claims |
| — | [doc-normative-vs-historical.md](./doc-normative-vs-historical.md) | Which `docs/**` files are normative and which are historical |

## Regenerating the generated sections

```bash
SOURCE_FREEZE_SHA=cf1c1373f3affdd66c17a53b97200ac06c3a878f node scripts/generate-rebuild-manual-catalogs.mjs
node scripts/check-rebuild-manual-consistency.mjs
```

The generator reads the working tree only. It writes C, D, E, G, H, V, W, the coverage manifest and the validation report, and stamps `source_freeze_sha` into every one of them. It never contacts the database or any provider. The checker re-derives route, page, edge-function, migration and manifest coverage independently, verifies the freeze stamp is identical across all generated files, and scans for stale current-state claims.

## Headline scale at this source freeze

| Thing | Count |
|---|---|
| Tracked files | 2,975 (includes the three new documentation files added by this closeout) |
| Registered routes | 876 (800 founder-guarded — 798 distinct paths, 46 public, 6 redirects) |
| Founder module families | 190 (Appendix W, one operator entry each) |
| Founder route operator coverage | **191 direct + 607 inherited + 0 classified + 0 uncovered = 798** (Appendix V) |
| Page files | 945 (841 registered directly in the router; the remainder are tabs/panels of a parent page) |
| Components | 419 |
| `src/lib` engines/helpers | 177 |
| Edge functions | 620 (+ 52 shared helper modules) |
| Migrations | 442 |
| Public tables | 1,112 (1,109 RLS on, **3 RLS off** — Section F5) |
| Public views | 26 |
| Public functions/RPCs | 390 |
| RLS policies | 1,520 |
| Triggers (non-internal, `public`) | **797** (the superseded 803 counted six Supabase-owned `auth`/`storage`/`cron` triggers — Section F1.1) |
| Indexes | 2,774 |
| Foreign keys | 934 |
| External action gates | 19, **all disabled** |
