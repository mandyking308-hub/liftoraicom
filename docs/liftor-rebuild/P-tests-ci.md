# Section P — Tests, acceptance functions and CI

## P1. Test suites

Vitest, run with `npm test`. At the audit commit: **48 test files, 689 tests, all passing.**

Coverage concentrates on the deterministic layer — which is the right place for it, because that is where safety behaviour lives:

- sender estate classification and GSM/GHAT segregation (`src/lib/__tests__/gsmSenderEstate.test.ts`)
- mailbox allocation and pool capacity
- education relevance scoring and eligibility gates
- Smartlead activation checklist keys and event normalisation
- outbound sendability and suppression logic
- AI governor behaviour including adversarial cases (`src/services/__tests__/aiGovernor*.test.ts`)
- Command Centre / manual consistency checks

Playwright is configured (`playwright.config.ts`, `playwright-fixture.ts`) but the suite is not part of `npm test`.

## P2. Acceptance functions

Many subsystems ship an `*-acceptance` or `*-healthcheck` edge function (e.g. `social-content-factory-acceptance`, `paid-media-planner-acceptance`, `social-competitor-trend-healthcheck`). These assert internal wiring and return structured pass/fail. They are **internal** checks: running one proves the code path and tables line up, not that a provider action succeeded.

## P3. CI workflows (`.github/workflows/`)

| Workflow | What it proves |
|---|---|
| `frontend-build.yml` | the app typechecks and builds |
| `deploy-supabase-migrations.yml` | migrations apply in order |
| `education-crm-apollo-quality.yml` | education CRM/Apollo data-quality invariants |
| `billionaire-research-integrity.yml` | wealth-research record integrity (`scripts/validate-billionaire-*.mjs`) |
| `giving-platform-quality.yml` | the standalone giving-platform prototype builds/tests |

## P4. What the tests do NOT prove

State this plainly to anyone reading a green pipeline:

- **No test sends an email, starts a campaign, pushes a lead or spends an Apollo credit.** Provider behaviour is unproven by CI.
- No end-to-end test covers the full outbound chain from import to event return; the pilot in Section N6 is the only thing that would.
- RLS policies are not tested. The three RLS-off tables in Section F5 passed CI for months.
- No load, cost or concurrency testing exists for the AI layer (6 live gateway requests total).
- Webhook receivers are tested for fail-closed behaviour, not for real provider payload shapes at volume.
- The Playwright suite is not run in CI.
