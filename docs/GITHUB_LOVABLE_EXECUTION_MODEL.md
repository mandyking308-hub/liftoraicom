# Liftor GitHub + Lovable Execution Model

**Effective:** 10 September 2026  
**Status:** canonical build process for Liftor engineering work  
**Purpose:** reduce unnecessary Lovable AI credit usage, prevent architectural drift, and make every production change auditable and reversible.

## 1. Source-of-truth rule

- GitHub `main` is the canonical source for Liftor application code, migrations, tests and documentation.
- Live database/provider state is separate from repository state and must be checked explicitly when relevant.
- Command Centre Truth Sync remains the live-state authority inside Liftor.
- A Lovable conversation is never itself the source of truth. Durable changes must land in GitHub.

## 2. One build unit at a time

Every material change is a discrete build unit with:

1. one named objective;
2. one branch;
3. explicit in-scope and out-of-scope items;
4. current-state inspection before editing;
5. tests/build gates;
6. manual/current-state update when architecture changes;
7. pull-request review/diff;
8. merge to `main` only after the gate passes.

Do not mix unrelated features, data repair, provider activation and documentation work in one build unit.

## 3. What should be done through GitHub first

Use GitHub as the default surface for:

- repository search and code inspection;
- history/commit comparison;
- documentation and reconciliation;
- small/localised source changes where behaviour is well understood;
- tests and fixtures;
- branch/PR/diff review;
- engineering specifications and acceptance criteria;
- migration review before execution;
- issue/backlog tracking;
- manual/version updates;
- rollback/reference history.

This work should not consume Lovable AI credits merely to read or reason about the repository.

## 4. When Lovable AI earns a build turn

Use a Lovable AI build turn only when it adds material value, especially:

- coordinated changes across many application files;
- Lovable/Supabase-specific implementation where project context materially helps;
- complex UI changes and preview validation;
- application-aware refactoring with broad dependency awareness;
- edge-function/database integration where Lovable's project tooling materially reduces risk;
- final preview/build validation when the change is meant to surface in the Lovable app.

Do not use Lovable AI for open-ended repository archaeology, broad brainstorming, repeated status checks or manual-only edits that can be completed safely in GitHub.

## 5. Lovable prompt discipline

A Lovable build prompt should be generated from an already reconciled GitHub spec and contain:

- exact objective;
- exact current-state assumptions;
- explicit files/modules likely involved where known;
- non-negotiable safety boundaries;
- provider/data actions that are forbidden;
- acceptance criteria;
- required tests;
- instruction to avoid unrelated refactors;
- requirement to report changed files and test result.

Prefer one comprehensive scoped prompt over multiple exploratory prompts.

If a connector times out, check the existing Lovable message status before resubmitting. Never duplicate a long-running build turn merely because the client timed out.

## 6. Branch naming

Use one of these prefixes:

- `reconcile/` — truth/manual/data-state reconciliation
- `process/` — engineering/process controls
- `feature/` — new application capability
- `fix/` — defect correction
- `data/` — controlled data migration/recovery tooling
- `integration/` — provider/integration work
- `safety/` — gates, limits, compliance or spend controls

Include the core feature and, where useful, the date.

Examples:

- `safety/apollo-credit-firewall`
- `feature/education-company-universe`
- `integration/smartlead-closed-loop`
- `data/education-universe-reconciliation`

## 7. Pull-request gate

Before merge, verify as applicable:

### Code correctness
- type-check passes;
- unit tests pass;
- relevant integration tests pass;
- frontend/build passes;
- no unrelated files changed.

### Data correctness
- migrations are idempotent or intentionally one-way and documented;
- dry-run/preview exists for high-impact imports where practical;
- dedupe keys and conflict behaviour are explicit;
- no real data is overwritten by masked/null/stale source values;
- rollback/recovery path is understood.

### External-provider safety
- no provider mutation occurs in a read-only test;
- API keys/secrets are never logged or committed;
- paid API operations have a hard budget/gate where spend is possible;
- sending/publishing/payment actions remain separate from preparation/import;
- retries/resumes cannot silently duplicate paid actions.

### Manual fidelity
If architecture, safety behaviour, provider state model, data ownership or operator workflow changes, the same build unit updates the relevant manual/current-state section.

## 8. Deployment discipline

Repository merge and live deployment are distinct events.

- Do not infer that code on `main` is deployed unless deployment evidence exists.
- Do not infer that an edge function is deployed merely because source exists.
- Do not infer that a provider is fully integrated merely because credentials authenticate.
- Record deployed/tested/live states separately.

For high-risk changes, use the sequence:

`inspect -> spec -> branch -> implement -> tests -> PR/diff -> merge -> deploy -> live read-only verification -> controlled activation`

## 9. Database discipline

- Read-only inspection may be performed before a build.
- Production writes happen only in a build/data stage that explicitly permits them.
- Schema changes should be represented as migrations in GitHub first.
- Data-recovery jobs should be resumable, idempotent and auditable.
- Historical data evidence must never be described as live until checked against the live database.

## 10. Apollo-specific rule

Until the Apollo Credit Firewall build is complete and tested:

- free People Search may be used only through an approved campaign-safe configuration;
- automatic paid enrichment stays OFF;
- no blanket enrichment;
- no paid cron-driven enrichment;
- no phone reveal/waterfall unless separately approved;
- Apollo person IDs already processed must be checked before any paid request;
- the final education data workflow must separate discovery, qualification, paid reveal and outreach.

## 11. Smartlead-specific rule

Until the Smartlead closed loop is completed and tested:

- provider connectivity does not mean send-ready;
- campaigns remain draft/paused for testing;
- campaign mapping, lead mapping, webhook/event return and mailbox readiness must be proved independently;
- lead preparation/push and campaign start/send are separate gates;
- Smartlead is the education delivery engine, not the preferred prospect-data source.

## 12. Education-data rule

The education research universe is a portfolio data asset, separate from live CRM contacts and separate from Smartlead campaign membership.

The future process should preserve broad discovery while controlling paid reveal:

`company universe -> free candidate discovery -> Liftor role/fit scoring -> canonical dedupe -> ranked candidate pool -> selective paid reveal -> campaign eligibility -> Smartlead`

Do not impose a three-person limit on the research universe. Per-company limits belong at the paid reveal/wave stage, not at discovery, so useful buyer routes are not discarded.

## 13. Completion definition

A stage is DONE only when:

- the intended output exists in GitHub `main`;
- required tests/checks pass;
- any live-state claim has been independently verified;
- no forbidden external action occurred;
- the manual/current-state record is aligned where applicable;
- the next stage can start from a clear, durable handover rather than chat memory.
