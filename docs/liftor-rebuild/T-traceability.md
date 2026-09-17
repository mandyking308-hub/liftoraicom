# Section T — Source-to-manual traceability

Every subsystem maps to concrete files, tables, routes and functions. Use this table to go from a manual claim to the code that backs it.

| Subsystem | Manual section | Frontend | `src/lib` engines | Edge functions | Key tables/views |
|---|---|---|---|---|---|
| Router & shell | A, C | `src/App.tsx`, `src/main.tsx`, `src/index.css` | `animations.ts`, `runtimeEnvCheck.ts` | — | — |
| Auth & roles | B | `contexts/AuthContext.tsx`, `components/*/\*Route.tsx` | — | `_shared/socialAuth.ts` (`requireFounder`) | `user_roles`, `profiles`, `_is_founder_or_admin` |
| Portfolio CRM | K1 | `pages/founder/crm/**` | `lib/crm/portfolioCrmModel.ts`, `portfolioCrmQueries.ts`, `portfolioCrmPoolResolver.ts`, `dataQualityEngine.ts`, `dataAssetRegistry.ts` | `crm-*`, import/identity functions | `contacts`, `organisations`, `business_contact_relationships`, `portfolio_contact_ownership`, `portfolio_ownership_events`, `crm_spine_summary` |
| Education commercial layer | K2 | `pages/founder/education-commercial/**` | `lib/education/educationBusinessRelevance.ts` | `education-outreach-eligibility`, `_shared/educationCrm.ts`, `educationRoleScorer.ts`, `educationAccountUniverse.ts` | `outreach_campaign_drafts`, `education_commercial_funnel` |
| Relationship Intelligence / wealth | K3 | `pages/founder/relationship-intelligence/**`, `billionaire*` pages | `billionaireCoverage.ts` | `billionaire-*` functions | `relationship_intelligence_contacts`, `billionaire_*`, `philanthropic_institutions` |
| Apollo + credit firewall | I1, N | `pages/founder/apollo/**` | — | `apollo-*`, `_shared/apolloCreditFirewall.ts`, `apolloRelationshipUpsert.ts` | `apollo_*`, `apollo_credit_reserve/settle/release/status` |
| Smartlead outbound | N | `pages/founder/smartlead/**` | — | `smartlead-*`, `_shared/smartlead*.ts` | `outbound_provider_campaign_mappings`, `_lead_mappings`, `_events`, `smartlead_send_dry_run_audit` |
| Winnr / sender estate | N, I2 | `pages/founder/GSMOutbound.tsx`, GHAT outbound page | — | `gsm-winnr-sync`, `gsm-smartlead-mailbox-sync`, `gsm-pool-allocate`, `mailbox-estate-register`, `_shared/winnrClient.ts`, `senderEstates.ts`, `gsmSenderEstate.ts`, `mailboxAllocator.ts` | `gsm_sending_domains`, `gsm_mailboxes`, `gsm_mailbox_readiness`, `warmup_progress` |
| External action safety | J | gate admin surfaces | `businessActivationControl.ts`, `approvalOpsEngine.ts` | every external-capable function | `external_action_gates`, `system_execution_modes`, `system_mode_ledger` |
| Business lifecycle | M | `pages/founder/business-lifecycle/**`, setup tunnel pages | `businessSetupTunnel.ts`, `businessLifecycleEngine.ts`, `businessTemplateFactory.ts`, `businessArchetypeEngine.ts` | `business-*` functions | `business_*` (90 tables) |
| AI architecture | L | `pages/founder/ai/**` | `services/aiUsageLogger.ts` | `_shared/aiGateway.ts`, `liftor-brain-*`, `vid-*`, `worker-help-chat` | `ai_*` (43 tables), `acquire_ai_lease` |
| Social / distribution | K6 | `pages/founder/social/**` | `channelStrategyEngine.ts`, `attributionEngine.ts` | `social-*` (large family), `_shared/social*.ts` | `social_*` (110 tables) |
| PR radar | K6 | `pages/founder/pr/**` | — | `pr-*` (Gmail draft-only) | `pr_*`, `journalist_*`, `media_*` |
| M&A / exit | K5 | `pages/founder/ma/**`, exit engines | exit/buyer engines in `src/lib` | `ma-*` functions | `ma_*` (58 tables) |
| Finance / QTC | K4 | `pages/founder/finance/**` | `collectionsEngine.ts`, `commercialPace.ts` | finance/invoice functions | `invoices`, `payments`, `qtc_*`, `collections_*`, `fx_*` |
| Customer success / support | K4 | `pages/founder/customer-*/**`, `pages/portal/**` | `customerOnboarding.ts`, `customerSalesSafety.ts`, `complaintsEngine.ts` | `customer-*`, `support-*`, `_shared/customerSuccessLogic.ts`, `supportAgentLogic.ts`, `voiceProviderShared.ts` | `customer_*` (54), `support_*` (15) |
| Compliance / legal | K8 | `pages/legal/**`, founder legal console | `businessComplianceEngine.ts`, `contextGuardEngine.ts`, `crossBusinessIntegrityEngine.ts` | `compliance-*` | `compliance_*`, `legal_*`, `consent_*`, `evidence_*`, `compliance_check_*` RPCs |
| Giving rail (GHAT/SME) | K7 | founder giving-rail pages, `apps/giving-platform` | — | `ghat-*` | `philanthropy_*`, `trust_*`, pledge/ledger tables |
| Healthcare overlay | K9 | healthcare pages | — | — | `healthcare_*` (NOT LIVE) |
| Manuals & knowledge | A, T | `pages/founder/ManualsHub`, User Manual page | `founderManualContent.ts`, `manualArchitectureSync2026.ts`, `liftorUserManualContent.ts`, `slimMandyManualContent.ts`, `lib/businessManuals/**` | — | `manual_*`, `knowledge_*`, `build_log_entries` |
| Jobs & webhooks | O | — | — | 16 `verify_jwt=false` functions, cron entrypoints | `scheduled_jobs`, `webhook_*`, `outbound_provider_events` |
| Tests & CI | P | — | `src/lib/__tests__/**`, `src/services/__tests__/**` | `*-acceptance`, `*-healthcheck` | — |

## Regeneration and proof

- Route → file: [C-route-catalog.md](./C-route-catalog.md)
- Page → edge functions/tables: [D-page-surface-catalog.md](./D-page-surface-catalog.md)
- Engine → exports/tables: [E-component-service-catalog.md](./E-component-service-catalog.md)
- Function → auth/hosts/gates: [H-edge-function-catalog.md](./H-edge-function-catalog.md)
- Migration → objects: [G-migration-map.md](./G-migration-map.md)
- File → section: [source-coverage-manifest.md](./source-coverage-manifest.md)
