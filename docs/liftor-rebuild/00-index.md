# Liftor Rebuild Manual — canonical current-state technical specification

**Freeze commit audited:** `4fc7f388943cc8e70d47d50247f240c8b25a140a` (founder SME sales-linked giving rail MVP).
**Documented tree:** `f52881aadd42bef28e7f93ed658e8be08922370a` — one commit later ("Build standalone global giving platform prototype"); the freeze commit is an ancestor of it and the delta is the standalone `apps/giving-platform` prototype, documented in Section A6.
**Audit date:** 17 September 2026.
**Status:** current-state rebuild specification. No history, no diary. Superseded material lives in the Build Log and in dated `docs/*` reports, which remain untouched historical evidence.

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
| — | [source-coverage-manifest.md](./source-coverage-manifest.md) | Every tracked file mapped to a section (+ `.json` twin) |
| — | [validation-report.json](./validation-report.json) | Machine-checkable counts behind the coverage claims |
| — | [doc-normative-vs-historical.md](./doc-normative-vs-historical.md) | Which `docs/**` files are normative and which are historical |

## Regenerating the generated sections

```bash
node scripts/generate-rebuild-manual-catalogs.mjs
```

The script reads the working tree only. It writes C, D, E, G, H, the coverage manifest and the validation report. It never contacts the database or any provider.

## Headline scale at this commit

| Thing | Count |
|---|---|
| Tracked files | 2,932 |
| Registered routes | 876 (800 founder-guarded, 46 public, 6 redirects) |
| Page files | 945 (32 routed directly; the rest are tabs/panels of a parent page) |
| Components | 419 |
| `src/lib` engines/helpers | 177 |
| Edge functions | 620 (+ 52 shared helper modules) |
| Migrations | 442 |
| Public tables | 1,112 (1,109 RLS on, **3 RLS off** — Section F5) |
| Public views | 26 |
| Public functions/RPCs | 390 |
| RLS policies | 1,520 |
| Triggers (non-internal) | 803 |
| Indexes | 2,774 |
| Foreign keys | 934 |
| External action gates | 19, **all disabled** |
