# Appendix C — Complete Route Catalog

_Generated from commit `a513cacffe2a1064a5ea172c9170c46a55c51b8e` by `scripts/generate-rebuild-manual-catalogs.mjs`. Regenerate with `node scripts/generate-rebuild-manual-catalogs.mjs`._

Every route registered in `src/App.tsx`. Guard column: `FounderRoute` = founder/admin only (`user_roles.role = 'founder'`), `ProtectedRoute` = any authenticated portal user, `PartnerRoute`/`SupplierRoute`/`WorkerRoute` = scoped portals, `public` = unauthenticated, `redirect` = alias.

**Total registered routes: 876** across 26 top-level areas.

| Area | Routes |
|---|---|
| `/founder` | 806 |
| `/portal` | 24 |
| `/legal` | 13 |
| `/partner` | 7 |
| `/supplier` | 3 |
| `/(root)` | 2 |
| `/proposals` | 2 |
| `/what-we-build` | 1 |
| `/industries` | 1 |
| `/method` | 1 |
| `/case-studies` | 1 |
| `/partners` | 1 |
| `/project-discovery` | 1 |
| `/about` | 1 |
| `/ai-proposal` | 1 |
| `/platform` | 1 |
| `/systems` | 1 |
| `/architecture` | 1 |
| `/survey` | 1 |
| `/customer-report` | 1 |
| `/onboarding` | 1 |
| `/demo` | 1 |
| `/operator-login` | 1 |
| `/operator-portal` | 1 |
| `/oversight-login` | 1 |
| `/oversight-portal` | 1 |

## /(root) (2)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `*` | public | NotFound | `./pages/NotFound` |
| `/` | public | Index | `./pages/Index` |

## /about (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/about` | public | About | `./pages/About` |

## /ai-proposal (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/ai-proposal` | public | AIProposal | `./pages/AIProposal` |

## /architecture (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/architecture` | public | Architecture | `./pages/Architecture` |

## /case-studies (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/case-studies` | public | CaseStudies | `./pages/CaseStudies` |

## /customer-report (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/customer-report/:token` _(dynamic)_ | public | CustomerReportView | `@/pages/public/CustomerReportView` |

## /demo (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/demo/:token` _(dynamic)_ | public | PublicDemo | `./pages/public/PublicDemo` |

## /founder (806)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/founder` | FounderRoute | FounderOverview | `./pages/founder/FounderOverview` |
| `/founder/access-control` | FounderRoute | AccessControl | `./pages/founder/AccessControl` |
| `/founder/access-governance` | FounderRoute | AccessGovernanceOverview | `./pages/founder/access-governance/Overview` |
| `/founder/access-governance/audit` | FounderRoute | AccessGovernanceAudit | `./pages/founder/access-governance/Audit` |
| `/founder/access-governance/revocation` | FounderRoute | AccessGovernanceRevocation | `./pages/founder/access-governance/Revocation` |
| `/founder/access-governance/rotation` | FounderRoute | AccessGovernanceRotation | `./pages/founder/access-governance/Rotation` |
| `/founder/access-governance/secrets` | FounderRoute | AccessGovernanceSecrets | `./pages/founder/access-governance/Secrets` |
| `/founder/access-governance/systems` | FounderRoute | AccessGovernanceSystems | `./pages/founder/access-governance/Systems` |
| `/founder/access-governance/users` | FounderRoute | AccessGovernanceUsers | `./pages/founder/access-governance/Users` |
| `/founder/acquisition-funding` | FounderRoute | AFOverview | `./pages/founder/acquisition-funding/Overview` |
| `/founder/acquisition-funding/deals` | FounderRoute | AFDeals | `./pages/founder/acquisition-funding/Deals` |
| `/founder/acquisition-funding/funders` | FounderRoute | AFFunders | `./pages/founder/acquisition-funding/Funders` |
| `/founder/acquisition-funding/opportunities` | FounderRoute | AFOpportunities | `./pages/founder/acquisition-funding/Opportunities` |
| `/founder/acquisition-funding/opportunities/:id` _(dynamic)_ | FounderRoute | AFOpportunityDetail | `./pages/founder/acquisition-funding/OpportunityDetail` |
| `/founder/acquisition-funding/pitches` | FounderRoute | AFPitches | `./pages/founder/acquisition-funding/Pitches` |
| `/founder/activity` | FounderRoute | FounderActivity | `./pages/founder/FounderActivity` |
| `/founder/adviser-pack` | FounderRoute | AdviserPackOverview | `./pages/founder/adviser-pack/Overview` |
| `/founder/adviser-pack/documents` | FounderRoute | AdviserPackDocuments | `./pages/founder/adviser-pack/Documents` |
| `/founder/adviser-pack/entities` | FounderRoute | AdviserPackEntities | `./pages/founder/adviser-pack/Entities` |
| `/founder/adviser-pack/expenses` | FounderRoute | AdviserPackExpenses | `./pages/founder/adviser-pack/Expenses` |
| `/founder/adviser-pack/monthly` | FounderRoute | AdviserPackMonthly | `./pages/founder/adviser-pack/Monthly` |
| `/founder/adviser-pack/questions` | FounderRoute | AdviserPackQuestions | `./pages/founder/adviser-pack/Questions` |
| `/founder/adviser-pack/revenue` | FounderRoute | AdviserPackRevenue | `./pages/founder/adviser-pack/Revenue` |
| `/founder/agent-capabilities` | FounderRoute | AgentCapabilitiesOverview | `./pages/founder/agent-capabilities/Overview` |
| `/founder/agent-capabilities/approval-rules` | FounderRoute | AgentCapabilitiesApprovalRules | `./pages/founder/agent-capabilities/ApprovalRules` |
| `/founder/agent-capabilities/audit` | FounderRoute | AgentCapabilitiesAudit | `./pages/founder/agent-capabilities/Audit` |
| `/founder/agent-capabilities/boundaries` | FounderRoute | AgentCapabilitiesBoundaries | `./pages/founder/agent-capabilities/Boundaries` |
| `/founder/agent-capabilities/escalations` | FounderRoute | AgentCapabilitiesEscalations | `./pages/founder/agent-capabilities/Escalations` |
| `/founder/agent-capabilities/registry` | FounderRoute | AgentCapabilitiesRegistry | `./pages/founder/agent-capabilities/Registry` |
| `/founder/agents` | FounderRoute | AgentDirectory | `./pages/founder/AgentDirectory` |
| `/founder/agents/:id` _(dynamic)_ | FounderRoute | AgentProfile | `./pages/founder/AgentProfile` |
| `/founder/ai-compliance` | FounderRoute | AICOverview | `./pages/founder/ai-compliance/Overview` |
| `/founder/ai-compliance/data-flows` | FounderRoute | AICDataFlows | `./pages/founder/ai-compliance/DataFlows` |
| `/founder/ai-compliance/evidence` | FounderRoute | AICEvidence | `./pages/founder/ai-compliance/Evidence` |
| `/founder/ai-compliance/gaps` | FounderRoute | AICGaps | `./pages/founder/ai-compliance/Gaps` |
| `/founder/ai-compliance/oversight` | FounderRoute | AICOversight | `./pages/founder/ai-compliance/Oversight` |
| `/founder/ai-compliance/risk` | FounderRoute | AICRisk | `./pages/founder/ai-compliance/Risk` |
| `/founder/ai-compliance/systems` | FounderRoute | AICSystems | `./pages/founder/ai-compliance/Systems` |
| `/founder/ai-cost` | FounderRoute | AICostGovernorHub | `./pages/founder/AICostGovernorHub` |
| `/founder/ai-cost/action-board` | FounderRoute | AIFounderActionBoard | `./pages/founder/AIFounderActionBoard` |
| `/founder/ai-cost/agent-controls` | FounderRoute | AIAgentCostControls | `./pages/founder/AIAgentCostControls` |
| `/founder/ai-cost/alerts` | FounderRoute | AICostAlerts | `./pages/founder/AICostAlerts` |
| `/founder/ai-cost/approvals` | FounderRoute | AIApprovalGates | `./pages/founder/AIApprovalGates` |
| `/founder/ai-cost/budgets` | FounderRoute | AIBusinessBudgets | `./pages/founder/AIBusinessBudgets` |
| `/founder/ai-cost/context` | FounderRoute | AICachedContext | `./pages/founder/AICachedContext` |
| `/founder/ai-cost/finance` | FounderRoute | AIFinancePack | `./pages/founder/AIFinancePack` |
| `/founder/ai-cost/first-use` | FounderRoute | AIFirstUseSetup | `./pages/founder/AIFirstUseSetup` |
| `/founder/ai-cost/health` | FounderRoute | AIRuntimeHealth | `./pages/founder/AIRuntimeHealth` |
| `/founder/ai-cost/ledger` | FounderRoute | AIUsageLedger | `./pages/founder/AIUsageLedger` |
| `/founder/ai-cost/live` | FounderRoute | AILiveOperations | `./pages/founder/AILiveOperations` |
| `/founder/ai-cost/orchestration-live` | FounderRoute | AIOrchestrationLive | `./pages/founder/AIOrchestrationLive` |
| `/founder/ai-cost/pricing` | FounderRoute | AIProviderPricing | `./pages/founder/AIProviderPricing` |
| `/founder/ai-cost/quality` | FounderRoute | AIQualityScoring | `./pages/founder/AIQualityScoring` |
| `/founder/ai-cost/queue` | FounderRoute | AIQueueControl | `./pages/founder/AIQueueControl` |
| `/founder/ai-cost/roi` | FounderRoute | AIROIEngine | `./pages/founder/AIROIEngine` |
| `/founder/ai-cost/routing` | FounderRoute | AIModelRouting | `./pages/founder/AIModelRouting` |
| `/founder/ai-cost/runtime` | FounderRoute | AIRuntimeOrchestration | `./pages/founder/AIRuntimeOrchestration` |
| `/founder/ai-cost/sandbox` | FounderRoute | AISandbox | `./pages/founder/AISandbox` |
| `/founder/ai-cost/security` | FounderRoute | AISecurityCentre | `./pages/founder/AISecurityCentre` |
| `/founder/ai-cost/templates` | FounderRoute | AIPromptTemplates | `./pages/founder/AIPromptTemplates` |
| `/founder/ai-evals` | FounderRoute | EvalsOverview | `./pages/founder/ai-evals/Overview` |
| `/founder/ai-evals/agents` | FounderRoute | EvalsAgents | `./pages/founder/ai-evals/Agents` |
| `/founder/ai-evals/regression` | FounderRoute | EvalsRegression | `./pages/founder/ai-evals/Regression` |
| `/founder/ai-evals/results` | FounderRoute | EvalsResults | `./pages/founder/ai-evals/Results` |
| `/founder/ai-evals/safety` | FounderRoute | EvalsSafety | `./pages/founder/ai-evals/Safety` |
| `/founder/ai-evals/settings` | FounderRoute | EvalsSettings | `./pages/founder/ai-evals/Settings` |
| `/founder/ai-evals/test-suites` | FounderRoute | EvalsTestSuites | `./pages/founder/ai-evals/TestSuites` |
| `/founder/analytics` | FounderRoute | FounderAnalytics | `./pages/founder/FounderAnalytics` |
| `/founder/analytics-attribution` | FounderRoute | AAOverview | `./pages/founder/analytics-attribution/Overview` |
| `/founder/analytics-attribution/campaigns` | FounderRoute | AACampaigns | `./pages/founder/analytics-attribution/Campaigns` |
| `/founder/analytics-attribution/funnel` | FounderRoute | AAFunnel | `./pages/founder/analytics-attribution/Funnel` |
| `/founder/analytics-attribution/revenue` | FounderRoute | AARevenue | `./pages/founder/analytics-attribution/Revenue` |
| `/founder/analytics-attribution/settings` | FounderRoute | AASettings | `./pages/founder/analytics-attribution/Settings` |
| `/founder/analytics-attribution/sources` | FounderRoute | AASources | `./pages/founder/analytics-attribution/Sources` |
| `/founder/approvals-ops` | FounderRoute | ApprovalsOpsOverview | `@/pages/founder/approvals-ops/Overview` |
| `/founder/architectures` | FounderRoute | ArchitectureDirectory | `./pages/founder/ArchitectureDirectory` |
| `/founder/architectures/:id` _(dynamic)_ | FounderRoute | ArchitectureDetail | `./pages/founder/ArchitectureDetail` |
| `/founder/assets` | FounderRoute | CreativeAssetsHub | `./pages/founder/CreativeAssetsHub` |
| `/founder/assignments` | FounderRoute | AssignmentsDashboard | `./pages/founder/suppliers/AssignmentsDashboard` |
| `/founder/attention-guard` | FounderRoute | AttentionOverview | `./pages/founder/attention-guard/Overview` |
| `/founder/attention-guard/decisions` | FounderRoute | AttentionDecisions | `./pages/founder/attention-guard/Decisions` |
| `/founder/attention-guard/delegation` | FounderRoute | AttentionDelegation | `./pages/founder/attention-guard/Delegation` |
| `/founder/attention-guard/noise` | FounderRoute | AttentionNoise | `./pages/founder/attention-guard/Noise` |
| `/founder/attention-guard/settings` | FounderRoute | AttentionSettings | `./pages/founder/attention-guard/Settings` |
| `/founder/attention-guard/today` | FounderRoute | AttentionToday | `./pages/founder/attention-guard/Today` |
| `/founder/audit-ledger` | FounderRoute | AuditOverview | `./pages/founder/audit-ledger/Overview` |
| `/founder/audit-ledger/by-business` | FounderRoute | AuditByBusiness | `./pages/founder/audit-ledger/ByBusiness` |
| `/founder/audit-ledger/by-module` | FounderRoute | AuditByModule | `./pages/founder/audit-ledger/ByModule` |
| `/founder/audit-ledger/by-user` | FounderRoute | AuditByUser | `./pages/founder/audit-ledger/ByUser` |
| `/founder/audit-ledger/events` | FounderRoute | AuditEvents | `./pages/founder/audit-ledger/Events` |
| `/founder/audit-ledger/sensitive` | FounderRoute | AuditSensitive | `./pages/founder/audit-ledger/Sensitive` |
| `/founder/audit-ledger/settings` | FounderRoute | AuditSettings | `./pages/founder/audit-ledger/Settings` |
| `/founder/automation-book` | FounderRoute | AutomationBook | `@/pages/founder/AutomationBook` |
| `/founder/backup-recovery` | FounderRoute | BROverview | `./pages/founder/backup-recovery/Overview` |
| `/founder/backup-recovery/emergency-pack` | FounderRoute | BREmergencyPack | `./pages/founder/backup-recovery/EmergencyPack` |
| `/founder/backup-recovery/exports` | FounderRoute | BRExports | `./pages/founder/backup-recovery/Exports` |
| `/founder/backup-recovery/restore` | FounderRoute | BRRestore | `./pages/founder/backup-recovery/Restore` |
| `/founder/backup-recovery/settings` | FounderRoute | BRSettings | `./pages/founder/backup-recovery/Settings` |
| `/founder/backup-recovery/status` | FounderRoute | BRStatus | `./pages/founder/backup-recovery/Status` |
| `/founder/billionaire-intelligence` | FounderRoute | BillionaireIntelligence | `./pages/founder/BillionaireIntelligence` |
| `/founder/brain` | FounderRoute | LiftorBrain | `./pages/founder/LiftorBrain` |
| `/founder/brain-core` | FounderRoute | BrainCore | `./pages/founder/BrainCore` |
| `/founder/brain/audit` | FounderRoute | BrainAudit | `./pages/founder/BrainAudit` |
| `/founder/brain/drafts` | FounderRoute | BrainDrafts | `./pages/founder/BrainDrafts` |
| `/founder/brain/provider` | FounderRoute | BrainProvider | `./pages/founder/BrainProvider` |
| `/founder/brain/sessions` | FounderRoute | BrainSessions | `./pages/founder/BrainSessions` |
| `/founder/brain/tools` | FounderRoute | BrainTools | `./pages/founder/BrainTools` |
| `/founder/build-log` | FounderRoute | BuildLog | `./pages/founder/BuildLog` |
| `/founder/build-phase-closeout` | FounderRoute | BuildPhaseCloseoutPage | `./pages/founder/BuildPhaseCloseout` |
| `/founder/business-activation` | FounderRoute | BusinessActivationOverview | `@/pages/founder/business-activation/Overview` |
| `/founder/business-archetypes` | FounderRoute | ArchetypeOverview | `./pages/founder/archetypes/Overview` |
| `/founder/business-archetypes/business-map` | FounderRoute | ArchetypeBusinessMap | `./pages/founder/archetypes/BusinessMap` |
| `/founder/business-archetypes/classifier` | FounderRoute | ArchetypeClassifier | `./pages/founder/archetypes/Classifier` |
| `/founder/business-archetypes/recommendations` | FounderRoute | ArchetypeRecommendations | `./pages/founder/archetypes/Recommendations` |
| `/founder/business-archetypes/settings` | FounderRoute | ArchetypeSettings | `./pages/founder/archetypes/Settings` |
| `/founder/business-compliance` | FounderRoute | BCOverview | `./pages/founder/business-compliance/Overview` |
| `/founder/business-compliance/approval-triggers` | FounderRoute | BCApprovalTriggers | `./pages/founder/business-compliance/ApprovalTriggers` |
| `/founder/business-compliance/businesses` | FounderRoute | BCBusinesses | `./pages/founder/business-compliance/Businesses` |
| `/founder/business-compliance/channels` | FounderRoute | BCChannels | `./pages/founder/business-compliance/Channels` |
| `/founder/business-compliance/claims` | FounderRoute | BCClaims | `./pages/founder/business-compliance/Claims` |
| `/founder/business-compliance/rules` | FounderRoute | BCRules | `./pages/founder/business-compliance/Rules` |
| `/founder/business-daily-operating-loop` | FounderRoute | BusinessDailyOperatingLoopPage | `./pages/founder/BusinessDailyOperatingLoop` |
| `/founder/business-internal-activation` | FounderRoute | BusinessInternalActivationPage | `./pages/founder/BusinessInternalActivation` |
| `/founder/business-lifecycle` | FounderRoute | BLOverview | `./pages/founder/business-lifecycle/Overview` |
| `/founder/business-lifecycle/businesses` | FounderRoute | BLBusinesses | `./pages/founder/business-lifecycle/Businesses` |
| `/founder/business-lifecycle/settings` | FounderRoute | BLSettings | `./pages/founder/business-lifecycle/Settings` |
| `/founder/business-lifecycle/stages` | FounderRoute | BLStages | `./pages/founder/business-lifecycle/Stages` |
| `/founder/business-lifecycle/transitions` | FounderRoute | BLTransitions | `./pages/founder/business-lifecycle/Transitions` |
| `/founder/business-manuals` | FounderRoute | BusinessManualsPage | `./pages/founder/BusinessManuals` |
| `/founder/business-onboarding-factory` | FounderRoute | BusinessOnboardingFactoryPage | `./pages/founder/BusinessOnboardingFactory` |
| `/founder/business-setup-tunnel` | FounderRoute | BusinessSetupTunnel | `./pages/founder/BusinessSetupTunnel` |
| `/founder/business-templates` | FounderRoute | BTOverview | `./pages/founder/business-templates/Overview` |
| `/founder/business-templates/apply` | FounderRoute | BTApply | `./pages/founder/business-templates/Apply` |
| `/founder/business-templates/business-setup` | FounderRoute | BTBusinessSetup | `./pages/founder/business-templates/BusinessSetup` |
| `/founder/business-templates/library` | FounderRoute | BTLibrary | `./pages/founder/business-templates/Library` |
| `/founder/business-templates/settings` | FounderRoute | BTSettings | `./pages/founder/business-templates/Settings` |
| `/founder/business-weekly-review` | FounderRoute | BusinessWeeklyReviewPage | `./pages/founder/BusinessWeeklyReview` |
| `/founder/business-wind-down` | FounderRoute | WindDownOverview | `./pages/founder/wind-down/Overview` |
| `/founder/business-wind-down/archive` | FounderRoute | WindDownArchive | `./pages/founder/wind-down/Archive` |
| `/founder/business-wind-down/closure-checklist` | FounderRoute | WindDownClosureChecklist | `./pages/founder/wind-down/ClosureChecklist` |
| `/founder/business-wind-down/customer-offboarding` | FounderRoute | WindDownCustomerOffboarding | `./pages/founder/wind-down/CustomerOffboarding` |
| `/founder/business-wind-down/data-retention` | FounderRoute | WindDownDataRetention | `./pages/founder/wind-down/DataRetention` |
| `/founder/business-wind-down/pause` | FounderRoute | WindDownPause | `./pages/founder/wind-down/Pause` |
| `/founder/business-wind-down/vendor-cancellation` | FounderRoute | WindDownVendorCancellation | `./pages/founder/wind-down/VendorCancellation` |
| `/founder/campaign-factory` | FounderRoute | CampaignFactory | `@/pages/founder/CampaignFactory` |
| `/founder/capacity` | FounderRoute | CapacityOverview | `./pages/founder/capacity/Overview` |
| `/founder/capacity/agents` | FounderRoute | CapacityAgents | `./pages/founder/capacity/Agents` |
| `/founder/capacity/bottlenecks` | FounderRoute | CapacityBottlenecks | `./pages/founder/capacity/Bottlenecks` |
| `/founder/capacity/business` | FounderRoute | CapacityBusiness | `./pages/founder/capacity/Business` |
| `/founder/capacity/delivery` | FounderRoute | CapacityDelivery | `./pages/founder/capacity/Delivery` |
| `/founder/capacity/forecast` | FounderRoute | CapacityForecast | `./pages/founder/capacity/Forecast` |
| `/founder/capacity/humans` | FounderRoute | CapacityHumans | `./pages/founder/capacity/Humans` |
| `/founder/channel-strategy` | FounderRoute | CSOverview | `./pages/founder/channel-strategy/Overview` |
| `/founder/channel-strategy/businesses` | FounderRoute | CSBusinesses | `./pages/founder/channel-strategy/Businesses` |
| `/founder/channel-strategy/campaigns` | FounderRoute | CSCampaigns | `./pages/founder/channel-strategy/Campaigns` |
| `/founder/channel-strategy/channels` | FounderRoute | CSChannels | `./pages/founder/channel-strategy/Channels` |
| `/founder/channel-strategy/recommendations` | FounderRoute | CSRecommendations | `./pages/founder/channel-strategy/Recommendations` |
| `/founder/clients` | FounderRoute | ClientPortal | `./pages/founder/ClientPortal` |
| `/founder/collections` | FounderRoute | CollectionsOverview | `./pages/founder/collections/Overview` |
| `/founder/collections/failed-payments` | FounderRoute | CollectionsFailedPayments | `./pages/founder/collections/FailedPayments` |
| `/founder/collections/overdue` | FounderRoute | CollectionsOverdue | `./pages/founder/collections/Overdue` |
| `/founder/collections/payment-plans` | FounderRoute | CollectionsPaymentPlans | `./pages/founder/collections/PaymentPlans` |
| `/founder/collections/reminders` | FounderRoute | CollectionsReminders | `./pages/founder/collections/Reminders` |
| `/founder/collections/service-holds` | FounderRoute | CollectionsServiceHolds | `./pages/founder/collections/ServiceHolds` |
| `/founder/collections/settings` | FounderRoute | CollectionsSettings | `./pages/founder/collections/Settings` |
| `/founder/command-center` | redirect | → `/founder/command-centre` | `react-router-dom` |
| `/founder/command-center/legacy` | FounderRoute | CommandCenter | `./pages/founder/CommandCenter` |
| `/founder/command-centre` | FounderRoute | CommandCentre | `./pages/founder/CommandCentre` |
| `/founder/communications` | FounderRoute | CommsOverview | `./pages/founder/communications/Overview` |
| `/founder/communications/by-business` | FounderRoute | CommsByBusiness | `./pages/founder/communications/ByBusiness` |
| `/founder/communications/by-contact` | FounderRoute | CommsByContact | `./pages/founder/communications/ByContact` |
| `/founder/communications/drafts` | FounderRoute | CommsDrafts | `./pages/founder/communications/Drafts` |
| `/founder/communications/ledger` | FounderRoute | CommsLedger | `./pages/founder/communications/Ledger` |
| `/founder/communications/received` | FounderRoute | CommsReceived | `./pages/founder/communications/Received` |
| `/founder/communications/settings` | FounderRoute | CommsSettings | `./pages/founder/communications/Settings` |
| `/founder/complaints` | FounderRoute | ComplaintsOverview | `./pages/founder/complaints/Overview` |
| `/founder/complaints/disputes` | FounderRoute | ComplaintsDisputes | `./pages/founder/complaints/Disputes` |
| `/founder/complaints/escalations` | FounderRoute | ComplaintsEscalations | `./pages/founder/complaints/Escalations` |
| `/founder/complaints/evidence` | FounderRoute | ComplaintsEvidence | `./pages/founder/complaints/Evidence` |
| `/founder/complaints/refunds` | FounderRoute | ComplaintsRefunds | `./pages/founder/complaints/Refunds` |
| `/founder/complaints/settings` | FounderRoute | ComplaintsSettings | `./pages/founder/complaints/Settings` |
| `/founder/compliance` | FounderRoute | ComplianceDashboard | `./pages/founder/compliance/ComplianceDashboard` |
| `/founder/compliance/events` | FounderRoute | ComplianceEvents | `./pages/founder/compliance/ComplianceEvents` |
| `/founder/compliance/rules` | FounderRoute | ComplianceRules | `./pages/founder/compliance/ComplianceRules` |
| `/founder/connectors` | FounderRoute | ConnectorsOverview | `./pages/founder/connectors/Overview` |
| `/founder/connectors/business-map` | FounderRoute | ConnectorsBusinessMap | `./pages/founder/connectors/BusinessMap` |
| `/founder/connectors/health` | FounderRoute | ConnectorsHealth | `./pages/founder/connectors/Health` |
| `/founder/connectors/registry` | FounderRoute | ConnectorsRegistry | `./pages/founder/connectors/Registry` |
| `/founder/connectors/secrets` | FounderRoute | ConnectorsSecrets | `./pages/founder/connectors/Secrets` |
| `/founder/connectors/settings` | FounderRoute | ConnectorsSettings | `./pages/founder/connectors/Settings` |
| `/founder/connectors/webhooks` | FounderRoute | ConnectorsWebhooks | `./pages/founder/connectors/Webhooks` |
| `/founder/context-fabric` | FounderRoute | CGOverview | `./pages/founder/context-guard/Overview` |
| `/founder/context-fabric/cross-contamination` | FounderRoute | CGCross | `./pages/founder/context-guard/CrossContamination` |
| `/founder/context-fabric/events` | FounderRoute | CGEvents | `./pages/founder/context-guard/Events` |
| `/founder/context-fabric/missing-business` | FounderRoute | CGMissing | `./pages/founder/context-guard/MissingBusiness` |
| `/founder/context-fabric/settings` | FounderRoute | CGSettings | `./pages/founder/context-guard/Settings` |
| `/founder/context-guard` | redirect | → `/founder/context-fabric` | `react-router-dom` |
| `/founder/context-guard/cross-contamination` | redirect | → `/founder/context-fabric/cross-contamination` | `react-router-dom` |
| `/founder/context-guard/events` | redirect | → `/founder/context-fabric/events` | `react-router-dom` |
| `/founder/context-guard/missing-business` | redirect | → `/founder/context-fabric/missing-business` | `react-router-dom` |
| `/founder/context-guard/settings` | redirect | → `/founder/context-fabric/settings` | `react-router-dom` |
| `/founder/contracts` | FounderRoute | ContractsOverview | `./pages/founder/contracts/Overview` |
| `/founder/contracts/drafts` | FounderRoute | ContractsDrafts | `./pages/founder/contracts/Drafts` |
| `/founder/contracts/obligations` | FounderRoute | ContractsObligations | `./pages/founder/contracts/Obligations` |
| `/founder/contracts/renewals` | FounderRoute | ContractsRenewals | `./pages/founder/contracts/Renewals` |
| `/founder/contracts/risk` | FounderRoute | ContractsRisk | `./pages/founder/contracts/Risk` |
| `/founder/contracts/settings` | FounderRoute | ContractsSettings | `./pages/founder/contracts/Settings` |
| `/founder/contracts/signature` | FounderRoute | ContractsSignature | `./pages/founder/contracts/Signature` |
| `/founder/conversations` | FounderRoute | ConversationsDashboard | `./pages/founder/conversations/ConversationsDashboard` |
| `/founder/conversations/:id` _(dynamic)_ | FounderRoute | ConversationDetail | `./pages/founder/conversations/ConversationDetail` |
| `/founder/copilot` | FounderRoute | FounderCoPilot | `./pages/founder/FounderCoPilot` |
| `/founder/corporate-secretarial` | FounderRoute | CorporateSecretarialPage | `@/pages/founder/operating-loops/CorporateSecretarial` |
| `/founder/crm` | FounderRoute | CRMDashboard | `./pages/founder/CRMDashboard` |
| `/founder/crm/billionaire-access` | FounderRoute | BillionaireAccessResearch | `./pages/founder/BillionaireAccessResearch` |
| `/founder/crm/contacts` | FounderRoute | CRMContacts | `./pages/founder/CRMContacts` |
| `/founder/crm/contacts/:id` _(dynamic)_ | FounderRoute | CRMContactDetail | `./pages/founder/CRMContactDetail` |
| `/founder/crm/inboxes` | FounderRoute | CRMInboxes | `./pages/founder/CRMInboxes` |
| `/founder/crm/inboxes/:id/configure` _(dynamic)_ | FounderRoute | CRMInboxConfigure | `./pages/founder/CRMInboxConfigure` |
| `/founder/cross-contamination` | FounderRoute | CrossContaminationOverview | `@/pages/founder/cross-contamination/Overview` |
| `/founder/customer-feedback` | FounderRoute | VocOverview | `./pages/founder/customer-feedback/Overview` |
| `/founder/customer-feedback/churn-reasons` | FounderRoute | VocChurnReasons | `./pages/founder/customer-feedback/ChurnReasons` |
| `/founder/customer-feedback/feature-requests` | FounderRoute | VocFeatureRequests | `./pages/founder/customer-feedback/FeatureRequests` |
| `/founder/customer-feedback/insights` | FounderRoute | VocInsights | `./pages/founder/customer-feedback/Insights` |
| `/founder/customer-feedback/reviews` | FounderRoute | VocReviews | `./pages/founder/customer-feedback/Reviews` |
| `/founder/customer-feedback/signals` | FounderRoute | VocSignals | `./pages/founder/customer-feedback/Signals` |
| `/founder/customer-feedback/testimonials` | FounderRoute | VocTestimonials | `./pages/founder/customer-feedback/Testimonials` |
| `/founder/customer-onboarding` | FounderRoute | CustomerOnboardingOverview | `./pages/founder/customer-onboarding/Overview` |
| `/founder/customer-onboarding/checklists` | FounderRoute | CustomerOnboardingChecklists | `./pages/founder/customer-onboarding/Checklists` |
| `/founder/customer-onboarding/customers` | FounderRoute | CustomerOnboardingCustomers | `./pages/founder/customer-onboarding/Customers` |
| `/founder/customer-onboarding/missing-info` | FounderRoute | CustomerOnboardingMissingInfo | `./pages/founder/customer-onboarding/MissingInfo` |
| `/founder/customer-onboarding/settings` | FounderRoute | CustomerOnboardingSettings | `./pages/founder/customer-onboarding/Settings` |
| `/founder/customer-onboarding/welcome-packs` | FounderRoute | CustomerOnboardingWelcomePacks | `./pages/founder/customer-onboarding/WelcomePacks` |
| `/founder/customer-sales` | FounderRoute | CustomerSalesHub | `./pages/founder/customer-sales/CustomerSalesHub` |
| `/founder/customer-sales/call-logs` | FounderRoute | CustomerSalesCallLogs | `./pages/founder/customer-sales/CallLogs` |
| `/founder/customer-sales/close-engine` | FounderRoute | CustomerSalesCloseEngine | `./pages/founder/customer-sales/CloseEngine` |
| `/founder/customer-sales/conversations` | FounderRoute | CustomerSalesConversations | `./pages/founder/customer-sales/Conversations` |
| `/founder/customer-sales/follow-up` | FounderRoute | CustomerSalesFollowUp | `./pages/founder/customer-sales/FollowUp` |
| `/founder/customer-sales/objections` | FounderRoute | CustomerSalesObjections | `./pages/founder/customer-sales/Objections` |
| `/founder/customer-sales/offers` | FounderRoute | CustomerSalesOffers | `./pages/founder/customer-sales/Offers` |
| `/founder/customer-sales/playbooks` | FounderRoute | CustomerSalesPlaybooks | `./pages/founder/customer-sales/Playbooks` |
| `/founder/customer-sales/product-knowledge` | FounderRoute | CustomerSalesProductKnowledge | `./pages/founder/customer-sales/ProductKnowledge` |
| `/founder/customer-sales/safety` | FounderRoute | CustomerSalesSafetyCentre | `./pages/founder/customer-sales/SafetyCentre` |
| `/founder/customer-sales/settings` | FounderRoute | CustomerSalesSettings | `./pages/founder/customer-sales/Settings` |
| `/founder/customer-sales/voice-console` | FounderRoute | CustomerSalesVoiceConsole | `./pages/founder/customer-sales/VoiceConsole` |
| `/founder/customer-success` | FounderRoute | CustomerSuccess | `./pages/founder/CustomerSuccess` |
| `/founder/customer-upgrades` | FounderRoute | CustomerUpgradesHub | `./pages/founder/customer-upgrades/Hub` |
| `/founder/customer-upgrades/follow-up` | FounderRoute | CustomerUpgradesFollowUp | `./pages/founder/customer-upgrades/FollowUp` |
| `/founder/customer-upgrades/opportunities` | FounderRoute | CustomerUpgradesOpportunities | `./pages/founder/customer-upgrades/Opportunities` |
| `/founder/customer-upgrades/product-ladders` | FounderRoute | CustomerUpgradesProductLadders | `./pages/founder/customer-upgrades/ProductLadders` |
| `/founder/customer-upgrades/renewals` | FounderRoute | CustomerUpgradesRenewals | `./pages/founder/customer-upgrades/Renewals` |
| `/founder/customer-upgrades/upgrade-rules` | FounderRoute | CustomerUpgradesRules | `./pages/founder/customer-upgrades/UpgradeRules` |
| `/founder/daily-operator` | FounderRoute | DailyOperator | `./pages/founder/DailyOperator` |
| `/founder/data-quality` | FounderRoute | DataQualityOverview | `./pages/founder/data-quality/Overview` |
| `/founder/data-quality/duplicates` | FounderRoute | DataQualityDuplicates | `./pages/founder/data-quality/Duplicates` |
| `/founder/data-quality/orphans` | FounderRoute | DataQualityOrphans | `./pages/founder/data-quality/Orphans` |
| `/founder/data-quality/repair-queue` | FounderRoute | DataQualityRepairQueue | `./pages/founder/data-quality/RepairQueue` |
| `/founder/data-quality/revenue-integrity` | FounderRoute | DataQualityRevenueIntegrity | `./pages/founder/data-quality/RevenueIntegrity` |
| `/founder/data-quality/stale` | FounderRoute | DataQualityStale | `./pages/founder/data-quality/Stale` |
| `/founder/data-quality/test-data` | FounderRoute | DataQualityTestData | `./pages/founder/data-quality/TestData` |
| `/founder/data-room` | FounderRoute | DataRoomPage | `@/pages/founder/operating-loops/DataRoom` |
| `/founder/decisions` | FounderRoute | DecisionsOverview | `./pages/founder/decisions/Overview` |
| `/founder/decisions` | FounderRoute | DecisionEngine | `./pages/founder/DecisionEngine` |
| `/founder/decisions/implemented` | FounderRoute | DecisionsImplemented | `./pages/founder/decisions/Implemented` |
| `/founder/decisions/made` | FounderRoute | DecisionsMade | `./pages/founder/decisions/Made` |
| `/founder/decisions/open` | FounderRoute | DecisionsOpen | `./pages/founder/decisions/Open` |
| `/founder/decisions/review` | FounderRoute | DecisionsReview | `./pages/founder/decisions/Review` |
| `/founder/decisions/settings` | FounderRoute | DecisionsSettings | `./pages/founder/decisions/Settings` |
| `/founder/delivery` | FounderRoute | DeliveryOverview | `./pages/founder/delivery/Overview` |
| `/founder/delivery/blockers` | FounderRoute | DeliveryBlockers | `./pages/founder/delivery/Blockers` |
| `/founder/delivery/capacity` | FounderRoute | DeliveryCapacity | `./pages/founder/delivery/Capacity` |
| `/founder/delivery/completion-proof` | FounderRoute | DeliveryCompletionProof | `./pages/founder/delivery/CompletionProof` |
| `/founder/delivery/orders` | FounderRoute | DeliveryOrders | `./pages/founder/delivery/Orders` |
| `/founder/delivery/settings` | FounderRoute | DeliverySettings | `./pages/founder/delivery/Settings` |
| `/founder/delivery/tasks` | FounderRoute | DeliveryTasks | `./pages/founder/delivery/Tasks` |
| `/founder/demos` | FounderRoute | DemosDashboard | `./pages/founder/proposals/DemosDashboard` |
| `/founder/deployment` | FounderRoute | DepOverview | `./pages/founder/deployment/Overview` |
| `/founder/deployment/edge-functions` | FounderRoute | DepEdgeFunctions | `./pages/founder/deployment/EdgeFunctions` |
| `/founder/deployment/env-vars` | FounderRoute | DepEnvVars | `./pages/founder/deployment/EnvVars` |
| `/founder/deployment/environments` | FounderRoute | DepEnvironments | `./pages/founder/deployment/Environments` |
| `/founder/deployment/migrations` | FounderRoute | DepMigrations | `./pages/founder/deployment/Migrations` |
| `/founder/deployment/releases` | FounderRoute | DepReleases | `./pages/founder/deployment/Releases` |
| `/founder/deployment/rollback` | FounderRoute | DepRollback | `./pages/founder/deployment/Rollback` |
| `/founder/deployment/settings` | FounderRoute | DepSettings | `./pages/founder/deployment/Settings` |
| `/founder/deployments` | FounderRoute | DeploymentDirectory | `./pages/founder/DeploymentDirectory` |
| `/founder/deployments/:id` _(dynamic)_ | FounderRoute | DeploymentDetail | `./pages/founder/DeploymentDetail` |
| `/founder/distressed-radar` | FounderRoute | DROverview | `./pages/founder/distressed-radar/Overview` |
| `/founder/distressed-radar/acquisition` | FounderRoute | DRAcquisition | `./pages/founder/distressed-radar/Acquisition` |
| `/founder/distressed-radar/acquisition/:id` _(dynamic)_ | FounderRoute | DRAcquisitionDetail | `./pages/founder/distressed-radar/AcquisitionDetail` |
| `/founder/distressed-radar/disposal` | FounderRoute | DRDisposal | `./pages/founder/distressed-radar/Disposal` |
| `/founder/distressed-radar/financing` | FounderRoute | DRFinancing | `./pages/founder/distressed-radar/Financing` |
| `/founder/distressed-radar/sources` | FounderRoute | DRSources | `./pages/founder/distressed-radar/Sources` |
| `/founder/documents` | FounderRoute | FounderDocuments | `./pages/founder/FounderDocuments` |
| `/founder/documents` | FounderRoute | DocumentsOverview | `./pages/founder/documents/Overview` |
| `/founder/documents/access` | FounderRoute | DocumentsAccess | `./pages/founder/documents/Access` |
| `/founder/documents/data-room` | FounderRoute | DocumentsDataRoom | `./pages/founder/documents/DataRoom` |
| `/founder/documents/evidence` | FounderRoute | DocumentsEvidence | `./pages/founder/documents/Evidence` |
| `/founder/documents/policies` | FounderRoute | DocumentsPolicies | `./pages/founder/documents/Policies` |
| `/founder/documents/requests` | FounderRoute | DocumentsRequests | `./pages/founder/documents/Requests` |
| `/founder/documents/vault` | FounderRoute | DocumentsVault | `./pages/founder/documents/Vault` |
| `/founder/ecommerce` | FounderRoute | EcommerceOverview | `./pages/founder/ecommerce/Overview` |
| `/founder/ecommerce/fulfilment` | FounderRoute | EcommerceFulfilment | `./pages/founder/ecommerce/Fulfilment` |
| `/founder/ecommerce/inventory` | FounderRoute | EcommerceInventory | `./pages/founder/ecommerce/Inventory` |
| `/founder/ecommerce/orders` | FounderRoute | EcommerceOrders | `./pages/founder/ecommerce/Orders` |
| `/founder/ecommerce/products` | FounderRoute | EcommerceProducts | `./pages/founder/ecommerce/Products` |
| `/founder/ecommerce/returns` | FounderRoute | EcommerceReturns | `./pages/founder/ecommerce/Returns` |
| `/founder/ecommerce/settings` | FounderRoute | EcommerceSettings | `./pages/founder/ecommerce/Settings` |
| `/founder/ecommerce/suppliers` | FounderRoute | EcommerceSuppliers | `./pages/founder/ecommerce/Suppliers` |
| `/founder/education-commercial` | FounderRoute | EducationCommercialLayerPage | `./pages/founder/EducationCommercialLayer` |
| `/founder/entity-map` | FounderRoute | EMOverview | `./pages/founder/entity-map/Overview` |
| `/founder/entity-map/adviser-questions` | FounderRoute | EMAdviserQuestions | `./pages/founder/entity-map/AdviserQuestions` |
| `/founder/entity-map/businesses` | FounderRoute | EMBusinesses | `./pages/founder/entity-map/Businesses` |
| `/founder/entity-map/entities` | FounderRoute | EMEntities | `./pages/founder/entity-map/Entities` |
| `/founder/entity-map/revenue-routing` | FounderRoute | EMRevenueRouting | `./pages/founder/entity-map/RevenueRouting` |
| `/founder/entity-map/settings` | FounderRoute | EMSettings | `./pages/founder/entity-map/Settings` |
| `/founder/executions` | FounderRoute | ExecutionDashboard | `./pages/founder/ExecutionDashboard` |
| `/founder/executions/:id` _(dynamic)_ | FounderRoute | ExecutionDetail | `./pages/founder/ExecutionDetail` |
| `/founder/exit-metrics` | FounderRoute | ExitOverview | `./pages/founder/exit-metrics/Overview` |
| `/founder/exit-metrics/archetypes` | FounderRoute | ExitArchetypes | `./pages/founder/exit-metrics/Archetypes` |
| `/founder/exit-metrics/businesses` | FounderRoute | ExitBusinesses | `./pages/founder/exit-metrics/Businesses` |
| `/founder/exit-metrics/buyer-fit` | FounderRoute | ExitBuyerFit | `./pages/founder/exit-metrics/BuyerFit` |
| `/founder/exit-metrics/data-room` | FounderRoute | ExitDataRoom | `./pages/founder/exit-metrics/DataRoom` |
| `/founder/exit-metrics/readiness` | FounderRoute | ExitReadiness | `./pages/founder/exit-metrics/Readiness` |
| `/founder/expansion` | FounderRoute | PlatformExpansion | `./pages/founder/PlatformExpansion` |
| `/founder/expansion/:id` _(dynamic)_ | FounderRoute | PlatformLaunchDetail | `./pages/founder/PlatformLaunchDetail` |
| `/founder/experiments` | FounderRoute | ExperimentsOverview | `./pages/founder/experiments/Overview` |
| `/founder/experiments/learning-library` | FounderRoute | ExperimentLearningLibrary | `./pages/founder/experiments/LearningLibrary` |
| `/founder/experiments/plans` | FounderRoute | ExperimentPlans | `./pages/founder/experiments/Plans` |
| `/founder/experiments/results` | FounderRoute | ExperimentResults | `./pages/founder/experiments/Results` |
| `/founder/experiments/winners` | FounderRoute | ExperimentWinners | `./pages/founder/experiments/Winners` |
| `/founder/external-activation-readiness` | FounderRoute | ExternalActivationReadinessPage | `./pages/founder/ExternalActivationReadiness` |
| `/founder/finance` | FounderRoute | FinanceDashboard | `./pages/founder/finance/FinanceDashboard` |
| `/founder/finance/deals` | FounderRoute | FinanceDeals | `./pages/founder/finance/FinanceDeals` |
| `/founder/finance/invoices` | FounderRoute | FinanceInvoices | `./pages/founder/finance/FinanceInvoices` |
| `/founder/finance/payments` | FounderRoute | FinancePayments | `./pages/founder/finance/FinancePayments` |
| `/founder/finance/targets` | FounderRoute | FinanceTargets | `./pages/founder/finance/FinanceTargets` |
| `/founder/first-use-configuration` | FounderRoute | FirstUseConfiguration | `./pages/founder/FirstUseConfiguration` |
| `/founder/founder-led-buyer-market` | FounderRoute | FounderLedBuyerMarketEngine | `./pages/founder/FounderLedBuyerMarketEngine` |
| `/founder/founder-led-exit` | FounderRoute | FounderLedExitSalesEngine | `./pages/founder/FounderLedExitSalesEngine` |
| `/founder/funding-radar` | FounderRoute | FRRadarOverview | `./pages/founder/funding-radar/Overview` |
| `/founder/funding-radar/business-autopsy` | FounderRoute | FRBusinessAutopsy | `./pages/founder/funding-radar/BusinessAutopsy` |
| `/founder/funding-radar/business-autopsy/:id` _(dynamic)_ | FounderRoute | FRBusinessAutopsyDetail | `./pages/founder/funding-radar/BusinessAutopsyDetail` |
| `/founder/funding-radar/capital-efficiency` | FounderRoute | FRCapitalEfficiency | `./pages/founder/funding-radar/CapitalEfficiency` |
| `/founder/funding-radar/clusters` | FounderRoute | FRClusters | `./pages/founder/funding-radar/Clusters` |
| `/founder/funding-radar/companies` | FounderRoute | FRCompanies | `./pages/founder/funding-radar/Companies` |
| `/founder/funding-radar/company/:id` _(dynamic)_ | FounderRoute | FRCompanyDetail | `./pages/founder/funding-radar/CompanyDetail` |
| `/founder/funding-radar/decision-pack` | FounderRoute | FRDecisionPack | `./pages/founder/funding-radar/DecisionPack` |
| `/founder/funding-radar/handoff/:id` _(dynamic)_ | FounderRoute | FRBuildHandoffPack | `./pages/founder/funding-radar/BuildHandoffPack` |
| `/founder/funding-radar/market-maps` | FounderRoute | FRMarketMaps | `./pages/founder/funding-radar/MarketMaps` |
| `/founder/funding-radar/monthly-run` | FounderRoute | FRMonthlyRun | `./pages/founder/funding-radar/MonthlyRun` |
| `/founder/funding-radar/settings` | FounderRoute | FRSettings | `./pages/founder/funding-radar/Settings` |
| `/founder/funding-radar/shortlist` | FounderRoute | FRShortlist | `./pages/founder/funding-radar/Shortlist` |
| `/founder/funding-radar/watchlist` | FounderRoute | FRWatchlist | `./pages/founder/funding-radar/Watchlist` |
| `/founder/funding-radar/watchlist/:id` _(dynamic)_ | FounderRoute | FRWatchlistDetail | `./pages/founder/funding-radar/WatchlistDetail` |
| `/founder/funding-radar/weakness-signals` | FounderRoute | FRWeaknessSignals | `./pages/founder/funding-radar/WeaknessSignals` |
| `/founder/funding-radar/white-space` | FounderRoute | FRWhiteSpace | `./pages/founder/funding-radar/WhiteSpace` |
| `/founder/ghat-outbound` | FounderRoute | GHATOutbound | `./pages/founder/GHATOutbound` |
| `/founder/global-pr-radar` | FounderRoute | GlobalPrRadar | `./pages/founder/GlobalPrRadar` |
| `/founder/gsm-outbound` | FounderRoute | GSMOutbound | `./pages/founder/GSMOutbound` |
| `/founder/healthcare-overlay` | FounderRoute | HealthcareOverlay | `./pages/founder/HealthcareOverlay` |
| `/founder/human-workforce-control` | FounderRoute | HumanWorkforceControl | `@/pages/founder/HumanWorkforceControl` |
| `/founder/identity-resolution` | FounderRoute | IdentityOverview | `./pages/founder/identity-resolution/Overview` |
| `/founder/identity-resolution/do-not-contact` | FounderRoute | IdentityDoNotContact | `./pages/founder/identity-resolution/DoNotContact` |
| `/founder/identity-resolution/duplicates` | FounderRoute | IdentityDuplicates | `./pages/founder/identity-resolution/Duplicates` |
| `/founder/identity-resolution/merge-queue` | FounderRoute | IdentityMergeQueue | `./pages/founder/identity-resolution/MergeQueue` |
| `/founder/identity-resolution/people` | FounderRoute | IdentityPeople | `./pages/founder/identity-resolution/People` |
| `/founder/identity-resolution/roles` | FounderRoute | IdentityRoles | `./pages/founder/identity-resolution/Roles` |
| `/founder/identity-resolution/settings` | FounderRoute | IdentitySettings | `./pages/founder/identity-resolution/Settings` |
| `/founder/imports` | FounderRoute | ImportOverview | `./pages/founder/imports/Overview` |
| `/founder/imports/history` | FounderRoute | ImportHistory | `./pages/founder/imports/History` |
| `/founder/imports/mapping` | FounderRoute | ImportMapping | `./pages/founder/imports/Mapping` |
| `/founder/imports/preview` | FounderRoute | ImportPreview | `./pages/founder/imports/Preview` |
| `/founder/imports/rollback` | FounderRoute | ImportRollback | `./pages/founder/imports/Rollback` |
| `/founder/imports/settings` | FounderRoute | ImportSettings | `./pages/founder/imports/Settings` |
| `/founder/imports/upload` | FounderRoute | ImportUpload | `./pages/founder/imports/Upload` |
| `/founder/incidents` | FounderRoute | IncidentsOverview | `./pages/founder/incidents/Overview` |
| `/founder/incidents/continuity` | FounderRoute | IncidentsContinuity | `./pages/founder/incidents/Continuity` |
| `/founder/incidents/live` | FounderRoute | IncidentsLive | `./pages/founder/incidents/Live` |
| `/founder/incidents/notifications` | FounderRoute | IncidentsNotifications | `./pages/founder/incidents/Notifications` |
| `/founder/incidents/postmortems` | FounderRoute | IncidentsPostmortems | `./pages/founder/incidents/Postmortems` |
| `/founder/incidents/settings` | FounderRoute | IncidentsSettings | `./pages/founder/incidents/Settings` |
| `/founder/insurance-claims` | FounderRoute | InsuranceClaimsPage | `@/pages/founder/operating-loops/InsuranceClaims` |
| `/founder/insurance-liability` | FounderRoute | InsuranceOverview | `./pages/founder/insurance-liability/Overview` |
| `/founder/insurance-liability/businesses` | FounderRoute | InsuranceBusinesses | `./pages/founder/insurance-liability/Businesses` |
| `/founder/insurance-liability/claims` | FounderRoute | InsuranceClaims | `./pages/founder/insurance-liability/Claims` |
| `/founder/insurance-liability/gaps` | FounderRoute | InsuranceGaps | `./pages/founder/insurance-liability/Gaps` |
| `/founder/insurance-liability/policies` | FounderRoute | InsurancePolicies | `./pages/founder/insurance-liability/Policies` |
| `/founder/integration-map` | FounderRoute | IMOverview | `./pages/founder/integration-map/Overview` |
| `/founder/integration-map/businesses` | FounderRoute | IMBusinesses | `./pages/founder/integration-map/Businesses` |
| `/founder/integration-map/missing` | FounderRoute | IMMissing | `./pages/founder/integration-map/Missing` |
| `/founder/integration-map/providers` | FounderRoute | IMProviders | `./pages/founder/integration-map/Providers` |
| `/founder/integration-map/risks` | FounderRoute | IMRisks | `./pages/founder/integration-map/Risks` |
| `/founder/integration-map/settings` | FounderRoute | IMSettings | `./pages/founder/integration-map/Settings` |
| `/founder/integrations` | FounderRoute | IntegrationDirectory | `./pages/founder/IntegrationDirectory` |
| `/founder/integrations/:id` _(dynamic)_ | FounderRoute | IntegrationDetail | `./pages/founder/IntegrationDetail` |
| `/founder/internal-proposals` | FounderRoute | InternalProposals | `./pages/founder/proposals/InternalProposals` |
| `/founder/internal-proposals/:id` _(dynamic)_ | FounderRoute | InternalProposalDetail | `./pages/founder/proposals/InternalProposalDetail` |
| `/founder/internal-sla` | FounderRoute | SlaOverview | `./pages/founder/internal-sla/Overview` |
| `/founder/internal-sla/by-agent` | FounderRoute | SlaByAgent | `./pages/founder/internal-sla/ByAgent` |
| `/founder/internal-sla/by-human` | FounderRoute | SlaByHuman | `./pages/founder/internal-sla/ByHuman` |
| `/founder/internal-sla/handoffs` | FounderRoute | SlaHandoffs | `./pages/founder/internal-sla/Handoffs` |
| `/founder/internal-sla/overdue` | FounderRoute | SlaOverdue | `./pages/founder/internal-sla/Overdue` |
| `/founder/internal-sla/settings` | FounderRoute | SlaSettings | `./pages/founder/internal-sla/Settings` |
| `/founder/international-expansion` | FounderRoute | InternationalExpansionPage | `@/pages/founder/operating-loops/InternationalExpansion` |
| `/founder/ip-assets` | FounderRoute | IPOverview | `./pages/founder/ip-assets/Overview` |
| `/founder/ip-assets/catalogue` | FounderRoute | IPCatalogue | `./pages/founder/ip-assets/Catalogue` |
| `/founder/ip-assets/distribution` | FounderRoute | IPDistribution | `./pages/founder/ip-assets/Distribution` |
| `/founder/ip-assets/licensing` | FounderRoute | IPLicensing | `./pages/founder/ip-assets/Licensing` |
| `/founder/ip-assets/rights` | FounderRoute | IPRights | `./pages/founder/ip-assets/Rights` |
| `/founder/ip-assets/risks` | FounderRoute | IPRisks | `./pages/founder/ip-assets/Risks` |
| `/founder/jurisdiction-tax` | FounderRoute | JTOverview | `./pages/founder/jurisdiction-tax/Overview` |
| `/founder/jurisdiction-tax/adviser-review` | FounderRoute | JTAdviserReview | `./pages/founder/jurisdiction-tax/AdviserReview` |
| `/founder/jurisdiction-tax/currencies` | FounderRoute | JTCurrencies | `./pages/founder/jurisdiction-tax/Currencies` |
| `/founder/jurisdiction-tax/customers` | FounderRoute | JTCustomers | `./pages/founder/jurisdiction-tax/Customers` |
| `/founder/jurisdiction-tax/revenue` | FounderRoute | JTRevenue | `./pages/founder/jurisdiction-tax/Revenue` |
| `/founder/jurisdiction-tax/sellers` | FounderRoute | JTSellers | `./pages/founder/jurisdiction-tax/Sellers` |
| `/founder/jurisdiction-tax/settings` | FounderRoute | JTSettings | `./pages/founder/jurisdiction-tax/Settings` |
| `/founder/knowledge` | FounderRoute | KnowledgeDirectory | `./pages/founder/KnowledgeDirectory` |
| `/founder/knowledge-governance` | FounderRoute | KnowledgeOverview | `./pages/founder/knowledge-governance/Overview` |
| `/founder/knowledge-governance/approved-claims` | FounderRoute | KnowledgeApprovedClaims | `./pages/founder/knowledge-governance/ApprovedClaims` |
| `/founder/knowledge-governance/conflicts` | FounderRoute | KnowledgeConflicts | `./pages/founder/knowledge-governance/Conflicts` |
| `/founder/knowledge-governance/manual-sync` | FounderRoute | KnowledgeManualSync | `./pages/founder/knowledge-governance/ManualSync` |
| `/founder/knowledge-governance/sources` | FounderRoute | KnowledgeSources | `./pages/founder/knowledge-governance/Sources` |
| `/founder/knowledge-governance/stale` | FounderRoute | KnowledgeStale | `./pages/founder/knowledge-governance/Stale` |
| `/founder/knowledge/:id` _(dynamic)_ | FounderRoute | KnowledgeDetail | `./pages/founder/KnowledgeDetail` |
| `/founder/launch-factory` | FounderRoute | LFOverview | `./pages/founder/launch-factory/Overview` |
| `/founder/launch-factory/brand` | FounderRoute | LFBrand | `./pages/founder/launch-factory/Brand` |
| `/founder/launch-factory/checklist` | FounderRoute | LFChecklist | `./pages/founder/launch-factory/Checklist` |
| `/founder/launch-factory/domains` | FounderRoute | LFDomains | `./pages/founder/launch-factory/Domains` |
| `/founder/launch-factory/email` | FounderRoute | LFEmail | `./pages/founder/launch-factory/Email` |
| `/founder/launch-factory/legal-pages` | FounderRoute | LFLegalPages | `./pages/founder/launch-factory/LegalPages` |
| `/founder/launch-factory/socials` | FounderRoute | LFSocials | `./pages/founder/launch-factory/Socials` |
| `/founder/launch-factory/tracking` | FounderRoute | LFTracking | `./pages/founder/launch-factory/Tracking` |
| `/founder/launch-factory/vertical-launch-cannon` | FounderRoute | QPMVerticalLaunch | `./pages/founder/quarterly-production-machine/VerticalLaunch` |
| `/founder/legal` | FounderRoute | FounderLegalConsole | `./pages/founder/FounderLegalConsole` |
| `/founder/manual` | FounderRoute | FounderManual | `./pages/founder/FounderManual` |
| `/founder/manual/:id` _(dynamic)_ | FounderRoute | ManualPageDetail | `./pages/founder/ManualPageDetail` |
| `/founder/manual/full` | FounderRoute | FullSystemMirror | `./pages/founder/FullSystemMirror` |
| `/founder/manual/user` | FounderRoute | UserManualPage | `./pages/founder/UserManualPage` |
| `/founder/manuals-hub` | FounderRoute | ManualsHubPage | `./pages/founder/ManualsHub` |
| `/founder/marketing` | FounderRoute | MarketingHub | `./pages/founder/MarketingHub` |
| `/founder/marketplace` | FounderRoute | MarketplaceOverview | `./pages/founder/marketplace/Overview` |
| `/founder/marketplace/active-sellers` | FounderRoute | MarketplacePerformance | `./pages/founder/marketplace/Performance` |
| `/founder/marketplace/category-balance` | FounderRoute | MarketplaceCategoryBalance | `./pages/founder/marketplace/CategoryBalance` |
| `/founder/marketplace/growth-actions` | FounderRoute | MarketplaceGrowthActions | `./pages/founder/marketplace/GrowthActions` |
| `/founder/marketplace/liquidity` | FounderRoute | MarketplaceLiquidity | `./pages/founder/marketplace/Liquidity` |
| `/founder/marketplace/listing-queue` | FounderRoute | ListingQueue | `./pages/founder/marketplace/ListingQueue` |
| `/founder/marketplace/listings` | FounderRoute | MarketplaceListings | `./pages/founder/marketplace/Listings` |
| `/founder/marketplace/location-balance` | FounderRoute | MarketplaceLocationBalance | `./pages/founder/marketplace/LocationBalance` |
| `/founder/marketplace/payouts` | FounderRoute | SellerPayouts | `./pages/founder/marketplace/Payouts` |
| `/founder/marketplace/performance-board` | FounderRoute | SellerPerformanceBoard | `./pages/founder/marketplace/Performance2` |
| `/founder/marketplace/risk` | FounderRoute | SellerRisk | `./pages/founder/marketplace/Risk` |
| `/founder/marketplace/seller-accounts` | FounderRoute | SellerAccounts | `./pages/founder/marketplace/SellerAccounts` |
| `/founder/marketplace/seller-checklist` | FounderRoute | SellerChecklist | `./pages/founder/marketplace/SellerChecklist` |
| `/founder/marketplace/seller-onboarding` | FounderRoute | MarketplaceOnboarding | `./pages/founder/marketplace/Onboarding` |
| `/founder/marketplace/seller-performance` | FounderRoute | SellerPerformanceBoard | `./pages/founder/marketplace/Performance2` |
| `/founder/marketplace/seller-prospects` | FounderRoute | MarketplaceProspects | `./pages/founder/marketplace/Prospects` |
| `/founder/marketplace/seller-recruitment` | FounderRoute | MarketplaceRecruitment | `./pages/founder/marketplace/Recruitment` |
| `/founder/marketplace/seller-verification` | FounderRoute | MarketplaceVerification | `./pages/founder/marketplace/Verification` |
| `/founder/marketplace/settings` | FounderRoute | MarketplaceSettings | `./pages/founder/marketplace/Settings` |
| `/founder/marketplace/supply-demand` | FounderRoute | MarketplaceSupplyDemand | `./pages/founder/marketplace/SupplyDemand` |
| `/founder/marketplace/terms` | FounderRoute | SellerTerms | `./pages/founder/marketplace/Terms` |
| `/founder/micro-batch-preparation` | FounderRoute | MicroBatchPreparationPage | `./pages/founder/MicroBatchPreparation` |
| `/founder/monday-launch` | FounderRoute | MondayLaunchOverview | `@/pages/founder/monday-launch/Overview` |
| `/founder/monday-readiness` | FounderRoute | MondayReadinessOverview | `@/pages/founder/monday-readiness/Overview` |
| `/founder/money` | FounderRoute | FounderMoney | `./pages/founder/FounderMoney` |
| `/founder/monitoring` | FounderRoute | MonitoringDashboard | `./pages/founder/MonitoringDashboard` |
| `/founder/monitoring/:id` _(dynamic)_ | FounderRoute | MonitoringSystemDetail | `./pages/founder/MonitoringSystemDetail` |
| `/founder/notifications` | FounderRoute | NotificationsOverview | `./pages/founder/notifications/Overview` |
| `/founder/notifications/archive` | FounderRoute | NotificationsArchive | `./pages/founder/notifications/Archive` |
| `/founder/notifications/escalations` | FounderRoute | NotificationsEscalations | `./pages/founder/notifications/Escalations` |
| `/founder/notifications/inbox` | FounderRoute | NotificationsInbox | `./pages/founder/notifications/Inbox` |
| `/founder/notifications/rules` | FounderRoute | NotificationsRules | `./pages/founder/notifications/Rules` |
| `/founder/notifications/settings` | FounderRoute | NotificationsSettings | `./pages/founder/notifications/Settings` |
| `/founder/notifications/urgent` | FounderRoute | NotificationsUrgent | `./pages/founder/notifications/Urgent` |
| `/founder/operations` | FounderRoute | GlobalOperations | `./pages/founder/GlobalOperations` |
| `/founder/optimisation` | FounderRoute | OptimisationDashboard | `./pages/founder/OptimisationDashboard` |
| `/founder/organisations` | FounderRoute | OrganisationDirectory | `./pages/founder/OrganisationDirectory` |
| `/founder/organisations/:id` _(dynamic)_ | FounderRoute | OrganisationProfile | `./pages/founder/OrganisationProfile` |
| `/founder/outreach` | FounderRoute | OutreachDashboard | `./pages/founder/outreach/OutreachDashboard` |
| `/founder/outreach/apollo` | FounderRoute | ApolloIntegration | `./pages/founder/outreach/ApolloIntegration` |
| `/founder/outreach/campaigns` | FounderRoute | OutreachCampaigns | `./pages/founder/outreach/OutreachCampaigns` |
| `/founder/outreach/engagement` | FounderRoute | EngagementTracking | `./pages/founder/outreach/EngagementTracking` |
| `/founder/outreach/imports` | FounderRoute | OutreachImports | `./pages/founder/outreach/OutreachImports` |
| `/founder/outreach/live-monitor` | FounderRoute | CampaignLiveMonitor | `./pages/founder/outreach/CampaignLiveMonitor` |
| `/founder/outreach/queue` | FounderRoute | OutreachQueue | `./pages/founder/outreach/OutreachQueue` |
| `/founder/outreach/queue-audit` | FounderRoute | QueueAudit | `./pages/founder/outreach/QueueAudit` |
| `/founder/outreach/send-preview` | FounderRoute | ControlledSendPreview | `./pages/founder/outreach/ControlledSendPreview` |
| `/founder/partners` | FounderRoute | PAOverview | `./pages/founder/partners/Overview` |
| `/founder/partners/affiliates` | FounderRoute | PAAffiliates | `./pages/founder/partners/Affiliates` |
| `/founder/partners/commissions` | FounderRoute | PACommissions | `./pages/founder/partners/Commissions` |
| `/founder/partners/performance` | FounderRoute | PAPerformance | `./pages/founder/partners/Performance` |
| `/founder/partners/prospects` | FounderRoute | PAProspects | `./pages/founder/partners/Prospects` |
| `/founder/partners/referrals` | FounderRoute | PAReferrals | `./pages/founder/partners/Referrals` |
| `/founder/people` | FounderRoute | PeopleOverview | `./pages/founder/people/Overview` |
| `/founder/people/access` | FounderRoute | PeopleAccess | `./pages/founder/people/Access` |
| `/founder/people/handover` | FounderRoute | PeopleHandover | `./pages/founder/people/Handover` |
| `/founder/people/operators` | FounderRoute | PeopleOperators | `./pages/founder/people/Operators` |
| `/founder/people/quality` | FounderRoute | PeopleQuality | `./pages/founder/people/Quality` |
| `/founder/people/tasks` | FounderRoute | PeopleTasks | `./pages/founder/people/Tasks` |
| `/founder/people/training` | FounderRoute | PeopleTraining | `./pages/founder/people/Training` |
| `/founder/pipeline` | FounderRoute | LeadPipeline | `./pages/founder/LeadPipeline` |
| `/founder/platform-monitor` | FounderRoute | PlatMonOverview | `./pages/founder/platform-monitor/Overview` |
| `/founder/platform-monitor/costs` | FounderRoute | PlatMonCosts | `./pages/founder/platform-monitor/Costs` |
| `/founder/platform-monitor/errors` | FounderRoute | PlatMonErrors | `./pages/founder/platform-monitor/Errors` |
| `/founder/platform-monitor/performance` | FounderRoute | PlatMonPerformance | `./pages/founder/platform-monitor/Performance` |
| `/founder/platform-monitor/rate-limits` | FounderRoute | PlatMonRateLimits | `./pages/founder/platform-monitor/RateLimits` |
| `/founder/platform-monitor/recommendations` | FounderRoute | PlatMonRecommendations | `./pages/founder/platform-monitor/Recommendations` |
| `/founder/platform-monitor/scalability` | FounderRoute | PlatMonScalability | `./pages/founder/platform-monitor/Scalability` |
| `/founder/policies` | FounderRoute | PoliciesOverview | `./pages/founder/policies/Overview` |
| `/founder/policies/businesses` | FounderRoute | PoliciesBusinesses | `./pages/founder/policies/Businesses` |
| `/founder/policies/coverage` | FounderRoute | PoliciesCoverage | `./pages/founder/policies/Coverage` |
| `/founder/policies/drafts` | FounderRoute | PoliciesDrafts | `./pages/founder/policies/Drafts` |
| `/founder/policies/public-pages` | FounderRoute | PoliciesPublicPages | `./pages/founder/policies/PublicPages` |
| `/founder/policies/review` | FounderRoute | PoliciesReview | `./pages/founder/policies/Review` |
| `/founder/portal-admin` | FounderRoute | PortalsOverview | `./pages/founder/portals/Overview` |
| `/founder/portal-admin/access` | FounderRoute | PortalsAccessPage | `./pages/founder/portals/Access` |
| `/founder/portal-admin/adviser` | FounderRoute | PortalsAdviserAdmin | `./pages/founder/portals/Adviser` |
| `/founder/portal-admin/customer` | FounderRoute | PortalsCustomerAdmin | `./pages/founder/portals/Customer` |
| `/founder/portal-admin/document-upload` | FounderRoute | PortalsDocumentUploadAdmin | `./pages/founder/portals/DocumentUpload` |
| `/founder/portal-admin/partner` | FounderRoute | PortalsPartnerAdmin | `./pages/founder/portals/Partner` |
| `/founder/portal-admin/seller` | FounderRoute | PortalsSellerAdmin | `./pages/founder/portals/Seller` |
| `/founder/portal-admin/settings` | FounderRoute | PortalsSettings | `./pages/founder/portals/Settings` |
| `/founder/portals` | FounderRoute | PortalsOverview | `./pages/founder/portals/Overview` |
| `/founder/portals/access` | FounderRoute | PortalsAccessPage | `./pages/founder/portals/Access` |
| `/founder/portals/adviser` | FounderRoute | PortalsAdviserAdmin | `./pages/founder/portals/Adviser` |
| `/founder/portals/customer` | FounderRoute | PortalsCustomerAdmin | `./pages/founder/portals/Customer` |
| `/founder/portals/document-upload` | FounderRoute | PortalsDocumentUploadAdmin | `./pages/founder/portals/DocumentUpload` |
| `/founder/portals/partner` | FounderRoute | PortalsPartnerAdmin | `./pages/founder/portals/Partner` |
| `/founder/portals/seller` | FounderRoute | PortalsSellerAdmin | `./pages/founder/portals/Seller` |
| `/founder/portals/settings` | FounderRoute | PortalsSettings | `./pages/founder/portals/Settings` |
| `/founder/portfolio-diversity` | FounderRoute | PortfolioDiversityOverview | `./pages/founder/portfolio-diversity/Overview` |
| `/founder/portfolio-exit` | FounderRoute | PortfolioExitCommandCentre | `./pages/founder/PortfolioExitCommandCentre` |
| `/founder/portfolio-exit-targets` | FounderRoute | PETDashboard | `./pages/founder/portfolio-exit-targets/Dashboard` |
| `/founder/portfolio-exit-targets/:id` _(dynamic)_ | FounderRoute | PETDetail | `./pages/founder/portfolio-exit-targets/Detail` |
| `/founder/portfolio-exit-targets/alerts` | FounderRoute | PETAlerts | `./pages/founder/portfolio-exit-targets/Alerts` |
| `/founder/portfolio-exit-targets/businesses` | FounderRoute | PETBusinesses | `./pages/founder/portfolio-exit-targets/Businesses` |
| `/founder/portfolio-exit-targets/settings` | FounderRoute | PETSettings | `./pages/founder/portfolio-exit-targets/Settings` |
| `/founder/portfolio-exit/:assetId` _(dynamic)_ | FounderRoute | PortfolioExitAssetDetail | `./pages/founder/PortfolioExitAssetDetail` |
| `/founder/portfolio-exit/ai-bypass-register` | FounderRoute | AIGatewayBypassRegister | `./pages/founder/AIGatewayBypassRegister` |
| `/founder/portfolio-exit/build-selector` | FounderRoute | QuarterlyBuildSelector | `./pages/founder/QuarterlyBuildSelector` |
| `/founder/portfolio-exit/buyer-warmup` | FounderRoute | PortfolioBuyerWarmUp | `./pages/founder/PortfolioBuyerWarmUp` |
| `/founder/portfolio-exit/competitors` | FounderRoute | PortfolioCompetitorIntelligence | `./pages/founder/PortfolioCompetitorIntelligence` |
| `/founder/portfolio-exit/controls` | FounderRoute | PortfolioExitControls | `./pages/founder/PortfolioExitControls` |
| `/founder/portfolio-exit/execution-handoff` | FounderRoute | ExecutionHandoff | `./pages/founder/ExecutionHandoff` |
| `/founder/portfolio-exit/hardening` | FounderRoute | PortfolioExitHardening | `./pages/founder/PortfolioExitHardening` |
| `/founder/portfolio-exit/ingestion` | FounderRoute | DataIngestionCentre | `./pages/founder/DataIngestionCentre` |
| `/founder/portfolio-exit/intelligence` | FounderRoute | MAIntelligenceWorkspace | `./pages/founder/MAIntelligenceWorkspace` |
| `/founder/portfolio-exit/investors` | FounderRoute | PortfolioInvestorIntelligence | `./pages/founder/PortfolioInvestorIntelligence` |
| `/founder/portfolio-exit/manual` | FounderRoute | PortfolioExitManual | `./pages/founder/PortfolioExitManual` |
| `/founder/portfolio-exit/operating-panels` | FounderRoute | PortfolioOperatingPanels | `./pages/founder/PortfolioOperatingPanels` |
| `/founder/portfolio-exit/release-gate` | FounderRoute | PortfolioExitReleaseGate | `./pages/founder/PortfolioExitReleaseGate` |
| `/founder/portfolio-exit/valuation` | FounderRoute | ExitValuationEngine | `./pages/founder/ExitValuationEngine` |
| `/founder/portfolio-fx` | FounderRoute | PortfolioFxPage | `@/pages/founder/operating-loops/PortfolioFx` |
| `/founder/portfolio-memory` | FounderRoute | PortMemOverview | `./pages/founder/portfolio-memory/Overview` |
| `/founder/portfolio-memory/adviser-briefs` | FounderRoute | PortMemAdviser | `./pages/founder/portfolio-memory/AdviserBriefs` |
| `/founder/portfolio-memory/businesses` | FounderRoute | PortMemBusinesses | `./pages/founder/portfolio-memory/Businesses` |
| `/founder/portfolio-memory/buyer-briefs` | FounderRoute | PortMemBuyer | `./pages/founder/portfolio-memory/BuyerBriefs` |
| `/founder/portfolio-memory/handover-packs` | FounderRoute | PortMemPacks | `./pages/founder/portfolio-memory/HandoverPacks` |
| `/founder/portfolio-memory/history` | FounderRoute | PortMemHistory | `./pages/founder/portfolio-memory/History` |
| `/founder/portfolio-memory/operator-briefs` | FounderRoute | PortMemOperator | `./pages/founder/portfolio-memory/OperatorBriefs` |
| `/founder/portfolio-prioritisation` | FounderRoute | PPOverview | `./pages/founder/portfolio-prioritisation/Overview` |
| `/founder/portfolio-prioritisation/build-now` | FounderRoute | PPBuildNow | `./pages/founder/portfolio-prioritisation/BuildNow` |
| `/founder/portfolio-prioritisation/decisions` | FounderRoute | PPDecisions | `./pages/founder/portfolio-prioritisation/Decisions` |
| `/founder/portfolio-prioritisation/park` | FounderRoute | PPPark | `./pages/founder/portfolio-prioritisation/Park` |
| `/founder/portfolio-prioritisation/scale` | FounderRoute | PPScale | `./pages/founder/portfolio-prioritisation/Scale` |
| `/founder/portfolio-prioritisation/scores` | FounderRoute | PPScores | `./pages/founder/portfolio-prioritisation/Scores` |
| `/founder/portfolio-risk` | FounderRoute | PROverview | `./pages/founder/portfolio-risk/Overview` |
| `/founder/portfolio-risk/actions` | FounderRoute | PRActions | `./pages/founder/portfolio-risk/Actions` |
| `/founder/portfolio-risk/businesses` | FounderRoute | PRBusinesses | `./pages/founder/portfolio-risk/Businesses` |
| `/founder/portfolio-risk/critical` | FounderRoute | PRCritical | `./pages/founder/portfolio-risk/Critical` |
| `/founder/portfolio-risk/matrix` | FounderRoute | PRMatrix | `./pages/founder/portfolio-risk/Matrix` |
| `/founder/pricing-margin` | FounderRoute | PMOverview | `./pages/founder/pricing-margin/Overview` |
| `/founder/pricing-margin/breakeven` | FounderRoute | PMBreakeven | `./pages/founder/pricing-margin/Breakeven` |
| `/founder/pricing-margin/businesses` | FounderRoute | PMBusinesses | `./pages/founder/pricing-margin/Businesses` |
| `/founder/pricing-margin/discounts` | FounderRoute | PMDiscounts | `./pages/founder/pricing-margin/Discounts` |
| `/founder/pricing-margin/products` | FounderRoute | PMProducts | `./pages/founder/pricing-margin/Products` |
| `/founder/pricing-margin/recommendations` | FounderRoute | PMRecommendations | `./pages/founder/pricing-margin/Recommendations` |
| `/founder/priority` | FounderRoute | PriorityDashboard | `./pages/founder/priority/PriorityDashboard` |
| `/founder/privacy` | FounderRoute | PrivacyOverview | `./pages/founder/privacy/Overview` |
| `/founder/privacy/breaches` | FounderRoute | PrivacyBreaches | `./pages/founder/privacy/Breaches` |
| `/founder/privacy/consent` | FounderRoute | PrivacyConsent | `./pages/founder/privacy/Consent` |
| `/founder/privacy/dsar` | FounderRoute | PrivacyDSAR | `./pages/founder/privacy/DSAR` |
| `/founder/privacy/processors` | FounderRoute | PrivacyProcessors | `./pages/founder/privacy/Processors` |
| `/founder/privacy/retention` | FounderRoute | PrivacyRetention | `./pages/founder/privacy/Retention` |
| `/founder/privacy/settings` | FounderRoute | PrivacySettings | `./pages/founder/privacy/Settings` |
| `/founder/processes` | FounderRoute | ProcessDirectory | `./pages/founder/ProcessDirectory` |
| `/founder/processes/:id` _(dynamic)_ | FounderRoute | ProcessDetail | `./pages/founder/ProcessDetail` |
| `/founder/product` | FounderRoute | ProductOverview | `./pages/founder/product/Overview` |
| `/founder/product-catalogue` | FounderRoute | PCOverview | `./pages/founder/product-catalogue/Overview` |
| `/founder/product-catalogue/add-ons` | FounderRoute | PCAddOns | `./pages/founder/product-catalogue/AddOns` |
| `/founder/product-catalogue/claims` | FounderRoute | PCClaims | `./pages/founder/product-catalogue/Claims` |
| `/founder/product-catalogue/offers` | FounderRoute | PCOffers | `./pages/founder/product-catalogue/Offers` |
| `/founder/product-catalogue/packages` | FounderRoute | PCPackages | `./pages/founder/product-catalogue/Packages` |
| `/founder/product-catalogue/pricing` | FounderRoute | PCPricing | `./pages/founder/product-catalogue/Pricing` |
| `/founder/product-catalogue/products` | FounderRoute | PCProducts | `./pages/founder/product-catalogue/Products` |
| `/founder/product/bugs` | FounderRoute | ProductBugs | `./pages/founder/product/Bugs` |
| `/founder/product/features` | FounderRoute | ProductFeatures | `./pages/founder/product/Features` |
| `/founder/product/known-issues` | FounderRoute | ProductKnownIssues | `./pages/founder/product/KnownIssues` |
| `/founder/product/qa` | FounderRoute | ProductQA | `./pages/founder/product/QA` |
| `/founder/product/releases` | FounderRoute | ProductReleases | `./pages/founder/product/Releases` |
| `/founder/product/rollback` | FounderRoute | ProductRollback | `./pages/founder/product/Rollback` |
| `/founder/projects` | FounderRoute | FounderProjects | `./pages/founder/FounderProjects` |
| `/founder/projects/:id` _(dynamic)_ | FounderRoute | FounderProjectDetail | `./pages/founder/FounderProjectDetail` |
| `/founder/proposals` | FounderRoute | FounderProposals | `./pages/founder/FounderProposals` |
| `/founder/proposals/:id` _(dynamic)_ | FounderRoute | ProposalDetail | `./pages/founder/ProposalDetail` |
| `/founder/quarterly-production-machine` | FounderRoute | QuarterlyProductionMachine | `./pages/founder/QuarterlyProductionMachine` |
| `/founder/quarterly-production-machine/build-generator` | FounderRoute | FRBusinessAutopsy | `./pages/founder/funding-radar/BusinessAutopsy` |
| `/founder/quarterly-production-machine/build-pack-validator` | FounderRoute | QPMBuildPackValidator | `./pages/founder/quarterly-production-machine/BuildPackValidator` |
| `/founder/quarterly-production-machine/lovable-pack` | FounderRoute | QPMLovablePack | `./pages/founder/quarterly-production-machine/LovablePack` |
| `/founder/quarterly-production-machine/production-pack` | FounderRoute | QPMProductionPack | `./pages/founder/quarterly-production-machine/ProductionPack` |
| `/founder/quarterly-production-machine/prompt-queue` | FounderRoute | QPMPromptQueue | `./pages/founder/quarterly-production-machine/PromptQueue` |
| `/founder/quarterly-production-machine/vertical-launch` | FounderRoute | QPMVerticalLaunch | `./pages/founder/quarterly-production-machine/VerticalLaunch` |
| `/founder/quote-to-cash` | FounderRoute | QTCOverview | `./pages/founder/quote-to-cash/Overview` |
| `/founder/quote-to-cash/invoices` | FounderRoute | QTCInvoices | `./pages/founder/quote-to-cash/Invoices` |
| `/founder/quote-to-cash/payment-architecture-readiness` | FounderRoute | QTCPaymentArchitectureReadiness | `./pages/founder/quote-to-cash/PaymentArchitectureReadiness` |
| `/founder/quote-to-cash/payment-control-centre` | FounderRoute | QTCPaymentControlCentre | `./pages/founder/quote-to-cash/PaymentControlCentre` |
| `/founder/quote-to-cash/payments` | FounderRoute | QTCPayments | `./pages/founder/quote-to-cash/Payments` |
| `/founder/quote-to-cash/proposals` | FounderRoute | QTCProposals | `./pages/founder/quote-to-cash/Proposals` |
| `/founder/quote-to-cash/quotes` | FounderRoute | QTCQuotes | `./pages/founder/quote-to-cash/Quotes` |
| `/founder/quote-to-cash/revenue-confirmation` | FounderRoute | QTCRevenueConfirmation | `./pages/founder/quote-to-cash/RevenueConfirmation` |
| `/founder/quote-to-cash/settings` | FounderRoute | QTCSettings | `./pages/founder/quote-to-cash/Settings` |
| `/founder/quote-to-cash/stripe-price-mapping` | FounderRoute | QTCStripePriceMapping | `./pages/founder/quote-to-cash/StripePriceMapping` |
| `/founder/reconciliation` | FounderRoute | ReconciliationOverview | `./pages/founder/reconciliation/Overview` |
| `/founder/reconciliation/bank` | FounderRoute | ReconciliationBank | `./pages/founder/reconciliation/Bank` |
| `/founder/reconciliation/invoices` | FounderRoute | ReconciliationInvoices | `./pages/founder/reconciliation/Invoices` |
| `/founder/reconciliation/payments` | FounderRoute | ReconciliationPayments | `./pages/founder/reconciliation/Payments` |
| `/founder/reconciliation/payouts` | FounderRoute | ReconciliationPayouts | `./pages/founder/reconciliation/Payouts` |
| `/founder/reconciliation/refunds` | FounderRoute | ReconciliationRefunds | `./pages/founder/reconciliation/Refunds` |
| `/founder/reconciliation/settings` | FounderRoute | ReconciliationSettings | `./pages/founder/reconciliation/Settings` |
| `/founder/reconciliation/unmatched` | FounderRoute | ReconciliationUnmatched | `./pages/founder/reconciliation/Unmatched` |
| `/founder/recovery` | FounderRoute | RecoveryOverview | `@/pages/founder/recovery/Overview` |
| `/founder/relationship-health` | FounderRoute | RhOverview | `./pages/founder/relationship-health/Overview` |
| `/founder/relationship-health/customers` | FounderRoute | RhCustomers | `./pages/founder/relationship-health/Customers` |
| `/founder/relationship-health/opportunities` | FounderRoute | RhOpportunities | `./pages/founder/relationship-health/Opportunities` |
| `/founder/relationship-health/partners` | FounderRoute | RhPartners | `./pages/founder/relationship-health/Partners` |
| `/founder/relationship-health/risks` | FounderRoute | RhRisks | `./pages/founder/relationship-health/Risks` |
| `/founder/relationship-health/sellers` | FounderRoute | RhSellers | `./pages/founder/relationship-health/Sellers` |
| `/founder/relationship-intelligence` | FounderRoute | RelationshipIntelligencePage | `./pages/founder/RelationshipIntelligence` |
| `/founder/relationship-intelligence/import` | FounderRoute | RelationshipIntelligenceImport | `./pages/founder/RelationshipIntelligenceImport` |
| `/founder/release-workflow` | FounderRoute | ReleaseWorkflowPage | `@/pages/founder/operating-loops/ReleaseWorkflow` |
| `/founder/reporting-truth` | FounderRoute | ReportingTruthOverview | `./pages/founder/reporting-truth/Overview` |
| `/founder/reporting-truth/conflicts` | FounderRoute | ReportingTruthConflicts | `./pages/founder/reporting-truth/Conflicts` |
| `/founder/reporting-truth/definitions` | FounderRoute | ReportingTruthDefinitions | `./pages/founder/reporting-truth/Definitions` |
| `/founder/reporting-truth/kpi-dictionary` | FounderRoute | ReportingTruthKpiDictionary | `./pages/founder/reporting-truth/KpiDictionary` |
| `/founder/reporting-truth/reconciliation` | FounderRoute | ReportingTruthReconciliation | `./pages/founder/reporting-truth/Reconciliation` |
| `/founder/reporting-truth/settings` | FounderRoute | ReportingTruthSettings | `./pages/founder/reporting-truth/Settings` |
| `/founder/reports` | FounderRoute | ReportsOverview | `./pages/founder/reports/Overview` |
| `/founder/reports/archive` | FounderRoute | ReportsArchive | `./pages/founder/reports/Archive` |
| `/founder/reports/decisions` | FounderRoute | ReportsDecisions | `./pages/founder/reports/Decisions` |
| `/founder/reports/monthly` | FounderRoute | ReportsMonthly | `./pages/founder/reports/Monthly` |
| `/founder/reports/portfolio` | FounderRoute | ReportsPortfolio | `./pages/founder/reports/Portfolio` |
| `/founder/reports/weekly` | FounderRoute | ReportsWeekly | `./pages/founder/reports/Weekly` |
| `/founder/resource-allocation` | FounderRoute | RAOverview | `./pages/founder/resource-allocation/Overview` |
| `/founder/resource-allocation/ai-budget` | FounderRoute | RAAIBudget | `./pages/founder/resource-allocation/AIBudget` |
| `/founder/resource-allocation/cash` | FounderRoute | RACash | `./pages/founder/resource-allocation/Cash` |
| `/founder/resource-allocation/founder-attention` | FounderRoute | RAFounderAttention | `./pages/founder/resource-allocation/FounderAttention` |
| `/founder/resource-allocation/human-time` | FounderRoute | RAHumanTime | `./pages/founder/resource-allocation/HumanTime` |
| `/founder/resource-allocation/recommendations` | FounderRoute | RARecommendations | `./pages/founder/resource-allocation/Recommendations` |
| `/founder/revenue` | FounderRoute | FounderRevenue | `./pages/founder/FounderRevenue` |
| `/founder/revenue-autopilot` | FounderRoute | RevenueAutopilotOverview | `./pages/founder/revenue-autopilot/Overview` |
| `/founder/revenue-autopilot/approvals` | FounderRoute | RevenueAutopilotApprovals | `./pages/founder/revenue-autopilot/Approvals` |
| `/founder/revenue-autopilot/gaps` | FounderRoute | RevenueAutopilotGaps | `./pages/founder/revenue-autopilot/Gaps` |
| `/founder/revenue-autopilot/targets` | FounderRoute | RevenueAutopilotTargets | `./pages/founder/revenue-autopilot/Targets` |
| `/founder/revenue-autopilot/tasks` | FounderRoute | RevenueAutopilotTasks | `./pages/founder/revenue-autopilot/Tasks` |
| `/founder/revenue-autopilot/today` | FounderRoute | RevenueAutopilotToday | `./pages/founder/revenue-autopilot/Today` |
| `/founder/roles` | FounderRoute | RolesOverview | `./pages/founder/roles/Overview` |
| `/founder/roles/access-requests` | FounderRoute | RolesAccessRequests | `./pages/founder/roles/AccessRequests` |
| `/founder/roles/audit` | FounderRoute | RolesAudit | `./pages/founder/roles/Audit` |
| `/founder/roles/delegation` | FounderRoute | RolesDelegation | `./pages/founder/roles/Delegation` |
| `/founder/roles/permissions` | FounderRoute | RolesPermissions | `./pages/founder/roles/Permissions` |
| `/founder/roles/settings` | FounderRoute | RolesSettings | `./pages/founder/roles/Settings` |
| `/founder/roles/users` | FounderRoute | RolesUsers | `./pages/founder/roles/Users` |
| `/founder/runtime-mode` | FounderRoute | RuntimeModeOverview | `@/pages/founder/runtime-mode/Overview` |
| `/founder/sales-coaching` | FounderRoute | SalesCoachingDashboard | `./pages/founder/sales-coaching/Dashboard` |
| `/founder/sales-coaching/conversions` | FounderRoute | SalesCoachingConversions | `./pages/founder/sales-coaching/Conversions` |
| `/founder/sales-coaching/objections` | FounderRoute | SalesCoachingObjections | `./pages/founder/sales-coaching/Objections` |
| `/founder/sales-coaching/recommendations` | FounderRoute | SalesCoachingRecommendations | `./pages/founder/sales-coaching/Recommendations` |
| `/founder/sales-coaching/scripts` | FounderRoute | SalesCoachingScripts | `./pages/founder/sales-coaching/Scripts` |
| `/founder/sales-coaching/wins-losses` | FounderRoute | SalesCoachingWinsLosses | `./pages/founder/sales-coaching/WinsLosses` |
| `/founder/sales-targets` | FounderRoute | SalesTargetsCockpit | `./pages/founder/sales-targets/Cockpit` |
| `/founder/sales-targets/activity-plan` | FounderRoute | SalesTargetsActivityPlan | `./pages/founder/sales-targets/ActivityPlan` |
| `/founder/sales-targets/business` | FounderRoute | SalesTargetsBusiness | `./pages/founder/sales-targets/BusinessTargets` |
| `/founder/sales-targets/conversion` | FounderRoute | SalesTargetsConversion | `./pages/founder/sales-targets/Conversion` |
| `/founder/sales-targets/forecast` | FounderRoute | SalesTargetsForecast | `./pages/founder/sales-targets/Forecast` |
| `/founder/sales-targets/gaps` | FounderRoute | SalesTargetsGaps | `./pages/founder/sales-targets/Gaps` |
| `/founder/scheduled-jobs` | FounderRoute | SJOverview | `./pages/founder/scheduled-jobs/Overview` |
| `/founder/scheduled-jobs/calendar` | FounderRoute | SJCalendar | `./pages/founder/scheduled-jobs/Calendar` |
| `/founder/scheduled-jobs/failures` | FounderRoute | SJFailures | `./pages/founder/scheduled-jobs/Failures` |
| `/founder/scheduled-jobs/jobs` | FounderRoute | SJJobs | `./pages/founder/scheduled-jobs/Jobs` |
| `/founder/scheduled-jobs/runs` | FounderRoute | SJRuns | `./pages/founder/scheduled-jobs/Runs` |
| `/founder/scheduled-jobs/settings` | FounderRoute | SJSettings | `./pages/founder/scheduled-jobs/Settings` |
| `/founder/scheduling` | FounderRoute | SchedulingOverview | `./pages/founder/scheduling/Overview` |
| `/founder/scheduling/availability` | FounderRoute | SchedulingAvailability | `./pages/founder/scheduling/Availability` |
| `/founder/scheduling/bookings` | FounderRoute | SchedulingBookings | `./pages/founder/scheduling/Bookings` |
| `/founder/scheduling/no-shows` | FounderRoute | SchedulingNoShows | `./pages/founder/scheduling/NoShows` |
| `/founder/scheduling/resources` | FounderRoute | SchedulingResources | `./pages/founder/scheduling/Resources` |
| `/founder/scheduling/settings` | FounderRoute | SchedulingSettings | `./pages/founder/scheduling/Settings` |
| `/founder/search` | FounderRoute | SearchOverview | `./pages/founder/search/Overview` |
| `/founder/search/all` | FounderRoute | SearchAll | `./pages/founder/search/All` |
| `/founder/search/audit` | FounderRoute | SearchAudit | `./pages/founder/search/Audit` |
| `/founder/search/businesses` | FounderRoute | SearchBusinesses | `./pages/founder/search/Businesses` |
| `/founder/search/communications` | FounderRoute | SearchCommunications | `./pages/founder/search/Communications` |
| `/founder/search/customers` | FounderRoute | SearchCustomers | `./pages/founder/search/Customers` |
| `/founder/search/documents` | FounderRoute | SearchDocuments | `./pages/founder/search/Documents` |
| `/founder/search/settings` | FounderRoute | SearchSettings | `./pages/founder/search/Settings` |
| `/founder/security` | FounderRoute | SecurityDashboard | `./pages/founder/SecurityDashboard` |
| `/founder/security-vault` | FounderRoute | SecurityVaultOverview | `@/pages/founder/security-vault/Overview` |
| `/founder/security-vault/backup-restore` | FounderRoute | SecurityVaultBackupRestore | `@/pages/founder/security-vault/BackupRestore` |
| `/founder/security-vault/build-snapshots` | FounderRoute | SecurityVaultBuildSnapshots | `@/pages/founder/security-vault/BuildSnapshots` |
| `/founder/security-vault/secrets-register` | FounderRoute | SecurityVaultSecretsRegister | `@/pages/founder/security-vault/SecretsRegister` |
| `/founder/security-vault/security-audit` | FounderRoute | SecurityVaultSecurityAudit | `@/pages/founder/security-vault/SecurityAudit` |
| `/founder/sending` | FounderRoute | SendingHealth | `./pages/founder/sending/SendingHealth` |
| `/founder/sending-infrastructure` | FounderRoute | SendingInfrastructure | `./pages/founder/SendingInfrastructure` |
| `/founder/social` | FounderRoute | SocialBrain | `./pages/founder/SocialBrain` |
| `/founder/social-autopilot` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/accounts` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/ads` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/assets` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/calendar` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/content` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/engagement` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/funnels` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/inbox` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/performance` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/publishing` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/replies` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-autopilot/settings` | FounderRoute | SocialAutopilotPage | `./pages/founder/SocialAutopilotPage` |
| `/founder/social-relationships` | FounderRoute | SocialRelationshipsPage | `./pages/founder/SocialRelationshipsPage` |
| `/founder/social-relationships/connections` | FounderRoute | SocialRelationshipsPage | `./pages/founder/SocialRelationshipsPage` |
| `/founder/social-relationships/discovery` | FounderRoute | SocialRelationshipsPage | `./pages/founder/SocialRelationshipsPage` |
| `/founder/social-relationships/inbox` | FounderRoute | SocialRelationshipsPage | `./pages/founder/SocialRelationshipsPage` |
| `/founder/social-relationships/policies` | FounderRoute | SocialRelationshipsPage | `./pages/founder/SocialRelationshipsPage` |
| `/founder/social-relationships/queue` | FounderRoute | SocialRelationshipsPage | `./pages/founder/SocialRelationshipsPage` |
| `/founder/social-relationships/targets` | FounderRoute | SocialRelationshipsPage | `./pages/founder/SocialRelationshipsPage` |
| `/founder/sops` | FounderRoute | SopsOverview | `./pages/founder/sops/Overview` |
| `/founder/sops/agent-usage` | FounderRoute | SopsAgentUsage | `./pages/founder/sops/AgentUsage` |
| `/founder/sops/conflicts` | FounderRoute | SopsConflicts | `./pages/founder/sops/Conflicts` |
| `/founder/sops/library` | FounderRoute | SopsLibrary | `./pages/founder/sops/Library` |
| `/founder/sops/reviews` | FounderRoute | SopsReviews | `./pages/founder/sops/Reviews` |
| `/founder/sops/settings` | FounderRoute | SopsSettings | `./pages/founder/sops/Settings` |
| `/founder/sops/versions` | FounderRoute | SopsVersions | `./pages/founder/sops/Versions` |
| `/founder/start-here` | FounderRoute | StartHere | `./pages/founder/StartHere` |
| `/founder/start-here/setup-business` | FounderRoute | StartHereSetupBusiness | `./pages/founder/StartHereSetupBusiness` |
| `/founder/starter-pack-materialiser` | FounderRoute | StarterPackMaterialiserPage | `./pages/founder/StarterPackMaterialiser` |
| `/founder/statutory-filings` | FounderRoute | StatutoryFilingsPage | `@/pages/founder/operating-loops/StatutoryFilings` |
| `/founder/strategy` | FounderRoute | StrategyEngine | `./pages/founder/StrategyEngine` |
| `/founder/suppliers` | FounderRoute | SuppliersDashboard | `./pages/founder/suppliers/SuppliersDashboard` |
| `/founder/suppliers/:id` _(dynamic)_ | FounderRoute | SupplierDetail | `./pages/founder/suppliers/SupplierDetail` |
| `/founder/support` | FounderRoute | SupportHub | `./pages/founder/SupportHub` |
| `/founder/support-tickets` | FounderRoute | SupportTicketsOverview | `./pages/founder/support-tickets/Overview` |
| `/founder/support-tickets/escalations` | FounderRoute | SupportTicketsEscalations | `./pages/founder/support-tickets/Escalations` |
| `/founder/support-tickets/knowledge` | FounderRoute | SupportTicketsKnowledge | `./pages/founder/support-tickets/Knowledge` |
| `/founder/support-tickets/queue` | FounderRoute | SupportTicketsQueue | `./pages/founder/support-tickets/Queue` |
| `/founder/support-tickets/settings` | FounderRoute | SupportTicketsSettings | `./pages/founder/support-tickets/Settings` |
| `/founder/support-tickets/sla` | FounderRoute | SupportTicketsSLA | `./pages/founder/support-tickets/SLA` |
| `/founder/support/knowledge-agent` | FounderRoute | SupportKnowledgeAgent | `./pages/founder/SupportKnowledgeAgent` |
| `/founder/system` | FounderRoute | SystemDashboard | `./pages/founder/system/SystemDashboard` |
| `/founder/system-config` | FounderRoute | SCOverview | `./pages/founder/system-config/Overview` |
| `/founder/system-config/audit` | FounderRoute | SCAudit | `./pages/founder/system-config/Audit` |
| `/founder/system-config/business-overrides` | FounderRoute | SCBusinessOverrides | `./pages/founder/system-config/BusinessOverrides` |
| `/founder/system-config/external-actions` | FounderRoute | SCExternalActions | `./pages/founder/system-config/ExternalActions` |
| `/founder/system-config/feature-flags` | FounderRoute | SCFeatureFlags | `./pages/founder/system-config/FeatureFlags` |
| `/founder/system-config/modules` | FounderRoute | SCModules | `./pages/founder/system-config/Modules` |
| `/founder/system-health` | FounderRoute | SystemHealthOverview | `@/pages/founder/system-health/Overview` |
| `/founder/system/events` | FounderRoute | SystemEvents | `./pages/founder/system/SystemEvents` |
| `/founder/system/health` | FounderRoute | SystemHealth | `./pages/founder/system/SystemHealth` |
| `/founder/system/modes` | FounderRoute | ExecutionModes | `./pages/founder/system/ExecutionModes` |
| `/founder/templates` | FounderRoute | TemplateDirectory | `./pages/founder/TemplateDirectory` |
| `/founder/templates/:id` _(dynamic)_ | FounderRoute | TemplateDetail | `./pages/founder/TemplateDetail` |
| `/founder/testing` | FounderRoute | PlatformTesting | `./pages/founder/PlatformTesting` |
| `/founder/trust-safety` | FounderRoute | TsOverview | `./pages/founder/trust-safety/Overview` |
| `/founder/trust-safety/accounts` | FounderRoute | TsAccounts | `./pages/founder/trust-safety/Accounts` |
| `/founder/trust-safety/actions` | FounderRoute | TsActions | `./pages/founder/trust-safety/Actions` |
| `/founder/trust-safety/messages` | FounderRoute | TsMessages | `./pages/founder/trust-safety/Messages` |
| `/founder/trust-safety/payments` | FounderRoute | TsPayments | `./pages/founder/trust-safety/Payments` |
| `/founder/trust-safety/risk-events` | FounderRoute | TsRiskEvents | `./pages/founder/trust-safety/RiskEvents` |
| `/founder/trust-safety/settings` | FounderRoute | TsSettings | `./pages/founder/trust-safety/Settings` |
| `/founder/user-guide` | FounderRoute | FounderUserGuide | `./pages/founder/FounderUserGuide` |
| `/founder/vendors` | FounderRoute | VendorsOverview | `./pages/founder/vendors/Overview` |
| `/founder/vendors/access` | FounderRoute | VendorsAccess | `./pages/founder/vendors/Access` |
| `/founder/vendors/contracts` | FounderRoute | VendorsContracts | `./pages/founder/vendors/Contracts` |
| `/founder/vendors/costs` | FounderRoute | VendorsCosts | `./pages/founder/vendors/Costs` |
| `/founder/vendors/renewals` | FounderRoute | VendorsRenewals | `./pages/founder/vendors/Renewals` |
| `/founder/vendors/risk` | FounderRoute | VendorsRisk | `./pages/founder/vendors/Risk` |
| `/founder/vendors/saas` | FounderRoute | VendorsSaas | `./pages/founder/vendors/Saas` |
| `/founder/video-library` | FounderRoute | VideoLibrary | `./pages/founder/VideoLibrary` |
| `/founder/video-sop-factory` | FounderRoute | VideoSopFactoryPage | `./pages/founder/VideoSopFactory` |
| `/founder/webhooks` | FounderRoute | WebhooksOverview | `./pages/founder/webhooks/Overview` |
| `/founder/webhooks/failures` | FounderRoute | WebhooksFailures | `./pages/founder/webhooks/Failures` |
| `/founder/webhooks/inbox` | FounderRoute | WebhooksInbox | `./pages/founder/webhooks/Inbox` |
| `/founder/webhooks/normalised-events` | FounderRoute | WebhooksNormalised | `./pages/founder/webhooks/NormalisedEvents` |
| `/founder/webhooks/providers` | FounderRoute | WebhooksProviders | `./pages/founder/webhooks/Providers` |
| `/founder/webhooks/settings` | FounderRoute | WebhooksSettings | `./pages/founder/webhooks/Settings` |
| `/founder/work-queue` | FounderRoute | WorkQueueOverview | `./pages/founder/work-queue/Overview` |
| `/founder/work-queue/approvals` | FounderRoute | WorkQueueApprovals | `./pages/founder/work-queue/Approvals` |
| `/founder/work-queue/blocked` | FounderRoute | WorkQueueBlocked | `./pages/founder/work-queue/Blocked` |
| `/founder/work-queue/by-agent` | FounderRoute | WorkQueueByAgent | `./pages/founder/work-queue/ByAgent` |
| `/founder/work-queue/by-business` | FounderRoute | WorkQueueByBusiness | `./pages/founder/work-queue/ByBusiness` |
| `/founder/work-queue/high-value` | FounderRoute | WorkQueueHighValue | `./pages/founder/work-queue/HighValue` |
| `/founder/work-queue/overdue` | FounderRoute | WorkQueueOverdue | `./pages/founder/work-queue/Overdue` |
| `/founder/work-queue/settings` | FounderRoute | WorkQueueSettings | `./pages/founder/work-queue/Settings` |
| `/founder/work-queue/today` | FounderRoute | WorkQueueToday | `./pages/founder/work-queue/Today` |
| `/founder/worker-help-audit` | FounderRoute | WorkerHelpAudit | `@/pages/founder/WorkerHelpAudit` |
| `/founder/worker-manuals` | FounderRoute | WorkerManuals | `@/pages/founder/WorkerManuals` |
| `/founder/workflows` | FounderRoute | WorkflowDirectory | `./pages/founder/WorkflowDirectory` |
| `/founder/workflows/:id` _(dynamic)_ | FounderRoute | WorkflowDetail | `./pages/founder/WorkflowDetail` |

## /industries (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/industries` | public | Industries | `./pages/Industries` |

## /legal (13)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/legal` | public | LegalHub | `./pages/legal/LegalHub` |
| `/legal/acceptable-use` | public | AcceptableUse | `./pages/legal/AcceptableUse` |
| `/legal/ai-output-disclaimer` | public | AIOutputDisclaimer | `./pages/legal/AIOutputDisclaimer` |
| `/legal/ai-usage-policy` | public | AIUsagePolicy | `./pages/legal/AIUsagePolicy` |
| `/legal/automation-liability-disclaimer` | public | AutomationLiabilityDisclaimer | `./pages/legal/AutomationLiabilityDisclaimer` |
| `/legal/automation-safety-policy` | public | AutomationSafetyPolicy | `./pages/legal/AutomationSafetyPolicy` |
| `/legal/cookie-policy` | public | CookiePolicy | `./pages/legal/CookiePolicy` |
| `/legal/data-processing-agreement` | public | DataProcessingAgreement | `./pages/legal/DataProcessingAgreement` |
| `/legal/enterprise-services-agreement` | public | EnterpriseServicesAgreement | `./pages/legal/EnterpriseServicesAgreement` |
| `/legal/privacy-policy` | public | PrivacyPolicy | `./pages/legal/PrivacyPolicy` |
| `/legal/security-policy` | public | SecurityPolicy | `./pages/legal/SecurityPolicy` |
| `/legal/security-reporting` | public | SecurityReporting | `./pages/legal/SecurityReporting` |
| `/legal/terms-of-service` | public | TermsOfService | `./pages/legal/TermsOfService` |

## /method (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/method` | public | Method | `./pages/Method` |

## /onboarding (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/onboarding/:token` _(dynamic)_ | public | CustomerOnboardingView | `@/pages/public/CustomerOnboardingView` |

## /operator-login (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/operator-login` | public | OperatorLogin | `@/pages/worker/OperatorLogin` |

## /operator-portal (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/operator-portal` | WorkerRoute | OperatorPortal | `@/pages/worker/OperatorPortal` |

## /oversight-login (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/oversight-login` | public | OversightLogin | `@/pages/worker/OversightLogin` |

## /oversight-portal (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/oversight-portal` | WorkerRoute | OversightPortal | `@/pages/worker/OversightPortal` |

## /partner (7)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/partner` | PartnerRoute | PartnerDashboard | `./pages/partner/PartnerDashboard` |
| `/partner/documents` | PartnerRoute | PartnerDocuments | `./pages/partner/PartnerDocuments` |
| `/partner/messages` | PartnerRoute | PartnerMessages | `./pages/partner/PartnerMessages` |
| `/partner/opportunities` | PartnerRoute | PartnerOpportunities | `./pages/partner/PartnerOpportunities` |
| `/partner/opportunities/:id` _(dynamic)_ | PartnerRoute | PartnerOpportunityDetail | `./pages/partner/PartnerOpportunityDetail` |
| `/partner/projects` | PartnerRoute | PartnerProjects | `./pages/partner/PartnerProjects` |
| `/partner/projects/:id` _(dynamic)_ | PartnerRoute | PartnerProjectDetail | `./pages/partner/PartnerProjectDetail` |

## /partners (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/partners` | public | PartnerProgram | `./pages/PartnerProgram` |

## /platform (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/platform` | public | Platform | `./pages/Platform` |

## /portal (24)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/portal/adviser` | public | PublicAdviserPortal | `./pages/portal/Adviser` |
| `/portal/analytics` | ProtectedRoute | ClientAnalytics | `./pages/portal/ClientAnalytics` |
| `/portal/customer` | public | PublicCustomerPortal | `./pages/portal/Customer` |
| `/portal/dashboard` | ProtectedRoute | Dashboard | `./pages/portal/Dashboard` |
| `/portal/documents` | ProtectedRoute | Documents | `./pages/portal/Documents` |
| `/portal/forgot-password` | public | ForgotPassword | `./pages/portal/ForgotPassword` |
| `/portal/login` | public | PortalLogin | `./pages/portal/PortalLogin` |
| `/portal/maintenance` | ProtectedRoute | MaintenanceDashboard | `./pages/portal/MaintenanceDashboard` |
| `/portal/maintenance/features` | ProtectedRoute | FeatureRequests | `./pages/portal/FeatureRequests` |
| `/portal/maintenance/schedule` | ProtectedRoute | MaintenanceSchedule | `./pages/portal/MaintenanceSchedule` |
| `/portal/maintenance/updates` | ProtectedRoute | MaintenanceUpdates | `./pages/portal/MaintenanceUpdates` |
| `/portal/messages` | ProtectedRoute | Messages | `./pages/portal/Messages` |
| `/portal/monitoring` | ProtectedRoute | ClientSystemMonitoring | `./pages/portal/ClientSystemMonitoring` |
| `/portal/optimisation` | ProtectedRoute | ClientOptimisation | `./pages/portal/ClientOptimisation` |
| `/portal/partner` | public | PublicPartnerPortal | `./pages/portal/Partner` |
| `/portal/projects` | ProtectedRoute | Projects | `./pages/portal/Projects` |
| `/portal/projects/:id` _(dynamic)_ | ProtectedRoute | ProjectDetail | `./pages/portal/ProjectDetail` |
| `/portal/reset-password` | public | ResetPassword | `./pages/portal/ResetPassword` |
| `/portal/seller` | public | PublicSellerPortal | `./pages/portal/Seller` |
| `/portal/signup` | public | PortalSignup | `./pages/portal/PortalSignup` |
| `/portal/support` | ProtectedRoute | Support | `./pages/portal/Support` |
| `/portal/systems` | ProtectedRoute | ClientControlPanel | `./pages/portal/ClientControlPanel` |
| `/portal/systems/:id` _(dynamic)_ | ProtectedRoute | ClientSystemDetail | `./pages/portal/ClientSystemDetail` |
| `/portal/upload` | public | PublicUploadPortal | `./pages/portal/Upload` |

## /project-discovery (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/project-discovery` | public | ProjectDiscovery | `./pages/ProjectDiscovery` |

## /proposals (2)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/proposals/accept/:token` _(dynamic)_ | public | PublicProposalAccept | `./pages/public/PublicProposalAccept` |
| `/proposals/view/:token` _(dynamic)_ | public | PublicProposalView | `./pages/public/PublicProposalView` |

## /supplier (3)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/supplier/assignments` | public | SupplierAssignments | `./pages/supplier/SupplierAssignments` |
| `/supplier/dashboard` | public | SupplierDashboard | `./pages/supplier/SupplierDashboard` |
| `/supplier/login` | public | SupplierLogin | `./pages/supplier/SupplierLogin` |

## /survey (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/survey/:token` _(dynamic)_ | public | SurveyResponse | `@/pages/public/SurveyResponse` |

## /systems (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/systems` | public | Systems | `./pages/Systems` |

## /what-we-build (1)

| Route | Guard | Page component | Source file |
|---|---|---|---|
| `/what-we-build` | public | WhatWeBuild | `./pages/WhatWeBuild` |
