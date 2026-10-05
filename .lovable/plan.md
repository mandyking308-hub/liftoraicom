# Liftor — Canonical Remediation Programme to Safe 40-Business Operation

Source freeze `cf1c1373f3affdd66c17a53b97200ac06c3a878f`, documentation HEAD `033c7431`.
Plan only. Nothing is activated, sent, migrated or configured in this pass.

## Evidence gathered for this plan (read-only)

| Signal | Measured now | Why it matters |
|---|---|---|
| Edge functions | 620 dirs + 52 shared helpers | safety fixes must be applied family-wide, not per file |
| Functions calling a provider host / SMTP directly | 37 (nodemailer 4, Smartlead-referencing 147, Winnr 6, Buffer 18, Stripe 12, Gmail 12, voice 2) | this is the real external-side-effect surface |
| Functions referencing `external_action_gates` | **12** | the other external-capable paths use their own ad-hoc phrase/flag or none |
| Functions using the service-role key | **305** | each is a potential RLS bypass if caller auth is weak |
| Functions using `requireFounder` | 307 of 620 | the remainder authorise inline or not at all |
| `verify_jwt = false` functions | 16 | each relies on its own secret check |
| Legacy `assigned_business` / `source_business` references | present in 20+ functions incl. `_shared/smartleadLeadImport.ts`, `_shared/educationCrm.ts`, `enqueue-eligible-contacts`, `create-queue-from-staged`, `autopilot-orchestrator` | single-business identity model still drives queueing and import |
| RLS-off public tables | 3 (`billionaire_institution_links`, `philanthropic_institutions`, `billionaire_enrichment_batches`) | live exposure |
| Environments | one Supabase project for preview + production | a preview mistake is a production mistake |
| Live truth | 14 businesses, 19 gates all disabled, 0 campaign-ready mailboxes, no pilot ever sent | 40-business claims are not yet supportable |

Assumption stated for correction: "40 businesses concurrently" means 40 tenant rows in `businesses` running the daily/weekly loops and outbound simultaneously, not 40 separate deployments.

---

## Stage 0 — Semantic safety inventory (no code change)

**Objective.** Produce a machine-regenerable, semantically classified register of every external-side-effect path, every authorisation posture and every gate bypass. The generated catalog counts files; this classifies behaviour.

**Defects resolved.** Unknown true blast radius; R5/D5 (copy-paste safety drift); no reliable list of "can this function touch the outside world".

**Principal artefacts.** New `scripts/generate-safety-register.mjs`; `docs/liftor-rebuild/X-external-effect-register.md` + `.json`. Classifies each of the 620 functions on: provider reach (SMTP/Smartlead/Winnr/Buffer/Stripe/Gmail/voice/webhook/generic HTTP/none), auth posture (requireFounder / inline check / secret header / none), service-role usage, gate reference, dry-run support, idempotency key, business scoping, "marks-as-sent" writes without provider proof.

**Must NOT change.** Any function, migration, gate row, provider setting.

**Proof.** Every function classified with zero `unknown` terminal states; register cross-checked by hand against the 37 known provider-calling functions and the 16 `verify_jwt = false` entries; checker script fails CI if a new function appears unclassified.

**Dependencies.** None. **Mutation needed.** None (read-only SELECTs only). **Rollback.** Delete docs/scripts.

---

## Stage 1 — Single chokepoint for external effects

**Objective.** Make it structurally impossible to reach a provider except through one audited helper that consults `external_action_gates`.

**Defects.** Only 12 of the external-capable functions consult the gate table (item 2); parallel confirmation phrases; `outreach-send-draft` sends SMTP with no gate reference at all; `social-distribution-*` uses its own policy/pause model; Stripe and Gmail paths have their own flags.

**Principal files.** New `supabase/functions/_shared/externalEffect.ts` (gate lookup → kill switch → business scope → batch cap → idempotency claim → provider call → result log). Migrate: `outreach-send-draft`, `controlled-proof-send`, `internal-proposal-send`, `external-action-executor`, the Smartlead send/apply family, `_shared/bufferClient.ts` + `socialDistributionSubmit.ts`, `_shared/winnrClient.ts`, Stripe and Gmail/PR functions, voice adapters. Tables: `external_action_gates`, `execution_result_log`, `agent_action_audit_log`.

**Must NOT change.** Gate `enabled` values (all stay false), confirmation phrases, provider credentials, cron, webhook registration. No function gains new capability — only new refusal paths.

**Proof.** A lint/test rule proves no function imports `nodemailer` or fetches a provider host outside `externalEffect.ts`; every migrated path returns `blocked` with a reason under founder auth and writes an audit row; safe-off shells stay safe-off; full suite green.

**Dependencies.** Stage 0. **Mutation.** Code + possibly additive columns on the result/audit log; no gate flips, no provider calls. **Rollback.** Revert the commit; gates were never enabled, so no external state to undo.

---

## Stage 2 — Authorisation hardening

**Objective.** No service-role client may be created before the caller is authorised, and every public function must prove its own caller.

**Defects.** 305 service-role users vs 307 `requireFounder` users — the sets do not coincide (item 3); 16 `verify_jwt = false` functions rely on individually written secret checks (S6); `requireFounder` itself builds the admin client only after role check (good) but is not universally used.

**Principal files.** `_shared/socialAuth.ts`, `_shared/socialDispatchAuth.ts`, a new `_shared/requireCaller.ts` with explicit postures (`founder`, `operator`, `scheduler-secret`, `provider-webhook-signature`, `public-token`); every function the Stage 0 register flags as `service_role + weak_auth`; `supabase/config.toml` (read-only reference — the 16 public entries are reviewed, not changed).

**Must NOT change.** Which functions are public, role model, RLS policies, user accounts.

**Proof.** Register shows zero `service_role + no/weak auth`; each of the 16 public functions has a named, tested verification mechanism; negative tests (no token, wrong role, wrong secret, replayed signature) return 401/403 without touching the database.

**Dependencies.** Stage 0. **Mutation.** Code only. **Rollback.** Per-function revert.

---

## Stage 3 — Truthful state: no "sent/paid/published/shared" without provider proof

**Objective.** Status transitions become derived from a recorded provider response, never optimistic.

**Defects.** Item 4 — e.g. `outreach-send-draft` writes `communications` and marks the draft `sent` after an SMTP call with no persisted provider identifier for reconciliation; social jobs may be marked scheduled on ambiguous responses; finance/invoice and portal-share paths mark state without provider acknowledgement.

**Principal files/tables.** `outreach-send-draft`, `social-distribution-submit` / `-dispatch-due` / `_shared/socialDistributionReconcile.ts`, Stripe/invoice functions, portal invite/share functions; tables `ai_drafts`, `communications`, `social_publish_jobs`, `execution_result_log`, invoice/payment tables. Add a shared `provider_receipt` shape (provider, external id, raw status, received_at) plus an explicit `submission_unknown` state that must be reconciled, never silently promoted.

**Must NOT change.** Historical rows, provider settings, gates.

**Proof.** Unit tests: ambiguous/timeout/error provider responses never produce a terminal success state; reconciliation job resolves `submission_unknown` deterministically; a status audit query shows every terminal-success row carries a receipt (new rows only; legacy rows labelled `unverified_legacy`).

**Dependencies.** Stages 1–2. **Mutation.** Additive schema (receipt columns / status enum values) — no backfill that rewrites history, no provider calls. **Rollback.** Columns are additive and nullable; revert code.

---

## Stage 4 — Canonical multi-business identity

**Objective.** One canonical answer to "which business owns this contact/queue item/context", used everywhere.

**Defects.** Item 5 — `contacts.assigned_business` / `source_business` still drive behaviour in `_shared/smartleadLeadImport.ts`, `_shared/educationCrm.ts`, `enqueue-eligible-contacts`, `create-queue-from-staged`, `autopilot-orchestrator`, `apollo-sync-enrich`, `crm-health-integrity-check`, `winback-agent-run` and others, while `business_contact_relationships` + `portfolio_contact_ownership` are the documented canon (K1).

**Principal files/tables.** A shared resolver (`_shared/businessScope.ts`) returning canonical scope from the relationship/ownership tables; the functions above; `src/lib/portfolioCrmModel.ts`; tables `contacts`, `business_contact_relationships`, `portfolio_contact_ownership`.

**Approach.** Read canonical first, fall back to legacy with a logged discrepancy; publish a divergence report; only then deprecate the legacy fields (drop is a later, separately approved step — not in this programme).

**Must NOT change.** Do not drop or null the legacy columns; do not rewrite existing relationship rows without a reviewed divergence report.

**Proof.** Divergence report enumerating every contact where legacy and canonical disagree; all listed functions read canonical; tests cover contacts shared by multiple businesses.

**Dependencies.** Stage 0. **Mutation.** Read-only analysis plus code; any data reconciliation is a separate, itemised, reviewed migration. **Rollback.** Fallback path retained until the divergence count is zero.

---

## Stage 5 — Business isolation under concurrency

**Objective.** Prove that 40 businesses cannot contaminate one another.

**Defects.** Item 6 — shared queues without per-business partitioning/fair scheduling, AI context assembly that may pull cross-business memory, sender-pool allocation that must never lend a GSM mailbox to another tenant's thread, social/customer-success/finance/provider mapping tables keyed loosely, and concurrency leases (`ai_concurrency_leases`) not proven under parallel tenants.

**Principal files/tables.** `_shared/gsmSenderEstate.ts`, `_shared/senderEstates.ts`, `_shared/mailboxAllocator.ts`, `_shared/aiGateway.ts`, business-context/memory builders, `ai_action_queue`, `ai_agent_task_queue`, `ai_concurrency_leases`, `ai_business_budgets`, `business_channel_accounts`, social/CS/finance mapping tables.

**Must NOT change.** Sender readiness rules, warm-up thresholds, health-score floor, the Apollo credit firewall, Neon Candy segregation.

**Proof.** A concurrency harness running 40 synthetic businesses through queueing, AI context assembly, sender allocation and finance rollups, asserting: zero cross-business rows, per-business budget and rate limits honoured, fair scheduling (no tenant starvation), leases never double-issued, idempotency keys scoped per business.

**Dependencies.** Stages 1–4. **Mutation.** Simulation runs against non-production-looking synthetic rows, clearly tagged and removable; no provider calls. **Rollback.** Delete synthetic tenants by tag.

---

## Stage 6 — Data-access hardening

**Objective.** Close the exposure findings and make policy regressions visible.

**Defects.** S1–S3 (3 RLS-off tables), S4 (`inbox_credentials` deny-by-default undocumented), D9 (no RLS tests), S5 (single environment).

**Principal objects.** `billionaire_institution_links`, `philanthropic_institutions`, `billionaire_enrichment_batches`; a documented explicit deny policy comment for `inbox_credentials`; new RLS regression tests; an environment decision record for preview/production separation (recommendation, not an unilateral change).

**Must NOT change.** Existing policies on other tables; no broadening of access anywhere; no data deletion.

**Proof.** Anon-key probe returns zero rows for all three tables; authorised founder path still works; RLS test suite runs in CI and fails on a deliberately weakened policy.

**Dependencies.** None hard, but sequence after Stage 2 so role posture is settled. **Mutation.** Yes — one additive migration enabling RLS + GRANT + policies. **Rollback.** Policies are additive; a reverse migration restores prior (unsafe) state if it ever breaks a legitimate reader — expected to be none.

---

## Stage 7 — Router and dead-implementation cleanup

**Objective.** One reachable implementation per surface.

**Defects.** Item 7 / D3 — `/founder/documents` (`FounderDocuments` vs `DocumentsOverview`) and `/founder/decisions` (`DecisionsOverview` vs `DecisionEngine`), the later registration silently winning; D4 unreachable pages; competing engines where two modules implement the same loop.

**Principal files.** `src/App.tsx`, the four duplicate page components, reachability report from the catalog generator.

**Must NOT change.** Any surface a founder currently uses without an explicit decision recorded per duplicate; no bulk deletion of "unreachable" files until reachability is verified twice (router + dynamic import scan).

**Proof.** Zero duplicate route registrations; a reachability report with an explicit keep/remove decision per orphan; navigation smoke test through the main founder modules.

**Dependencies.** Stage 0 register. **Mutation.** Code only. **Rollback.** Revert; removed files recoverable from history.

---

## Stage 8 — Test and CI gates required before trusting 40 businesses

**Objective.** Make the invariants of Stages 1–6 permanently enforced.

**Defects.** Item 9 / D7–D10 — lint not a gate, Playwright not run, no RLS tests, AI layer untested at volume, `command-centre-full-link-check` a hard-coded stub returning `broken_links: []`.

**Principal files.** `.github/workflows/frontend-build.yml`, new safety/RLS/isolation workflows, `scripts/check-rebuild-manual-consistency.mjs` extension, the stub link-check function.

**Gates to add.** (a) no provider call outside `externalEffect.ts`; (b) no service-role client before authorisation; (c) every function classified in the safety register; (d) RLS regression suite; (e) multi-tenant isolation harness; (f) Playwright smoke; (g) lint ratchet (no new violations rather than a big-bang cleanup).

**Must NOT change.** Runtime behaviour; the stub link-check is replaced with a real check or made to fail loudly — it must not keep reporting false green.

**Proof.** Each gate demonstrably fails on a deliberately introduced violation, then passes on clean main.

**Dependencies.** Stages 1–6. **Mutation.** CI config only. **Rollback.** Revert workflow.

---

## Stage 9 — Proven pilot before any scale claim

**Objective.** One business, one channel, one small batch, end to end with returned events — the first genuine proof.

**Defects.** R5.1–R5.3 — 190 mailboxes warmed but unconnected, webhook unconfigured, no delivered message and no returned event ever.

**Scope.** A single named business, a single-digit batch, explicit founder confirmation, gate enabled for that action only and re-disabled afterwards, receipts and returned events reconciled.

**Must NOT change.** No other gate, no other business, no Apollo credit spend, no Neon Candy, no bulk campaign activation.

**Proof.** Delivered message with provider receipt, webhook event returned and normalised, status derived from proof (Stage 3), audit trail complete, gate re-disabled and verified.

**Dependencies.** Stages 1–8 all complete. **Mutation.** Yes — first deliberate external action of the programme, separately approved at execution time. **Rollback.** Suppression list, gate disable, kill switch; irreversible-send boundary acknowledged up front.

---

## Stage 10 — Scale-out (only after Stage 9 passes)

Onboard businesses in reviewed waves (e.g. 14 → 25 → 40), re-running the isolation harness and budget/throughput checks at each wave. No onboarding of the remaining businesses is proposed before the canonical multi-business execution architecture is proven by Stages 5 and 9.

## Stage 11 — Performance and debt (last, deliberately)

Route-level code splitting for the 9.8 MB monolithic chunk, squashed migration baseline, edge-function de-duplication, lint debt burn-down, `caniuse-lite` refresh. Correctness and safety first; none of this may precede Stages 1–9.

---

## Programme rules

1. No gate is enabled and nothing is sent before Stage 9.
2. Every stage lands with its proof artefact committed alongside the code.
3. Problem-register items stay open until their stage closes them with evidence.
4. Documentation (Sections Q and R) is updated at the end of each stage so the manual never leads live state.
