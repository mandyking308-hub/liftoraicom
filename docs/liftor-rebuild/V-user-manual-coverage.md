# Appendix V — User Manual route coverage and module directory

_Generated from commit `a513cacffe2a1064a5ea172c9170c46a55c51b8e` by `scripts/generate-rebuild-manual-catalogs.mjs`. Regenerate with `node scripts/generate-rebuild-manual-catalogs.mjs`._

Every founder-guarded route mapped to operator documentation. Coverage kinds:

- **direct** — the Liftor User Manual (`src/lib/liftorUserManualContent.ts`, rendered at `/founder/user-manual`) names this exact route and explains how to operate it.
- **parent-module** — the route is an internal sub-tab or detail view of a surface the user manual names; it is operated from that parent.
- **module-directory** — no hand-written operator section names it yet. It is accounted for here by its module family in the directory below, which states, from source evidence only, how many routes and pages the family has, whether any of its pages write to the database, which edge functions its routed pages can call (the only way a page can reach a provider), and any external-action confirmation phrase. **This is coverage by inventory, not a hand-written operator walkthrough** — the shortfall is recorded as a real gap in Section R.

| Coverage | Routes |
|---|---|
| module-directory | 461 |
| direct | 88 |
| parent-module | 249 |

Distinct founder routes: **798**. Routes named directly in the user manual: **93**. Module families: **190**.

## Module directory (all founder families)

If the "Edge functions its pages call" column reads `none`, the family's routed pages make no provider call at all — they read and write Liftor's own database only. A confirmation phrase means the surface is behind an external-action gate and cannot act until the founder types that exact phrase.

| Module family | Routes | Routed pages | Any page writes | Edge functions its pages call | Confirmation phrase |
|---|---|---|---|---|---|
| `/founder` | 1 | 0 | no | none | — |
| `/founder/access-control` | 1 | 0 | no | none | — |
| `/founder/access-governance` | 7 | 0 | no | none | — |
| `/founder/acquisition-funding` | 6 | 0 | no | none | — |
| `/founder/activity` | 1 | 0 | no | none | — |
| `/founder/adviser-pack` | 7 | 0 | no | none | — |
| `/founder/agent-capabilities` | 6 | 0 | no | none | — |
| `/founder/agents` | 2 | 0 | no | none | — |
| `/founder/ai-compliance` | 7 | 0 | no | none | — |
| `/founder/ai-cost` | 22 | 0 | no | none | — |
| `/founder/ai-evals` | 7 | 0 | no | none | — |
| `/founder/analytics` | 1 | 0 | no | none | — |
| `/founder/analytics-attribution` | 6 | 0 | no | none | — |
| `/founder/approvals-ops` | 1 | 1 | no | none | — |
| `/founder/architectures` | 2 | 0 | no | none | — |
| `/founder/assets` | 1 | 0 | no | none | — |
| `/founder/assignments` | 1 | 0 | no | none | — |
| `/founder/attention-guard` | 6 | 0 | no | none | — |
| `/founder/audit-ledger` | 7 | 0 | no | none | — |
| `/founder/automation-book` | 1 | 1 | yes | none | — |
| `/founder/backup-recovery` | 6 | 0 | no | none | — |
| `/founder/billionaire-intelligence` | 1 | 0 | no | none | — |
| `/founder/brain` | 6 | 0 | no | none | — |
| `/founder/brain-core` | 1 | 0 | no | none | — |
| `/founder/build-log` | 1 | 0 | no | none | — |
| `/founder/build-phase-closeout` | 1 | 0 | no | none | — |
| `/founder/business-activation` | 1 | 1 | no | none | — |
| `/founder/business-archetypes` | 5 | 0 | no | none | — |
| `/founder/business-compliance` | 6 | 0 | no | none | — |
| `/founder/business-daily-operating-loop` | 1 | 0 | no | none | — |
| `/founder/business-internal-activation` | 1 | 0 | no | none | — |
| `/founder/business-lifecycle` | 5 | 0 | no | none | — |
| `/founder/business-manuals` | 1 | 0 | no | none | — |
| `/founder/business-onboarding-factory` | 1 | 0 | no | none | — |
| `/founder/business-setup-tunnel` | 1 | 0 | no | none | — |
| `/founder/business-templates` | 5 | 0 | no | none | — |
| `/founder/business-weekly-review` | 1 | 0 | no | none | — |
| `/founder/business-wind-down` | 7 | 0 | no | none | — |
| `/founder/campaign-factory` | 1 | 1 | yes | none | — |
| `/founder/capacity` | 7 | 0 | no | none | — |
| `/founder/channel-strategy` | 5 | 0 | no | none | — |
| `/founder/clients` | 1 | 0 | no | none | — |
| `/founder/collections` | 7 | 0 | no | none | — |
| `/founder/command-center` | 1 | 0 | no | none | — |
| `/founder/command-centre` | 1 | 0 | no | none | — |
| `/founder/communications` | 7 | 0 | no | none | — |
| `/founder/complaints` | 6 | 0 | no | none | — |
| `/founder/compliance` | 3 | 0 | no | none | — |
| `/founder/connectors` | 7 | 0 | no | none | — |
| `/founder/context-fabric` | 5 | 0 | no | none | — |
| `/founder/contracts` | 7 | 0 | no | none | — |
| `/founder/conversations` | 2 | 0 | no | none | — |
| `/founder/copilot` | 1 | 0 | no | none | — |
| `/founder/corporate-secretarial` | 1 | 1 | no | none | — |
| `/founder/crm` | 6 | 0 | no | none | — |
| `/founder/cross-contamination` | 1 | 1 | no | none | — |
| `/founder/customer-feedback` | 7 | 0 | no | none | — |
| `/founder/customer-onboarding` | 6 | 0 | no | none | — |
| `/founder/customer-sales` | 12 | 0 | no | none | — |
| `/founder/customer-success` | 1 | 0 | no | none | — |
| `/founder/customer-upgrades` | 6 | 0 | no | none | — |
| `/founder/daily-operator` | 1 | 0 | no | none | — |
| `/founder/data-quality` | 7 | 0 | no | none | — |
| `/founder/data-room` | 1 | 1 | no | none | — |
| `/founder/decisions` | 7 | 0 | no | none | — |
| `/founder/delivery` | 7 | 0 | no | none | — |
| `/founder/demos` | 1 | 0 | no | none | — |
| `/founder/deployment` | 8 | 0 | no | none | — |
| `/founder/deployments` | 2 | 0 | no | none | — |
| `/founder/distressed-radar` | 6 | 0 | no | none | — |
| `/founder/documents` | 8 | 0 | no | none | — |
| `/founder/ecommerce` | 8 | 0 | no | none | — |
| `/founder/education-commercial` | 1 | 0 | no | none | — |
| `/founder/entity-map` | 6 | 0 | no | none | — |
| `/founder/executions` | 2 | 0 | no | none | — |
| `/founder/exit-metrics` | 6 | 0 | no | none | — |
| `/founder/expansion` | 2 | 0 | no | none | — |
| `/founder/experiments` | 5 | 0 | no | none | — |
| `/founder/external-activation-readiness` | 1 | 0 | no | none | — |
| `/founder/finance` | 5 | 0 | no | none | — |
| `/founder/first-use-configuration` | 1 | 0 | no | none | — |
| `/founder/founder-led-buyer-market` | 1 | 0 | no | none | — |
| `/founder/founder-led-exit` | 1 | 0 | no | none | — |
| `/founder/funding-radar` | 17 | 0 | no | none | — |
| `/founder/ghat-outbound` | 1 | 0 | no | none | — |
| `/founder/global-pr-radar` | 1 | 0 | no | none | — |
| `/founder/gsm-outbound` | 1 | 0 | no | none | — |
| `/founder/healthcare-overlay` | 1 | 0 | no | none | — |
| `/founder/human-workforce-control` | 1 | 1 | yes | none | — |
| `/founder/identity-resolution` | 7 | 0 | no | none | — |
| `/founder/imports` | 7 | 0 | no | none | — |
| `/founder/incidents` | 6 | 0 | no | none | — |
| `/founder/insurance-claims` | 1 | 1 | no | none | — |
| `/founder/insurance-liability` | 5 | 0 | no | none | — |
| `/founder/integration-map` | 6 | 0 | no | none | — |
| `/founder/integrations` | 2 | 0 | no | none | — |
| `/founder/internal-proposals` | 2 | 0 | no | none | — |
| `/founder/internal-sla` | 6 | 0 | no | none | — |
| `/founder/international-expansion` | 1 | 1 | no | none | — |
| `/founder/ip-assets` | 6 | 0 | no | none | — |
| `/founder/jurisdiction-tax` | 7 | 0 | no | none | — |
| `/founder/knowledge` | 2 | 0 | no | none | — |
| `/founder/knowledge-governance` | 6 | 0 | no | none | — |
| `/founder/launch-factory` | 9 | 0 | no | none | — |
| `/founder/legal` | 1 | 0 | no | none | — |
| `/founder/manual` | 4 | 0 | no | none | — |
| `/founder/manuals-hub` | 1 | 0 | no | none | — |
| `/founder/marketing` | 1 | 0 | no | none | — |
| `/founder/marketplace` | 21 | 0 | no | none | — |
| `/founder/micro-batch-preparation` | 1 | 0 | no | none | — |
| `/founder/monday-launch` | 1 | 1 | no | none | — |
| `/founder/monday-readiness` | 1 | 1 | no | none | — |
| `/founder/money` | 1 | 0 | no | none | — |
| `/founder/monitoring` | 2 | 0 | no | none | — |
| `/founder/notifications` | 7 | 0 | no | none | — |
| `/founder/operations` | 1 | 0 | no | none | — |
| `/founder/optimisation` | 1 | 0 | no | none | — |
| `/founder/organisations` | 2 | 0 | no | none | — |
| `/founder/outreach` | 9 | 0 | no | none | — |
| `/founder/partners` | 6 | 0 | no | none | — |
| `/founder/people` | 7 | 0 | no | none | — |
| `/founder/pipeline` | 1 | 0 | no | none | — |
| `/founder/platform-monitor` | 7 | 0 | no | none | — |
| `/founder/policies` | 6 | 0 | no | none | — |
| `/founder/portal-admin` | 8 | 0 | no | none | — |
| `/founder/portals` | 8 | 0 | no | none | — |
| `/founder/portfolio-diversity` | 1 | 0 | no | none | — |
| `/founder/portfolio-exit` | 16 | 0 | no | none | — |
| `/founder/portfolio-exit-targets` | 5 | 0 | no | none | — |
| `/founder/portfolio-fx` | 1 | 1 | no | none | — |
| `/founder/portfolio-memory` | 7 | 0 | no | none | — |
| `/founder/portfolio-prioritisation` | 6 | 0 | no | none | — |
| `/founder/portfolio-risk` | 5 | 0 | no | none | — |
| `/founder/pricing-margin` | 6 | 0 | no | none | — |
| `/founder/priority` | 1 | 0 | no | none | — |
| `/founder/privacy` | 7 | 0 | no | none | — |
| `/founder/processes` | 2 | 0 | no | none | — |
| `/founder/product` | 7 | 0 | no | none | — |
| `/founder/product-catalogue` | 7 | 0 | no | none | — |
| `/founder/projects` | 2 | 0 | no | none | — |
| `/founder/proposals` | 2 | 0 | no | none | — |
| `/founder/quarterly-production-machine` | 7 | 0 | no | none | — |
| `/founder/quote-to-cash` | 10 | 0 | no | none | — |
| `/founder/reconciliation` | 8 | 0 | no | none | — |
| `/founder/recovery` | 1 | 1 | no | none | — |
| `/founder/relationship-health` | 6 | 0 | no | none | — |
| `/founder/relationship-intelligence` | 2 | 0 | no | none | — |
| `/founder/release-workflow` | 1 | 1 | no | none | — |
| `/founder/reporting-truth` | 6 | 0 | no | none | — |
| `/founder/reports` | 6 | 0 | no | none | — |
| `/founder/resource-allocation` | 6 | 0 | no | none | — |
| `/founder/revenue` | 1 | 0 | no | none | — |
| `/founder/revenue-autopilot` | 6 | 0 | no | none | — |
| `/founder/roles` | 7 | 0 | no | none | — |
| `/founder/runtime-mode` | 1 | 1 | no | none | — |
| `/founder/sales-coaching` | 6 | 0 | no | none | — |
| `/founder/sales-targets` | 6 | 0 | no | none | — |
| `/founder/scheduled-jobs` | 6 | 0 | no | none | — |
| `/founder/scheduling` | 6 | 0 | no | none | — |
| `/founder/search` | 8 | 0 | no | none | — |
| `/founder/security` | 1 | 0 | no | none | — |
| `/founder/security-vault` | 5 | 5 | no | none | — |
| `/founder/sending` | 1 | 0 | no | none | — |
| `/founder/sending-infrastructure` | 1 | 0 | no | none | — |
| `/founder/social` | 1 | 0 | no | none | — |
| `/founder/social-autopilot` | 13 | 0 | no | none | — |
| `/founder/social-relationships` | 7 | 0 | no | none | — |
| `/founder/sops` | 7 | 0 | no | none | — |
| `/founder/start-here` | 2 | 0 | no | none | — |
| `/founder/starter-pack-materialiser` | 1 | 0 | no | none | — |
| `/founder/statutory-filings` | 1 | 1 | no | none | — |
| `/founder/strategy` | 1 | 0 | no | none | — |
| `/founder/suppliers` | 2 | 0 | no | none | — |
| `/founder/support` | 2 | 0 | no | none | — |
| `/founder/support-tickets` | 6 | 0 | no | none | — |
| `/founder/system` | 4 | 0 | no | none | — |
| `/founder/system-config` | 6 | 0 | no | none | — |
| `/founder/system-health` | 1 | 1 | no | none | — |
| `/founder/templates` | 2 | 0 | no | none | — |
| `/founder/testing` | 1 | 0 | no | none | — |
| `/founder/trust-safety` | 7 | 0 | no | none | — |
| `/founder/user-guide` | 1 | 0 | no | none | — |
| `/founder/vendors` | 7 | 0 | no | none | — |
| `/founder/video-library` | 1 | 0 | no | none | — |
| `/founder/video-sop-factory` | 1 | 0 | no | none | — |
| `/founder/webhooks` | 6 | 0 | no | none | — |
| `/founder/work-queue` | 9 | 0 | no | none | — |
| `/founder/worker-help-audit` | 1 | 1 | yes | none | — |
| `/founder/worker-manuals` | 1 | 1 | yes | none | — |
| `/founder/workflows` | 2 | 0 | no | none | — |

## Route-by-route mapping

| Route | Coverage | Operated from |
|---|---|---|
| `/founder` | module-directory | `/founder` |
| `/founder/access-control` | direct | `/founder/access-control` |
| `/founder/access-governance` | module-directory | `/founder/access-governance` |
| `/founder/access-governance/audit` | module-directory | `/founder/access-governance` |
| `/founder/access-governance/revocation` | module-directory | `/founder/access-governance` |
| `/founder/access-governance/rotation` | module-directory | `/founder/access-governance` |
| `/founder/access-governance/secrets` | module-directory | `/founder/access-governance` |
| `/founder/access-governance/systems` | module-directory | `/founder/access-governance` |
| `/founder/access-governance/users` | module-directory | `/founder/access-governance` |
| `/founder/acquisition-funding` | direct | `/founder/acquisition-funding` |
| `/founder/acquisition-funding/deals` | parent-module | `/founder/acquisition-funding` |
| `/founder/acquisition-funding/funders` | parent-module | `/founder/acquisition-funding` |
| `/founder/acquisition-funding/opportunities` | parent-module | `/founder/acquisition-funding` |
| `/founder/acquisition-funding/opportunities/:id` | parent-module | `/founder/acquisition-funding` |
| `/founder/acquisition-funding/pitches` | parent-module | `/founder/acquisition-funding` |
| `/founder/activity` | direct | `/founder/activity` |
| `/founder/adviser-pack` | direct | `/founder/adviser-pack` |
| `/founder/adviser-pack/documents` | parent-module | `/founder/adviser-pack` |
| `/founder/adviser-pack/entities` | parent-module | `/founder/adviser-pack` |
| `/founder/adviser-pack/expenses` | parent-module | `/founder/adviser-pack` |
| `/founder/adviser-pack/monthly` | parent-module | `/founder/adviser-pack` |
| `/founder/adviser-pack/questions` | parent-module | `/founder/adviser-pack` |
| `/founder/adviser-pack/revenue` | parent-module | `/founder/adviser-pack` |
| `/founder/agent-capabilities` | direct | `/founder/agent-capabilities` |
| `/founder/agent-capabilities/approval-rules` | parent-module | `/founder/agent-capabilities` |
| `/founder/agent-capabilities/audit` | parent-module | `/founder/agent-capabilities` |
| `/founder/agent-capabilities/boundaries` | parent-module | `/founder/agent-capabilities` |
| `/founder/agent-capabilities/escalations` | parent-module | `/founder/agent-capabilities` |
| `/founder/agent-capabilities/registry` | parent-module | `/founder/agent-capabilities` |
| `/founder/agents` | direct | `/founder/agents` |
| `/founder/agents/:id` | parent-module | `/founder/agents` |
| `/founder/ai-compliance` | module-directory | `/founder/ai-compliance` |
| `/founder/ai-compliance/data-flows` | module-directory | `/founder/ai-compliance` |
| `/founder/ai-compliance/evidence` | module-directory | `/founder/ai-compliance` |
| `/founder/ai-compliance/gaps` | module-directory | `/founder/ai-compliance` |
| `/founder/ai-compliance/oversight` | module-directory | `/founder/ai-compliance` |
| `/founder/ai-compliance/risk` | module-directory | `/founder/ai-compliance` |
| `/founder/ai-compliance/systems` | module-directory | `/founder/ai-compliance` |
| `/founder/ai-cost` | direct | `/founder/ai-cost` |
| `/founder/ai-cost/action-board` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/agent-controls` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/alerts` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/approvals` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/budgets` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/context` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/finance` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/first-use` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/health` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/ledger` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/live` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/orchestration-live` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/pricing` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/quality` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/queue` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/roi` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/routing` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/runtime` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/sandbox` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/security` | parent-module | `/founder/ai-cost` |
| `/founder/ai-cost/templates` | parent-module | `/founder/ai-cost` |
| `/founder/ai-evals` | direct | `/founder/ai-evals` |
| `/founder/ai-evals/agents` | parent-module | `/founder/ai-evals` |
| `/founder/ai-evals/regression` | parent-module | `/founder/ai-evals` |
| `/founder/ai-evals/results` | parent-module | `/founder/ai-evals` |
| `/founder/ai-evals/safety` | parent-module | `/founder/ai-evals` |
| `/founder/ai-evals/settings` | parent-module | `/founder/ai-evals` |
| `/founder/ai-evals/test-suites` | parent-module | `/founder/ai-evals` |
| `/founder/analytics` | direct | `/founder/analytics` |
| `/founder/analytics-attribution` | parent-module | `/founder/analytics` |
| `/founder/analytics-attribution/campaigns` | parent-module | `/founder/analytics` |
| `/founder/analytics-attribution/funnel` | parent-module | `/founder/analytics` |
| `/founder/analytics-attribution/revenue` | parent-module | `/founder/analytics` |
| `/founder/analytics-attribution/settings` | parent-module | `/founder/analytics` |
| `/founder/analytics-attribution/sources` | parent-module | `/founder/analytics` |
| `/founder/approvals-ops` | parent-module | `/founder/approvals` |
| `/founder/architectures` | direct | `/founder/architectures` |
| `/founder/architectures/:id` | parent-module | `/founder/architectures` |
| `/founder/assets` | direct | `/founder/assets` |
| `/founder/assignments` | direct | `/founder/assignments` |
| `/founder/attention-guard` | module-directory | `/founder/attention-guard` |
| `/founder/attention-guard/decisions` | module-directory | `/founder/attention-guard` |
| `/founder/attention-guard/delegation` | module-directory | `/founder/attention-guard` |
| `/founder/attention-guard/noise` | module-directory | `/founder/attention-guard` |
| `/founder/attention-guard/settings` | module-directory | `/founder/attention-guard` |
| `/founder/attention-guard/today` | module-directory | `/founder/attention-guard` |
| `/founder/audit-ledger` | module-directory | `/founder/audit-ledger` |
| `/founder/audit-ledger/by-business` | module-directory | `/founder/audit-ledger` |
| `/founder/audit-ledger/by-module` | module-directory | `/founder/audit-ledger` |
| `/founder/audit-ledger/by-user` | module-directory | `/founder/audit-ledger` |
| `/founder/audit-ledger/events` | module-directory | `/founder/audit-ledger` |
| `/founder/audit-ledger/sensitive` | module-directory | `/founder/audit-ledger` |
| `/founder/audit-ledger/settings` | module-directory | `/founder/audit-ledger` |
| `/founder/automation-book` | module-directory | `/founder/automation-book` |
| `/founder/backup-recovery` | module-directory | `/founder/backup-recovery` |
| `/founder/backup-recovery/emergency-pack` | module-directory | `/founder/backup-recovery` |
| `/founder/backup-recovery/exports` | module-directory | `/founder/backup-recovery` |
| `/founder/backup-recovery/restore` | module-directory | `/founder/backup-recovery` |
| `/founder/backup-recovery/settings` | module-directory | `/founder/backup-recovery` |
| `/founder/backup-recovery/status` | module-directory | `/founder/backup-recovery` |
| `/founder/billionaire-intelligence` | direct | `/founder/billionaire-intelligence` |
| `/founder/brain` | direct | `/founder/brain` |
| `/founder/brain-core` | parent-module | `/founder/brain` |
| `/founder/brain/audit` | parent-module | `/founder/brain` |
| `/founder/brain/drafts` | parent-module | `/founder/brain` |
| `/founder/brain/provider` | parent-module | `/founder/brain` |
| `/founder/brain/sessions` | parent-module | `/founder/brain` |
| `/founder/brain/tools` | parent-module | `/founder/brain` |
| `/founder/build-log` | direct | `/founder/build-log` |
| `/founder/build-phase-closeout` | direct | `/founder/build-phase-closeout` |
| `/founder/business-activation` | module-directory | `/founder/business-activation` |
| `/founder/business-archetypes` | module-directory | `/founder/business-archetypes` |
| `/founder/business-archetypes/business-map` | module-directory | `/founder/business-archetypes` |
| `/founder/business-archetypes/classifier` | module-directory | `/founder/business-archetypes` |
| `/founder/business-archetypes/recommendations` | module-directory | `/founder/business-archetypes` |
| `/founder/business-archetypes/settings` | module-directory | `/founder/business-archetypes` |
| `/founder/business-compliance` | module-directory | `/founder/business-compliance` |
| `/founder/business-compliance/approval-triggers` | module-directory | `/founder/business-compliance` |
| `/founder/business-compliance/businesses` | module-directory | `/founder/business-compliance` |
| `/founder/business-compliance/channels` | module-directory | `/founder/business-compliance` |
| `/founder/business-compliance/claims` | module-directory | `/founder/business-compliance` |
| `/founder/business-compliance/rules` | module-directory | `/founder/business-compliance` |
| `/founder/business-daily-operating-loop` | direct | `/founder/business-daily-operating-loop` |
| `/founder/business-internal-activation` | direct | `/founder/business-internal-activation` |
| `/founder/business-lifecycle` | module-directory | `/founder/business-lifecycle` |
| `/founder/business-lifecycle/businesses` | module-directory | `/founder/business-lifecycle` |
| `/founder/business-lifecycle/settings` | module-directory | `/founder/business-lifecycle` |
| `/founder/business-lifecycle/stages` | module-directory | `/founder/business-lifecycle` |
| `/founder/business-lifecycle/transitions` | module-directory | `/founder/business-lifecycle` |
| `/founder/business-manuals` | direct | `/founder/business-manuals` |
| `/founder/business-onboarding-factory` | direct | `/founder/business-onboarding-factory` |
| `/founder/business-setup-tunnel` | module-directory | `/founder/business-setup-tunnel` |
| `/founder/business-templates` | module-directory | `/founder/business-templates` |
| `/founder/business-templates/apply` | module-directory | `/founder/business-templates` |
| `/founder/business-templates/business-setup` | module-directory | `/founder/business-templates` |
| `/founder/business-templates/library` | module-directory | `/founder/business-templates` |
| `/founder/business-templates/settings` | module-directory | `/founder/business-templates` |
| `/founder/business-weekly-review` | direct | `/founder/business-weekly-review` |
| `/founder/business-wind-down` | module-directory | `/founder/business-wind-down` |
| `/founder/business-wind-down/archive` | module-directory | `/founder/business-wind-down` |
| `/founder/business-wind-down/closure-checklist` | module-directory | `/founder/business-wind-down` |
| `/founder/business-wind-down/customer-offboarding` | module-directory | `/founder/business-wind-down` |
| `/founder/business-wind-down/data-retention` | module-directory | `/founder/business-wind-down` |
| `/founder/business-wind-down/pause` | module-directory | `/founder/business-wind-down` |
| `/founder/business-wind-down/vendor-cancellation` | module-directory | `/founder/business-wind-down` |
| `/founder/campaign-factory` | module-directory | `/founder/campaign-factory` |
| `/founder/capacity` | module-directory | `/founder/capacity` |
| `/founder/capacity/agents` | module-directory | `/founder/capacity` |
| `/founder/capacity/bottlenecks` | module-directory | `/founder/capacity` |
| `/founder/capacity/business` | module-directory | `/founder/capacity` |
| `/founder/capacity/delivery` | module-directory | `/founder/capacity` |
| `/founder/capacity/forecast` | module-directory | `/founder/capacity` |
| `/founder/capacity/humans` | module-directory | `/founder/capacity` |
| `/founder/channel-strategy` | module-directory | `/founder/channel-strategy` |
| `/founder/channel-strategy/businesses` | module-directory | `/founder/channel-strategy` |
| `/founder/channel-strategy/campaigns` | module-directory | `/founder/channel-strategy` |
| `/founder/channel-strategy/channels` | module-directory | `/founder/channel-strategy` |
| `/founder/channel-strategy/recommendations` | module-directory | `/founder/channel-strategy` |
| `/founder/clients` | direct | `/founder/clients` |
| `/founder/collections` | module-directory | `/founder/collections` |
| `/founder/collections/failed-payments` | module-directory | `/founder/collections` |
| `/founder/collections/overdue` | module-directory | `/founder/collections` |
| `/founder/collections/payment-plans` | module-directory | `/founder/collections` |
| `/founder/collections/reminders` | module-directory | `/founder/collections` |
| `/founder/collections/service-holds` | module-directory | `/founder/collections` |
| `/founder/collections/settings` | module-directory | `/founder/collections` |
| `/founder/command-center/legacy` | parent-module | `/founder/command-center` |
| `/founder/command-centre` | direct | `/founder/command-centre` |
| `/founder/communications` | module-directory | `/founder/communications` |
| `/founder/communications/by-business` | module-directory | `/founder/communications` |
| `/founder/communications/by-contact` | module-directory | `/founder/communications` |
| `/founder/communications/drafts` | module-directory | `/founder/communications` |
| `/founder/communications/ledger` | module-directory | `/founder/communications` |
| `/founder/communications/received` | module-directory | `/founder/communications` |
| `/founder/communications/settings` | module-directory | `/founder/communications` |
| `/founder/complaints` | module-directory | `/founder/complaints` |
| `/founder/complaints/disputes` | module-directory | `/founder/complaints` |
| `/founder/complaints/escalations` | module-directory | `/founder/complaints` |
| `/founder/complaints/evidence` | module-directory | `/founder/complaints` |
| `/founder/complaints/refunds` | module-directory | `/founder/complaints` |
| `/founder/complaints/settings` | module-directory | `/founder/complaints` |
| `/founder/compliance` | direct | `/founder/compliance` |
| `/founder/compliance/events` | parent-module | `/founder/compliance` |
| `/founder/compliance/rules` | parent-module | `/founder/compliance` |
| `/founder/connectors` | module-directory | `/founder/connectors` |
| `/founder/connectors/business-map` | module-directory | `/founder/connectors` |
| `/founder/connectors/health` | module-directory | `/founder/connectors` |
| `/founder/connectors/registry` | module-directory | `/founder/connectors` |
| `/founder/connectors/secrets` | module-directory | `/founder/connectors` |
| `/founder/connectors/settings` | module-directory | `/founder/connectors` |
| `/founder/connectors/webhooks` | module-directory | `/founder/connectors` |
| `/founder/context-fabric` | module-directory | `/founder/context-fabric` |
| `/founder/context-fabric/cross-contamination` | module-directory | `/founder/context-fabric` |
| `/founder/context-fabric/events` | module-directory | `/founder/context-fabric` |
| `/founder/context-fabric/missing-business` | module-directory | `/founder/context-fabric` |
| `/founder/context-fabric/settings` | module-directory | `/founder/context-fabric` |
| `/founder/contracts` | module-directory | `/founder/contracts` |
| `/founder/contracts/drafts` | module-directory | `/founder/contracts` |
| `/founder/contracts/obligations` | module-directory | `/founder/contracts` |
| `/founder/contracts/renewals` | module-directory | `/founder/contracts` |
| `/founder/contracts/risk` | module-directory | `/founder/contracts` |
| `/founder/contracts/settings` | module-directory | `/founder/contracts` |
| `/founder/contracts/signature` | module-directory | `/founder/contracts` |
| `/founder/conversations` | direct | `/founder/conversations` |
| `/founder/conversations/:id` | parent-module | `/founder/conversations` |
| `/founder/copilot` | direct | `/founder/copilot` |
| `/founder/corporate-secretarial` | module-directory | `/founder/corporate-secretarial` |
| `/founder/crm` | direct | `/founder/crm` |
| `/founder/crm/billionaire-access` | parent-module | `/founder/crm` |
| `/founder/crm/contacts` | parent-module | `/founder/crm` |
| `/founder/crm/contacts/:id` | parent-module | `/founder/crm` |
| `/founder/crm/inboxes` | parent-module | `/founder/crm` |
| `/founder/crm/inboxes/:id/configure` | parent-module | `/founder/crm` |
| `/founder/cross-contamination` | module-directory | `/founder/cross-contamination` |
| `/founder/customer-feedback` | module-directory | `/founder/customer-feedback` |
| `/founder/customer-feedback/churn-reasons` | module-directory | `/founder/customer-feedback` |
| `/founder/customer-feedback/feature-requests` | module-directory | `/founder/customer-feedback` |
| `/founder/customer-feedback/insights` | module-directory | `/founder/customer-feedback` |
| `/founder/customer-feedback/reviews` | module-directory | `/founder/customer-feedback` |
| `/founder/customer-feedback/signals` | module-directory | `/founder/customer-feedback` |
| `/founder/customer-feedback/testimonials` | module-directory | `/founder/customer-feedback` |
| `/founder/customer-onboarding` | module-directory | `/founder/customer-onboarding` |
| `/founder/customer-onboarding/checklists` | module-directory | `/founder/customer-onboarding` |
| `/founder/customer-onboarding/customers` | module-directory | `/founder/customer-onboarding` |
| `/founder/customer-onboarding/missing-info` | module-directory | `/founder/customer-onboarding` |
| `/founder/customer-onboarding/settings` | module-directory | `/founder/customer-onboarding` |
| `/founder/customer-onboarding/welcome-packs` | module-directory | `/founder/customer-onboarding` |
| `/founder/customer-sales` | direct | `/founder/customer-sales` |
| `/founder/customer-sales/call-logs` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/close-engine` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/conversations` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/follow-up` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/objections` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/offers` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/playbooks` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/product-knowledge` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/safety` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/settings` | parent-module | `/founder/customer-sales` |
| `/founder/customer-sales/voice-console` | parent-module | `/founder/customer-sales` |
| `/founder/customer-success` | direct | `/founder/customer-success` |
| `/founder/customer-upgrades` | module-directory | `/founder/customer-upgrades` |
| `/founder/customer-upgrades/follow-up` | module-directory | `/founder/customer-upgrades` |
| `/founder/customer-upgrades/opportunities` | module-directory | `/founder/customer-upgrades` |
| `/founder/customer-upgrades/product-ladders` | module-directory | `/founder/customer-upgrades` |
| `/founder/customer-upgrades/renewals` | module-directory | `/founder/customer-upgrades` |
| `/founder/customer-upgrades/upgrade-rules` | module-directory | `/founder/customer-upgrades` |
| `/founder/daily-operator` | module-directory | `/founder/daily-operator` |
| `/founder/data-quality` | module-directory | `/founder/data-quality` |
| `/founder/data-quality/duplicates` | module-directory | `/founder/data-quality` |
| `/founder/data-quality/orphans` | module-directory | `/founder/data-quality` |
| `/founder/data-quality/repair-queue` | module-directory | `/founder/data-quality` |
| `/founder/data-quality/revenue-integrity` | module-directory | `/founder/data-quality` |
| `/founder/data-quality/stale` | module-directory | `/founder/data-quality` |
| `/founder/data-quality/test-data` | module-directory | `/founder/data-quality` |
| `/founder/data-room` | direct | `/founder/data-room` |
| `/founder/decisions` | direct | `/founder/decisions` |
| `/founder/decisions/implemented` | parent-module | `/founder/decisions` |
| `/founder/decisions/made` | parent-module | `/founder/decisions` |
| `/founder/decisions/open` | parent-module | `/founder/decisions` |
| `/founder/decisions/review` | parent-module | `/founder/decisions` |
| `/founder/decisions/settings` | parent-module | `/founder/decisions` |
| `/founder/delivery` | module-directory | `/founder/delivery` |
| `/founder/delivery/blockers` | module-directory | `/founder/delivery` |
| `/founder/delivery/capacity` | module-directory | `/founder/delivery` |
| `/founder/delivery/completion-proof` | module-directory | `/founder/delivery` |
| `/founder/delivery/orders` | module-directory | `/founder/delivery` |
| `/founder/delivery/settings` | module-directory | `/founder/delivery` |
| `/founder/delivery/tasks` | module-directory | `/founder/delivery` |
| `/founder/demos` | direct | `/founder/demos` |
| `/founder/deployment` | module-directory | `/founder/deployment` |
| `/founder/deployment/edge-functions` | module-directory | `/founder/deployment` |
| `/founder/deployment/env-vars` | module-directory | `/founder/deployment` |
| `/founder/deployment/environments` | module-directory | `/founder/deployment` |
| `/founder/deployment/migrations` | module-directory | `/founder/deployment` |
| `/founder/deployment/releases` | module-directory | `/founder/deployment` |
| `/founder/deployment/rollback` | module-directory | `/founder/deployment` |
| `/founder/deployment/settings` | module-directory | `/founder/deployment` |
| `/founder/deployments` | direct | `/founder/deployments` |
| `/founder/deployments/:id` | parent-module | `/founder/deployments` |
| `/founder/distressed-radar` | direct | `/founder/distressed-radar` |
| `/founder/distressed-radar/acquisition` | parent-module | `/founder/distressed-radar` |
| `/founder/distressed-radar/acquisition/:id` | parent-module | `/founder/distressed-radar` |
| `/founder/distressed-radar/disposal` | parent-module | `/founder/distressed-radar` |
| `/founder/distressed-radar/financing` | parent-module | `/founder/distressed-radar` |
| `/founder/distressed-radar/sources` | parent-module | `/founder/distressed-radar` |
| `/founder/documents` | direct | `/founder/documents` |
| `/founder/documents/access` | parent-module | `/founder/documents` |
| `/founder/documents/data-room` | parent-module | `/founder/documents` |
| `/founder/documents/evidence` | parent-module | `/founder/documents` |
| `/founder/documents/policies` | parent-module | `/founder/documents` |
| `/founder/documents/requests` | parent-module | `/founder/documents` |
| `/founder/documents/vault` | parent-module | `/founder/documents` |
| `/founder/ecommerce` | module-directory | `/founder/ecommerce` |
| `/founder/ecommerce/fulfilment` | module-directory | `/founder/ecommerce` |
| `/founder/ecommerce/inventory` | module-directory | `/founder/ecommerce` |
| `/founder/ecommerce/orders` | module-directory | `/founder/ecommerce` |
| `/founder/ecommerce/products` | module-directory | `/founder/ecommerce` |
| `/founder/ecommerce/returns` | module-directory | `/founder/ecommerce` |
| `/founder/ecommerce/settings` | module-directory | `/founder/ecommerce` |
| `/founder/ecommerce/suppliers` | module-directory | `/founder/ecommerce` |
| `/founder/education-commercial` | direct | `/founder/education-commercial` |
| `/founder/entity-map` | direct | `/founder/entity-map` |
| `/founder/entity-map/adviser-questions` | parent-module | `/founder/entity-map` |
| `/founder/entity-map/businesses` | parent-module | `/founder/entity-map` |
| `/founder/entity-map/entities` | parent-module | `/founder/entity-map` |
| `/founder/entity-map/revenue-routing` | parent-module | `/founder/entity-map` |
| `/founder/entity-map/settings` | parent-module | `/founder/entity-map` |
| `/founder/executions` | direct | `/founder/executions` |
| `/founder/executions/:id` | parent-module | `/founder/executions` |
| `/founder/exit-metrics` | module-directory | `/founder/exit-metrics` |
| `/founder/exit-metrics/archetypes` | module-directory | `/founder/exit-metrics` |
| `/founder/exit-metrics/businesses` | module-directory | `/founder/exit-metrics` |
| `/founder/exit-metrics/buyer-fit` | module-directory | `/founder/exit-metrics` |
| `/founder/exit-metrics/data-room` | module-directory | `/founder/exit-metrics` |
| `/founder/exit-metrics/readiness` | module-directory | `/founder/exit-metrics` |
| `/founder/expansion` | direct | `/founder/expansion` |
| `/founder/expansion/:id` | parent-module | `/founder/expansion` |
| `/founder/experiments` | module-directory | `/founder/experiments` |
| `/founder/experiments/learning-library` | module-directory | `/founder/experiments` |
| `/founder/experiments/plans` | module-directory | `/founder/experiments` |
| `/founder/experiments/results` | module-directory | `/founder/experiments` |
| `/founder/experiments/winners` | module-directory | `/founder/experiments` |
| `/founder/external-activation-readiness` | direct | `/founder/external-activation-readiness` |
| `/founder/finance` | direct | `/founder/finance` |
| `/founder/finance/deals` | parent-module | `/founder/finance` |
| `/founder/finance/invoices` | parent-module | `/founder/finance` |
| `/founder/finance/payments` | parent-module | `/founder/finance` |
| `/founder/finance/targets` | parent-module | `/founder/finance` |
| `/founder/first-use-configuration` | module-directory | `/founder/first-use-configuration` |
| `/founder/founder-led-buyer-market` | direct | `/founder/founder-led-buyer-market` |
| `/founder/founder-led-exit` | direct | `/founder/founder-led-exit` |
| `/founder/funding-radar` | direct | `/founder/funding-radar` |
| `/founder/funding-radar/business-autopsy` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/business-autopsy/:id` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/capital-efficiency` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/clusters` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/companies` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/company/:id` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/decision-pack` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/handoff/:id` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/market-maps` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/monthly-run` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/settings` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/shortlist` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/watchlist` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/watchlist/:id` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/weakness-signals` | parent-module | `/founder/funding-radar` |
| `/founder/funding-radar/white-space` | parent-module | `/founder/funding-radar` |
| `/founder/ghat-outbound` | direct | `/founder/ghat-outbound` |
| `/founder/global-pr-radar` | direct | `/founder/global-pr-radar` |
| `/founder/gsm-outbound` | direct | `/founder/gsm-outbound` |
| `/founder/healthcare-overlay` | direct | `/founder/healthcare-overlay` |
| `/founder/human-workforce-control` | module-directory | `/founder/human-workforce-control` |
| `/founder/identity-resolution` | direct | `/founder/identity-resolution` |
| `/founder/identity-resolution/do-not-contact` | parent-module | `/founder/identity-resolution` |
| `/founder/identity-resolution/duplicates` | parent-module | `/founder/identity-resolution` |
| `/founder/identity-resolution/merge-queue` | parent-module | `/founder/identity-resolution` |
| `/founder/identity-resolution/people` | parent-module | `/founder/identity-resolution` |
| `/founder/identity-resolution/roles` | parent-module | `/founder/identity-resolution` |
| `/founder/identity-resolution/settings` | parent-module | `/founder/identity-resolution` |
| `/founder/imports` | direct | `/founder/imports` |
| `/founder/imports/history` | parent-module | `/founder/imports` |
| `/founder/imports/mapping` | parent-module | `/founder/imports` |
| `/founder/imports/preview` | parent-module | `/founder/imports` |
| `/founder/imports/rollback` | parent-module | `/founder/imports` |
| `/founder/imports/settings` | parent-module | `/founder/imports` |
| `/founder/imports/upload` | parent-module | `/founder/imports` |
| `/founder/incidents` | module-directory | `/founder/incidents` |
| `/founder/incidents/continuity` | module-directory | `/founder/incidents` |
| `/founder/incidents/live` | module-directory | `/founder/incidents` |
| `/founder/incidents/notifications` | module-directory | `/founder/incidents` |
| `/founder/incidents/postmortems` | module-directory | `/founder/incidents` |
| `/founder/incidents/settings` | module-directory | `/founder/incidents` |
| `/founder/insurance-claims` | module-directory | `/founder/insurance-claims` |
| `/founder/insurance-liability` | module-directory | `/founder/insurance-liability` |
| `/founder/insurance-liability/businesses` | module-directory | `/founder/insurance-liability` |
| `/founder/insurance-liability/claims` | module-directory | `/founder/insurance-liability` |
| `/founder/insurance-liability/gaps` | module-directory | `/founder/insurance-liability` |
| `/founder/insurance-liability/policies` | module-directory | `/founder/insurance-liability` |
| `/founder/integration-map` | module-directory | `/founder/integration-map` |
| `/founder/integration-map/businesses` | module-directory | `/founder/integration-map` |
| `/founder/integration-map/missing` | module-directory | `/founder/integration-map` |
| `/founder/integration-map/providers` | module-directory | `/founder/integration-map` |
| `/founder/integration-map/risks` | module-directory | `/founder/integration-map` |
| `/founder/integration-map/settings` | module-directory | `/founder/integration-map` |
| `/founder/integrations` | direct | `/founder/integrations` |
| `/founder/integrations/:id` | parent-module | `/founder/integrations` |
| `/founder/internal-proposals` | direct | `/founder/internal-proposals` |
| `/founder/internal-proposals/:id` | parent-module | `/founder/internal-proposals` |
| `/founder/internal-sla` | module-directory | `/founder/internal-sla` |
| `/founder/internal-sla/by-agent` | module-directory | `/founder/internal-sla` |
| `/founder/internal-sla/by-human` | module-directory | `/founder/internal-sla` |
| `/founder/internal-sla/handoffs` | module-directory | `/founder/internal-sla` |
| `/founder/internal-sla/overdue` | module-directory | `/founder/internal-sla` |
| `/founder/internal-sla/settings` | module-directory | `/founder/internal-sla` |
| `/founder/international-expansion` | module-directory | `/founder/international-expansion` |
| `/founder/ip-assets` | module-directory | `/founder/ip-assets` |
| `/founder/ip-assets/catalogue` | module-directory | `/founder/ip-assets` |
| `/founder/ip-assets/distribution` | module-directory | `/founder/ip-assets` |
| `/founder/ip-assets/licensing` | module-directory | `/founder/ip-assets` |
| `/founder/ip-assets/rights` | module-directory | `/founder/ip-assets` |
| `/founder/ip-assets/risks` | module-directory | `/founder/ip-assets` |
| `/founder/jurisdiction-tax` | module-directory | `/founder/jurisdiction-tax` |
| `/founder/jurisdiction-tax/adviser-review` | module-directory | `/founder/jurisdiction-tax` |
| `/founder/jurisdiction-tax/currencies` | module-directory | `/founder/jurisdiction-tax` |
| `/founder/jurisdiction-tax/customers` | module-directory | `/founder/jurisdiction-tax` |
| `/founder/jurisdiction-tax/revenue` | module-directory | `/founder/jurisdiction-tax` |
| `/founder/jurisdiction-tax/sellers` | module-directory | `/founder/jurisdiction-tax` |
| `/founder/jurisdiction-tax/settings` | module-directory | `/founder/jurisdiction-tax` |
| `/founder/knowledge` | direct | `/founder/knowledge` |
| `/founder/knowledge-governance` | parent-module | `/founder/knowledge` |
| `/founder/knowledge-governance/approved-claims` | parent-module | `/founder/knowledge` |
| `/founder/knowledge-governance/conflicts` | parent-module | `/founder/knowledge` |
| `/founder/knowledge-governance/manual-sync` | parent-module | `/founder/knowledge` |
| `/founder/knowledge-governance/sources` | parent-module | `/founder/knowledge` |
| `/founder/knowledge-governance/stale` | parent-module | `/founder/knowledge` |
| `/founder/knowledge/:id` | parent-module | `/founder/knowledge` |
| `/founder/launch-factory` | module-directory | `/founder/launch-factory` |
| `/founder/launch-factory/brand` | module-directory | `/founder/launch-factory` |
| `/founder/launch-factory/checklist` | module-directory | `/founder/launch-factory` |
| `/founder/launch-factory/domains` | module-directory | `/founder/launch-factory` |
| `/founder/launch-factory/email` | module-directory | `/founder/launch-factory` |
| `/founder/launch-factory/legal-pages` | module-directory | `/founder/launch-factory` |
| `/founder/launch-factory/socials` | module-directory | `/founder/launch-factory` |
| `/founder/launch-factory/tracking` | module-directory | `/founder/launch-factory` |
| `/founder/launch-factory/vertical-launch-cannon` | module-directory | `/founder/launch-factory` |
| `/founder/legal` | direct | `/founder/legal` |
| `/founder/manual` | direct | `/founder/manual` |
| `/founder/manual/:id` | parent-module | `/founder/manual` |
| `/founder/manual/full` | parent-module | `/founder/manual` |
| `/founder/manual/user` | parent-module | `/founder/manual` |
| `/founder/manuals-hub` | direct | `/founder/manuals-hub` |
| `/founder/marketing` | direct | `/founder/marketing` |
| `/founder/marketplace` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/active-sellers` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/category-balance` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/growth-actions` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/liquidity` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/listing-queue` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/listings` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/location-balance` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/payouts` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/performance-board` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/risk` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/seller-accounts` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/seller-checklist` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/seller-onboarding` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/seller-performance` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/seller-prospects` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/seller-recruitment` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/seller-verification` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/settings` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/supply-demand` | module-directory | `/founder/marketplace` |
| `/founder/marketplace/terms` | module-directory | `/founder/marketplace` |
| `/founder/micro-batch-preparation` | direct | `/founder/micro-batch-preparation` |
| `/founder/monday-launch` | module-directory | `/founder/monday-launch` |
| `/founder/monday-readiness` | module-directory | `/founder/monday-readiness` |
| `/founder/money` | module-directory | `/founder/money` |
| `/founder/monitoring` | direct | `/founder/monitoring` |
| `/founder/monitoring/:id` | parent-module | `/founder/monitoring` |
| `/founder/notifications` | module-directory | `/founder/notifications` |
| `/founder/notifications/archive` | module-directory | `/founder/notifications` |
| `/founder/notifications/escalations` | module-directory | `/founder/notifications` |
| `/founder/notifications/inbox` | module-directory | `/founder/notifications` |
| `/founder/notifications/rules` | module-directory | `/founder/notifications` |
| `/founder/notifications/settings` | module-directory | `/founder/notifications` |
| `/founder/notifications/urgent` | module-directory | `/founder/notifications` |
| `/founder/operations` | module-directory | `/founder/operations` |
| `/founder/optimisation` | direct | `/founder/optimisation` |
| `/founder/organisations` | direct | `/founder/organisations` |
| `/founder/organisations/:id` | parent-module | `/founder/organisations` |
| `/founder/outreach` | direct | `/founder/outreach` |
| `/founder/outreach/apollo` | parent-module | `/founder/outreach` |
| `/founder/outreach/campaigns` | parent-module | `/founder/outreach` |
| `/founder/outreach/engagement` | parent-module | `/founder/outreach` |
| `/founder/outreach/imports` | parent-module | `/founder/outreach` |
| `/founder/outreach/live-monitor` | parent-module | `/founder/outreach` |
| `/founder/outreach/queue` | parent-module | `/founder/outreach` |
| `/founder/outreach/queue-audit` | parent-module | `/founder/outreach` |
| `/founder/outreach/send-preview` | parent-module | `/founder/outreach` |
| `/founder/partners` | module-directory | `/founder/partners` |
| `/founder/partners/affiliates` | module-directory | `/founder/partners` |
| `/founder/partners/commissions` | module-directory | `/founder/partners` |
| `/founder/partners/performance` | module-directory | `/founder/partners` |
| `/founder/partners/prospects` | module-directory | `/founder/partners` |
| `/founder/partners/referrals` | module-directory | `/founder/partners` |
| `/founder/people` | module-directory | `/founder/people` |
| `/founder/people/access` | module-directory | `/founder/people` |
| `/founder/people/handover` | module-directory | `/founder/people` |
| `/founder/people/operators` | module-directory | `/founder/people` |
| `/founder/people/quality` | module-directory | `/founder/people` |
| `/founder/people/tasks` | module-directory | `/founder/people` |
| `/founder/people/training` | module-directory | `/founder/people` |
| `/founder/pipeline` | direct | `/founder/pipeline` |
| `/founder/platform-monitor` | module-directory | `/founder/platform-monitor` |
| `/founder/platform-monitor/costs` | module-directory | `/founder/platform-monitor` |
| `/founder/platform-monitor/errors` | module-directory | `/founder/platform-monitor` |
| `/founder/platform-monitor/performance` | module-directory | `/founder/platform-monitor` |
| `/founder/platform-monitor/rate-limits` | module-directory | `/founder/platform-monitor` |
| `/founder/platform-monitor/recommendations` | module-directory | `/founder/platform-monitor` |
| `/founder/platform-monitor/scalability` | module-directory | `/founder/platform-monitor` |
| `/founder/policies` | module-directory | `/founder/policies` |
| `/founder/policies/businesses` | module-directory | `/founder/policies` |
| `/founder/policies/coverage` | module-directory | `/founder/policies` |
| `/founder/policies/drafts` | module-directory | `/founder/policies` |
| `/founder/policies/public-pages` | module-directory | `/founder/policies` |
| `/founder/policies/review` | module-directory | `/founder/policies` |
| `/founder/portal-admin` | module-directory | `/founder/portal-admin` |
| `/founder/portal-admin/access` | module-directory | `/founder/portal-admin` |
| `/founder/portal-admin/adviser` | module-directory | `/founder/portal-admin` |
| `/founder/portal-admin/customer` | module-directory | `/founder/portal-admin` |
| `/founder/portal-admin/document-upload` | module-directory | `/founder/portal-admin` |
| `/founder/portal-admin/partner` | module-directory | `/founder/portal-admin` |
| `/founder/portal-admin/seller` | module-directory | `/founder/portal-admin` |
| `/founder/portal-admin/settings` | module-directory | `/founder/portal-admin` |
| `/founder/portals` | module-directory | `/founder/portals` |
| `/founder/portals/access` | module-directory | `/founder/portals` |
| `/founder/portals/adviser` | module-directory | `/founder/portals` |
| `/founder/portals/customer` | module-directory | `/founder/portals` |
| `/founder/portals/document-upload` | module-directory | `/founder/portals` |
| `/founder/portals/partner` | module-directory | `/founder/portals` |
| `/founder/portals/seller` | module-directory | `/founder/portals` |
| `/founder/portals/settings` | module-directory | `/founder/portals` |
| `/founder/portfolio-diversity` | module-directory | `/founder/portfolio-diversity` |
| `/founder/portfolio-exit` | direct | `/founder/portfolio-exit` |
| `/founder/portfolio-exit-targets` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit-targets/:id` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit-targets/alerts` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit-targets/businesses` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit-targets/settings` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/:assetId` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/ai-bypass-register` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/build-selector` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/buyer-warmup` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/competitors` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/controls` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/execution-handoff` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/hardening` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/ingestion` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/intelligence` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/investors` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/manual` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/operating-panels` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/release-gate` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-exit/valuation` | parent-module | `/founder/portfolio-exit` |
| `/founder/portfolio-fx` | module-directory | `/founder/portfolio-fx` |
| `/founder/portfolio-memory` | module-directory | `/founder/portfolio-memory` |
| `/founder/portfolio-memory/adviser-briefs` | module-directory | `/founder/portfolio-memory` |
| `/founder/portfolio-memory/businesses` | module-directory | `/founder/portfolio-memory` |
| `/founder/portfolio-memory/buyer-briefs` | module-directory | `/founder/portfolio-memory` |
| `/founder/portfolio-memory/handover-packs` | module-directory | `/founder/portfolio-memory` |
| `/founder/portfolio-memory/history` | module-directory | `/founder/portfolio-memory` |
| `/founder/portfolio-memory/operator-briefs` | module-directory | `/founder/portfolio-memory` |
| `/founder/portfolio-prioritisation` | module-directory | `/founder/portfolio-prioritisation` |
| `/founder/portfolio-prioritisation/build-now` | module-directory | `/founder/portfolio-prioritisation` |
| `/founder/portfolio-prioritisation/decisions` | module-directory | `/founder/portfolio-prioritisation` |
| `/founder/portfolio-prioritisation/park` | module-directory | `/founder/portfolio-prioritisation` |
| `/founder/portfolio-prioritisation/scale` | module-directory | `/founder/portfolio-prioritisation` |
| `/founder/portfolio-prioritisation/scores` | module-directory | `/founder/portfolio-prioritisation` |
| `/founder/portfolio-risk` | module-directory | `/founder/portfolio-risk` |
| `/founder/portfolio-risk/actions` | module-directory | `/founder/portfolio-risk` |
| `/founder/portfolio-risk/businesses` | module-directory | `/founder/portfolio-risk` |
| `/founder/portfolio-risk/critical` | module-directory | `/founder/portfolio-risk` |
| `/founder/portfolio-risk/matrix` | module-directory | `/founder/portfolio-risk` |
| `/founder/pricing-margin` | module-directory | `/founder/pricing-margin` |
| `/founder/pricing-margin/breakeven` | module-directory | `/founder/pricing-margin` |
| `/founder/pricing-margin/businesses` | module-directory | `/founder/pricing-margin` |
| `/founder/pricing-margin/discounts` | module-directory | `/founder/pricing-margin` |
| `/founder/pricing-margin/products` | module-directory | `/founder/pricing-margin` |
| `/founder/pricing-margin/recommendations` | module-directory | `/founder/pricing-margin` |
| `/founder/priority` | direct | `/founder/priority` |
| `/founder/privacy` | module-directory | `/founder/privacy` |
| `/founder/privacy/breaches` | module-directory | `/founder/privacy` |
| `/founder/privacy/consent` | module-directory | `/founder/privacy` |
| `/founder/privacy/dsar` | module-directory | `/founder/privacy` |
| `/founder/privacy/processors` | module-directory | `/founder/privacy` |
| `/founder/privacy/retention` | module-directory | `/founder/privacy` |
| `/founder/privacy/settings` | module-directory | `/founder/privacy` |
| `/founder/processes` | direct | `/founder/processes` |
| `/founder/processes/:id` | parent-module | `/founder/processes` |
| `/founder/product` | module-directory | `/founder/product` |
| `/founder/product-catalogue` | module-directory | `/founder/product-catalogue` |
| `/founder/product-catalogue/add-ons` | module-directory | `/founder/product-catalogue` |
| `/founder/product-catalogue/claims` | module-directory | `/founder/product-catalogue` |
| `/founder/product-catalogue/offers` | module-directory | `/founder/product-catalogue` |
| `/founder/product-catalogue/packages` | module-directory | `/founder/product-catalogue` |
| `/founder/product-catalogue/pricing` | module-directory | `/founder/product-catalogue` |
| `/founder/product-catalogue/products` | module-directory | `/founder/product-catalogue` |
| `/founder/product/bugs` | module-directory | `/founder/product` |
| `/founder/product/features` | module-directory | `/founder/product` |
| `/founder/product/known-issues` | module-directory | `/founder/product` |
| `/founder/product/qa` | module-directory | `/founder/product` |
| `/founder/product/releases` | module-directory | `/founder/product` |
| `/founder/product/rollback` | module-directory | `/founder/product` |
| `/founder/projects` | direct | `/founder/projects` |
| `/founder/projects/:id` | parent-module | `/founder/projects` |
| `/founder/proposals` | direct | `/founder/proposals` |
| `/founder/proposals/:id` | parent-module | `/founder/proposals` |
| `/founder/quarterly-production-machine` | module-directory | `/founder/quarterly-production-machine` |
| `/founder/quarterly-production-machine/build-generator` | module-directory | `/founder/quarterly-production-machine` |
| `/founder/quarterly-production-machine/build-pack-validator` | module-directory | `/founder/quarterly-production-machine` |
| `/founder/quarterly-production-machine/lovable-pack` | module-directory | `/founder/quarterly-production-machine` |
| `/founder/quarterly-production-machine/production-pack` | module-directory | `/founder/quarterly-production-machine` |
| `/founder/quarterly-production-machine/prompt-queue` | module-directory | `/founder/quarterly-production-machine` |
| `/founder/quarterly-production-machine/vertical-launch` | module-directory | `/founder/quarterly-production-machine` |
| `/founder/quote-to-cash` | direct | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/invoices` | parent-module | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/payment-architecture-readiness` | parent-module | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/payment-control-centre` | parent-module | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/payments` | parent-module | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/proposals` | parent-module | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/quotes` | parent-module | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/revenue-confirmation` | parent-module | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/settings` | parent-module | `/founder/quote-to-cash` |
| `/founder/quote-to-cash/stripe-price-mapping` | parent-module | `/founder/quote-to-cash` |
| `/founder/reconciliation` | module-directory | `/founder/reconciliation` |
| `/founder/reconciliation/bank` | module-directory | `/founder/reconciliation` |
| `/founder/reconciliation/invoices` | module-directory | `/founder/reconciliation` |
| `/founder/reconciliation/payments` | module-directory | `/founder/reconciliation` |
| `/founder/reconciliation/payouts` | module-directory | `/founder/reconciliation` |
| `/founder/reconciliation/refunds` | module-directory | `/founder/reconciliation` |
| `/founder/reconciliation/settings` | module-directory | `/founder/reconciliation` |
| `/founder/reconciliation/unmatched` | module-directory | `/founder/reconciliation` |
| `/founder/recovery` | module-directory | `/founder/recovery` |
| `/founder/relationship-health` | module-directory | `/founder/relationship-health` |
| `/founder/relationship-health/customers` | module-directory | `/founder/relationship-health` |
| `/founder/relationship-health/opportunities` | module-directory | `/founder/relationship-health` |
| `/founder/relationship-health/partners` | module-directory | `/founder/relationship-health` |
| `/founder/relationship-health/risks` | module-directory | `/founder/relationship-health` |
| `/founder/relationship-health/sellers` | module-directory | `/founder/relationship-health` |
| `/founder/relationship-intelligence` | direct | `/founder/relationship-intelligence` |
| `/founder/relationship-intelligence/import` | parent-module | `/founder/relationship-intelligence` |
| `/founder/release-workflow` | module-directory | `/founder/release-workflow` |
| `/founder/reporting-truth` | module-directory | `/founder/reporting-truth` |
| `/founder/reporting-truth/conflicts` | module-directory | `/founder/reporting-truth` |
| `/founder/reporting-truth/definitions` | module-directory | `/founder/reporting-truth` |
| `/founder/reporting-truth/kpi-dictionary` | module-directory | `/founder/reporting-truth` |
| `/founder/reporting-truth/reconciliation` | module-directory | `/founder/reporting-truth` |
| `/founder/reporting-truth/settings` | module-directory | `/founder/reporting-truth` |
| `/founder/reports` | module-directory | `/founder/reports` |
| `/founder/reports/archive` | module-directory | `/founder/reports` |
| `/founder/reports/decisions` | module-directory | `/founder/reports` |
| `/founder/reports/monthly` | module-directory | `/founder/reports` |
| `/founder/reports/portfolio` | module-directory | `/founder/reports` |
| `/founder/reports/weekly` | module-directory | `/founder/reports` |
| `/founder/resource-allocation` | module-directory | `/founder/resource-allocation` |
| `/founder/resource-allocation/ai-budget` | module-directory | `/founder/resource-allocation` |
| `/founder/resource-allocation/cash` | module-directory | `/founder/resource-allocation` |
| `/founder/resource-allocation/founder-attention` | module-directory | `/founder/resource-allocation` |
| `/founder/resource-allocation/human-time` | module-directory | `/founder/resource-allocation` |
| `/founder/resource-allocation/recommendations` | module-directory | `/founder/resource-allocation` |
| `/founder/revenue` | direct | `/founder/revenue` |
| `/founder/revenue-autopilot` | direct | `/founder/revenue-autopilot` |
| `/founder/revenue-autopilot/approvals` | parent-module | `/founder/revenue-autopilot` |
| `/founder/revenue-autopilot/gaps` | parent-module | `/founder/revenue-autopilot` |
| `/founder/revenue-autopilot/targets` | parent-module | `/founder/revenue-autopilot` |
| `/founder/revenue-autopilot/tasks` | parent-module | `/founder/revenue-autopilot` |
| `/founder/revenue-autopilot/today` | parent-module | `/founder/revenue-autopilot` |
| `/founder/roles` | module-directory | `/founder/roles` |
| `/founder/roles/access-requests` | module-directory | `/founder/roles` |
| `/founder/roles/audit` | module-directory | `/founder/roles` |
| `/founder/roles/delegation` | module-directory | `/founder/roles` |
| `/founder/roles/permissions` | module-directory | `/founder/roles` |
| `/founder/roles/settings` | module-directory | `/founder/roles` |
| `/founder/roles/users` | module-directory | `/founder/roles` |
| `/founder/runtime-mode` | module-directory | `/founder/runtime-mode` |
| `/founder/sales-coaching` | direct | `/founder/sales-coaching` |
| `/founder/sales-coaching/conversions` | parent-module | `/founder/sales-coaching` |
| `/founder/sales-coaching/objections` | parent-module | `/founder/sales-coaching` |
| `/founder/sales-coaching/recommendations` | parent-module | `/founder/sales-coaching` |
| `/founder/sales-coaching/scripts` | parent-module | `/founder/sales-coaching` |
| `/founder/sales-coaching/wins-losses` | parent-module | `/founder/sales-coaching` |
| `/founder/sales-targets` | module-directory | `/founder/sales-targets` |
| `/founder/sales-targets/activity-plan` | module-directory | `/founder/sales-targets` |
| `/founder/sales-targets/business` | module-directory | `/founder/sales-targets` |
| `/founder/sales-targets/conversion` | module-directory | `/founder/sales-targets` |
| `/founder/sales-targets/forecast` | module-directory | `/founder/sales-targets` |
| `/founder/sales-targets/gaps` | module-directory | `/founder/sales-targets` |
| `/founder/scheduled-jobs` | module-directory | `/founder/scheduled-jobs` |
| `/founder/scheduled-jobs/calendar` | module-directory | `/founder/scheduled-jobs` |
| `/founder/scheduled-jobs/failures` | module-directory | `/founder/scheduled-jobs` |
| `/founder/scheduled-jobs/jobs` | module-directory | `/founder/scheduled-jobs` |
| `/founder/scheduled-jobs/runs` | module-directory | `/founder/scheduled-jobs` |
| `/founder/scheduled-jobs/settings` | module-directory | `/founder/scheduled-jobs` |
| `/founder/scheduling` | module-directory | `/founder/scheduling` |
| `/founder/scheduling/availability` | module-directory | `/founder/scheduling` |
| `/founder/scheduling/bookings` | module-directory | `/founder/scheduling` |
| `/founder/scheduling/no-shows` | module-directory | `/founder/scheduling` |
| `/founder/scheduling/resources` | module-directory | `/founder/scheduling` |
| `/founder/scheduling/settings` | module-directory | `/founder/scheduling` |
| `/founder/search` | direct | `/founder/search` |
| `/founder/search/all` | parent-module | `/founder/search` |
| `/founder/search/audit` | parent-module | `/founder/search` |
| `/founder/search/businesses` | parent-module | `/founder/search` |
| `/founder/search/communications` | parent-module | `/founder/search` |
| `/founder/search/customers` | parent-module | `/founder/search` |
| `/founder/search/documents` | parent-module | `/founder/search` |
| `/founder/search/settings` | parent-module | `/founder/search` |
| `/founder/security` | direct | `/founder/security` |
| `/founder/security-vault` | parent-module | `/founder/security` |
| `/founder/security-vault/backup-restore` | parent-module | `/founder/security` |
| `/founder/security-vault/build-snapshots` | parent-module | `/founder/security` |
| `/founder/security-vault/secrets-register` | parent-module | `/founder/security` |
| `/founder/security-vault/security-audit` | parent-module | `/founder/security` |
| `/founder/sending` | direct | `/founder/sending` |
| `/founder/sending-infrastructure` | direct | `/founder/sending-infrastructure` |
| `/founder/social` | direct | `/founder/social` |
| `/founder/social-autopilot` | direct | `/founder/social-autopilot` |
| `/founder/social-autopilot/accounts` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/ads` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/assets` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/calendar` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/content` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/engagement` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/funnels` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/inbox` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/performance` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/publishing` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/replies` | parent-module | `/founder/social-autopilot` |
| `/founder/social-autopilot/settings` | parent-module | `/founder/social-autopilot` |
| `/founder/social-relationships` | direct | `/founder/social-relationships` |
| `/founder/social-relationships/connections` | parent-module | `/founder/social-relationships` |
| `/founder/social-relationships/discovery` | parent-module | `/founder/social-relationships` |
| `/founder/social-relationships/inbox` | parent-module | `/founder/social-relationships` |
| `/founder/social-relationships/policies` | parent-module | `/founder/social-relationships` |
| `/founder/social-relationships/queue` | parent-module | `/founder/social-relationships` |
| `/founder/social-relationships/targets` | parent-module | `/founder/social-relationships` |
| `/founder/sops` | module-directory | `/founder/sops` |
| `/founder/sops/agent-usage` | module-directory | `/founder/sops` |
| `/founder/sops/conflicts` | module-directory | `/founder/sops` |
| `/founder/sops/library` | module-directory | `/founder/sops` |
| `/founder/sops/reviews` | module-directory | `/founder/sops` |
| `/founder/sops/settings` | module-directory | `/founder/sops` |
| `/founder/sops/versions` | module-directory | `/founder/sops` |
| `/founder/start-here` | module-directory | `/founder/start-here` |
| `/founder/start-here/setup-business` | module-directory | `/founder/start-here` |
| `/founder/starter-pack-materialiser` | direct | `/founder/starter-pack-materialiser` |
| `/founder/statutory-filings` | module-directory | `/founder/statutory-filings` |
| `/founder/strategy` | direct | `/founder/strategy` |
| `/founder/suppliers` | direct | `/founder/suppliers` |
| `/founder/suppliers/:id` | parent-module | `/founder/suppliers` |
| `/founder/support` | direct | `/founder/support` |
| `/founder/support-tickets` | parent-module | `/founder/support` |
| `/founder/support-tickets/escalations` | parent-module | `/founder/support` |
| `/founder/support-tickets/knowledge` | parent-module | `/founder/support` |
| `/founder/support-tickets/queue` | parent-module | `/founder/support` |
| `/founder/support-tickets/settings` | parent-module | `/founder/support` |
| `/founder/support-tickets/sla` | parent-module | `/founder/support` |
| `/founder/support/knowledge-agent` | parent-module | `/founder/support` |
| `/founder/system` | direct | `/founder/system` |
| `/founder/system-config` | parent-module | `/founder/system` |
| `/founder/system-config/audit` | parent-module | `/founder/system` |
| `/founder/system-config/business-overrides` | parent-module | `/founder/system` |
| `/founder/system-config/external-actions` | parent-module | `/founder/system` |
| `/founder/system-config/feature-flags` | parent-module | `/founder/system` |
| `/founder/system-config/modules` | parent-module | `/founder/system` |
| `/founder/system-health` | parent-module | `/founder/system` |
| `/founder/system/events` | parent-module | `/founder/system` |
| `/founder/system/health` | parent-module | `/founder/system` |
| `/founder/system/modes` | parent-module | `/founder/system` |
| `/founder/templates` | direct | `/founder/templates` |
| `/founder/templates/:id` | parent-module | `/founder/templates` |
| `/founder/testing` | direct | `/founder/testing` |
| `/founder/trust-safety` | module-directory | `/founder/trust-safety` |
| `/founder/trust-safety/accounts` | module-directory | `/founder/trust-safety` |
| `/founder/trust-safety/actions` | module-directory | `/founder/trust-safety` |
| `/founder/trust-safety/messages` | module-directory | `/founder/trust-safety` |
| `/founder/trust-safety/payments` | module-directory | `/founder/trust-safety` |
| `/founder/trust-safety/risk-events` | module-directory | `/founder/trust-safety` |
| `/founder/trust-safety/settings` | module-directory | `/founder/trust-safety` |
| `/founder/user-guide` | module-directory | `/founder/user-guide` |
| `/founder/vendors` | module-directory | `/founder/vendors` |
| `/founder/vendors/access` | module-directory | `/founder/vendors` |
| `/founder/vendors/contracts` | module-directory | `/founder/vendors` |
| `/founder/vendors/costs` | module-directory | `/founder/vendors` |
| `/founder/vendors/renewals` | module-directory | `/founder/vendors` |
| `/founder/vendors/risk` | module-directory | `/founder/vendors` |
| `/founder/vendors/saas` | module-directory | `/founder/vendors` |
| `/founder/video-library` | module-directory | `/founder/video-library` |
| `/founder/video-sop-factory` | module-directory | `/founder/video-sop-factory` |
| `/founder/webhooks` | module-directory | `/founder/webhooks` |
| `/founder/webhooks/failures` | module-directory | `/founder/webhooks` |
| `/founder/webhooks/inbox` | module-directory | `/founder/webhooks` |
| `/founder/webhooks/normalised-events` | module-directory | `/founder/webhooks` |
| `/founder/webhooks/providers` | module-directory | `/founder/webhooks` |
| `/founder/webhooks/settings` | module-directory | `/founder/webhooks` |
| `/founder/work-queue` | module-directory | `/founder/work-queue` |
| `/founder/work-queue/approvals` | module-directory | `/founder/work-queue` |
| `/founder/work-queue/blocked` | module-directory | `/founder/work-queue` |
| `/founder/work-queue/by-agent` | module-directory | `/founder/work-queue` |
| `/founder/work-queue/by-business` | module-directory | `/founder/work-queue` |
| `/founder/work-queue/high-value` | module-directory | `/founder/work-queue` |
| `/founder/work-queue/overdue` | module-directory | `/founder/work-queue` |
| `/founder/work-queue/settings` | module-directory | `/founder/work-queue` |
| `/founder/work-queue/today` | module-directory | `/founder/work-queue` |
| `/founder/worker-help-audit` | module-directory | `/founder/worker-help-audit` |
| `/founder/worker-manuals` | module-directory | `/founder/worker-manuals` |
| `/founder/workflows` | direct | `/founder/workflows` |
| `/founder/workflows/:id` | parent-module | `/founder/workflows` |
