# Appendix D — Page / Surface Catalog

_Generated from commit `efbc518f6951dc4ad0ca78e46fb5f4b7c0847029` by `scripts/generate-rebuild-manual-catalogs.mjs`. Regenerate with `node scripts/generate-rebuild-manual-catalogs.mjs`._

Every page file under `src/pages/**`. `Routed` means the file is directly registered in `src/App.tsx` (sub-tab and panel files are reached through a parent page). `Writes` means the file contains an insert/update/upsert/delete call. `Edge functions` lists every `supabase.functions.invoke` target — these are the only paths through which a page can reach a provider.

**Total page files: 945** (routed directly: 32).

| Page file | Routed | Writes | Edge functions invoked | Tables/views read or written | RPCs | Confirmation phrases |
|---|---|---|---|---|---|---|
| `src/pages/About.tsx` | no | no | — | — | — | — |
| `src/pages/AIProposal.tsx` | no | yes | generate-proposal | proposals, architectures, architecture_components | — | — |
| `src/pages/Architecture.tsx` | no | no | — | — | — | — |
| `src/pages/CaseStudies.tsx` | no | no | — | — | — | — |
| `src/pages/founder/access-governance/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/access-governance/Audit.tsx` | no | no | — | access_audit_events, access_systems | — | — |
| `src/pages/founder/access-governance/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/access-governance/Revocation.tsx` | no | no | — | access_assignments, access_systems, human_operators | — | — |
| `src/pages/founder/access-governance/Rotation.tsx` | no | no | — | secret_inventory, access_systems | — | — |
| `src/pages/founder/access-governance/Secrets.tsx` | no | no | — | secret_inventory, access_systems | — | — |
| `src/pages/founder/access-governance/Systems.tsx` | no | no | — | access_systems | — | — |
| `src/pages/founder/access-governance/Users.tsx` | no | no | — | access_assignments, access_systems | — | — |
| `src/pages/founder/AccessControl.tsx` | no | yes | — | platform_roles, role_permissions, user_platform_roles, profiles, organisations, access_audit_log | — | — |
| `src/pages/founder/acquisition-funding/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/acquisition-funding/Deals.tsx` | no | no | — | — | — | — |
| `src/pages/founder/acquisition-funding/Funders.tsx` | no | no | — | — | — | — |
| `src/pages/founder/acquisition-funding/Opportunities.tsx` | no | no | — | — | — | — |
| `src/pages/founder/acquisition-funding/OpportunityDetail.tsx` | no | no | — | — | — | — |
| `src/pages/founder/acquisition-funding/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/acquisition-funding/Pitches.tsx` | no | no | — | — | — | — |
| `src/pages/founder/adviser-pack/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/adviser-pack/Documents.tsx` | no | no | — | adviser_pack_items | — | — |
| `src/pages/founder/adviser-pack/Entities.tsx` | no | no | — | entity_structure_records | — | — |
| `src/pages/founder/adviser-pack/Expenses.tsx` | no | no | — | adviser_pack_items, ai_usage_ledger, vendor_subscriptions | — | — |
| `src/pages/founder/adviser-pack/Monthly.tsx` | no | no | — | adviser_handoff_packs, adviser_pack_items | — | — |
| `src/pages/founder/adviser-pack/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/adviser-pack/Questions.tsx` | no | no | — | adviser_questions | — | — |
| `src/pages/founder/adviser-pack/Revenue.tsx` | no | no | — | adviser_pack_items, qtc_payments | — | — |
| `src/pages/founder/agent-capabilities/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/agent-capabilities/ApprovalRules.tsx` | no | no | — | — | — | — |
| `src/pages/founder/agent-capabilities/Audit.tsx` | no | no | — | — | — | — |
| `src/pages/founder/agent-capabilities/Boundaries.tsx` | no | no | — | — | — | — |
| `src/pages/founder/agent-capabilities/Escalations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/agent-capabilities/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/agent-capabilities/Registry.tsx` | no | no | — | — | — | — |
| `src/pages/founder/AgentDirectory.tsx` | no | no | — | ai_agents, agent_alerts, agent_activity_logs | — | — |
| `src/pages/founder/AgentProfile.tsx` | no | no | — | ai_agents, agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts | — | — |
| `src/pages/founder/ai-compliance/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-compliance/DataFlows.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-compliance/Evidence.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-compliance/Gaps.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-compliance/Oversight.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-compliance/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-compliance/Risk.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-compliance/Systems.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-evals/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-evals/Agents.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-evals/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-evals/Regression.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-evals/Results.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-evals/Safety.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-evals/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ai-evals/TestSuites.tsx` | no | yes | — | ai_eval_runs, ai_eval_results | — | — |
| `src/pages/founder/AIAgentCostControls.tsx` | no | yes | — | ai_agents, ai_agent_cost_controls | — | — |
| `src/pages/founder/AIApprovalGates.tsx` | no | no | — | businesses | — | — |
| `src/pages/founder/AIBusinessBudgets.tsx` | no | yes | — | businesses, ai_business_budgets | — | — |
| `src/pages/founder/AICachedContext.tsx` | no | yes | — | businesses, ai_cached_context_blocks | — | — |
| `src/pages/founder/AICostAlerts.tsx` | no | yes | — | ai_cost_alerts, ai_usage_ledger | — | — |
| `src/pages/founder/AICostGovernorHub.tsx` | no | no | — | — | — | — |
| `src/pages/founder/AIFinancePack.tsx` | no | no | — | — | — | — |
| `src/pages/founder/AIFirstUseSetup.tsx` | no | no | — | ai_provider_pricing, businesses, ai_business_budgets, ai_agent_registry, ai_agent_cost_controls, ai_model_routing_rules, ai_gateway_requests, ai_runtime_events, founder_approval_items, ai_usage_ledger, ai_roi_snapshots, ai_prompt_templates, ai_cached_context_blocks, ai_kill_switch_state | — | — |
| `src/pages/founder/AIFounderActionBoard.tsx` | no | yes | — | ai_usage_ledger, ai_cost_alerts, founder_approval_items, ai_agent_cost_controls, ai_business_budgets, businesses, ai_quality_scores | — | — |
| `src/pages/founder/AIGatewayBypassRegister.tsx` | no | no | — | ai_usage_ledger | — | — |
| `src/pages/founder/AILiveOperations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/AIModelRouting.tsx` | no | yes | — | ai_model_routing_rules, businesses | — | — |
| `src/pages/founder/AIOrchestrationLive.tsx` | no | no | — | ai_agent_registry, ai_gateway_requests, ai_conversations, ai_workflow_runs, ai_workflow_steps | — | — |
| `src/pages/founder/AIPromptTemplates.tsx` | no | yes | — | businesses, ai_prompt_templates | — | — |
| `src/pages/founder/AIProviderPricing.tsx` | no | no | — | — | — | — |
| `src/pages/founder/AIQualityScoring.tsx` | no | no | — | ai_usage_ledger, ai_quality_scores, ai_prompt_templates | — | — |
| `src/pages/founder/AIQueueControl.tsx` | no | yes | — | ai_kill_switch_state, ai_action_queue, ai_rate_limits | — | — |
| `src/pages/founder/AIROIEngine.tsx` | no | no | — | businesses, ai_roi_snapshots | — | — |
| `src/pages/founder/AIRuntimeHealth.tsx` | no | yes | — | ai_agent_registry, ai_gateway_requests, ai_conversations, ai_workflow_runs, ai_runtime_events, ai_concurrency_leases, ai_provider_pricing, ai_business_budgets | cleanup_stale_ai_leases | — |
| `src/pages/founder/AIRuntimeOrchestration.tsx` | no | no | — | ai_gateway_requests, ai_agent_registry, ai_conversations | — | — |
| `src/pages/founder/AISandbox.tsx` | no | no | — | — | — | — |
| `src/pages/founder/AISecurityCentre.tsx` | no | no | — | ai_cost_alerts, ai_usage_ledger | — | — |
| `src/pages/founder/AIUsageLedger.tsx` | no | no | — | businesses, ai_model_routing_rules, ai_usage_ledger | — | — |
| `src/pages/founder/analytics-attribution/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/analytics-attribution/Campaigns.tsx` | no | no | — | — | — | — |
| `src/pages/founder/analytics-attribution/Funnel.tsx` | no | no | — | — | — | — |
| `src/pages/founder/analytics-attribution/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/analytics-attribution/Revenue.tsx` | no | no | — | — | — | — |
| `src/pages/founder/analytics-attribution/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/analytics-attribution/Sources.tsx` | no | no | — | — | — | — |
| `src/pages/founder/approvals-ops/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/archetypes/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/archetypes/BusinessMap.tsx` | no | no | — | — | — | — |
| `src/pages/founder/archetypes/Classifier.tsx` | no | no | — | — | — | — |
| `src/pages/founder/archetypes/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/archetypes/Recommendations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/archetypes/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ArchitectureDetail.tsx` | no | yes | — | architectures, architecture_components, architecture_relationships, ai_agents, automation_workflows, integrations | — | — |
| `src/pages/founder/ArchitectureDirectory.tsx` | no | yes | — | architectures | — | — |
| `src/pages/founder/attention-guard/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/attention-guard/Decisions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/attention-guard/Delegation.tsx` | no | no | — | — | — | — |
| `src/pages/founder/attention-guard/Noise.tsx` | no | no | — | — | — | — |
| `src/pages/founder/attention-guard/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/attention-guard/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/attention-guard/Today.tsx` | no | no | — | — | — | — |
| `src/pages/founder/audit-ledger/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/audit-ledger/ByBusiness.tsx` | no | no | — | — | — | — |
| `src/pages/founder/audit-ledger/ByModule.tsx` | no | no | — | — | — | — |
| `src/pages/founder/audit-ledger/ByUser.tsx` | no | no | — | — | — | — |
| `src/pages/founder/audit-ledger/Events.tsx` | no | no | — | — | — | — |
| `src/pages/founder/audit-ledger/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/audit-ledger/Sensitive.tsx` | no | no | — | — | — | — |
| `src/pages/founder/audit-ledger/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/AutomationBook.tsx` | yes | yes | — | automation_runbooks | — | — |
| `src/pages/founder/backup-recovery/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/backup-recovery/EmergencyPack.tsx` | no | no | — | — | — | — |
| `src/pages/founder/backup-recovery/Exports.tsx` | no | no | — | — | — | — |
| `src/pages/founder/backup-recovery/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/backup-recovery/Restore.tsx` | no | no | — | — | — | — |
| `src/pages/founder/backup-recovery/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/backup-recovery/Status.tsx` | no | no | — | — | — | — |
| `src/pages/founder/BillionaireAccessResearch.tsx` | no | no | — | — | — | — |
| `src/pages/founder/BillionaireIntelligence.tsx` | no | no | — | — | — | — |
| `src/pages/founder/BrainAudit.tsx` | no | no | — | liftor_brain_audit | — | — |
| `src/pages/founder/BrainCore.tsx` | no | yes | — | automation_workflows, ai_agents, monitored_systems, organisations, brain_insights, brain_learning_records, brain_recommendations | — | — |
| `src/pages/founder/BrainDrafts.tsx` | no | no | — | liftor_brain_drafts | — | — |
| `src/pages/founder/BrainProvider.tsx` | no | no | liftor-brain-provider-check | — | — | — |
| `src/pages/founder/BrainSessions.tsx` | no | no | — | liftor_brain_sessions | — | — |
| `src/pages/founder/BrainTools.tsx` | no | no | — | liftor_brain_tool_registry, liftor_brain_tool_calls | — | — |
| `src/pages/founder/BuildLog.tsx` | no | yes | — | build_log_entries | — | — |
| `src/pages/founder/BuildPhaseCloseout.tsx` | no | no | — | liftor_build_phase_closeout_records | — | — |
| `src/pages/founder/business-activation/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/business-compliance/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-compliance/ApprovalTriggers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-compliance/Businesses.tsx` | no | yes | — | business_compliance_profiles | — | — |
| `src/pages/founder/business-compliance/Channels.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-compliance/Claims.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-compliance/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-compliance/Rules.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-lifecycle/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-lifecycle/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-lifecycle/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-lifecycle/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-lifecycle/Stages.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-lifecycle/Transitions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-templates/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-templates/Apply.tsx` | no | no | — | business_archetype_assignments | — | — |
| `src/pages/founder/business-templates/BusinessSetup.tsx` | no | yes | — | business_setup_tasks, business_template_applications | — | — |
| `src/pages/founder/business-templates/Library.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-templates/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/business-templates/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/BusinessDailyOperatingLoop.tsx` | no | no | — | businesses, business_daily_operating_outputs, business_daily_operating_runs, business_internal_activation_records | — | — |
| `src/pages/founder/BusinessInternalActivation.tsx` | no | no | — | businesses, business_operating_runbook_items, business_internal_daily_actions, business_internal_activation_records | — | — |
| `src/pages/founder/BusinessManuals.tsx` | no | no | — | — | — | — |
| `src/pages/founder/BusinessOnboardingFactory.tsx` | no | no | — | — | — | — |
| `src/pages/founder/BusinessSetupTunnel.tsx` | no | yes | — | businesses | — | — |
| `src/pages/founder/BusinessWeeklyReview.tsx` | no | no | — | businesses, business_weekly_review_outputs, business_weekly_review_runs, business_internal_activation_records | — | — |
| `src/pages/founder/CampaignFactory.tsx` | yes | yes | — | campaign_factory_batches, business_campaign_plans, social_campaign_drafts, outreach_campaign_drafts, campaign_approval_packs, campaign_operator_checks, campaign_oversight_checks, worker_profiles | — | — |
| `src/pages/founder/capacity/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/capacity/Agents.tsx` | no | no | — | — | — | — |
| `src/pages/founder/capacity/Bottlenecks.tsx` | no | yes | — | bottleneck_alerts | — | — |
| `src/pages/founder/capacity/Business.tsx` | no | no | — | capacity_plans | — | — |
| `src/pages/founder/capacity/Delivery.tsx` | no | no | — | — | — | — |
| `src/pages/founder/capacity/Forecast.tsx` | no | no | — | — | — | — |
| `src/pages/founder/capacity/Humans.tsx` | no | no | — | — | — | — |
| `src/pages/founder/capacity/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/capacity/WorkloadView.tsx` | no | no | — | workload_items | — | — |
| `src/pages/founder/channel-strategy/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/channel-strategy/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/channel-strategy/Campaigns.tsx` | no | no | — | — | — | — |
| `src/pages/founder/channel-strategy/Channels.tsx` | no | no | — | — | — | — |
| `src/pages/founder/channel-strategy/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/channel-strategy/Recommendations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ClientPortal.tsx` | no | no | — | — | — | — |
| `src/pages/founder/collections/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/collections/FailedPayments.tsx` | no | no | — | — | — | — |
| `src/pages/founder/collections/Overdue.tsx` | no | no | — | — | — | — |
| `src/pages/founder/collections/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/collections/PaymentPlans.tsx` | no | no | — | — | — | — |
| `src/pages/founder/collections/Reminders.tsx` | no | no | — | — | — | — |
| `src/pages/founder/collections/ServiceHolds.tsx` | no | no | — | — | — | — |
| `src/pages/founder/collections/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/CommandCenter.tsx` | no | no | — | monitored_systems, ai_agents, automation_workflows, workflow_executions, system_alerts, workflow_alerts, integration_alerts, integrations, activity_log, platform_diagnostic_runs | — | — |
| `src/pages/founder/CommandCentre.tsx` | no | no | — | businesses, contacts, outreach_campaigns, email_queue, inboxes, social_business_profiles, social_post_drafts, social_scheduling_queue, metricool_export_batches, social_engagement_events, social_trend_watch_items, external_action_gates, command_centre_modules, business_module_status, marketing_content_assets, marketing_campaign_briefs, support_knowledge_articles, support_interaction_reviews, creative_asset_library, creative_asset_usage, command_centre_active_inboxes, internal_email_identities, lead_quality_profiles, lead_lifecycle_summary, ai_drafts, internal_proposals, conversations, high_intent_review_queue, system_events, system_settings, email_events, deals, invoices | — | — |
| `src/pages/founder/communications/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/communications/ByBusiness.tsx` | no | no | — | — | — | — |
| `src/pages/founder/communications/ByContact.tsx` | no | no | — | — | — | — |
| `src/pages/founder/communications/Drafts.tsx` | no | no | — | — | — | — |
| `src/pages/founder/communications/Ledger.tsx` | no | no | — | — | — | — |
| `src/pages/founder/communications/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/communications/Received.tsx` | no | no | — | — | — | — |
| `src/pages/founder/communications/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/complaints/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/complaints/Disputes.tsx` | no | no | — | complaint_cases | — | — |
| `src/pages/founder/complaints/Escalations.tsx` | no | no | — | complaint_cases | — | — |
| `src/pages/founder/complaints/Evidence.tsx` | no | no | — | dispute_evidence | — | — |
| `src/pages/founder/complaints/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/complaints/Refunds.tsx` | no | no | — | refund_requests | — | — |
| `src/pages/founder/complaints/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/compliance/ComplianceDashboard.tsx` | no | no | — | compliance_events, compliance_scores, business_risk_scores, jurisdiction_profiles | — | — |
| `src/pages/founder/compliance/ComplianceEvents.tsx` | no | yes | — | compliance_events | — | — |
| `src/pages/founder/compliance/ComplianceRules.tsx` | no | yes | — | compliance_rules | — | — |
| `src/pages/founder/connectors/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/connectors/BusinessMap.tsx` | no | no | — | — | — | — |
| `src/pages/founder/connectors/Health.tsx` | no | no | — | — | — | — |
| `src/pages/founder/connectors/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/connectors/Registry.tsx` | no | no | — | — | — | — |
| `src/pages/founder/connectors/Secrets.tsx` | no | no | — | — | — | — |
| `src/pages/founder/connectors/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/connectors/Webhooks.tsx` | no | no | — | — | — | — |
| `src/pages/founder/context-guard/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/context-guard/CrossContamination.tsx` | no | no | — | — | — | — |
| `src/pages/founder/context-guard/Events.tsx` | no | no | — | — | — | — |
| `src/pages/founder/context-guard/MissingBusiness.tsx` | no | no | — | — | — | — |
| `src/pages/founder/context-guard/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/context-guard/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/contracts/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/contracts/Drafts.tsx` | no | no | — | contracts | — | — |
| `src/pages/founder/contracts/Obligations.tsx` | no | no | — | contract_obligations | — | — |
| `src/pages/founder/contracts/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/contracts/Renewals.tsx` | no | no | — | contracts | — | — |
| `src/pages/founder/contracts/Risk.tsx` | no | no | — | contract_obligations, contract_events | — | — |
| `src/pages/founder/contracts/Settings.tsx` | no | no | — | contract_provider_settings | — | — |
| `src/pages/founder/contracts/Signature.tsx` | no | no | — | contracts | — | — |
| `src/pages/founder/conversations/ConversationDetail.tsx` | no | yes | outreach-send-draft | conversations, contacts, messages, ai_actions, ai_drafts | — | — |
| `src/pages/founder/conversations/ConversationsDashboard.tsx` | no | no | — | conversations, contacts, ai_actions, inbound_messages | — | — |
| `src/pages/founder/CreativeAssetsHub.tsx` | no | no | — | — | — | — |
| `src/pages/founder/CRMContactDetail.tsx` | no | yes | internal-proposal-generate | contacts, communications, email_events, inboxes | check_outreach_allowed | — |
| `src/pages/founder/CRMContacts.tsx` | no | no | — | — | upsert_contact | — |
| `src/pages/founder/CRMDashboard.tsx` | no | no | — | contacts, communications, inboxes | — | — |
| `src/pages/founder/CRMInboxConfigure.tsx` | no | yes | outreach-save-credentials, outreach-send-test, outreach-save-inbound-config, outreach-test-imap, outreach-inbound-poll | inboxes | list_inbox_credentials_public | — |
| `src/pages/founder/CRMInboxes.tsx` | no | yes | — | inboxes, sending_domains | — | — |
| `src/pages/founder/cross-contamination/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/customer-feedback/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-feedback/ChurnReasons.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-feedback/FeatureRequests.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-feedback/Insights.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-feedback/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-feedback/Reviews.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-feedback/Signals.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-feedback/Testimonials.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-onboarding/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-onboarding/Checklists.tsx` | no | no | — | onboarding_checklist_items, onboarding_templates | — | — |
| `src/pages/founder/customer-onboarding/Customers.tsx` | no | no | — | onboarding_records | — | — |
| `src/pages/founder/customer-onboarding/MissingInfo.tsx` | no | no | — | onboarding_records | — | — |
| `src/pages/founder/customer-onboarding/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-onboarding/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-onboarding/WelcomePacks.tsx` | no | no | — | onboarding_records | — | — |
| `src/pages/founder/customer-sales/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-sales/CallLogs.tsx` | no | yes | customer-voice-post-call-analysis | customer_sales_call_logs, customer_sales_conversations | — | — |
| `src/pages/founder/customer-sales/CloseEngine.tsx` | no | yes | — | customer_sales_close_actions, customer_sales_close_provider_settings, customer_sales_products, customer_sales_offers | — | — |
| `src/pages/founder/customer-sales/Conversations.tsx` | no | yes | sales-conversation-brain | customer_sales_conversations, customer_sales_playbooks, customer_sales_products, customer_sales_conversation_states, customer_sales_brain_runs, customer_sales_call_logs | — | — |
| `src/pages/founder/customer-sales/CSListPage.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-sales/CustomerSalesHub.tsx` | no | no | — | customer_sales_products, customer_sales_offers, customer_sales_playbooks, customer_sales_conversations, customer_sales_close_actions, customer_sales_call_logs, customer_sales_provider_settings, customer_sales_objection_library | — | — |
| `src/pages/founder/customer-sales/FollowUp.tsx` | no | yes | — | customer_sales_follow_up_tasks, customer_sales_human_handoff_tasks, customer_sales_follow_up_templates, customer_sales_conversations | — | — |
| `src/pages/founder/customer-sales/Objections.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-sales/Offers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-sales/Playbooks.tsx` | no | yes | — | customer_sales_playbooks, customer_sales_products | — | — |
| `src/pages/founder/customer-sales/ProductKnowledge.tsx` | no | no | — | customer_sales_products, customer_sales_offers, customer_sales_objection_library, customer_sales_knowledge_sources | — | — |
| `src/pages/founder/customer-sales/SafetyCentre.tsx` | no | no | — | customer_sales_safety_events, customer_sales_conversations, customer_sales_close_actions, customer_sales_contact_safety, customer_sales_prohibited_claims, customer_sales_escalation_triggers | — | — |
| `src/pages/founder/customer-sales/Settings.tsx` | no | yes | customer-voice-provider-test | customer_sales_provider_settings, customer_sales_knowledge_sources, customer_sales_close_provider_settings | — | — |
| `src/pages/founder/customer-sales/VoiceConsole.tsx` | no | no | — | customer_sales_provider_settings, customer_sales_call_logs | — | — |
| `src/pages/founder/customer-upgrades/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/customer-upgrades/FollowUp.tsx` | no | yes | — | customer_upgrade_opportunities | — | — |
| `src/pages/founder/customer-upgrades/Hub.tsx` | no | no | — | customer_upgrade_opportunities, product_upgrade_ladders, customer_upgrade_rules | — | — |
| `src/pages/founder/customer-upgrades/Opportunities.tsx` | no | yes | — | customer_upgrade_opportunities | — | — |
| `src/pages/founder/customer-upgrades/ProductLadders.tsx` | no | yes | — | product_upgrade_ladders | — | — |
| `src/pages/founder/customer-upgrades/Renewals.tsx` | no | no | — | customer_upgrade_opportunities | — | — |
| `src/pages/founder/customer-upgrades/UpgradeRules.tsx` | no | yes | — | customer_upgrade_rules | — | — |
| `src/pages/founder/CustomerSuccess.tsx` | no | no | — | — | — | — |
| `src/pages/founder/DailyOperator.tsx` | no | no | — | businesses | — | — |
| `src/pages/founder/data-quality/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/data-quality/Duplicates.tsx` | no | no | — | — | — | — |
| `src/pages/founder/data-quality/FindingsList.tsx` | no | no | — | data_quality_findings | — | — |
| `src/pages/founder/data-quality/Orphans.tsx` | no | no | — | — | — | — |
| `src/pages/founder/data-quality/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/data-quality/RepairQueue.tsx` | no | no | — | data_repair_actions | — | — |
| `src/pages/founder/data-quality/RevenueIntegrity.tsx` | no | no | — | — | — | — |
| `src/pages/founder/data-quality/Stale.tsx` | no | no | — | — | — | — |
| `src/pages/founder/data-quality/TestData.tsx` | no | no | — | — | — | — |
| `src/pages/founder/DataIngestionCentre.tsx` | no | yes | — | ma_data_imports, ma_dedupe_suggestions, ma_golden_records, ma_import_records, ma_approval_queue | — | — |
| `src/pages/founder/DecisionEngine.tsx` | no | yes | — | decision_recommendations | — | — |
| `src/pages/founder/decisions/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/decisions/Implemented.tsx` | no | no | — | — | — | — |
| `src/pages/founder/decisions/Made.tsx` | no | no | — | — | — | — |
| `src/pages/founder/decisions/Open.tsx` | no | no | — | — | — | — |
| `src/pages/founder/decisions/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/decisions/Review.tsx` | no | no | — | — | — | — |
| `src/pages/founder/decisions/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/delivery/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/delivery/Blockers.tsx` | no | no | — | delivery_orders, delivery_tasks | — | — |
| `src/pages/founder/delivery/Capacity.tsx` | no | no | — | delivery_capacity | — | — |
| `src/pages/founder/delivery/CompletionProof.tsx` | no | no | — | delivery_completion_proof | — | — |
| `src/pages/founder/delivery/Orders.tsx` | no | no | — | delivery_orders | — | — |
| `src/pages/founder/delivery/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/delivery/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/delivery/Tasks.tsx` | no | no | — | delivery_tasks | — | — |
| `src/pages/founder/deployment/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/deployment/EdgeFunctions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/deployment/Environments.tsx` | no | no | — | — | — | — |
| `src/pages/founder/deployment/EnvVars.tsx` | no | no | — | — | — | — |
| `src/pages/founder/deployment/Migrations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/deployment/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/deployment/Releases.tsx` | no | no | — | — | — | — |
| `src/pages/founder/deployment/Rollback.tsx` | no | no | — | — | — | — |
| `src/pages/founder/deployment/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/DeploymentDetail.tsx` | no | yes | — | deployments, deployment_stages, deployment_checklist, deployment_logs | — | — |
| `src/pages/founder/DeploymentDirectory.tsx` | no | yes | — | deployments, architectures, deployment_stages, deployment_checklist, deployment_logs | — | — |
| `src/pages/founder/distressed-radar/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/distressed-radar/Acquisition.tsx` | no | no | — | — | — | — |
| `src/pages/founder/distressed-radar/AcquisitionDetail.tsx` | no | no | — | — | — | — |
| `src/pages/founder/distressed-radar/Disposal.tsx` | no | no | — | — | — | — |
| `src/pages/founder/distressed-radar/Financing.tsx` | no | no | — | — | — | — |
| `src/pages/founder/distressed-radar/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/distressed-radar/Sources.tsx` | no | no | — | — | — | — |
| `src/pages/founder/documents/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/documents/Access.tsx` | no | no | — | — | — | — |
| `src/pages/founder/documents/DataRoom.tsx` | no | no | — | — | — | — |
| `src/pages/founder/documents/Evidence.tsx` | no | no | — | — | — | — |
| `src/pages/founder/documents/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/documents/Policies.tsx` | no | no | — | — | — | — |
| `src/pages/founder/documents/Requests.tsx` | no | no | — | — | — | — |
| `src/pages/founder/documents/Vault.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/Fulfilment.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/Inventory.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/Orders.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/Products.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/Returns.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ecommerce/Suppliers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/EducationCommercialLayer.tsx` | no | no | — | outreach_campaign_drafts | — | — |
| `src/pages/founder/entity-map/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/entity-map/AdviserQuestions.tsx` | no | yes | — | tax_sensitive_questions | — | — |
| `src/pages/founder/entity-map/Businesses.tsx` | no | yes | — | business_archetype_assignments, business_entity_assignments, entity_policy_assignments | — | — |
| `src/pages/founder/entity-map/Entities.tsx` | no | yes | — | legal_entities | — | — |
| `src/pages/founder/entity-map/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/entity-map/RevenueRouting.tsx` | no | yes | — | revenue_routing_rules | — | — |
| `src/pages/founder/entity-map/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ExecutionDashboard.tsx` | no | yes | — | workflow_executions, automation_workflows, workflow_steps, execution_steps, execution_logs | — | — |
| `src/pages/founder/ExecutionDetail.tsx` | no | yes | — | workflow_executions, execution_steps, execution_logs | — | — |
| `src/pages/founder/ExecutionHandoff.tsx` | no | yes | — | ma_portfolio_assets, ma_execution_targets, ma_exit_targets, ma_buyer_matches, ma_companies, ma_data_room_items | ma_generate_default_data_room | — |
| `src/pages/founder/exit-metrics/_shared.tsx` | no | no | — | businesses | — | — |
| `src/pages/founder/exit-metrics/Archetypes.tsx` | no | no | — | — | — | — |
| `src/pages/founder/exit-metrics/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/exit-metrics/BuyerFit.tsx` | no | no | — | — | — | — |
| `src/pages/founder/exit-metrics/DataRoom.tsx` | no | no | — | — | — | — |
| `src/pages/founder/exit-metrics/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/exit-metrics/Readiness.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ExitValuationEngine.tsx` | no | yes | — | ma_portfolio_assets, ma_exit_targets, ma_valuation_benchmarks, ma_deals, ma_intelligence_sources, ma_execution_targets | — | — |
| `src/pages/founder/experiments/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/experiments/LearningLibrary.tsx` | no | no | — | — | — | — |
| `src/pages/founder/experiments/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/experiments/Plans.tsx` | no | no | — | — | — | — |
| `src/pages/founder/experiments/Results.tsx` | no | no | — | — | — | — |
| `src/pages/founder/experiments/Winners.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ExternalActivationReadiness.tsx` | no | no | — | businesses, business_external_activation_channel_checks, business_external_activation_plans, business_external_activation_readiness_runs | — | — |
| `src/pages/founder/finance/FinanceDashboard.tsx` | no | no | finance-chase-overdue | invoices | finance_target_vs_actual | — |
| `src/pages/founder/finance/FinanceDeals.tsx` | no | yes | — | deals, contacts | — | — |
| `src/pages/founder/finance/FinanceInvoices.tsx` | no | yes | — | invoices | — | — |
| `src/pages/founder/finance/FinancePayments.tsx` | no | yes | — | payments, invoices | — | — |
| `src/pages/founder/finance/FinanceTargets.tsx` | no | yes | — | revenue_targets | — | — |
| `src/pages/founder/FirstUseConfiguration.tsx` | no | no | — | ai_provider_pricing, ai_business_budgets, ai_agent_cost_controls, businesses, business_knowledge_uploads, ai_gateway_requests, ai_runtime_events, ai_usage_ledger, founder_approval_items, external_action_gates, ai_kill_switch_state, apollo_leads, outreach_campaigns, ai_drafts, customer_sales_products, customer_sales_playbooks, customer_sales_provider_settings, customer_sales_close_actions | — | — |
| `src/pages/founder/FounderActivity.tsx` | no | no | — | activity_log | — | — |
| `src/pages/founder/FounderAnalytics.tsx` | no | no | — | workflow_executions, ai_agents, automation_workflows, agent_task_stats | — | — |
| `src/pages/founder/FounderCoPilot.tsx` | no | no | — | monitored_systems, ai_agents, automation_workflows, organisations, brain_insights, decision_recommendations | — | — |
| `src/pages/founder/FounderDocuments.tsx` | no | no | — | project_documents | — | — |
| `src/pages/founder/FounderLedBuyerMarketEngine.tsx` | no | no | — | business_exit_intelligence_profiles, founder_led_buyer_targets, competitor_intelligence_map, customer_prospect_segment_map, founder_led_buyer_warm_up_actions | — | — |
| `src/pages/founder/FounderLedExitSalesEngine.tsx` | no | no | — | founder_led_sale_reviews, founder_led_buyer_targets, founder_led_sale_readiness_scores | — | — |
| `src/pages/founder/FounderLegalConsole.tsx` | no | no | — | legal_document_versions, user_legal_acceptance | — | — |
| `src/pages/founder/FounderManual.tsx` | no | no | — | organisations, automation_workflows, ai_agents, integrations, deployments, system_templates, knowledge_entries, brain_insights, decision_recommendations, platform_test_runs, build_log_entries, manual_pages, monitored_systems, architectures, launched_platforms | — | — |
| `src/pages/founder/FounderMoney.tsx` | no | yes | — | businesses | — | — |
| `src/pages/founder/FounderOverview.tsx` | no | no | — | proposals, projects, activity_log | — | — |
| `src/pages/founder/FounderProjectDetail.tsx` | no | no | — | projects, project_stages, project_milestones, project_updates, project_messages | — | — |
| `src/pages/founder/FounderProjects.tsx` | no | no | — | projects, profiles | — | — |
| `src/pages/founder/FounderProposals.tsx` | no | no | — | proposals | — | — |
| `src/pages/founder/FounderRevenue.tsx` | no | yes | — | revenue_records, partner_deals, projects, subscriptions, organisations, ai_agents, automation_workflows, monitored_systems, launched_platforms, partner_opportunities, activity_log | — | — |
| `src/pages/founder/FounderUserGuide.tsx` | no | no | — | — | — | — |
| `src/pages/founder/FullSystemMirror.tsx` | no | no | — | system_coverage_reports, system_versions, system_pages_index, system_content, system_backend_objects, system_workflows_full, system_rules, system_integrations_full, system_data_flows, system_changes, system_version_diffs | rebuild_full_manual, validate_full_system_coverage, validate_runtime_vs_documentation, detect_orphan_content, compare_system_versions, export_full_system_snapshot | — |
| `src/pages/founder/funding-radar/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/funding-radar/BuildHandoffPack.tsx` | no | no | — | ma_build_candidates, funding_shortlist, funding_radar_companies, funding_problem_clusters | — | — |
| `src/pages/founder/funding-radar/BusinessAutopsy.tsx` | no | yes | — | business_autopsies | — | — |
| `src/pages/founder/funding-radar/BusinessAutopsyDetail.tsx` | no | yes | — | business_autopsies, funding_problem_clusters, funding_market_maps, funding_weakness_signals | — | — |
| `src/pages/founder/funding-radar/CapitalEfficiency.tsx` | no | no | — | funding_radar_scores | — | — |
| `src/pages/founder/funding-radar/Clusters.tsx` | no | yes | — | funding_problem_clusters | — | — |
| `src/pages/founder/funding-radar/Companies.tsx` | no | yes | — | funding_radar_companies, funding_imports | — | — |
| `src/pages/founder/funding-radar/CompanyDetail.tsx` | no | yes | — | funding_radar_companies, funding_radar_scores, funding_shortlist | — | — |
| `src/pages/founder/funding-radar/DecisionPack.tsx` | no | no | — | funding_radar_scores, funding_market_maps | — | — |
| `src/pages/founder/funding-radar/MarketMaps.tsx` | no | yes | — | funding_market_maps, ma_audit_logs | — | — |
| `src/pages/founder/funding-radar/MonthlyRun.tsx` | no | yes | — | funding_radar_scores, funding_monthly_runs | — | — |
| `src/pages/founder/funding-radar/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/funding-radar/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/funding-radar/Shortlist.tsx` | no | yes | — | funding_radar_scores, ma_build_candidates, funding_shortlist | — | — |
| `src/pages/founder/funding-radar/Watchlist.tsx` | no | yes | — | funding_radar_companies, funding_watchlist, ma_audit_logs | — | — |
| `src/pages/founder/funding-radar/WatchlistDetail.tsx` | no | yes | — | funding_shortlist, ma_build_candidates, funding_weakness_signals, ma_audit_logs | — | — |
| `src/pages/founder/funding-radar/WeaknessSignals.tsx` | no | no | — | — | — | — |
| `src/pages/founder/funding-radar/WhiteSpace.tsx` | no | yes | — | funding_white_space_opportunities, ma_audit_logs | — | — |
| `src/pages/founder/GHATOutbound.tsx` | no | no | — | gsm_sending_domains, gsm_mailboxes | — | — |
| `src/pages/founder/GlobalOperations.tsx` | no | no | — | monitored_systems, ai_agents, automation_workflows, workflow_executions, system_alerts, agent_alerts, workflow_alerts, activity_log | — | — |
| `src/pages/founder/GlobalPrRadar.tsx` | no | yes | pr-source-performance-summary, pr-opportunity-email-ingest, pr-parse-editorielle, pr-parse-email-digests, pr-business-match, pr-media-atlas-enrich, pr-media-atlas-manual-import, pr-press-readiness-sync, pr-generate-pitch-draft, pr-create-gmail-draft, pr-mark-platform-submission, pr-owned-media-create, pr-quarterly-campaign-planner, pr-gmail-connection-check, pr-gmail-oauth-start | pr_sources, pr_inbound_messages, media_opportunities, media_pitch_drafts, journalist_relationships, sector_leader_profiles, quarterly_pr_campaigns, coverage_mentions, business_press_readiness, media_opportunity_matches, business_press_packs, pr_audit_events, owned_media_articles, pr_risk_events | — | — |
| `src/pages/founder/GSMOutbound.tsx` | no | no | — | gsm_sending_domains, gsm_mailboxes, gsm_mailbox_allocations, gsm_sender_pools, gsm_provider_sync_runs | — | — |
| `src/pages/founder/HealthcareOverlay.tsx` | no | yes | — | healthcare_audit_events, healthcare_readiness | — | — |
| `src/pages/founder/HumanWorkforceControl.tsx` | yes | yes | — | worker_tasks, monthly_business_content_plans, worker_profiles | — | — |
| `src/pages/founder/identity-resolution/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/identity-resolution/DoNotContact.tsx` | no | no | — | — | — | — |
| `src/pages/founder/identity-resolution/Duplicates.tsx` | no | no | — | — | — | — |
| `src/pages/founder/identity-resolution/MergeQueue.tsx` | no | no | — | — | — | — |
| `src/pages/founder/identity-resolution/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/identity-resolution/People.tsx` | no | no | — | — | — | — |
| `src/pages/founder/identity-resolution/Roles.tsx` | no | no | — | — | — | — |
| `src/pages/founder/identity-resolution/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/imports/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/imports/History.tsx` | no | no | — | import_applied_records | — | — |
| `src/pages/founder/imports/Mapping.tsx` | no | no | — | import_mappings | — | — |
| `src/pages/founder/imports/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/imports/Preview.tsx` | no | no | — | import_preview_rows | — | — |
| `src/pages/founder/imports/Rollback.tsx` | no | no | — | — | — | — |
| `src/pages/founder/imports/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/imports/Upload.tsx` | no | no | — | — | — | — |
| `src/pages/founder/incidents/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/incidents/Continuity.tsx` | no | no | — | continuity_plans | — | — |
| `src/pages/founder/incidents/Live.tsx` | no | no | — | incident_records, incident_timeline_events | — | — |
| `src/pages/founder/incidents/Notifications.tsx` | no | no | — | incident_records | — | — |
| `src/pages/founder/incidents/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/incidents/Postmortems.tsx` | no | no | — | incident_postmortems | — | — |
| `src/pages/founder/incidents/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/insurance-liability/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/insurance-liability/Businesses.tsx` | no | no | — | businesses | — | — |
| `src/pages/founder/insurance-liability/Claims.tsx` | no | no | — | — | — | — |
| `src/pages/founder/insurance-liability/Gaps.tsx` | no | no | — | — | — | — |
| `src/pages/founder/insurance-liability/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/insurance-liability/Policies.tsx` | no | no | — | — | — | — |
| `src/pages/founder/integration-map/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/integration-map/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/integration-map/Missing.tsx` | no | no | — | — | — | — |
| `src/pages/founder/integration-map/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/integration-map/Providers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/integration-map/Risks.tsx` | no | no | — | — | — | — |
| `src/pages/founder/integration-map/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/IntegrationDetail.tsx` | no | yes | — | integrations, integration_linked_systems, integration_activity_logs, integration_alerts, ai_agents, automation_workflows, monitored_systems | — | — |
| `src/pages/founder/IntegrationDirectory.tsx` | no | yes | — | integrations, integration_alerts | — | — |
| `src/pages/founder/internal-sla/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/internal-sla/ByAgent.tsx` | no | no | — | — | — | — |
| `src/pages/founder/internal-sla/ByHuman.tsx` | no | no | — | — | — | — |
| `src/pages/founder/internal-sla/Handoffs.tsx` | no | no | — | — | — | — |
| `src/pages/founder/internal-sla/Overdue.tsx` | no | no | — | — | — | — |
| `src/pages/founder/internal-sla/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/internal-sla/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ip-assets/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ip-assets/Catalogue.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ip-assets/Distribution.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ip-assets/Licensing.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ip-assets/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ip-assets/Rights.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ip-assets/Risks.tsx` | no | no | — | — | — | — |
| `src/pages/founder/jurisdiction-tax/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/jurisdiction-tax/AdviserReview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/jurisdiction-tax/Currencies.tsx` | no | no | — | — | — | — |
| `src/pages/founder/jurisdiction-tax/Customers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/jurisdiction-tax/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/jurisdiction-tax/Revenue.tsx` | no | no | — | — | — | — |
| `src/pages/founder/jurisdiction-tax/Sellers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/jurisdiction-tax/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/knowledge-governance/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/knowledge-governance/ApprovedClaims.tsx` | no | no | — | approved_claims, knowledge_sources | — | — |
| `src/pages/founder/knowledge-governance/Conflicts.tsx` | no | no | — | knowledge_conflicts, knowledge_sources | — | — |
| `src/pages/founder/knowledge-governance/ManualSync.tsx` | no | no | — | knowledge_sources | — | — |
| `src/pages/founder/knowledge-governance/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/knowledge-governance/Sources.tsx` | no | no | — | knowledge_sources | — | — |
| `src/pages/founder/knowledge-governance/Stale.tsx` | no | no | — | knowledge_sources | — | — |
| `src/pages/founder/KnowledgeDetail.tsx` | no | yes | — | knowledge_entries, knowledge_documents | — | — |
| `src/pages/founder/KnowledgeDirectory.tsx` | no | yes | — | knowledge_entries | — | — |
| `src/pages/founder/launch-factory/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/launch-factory/Brand.tsx` | no | no | — | — | — | — |
| `src/pages/founder/launch-factory/Checklist.tsx` | no | no | — | — | — | — |
| `src/pages/founder/launch-factory/Domains.tsx` | no | no | — | — | — | — |
| `src/pages/founder/launch-factory/Email.tsx` | no | no | — | — | — | — |
| `src/pages/founder/launch-factory/LegalPages.tsx` | no | no | — | — | — | — |
| `src/pages/founder/launch-factory/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/launch-factory/Socials.tsx` | no | no | — | — | — | — |
| `src/pages/founder/launch-factory/Tracking.tsx` | no | no | — | — | — | — |
| `src/pages/founder/LeadPipeline.tsx` | no | yes | — | proposals | — | — |
| `src/pages/founder/LiftorBrain.tsx` | no | no | — | — | — | — |
| `src/pages/founder/MAIntelligenceWorkspace.tsx` | no | no | — | ma_companies, ma_investors, ma_competitor_profiles, ma_deals, ma_adviser_channels, ma_intelligence_sources, ma_portfolio_assets | — | — |
| `src/pages/founder/ManualPageDetail.tsx` | no | yes | — | manual_pages, knowledge_entries, manual_versions, build_log_entries | — | — |
| `src/pages/founder/ManualsHub.tsx` | no | no | manual-source-hierarchy-acceptance | manual_source_layers, manual_update_drafts | — | — |
| `src/pages/founder/MarketingHub.tsx` | no | no | — | — | — | — |
| `src/pages/founder/marketplace/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/marketplace/CategoryBalance.tsx` | no | no | — | marketplace_liquidity_scores | — | — |
| `src/pages/founder/marketplace/GrowthActions.tsx` | no | no | — | marketplace_growth_actions | — | — |
| `src/pages/founder/marketplace/Liquidity.tsx` | no | no | — | — | — | — |
| `src/pages/founder/marketplace/ListingQueue.tsx` | no | no | — | marketplace_listings | — | — |
| `src/pages/founder/marketplace/Listings.tsx` | no | no | — | marketplace_listings | — | — |
| `src/pages/founder/marketplace/LocationBalance.tsx` | no | no | — | marketplace_liquidity_scores | — | — |
| `src/pages/founder/marketplace/Onboarding.tsx` | no | no | — | seller_onboarding_records | — | — |
| `src/pages/founder/marketplace/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/marketplace/Payouts.tsx` | no | no | — | seller_payout_profiles | — | — |
| `src/pages/founder/marketplace/Performance.tsx` | no | no | — | seller_onboarding_records | — | — |
| `src/pages/founder/marketplace/Performance2.tsx` | no | no | — | seller_performance_metrics | — | — |
| `src/pages/founder/marketplace/Prospects.tsx` | no | no | — | seller_prospects | — | — |
| `src/pages/founder/marketplace/Recruitment.tsx` | no | no | — | seller_recruitment_campaigns | — | — |
| `src/pages/founder/marketplace/Risk.tsx` | no | no | — | seller_performance_metrics, seller_accounts | — | — |
| `src/pages/founder/marketplace/SellerAccounts.tsx` | no | no | — | seller_accounts | — | — |
| `src/pages/founder/marketplace/SellerChecklist.tsx` | no | no | — | seller_onboarding_records, seller_accounts | — | — |
| `src/pages/founder/marketplace/Settings.tsx` | no | no | — | marketplace_profiles | — | — |
| `src/pages/founder/marketplace/SupplyDemand.tsx` | no | no | — | marketplace_supply_demand_snapshots | — | — |
| `src/pages/founder/marketplace/Terms.tsx` | no | no | — | seller_terms_acceptance | — | — |
| `src/pages/founder/marketplace/Verification.tsx` | no | no | — | seller_verification_checks | — | — |
| `src/pages/founder/MicroBatchPreparation.tsx` | no | no | — | businesses, business_micro_batch_preparation_runs, business_micro_batch_candidates, business_micro_batch_approval_packets | — | — |
| `src/pages/founder/monday-launch/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/monday-readiness/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/MonitoringDashboard.tsx` | no | no | — | monitored_systems, automation_workflows, ai_agents, system_alerts | — | — |
| `src/pages/founder/MonitoringSystemDetail.tsx` | no | no | — | monitored_systems, automation_workflows, ai_agents, system_alerts | — | — |
| `src/pages/founder/notifications/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/notifications/Archive.tsx` | no | no | — | — | — | — |
| `src/pages/founder/notifications/Escalations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/notifications/Inbox.tsx` | no | no | — | — | — | — |
| `src/pages/founder/notifications/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/notifications/Rules.tsx` | no | no | — | — | — | — |
| `src/pages/founder/notifications/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/notifications/Urgent.tsx` | no | no | — | — | — | — |
| `src/pages/founder/operating-loops/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/operating-loops/CorporateSecretarial.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/operating-loops/DataRoom.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/operating-loops/InsuranceClaims.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/operating-loops/InternationalExpansion.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/operating-loops/PortfolioFx.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/operating-loops/ReleaseWorkflow.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/operating-loops/StatutoryFilings.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/OptimisationDashboard.tsx` | no | yes | — | automation_workflows, ai_agents, workflow_executions, optimisation_insights | — | — |
| `src/pages/founder/orchestration/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/orchestration/Events.tsx` | no | no | — | liftor_events | — | — |
| `src/pages/founder/orchestration/Failures.tsx` | no | yes | — | workflow_failure_events | — | — |
| `src/pages/founder/orchestration/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/orchestration/Runs.tsx` | no | yes | — | workflow_runs, workflow_step_runs | — | — |
| `src/pages/founder/orchestration/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/orchestration/Workflows.tsx` | no | no | — | workflow_definitions | — | — |
| `src/pages/founder/OrganisationDirectory.tsx` | no | yes | — | organisations, monitored_systems, organisation_members | — | — |
| `src/pages/founder/OrganisationProfile.tsx` | no | yes | — | organisations, monitored_systems, organisation_members, organisation_documents, system_alerts, workflow_executions | — | — |
| `src/pages/founder/outreach/ApolloIntegration.tsx` | no | yes | apollo-test-connection, apollo-sync-search, apollo-sync-enrich | apollo_leads, contacts, apollo_connections, apollo_sync_segments, apollo_sync_runs | — | — |
| `src/pages/founder/outreach/CampaignLiveMonitor.tsx` | no | yes | outreach-inbound-poll, outreach-test-imap | outreach_campaigns, inboxes, email_queue, inbound_messages, conversations, ai_drafts, contacts, activity_log, business_contact_relationships | activate_outreach_campaign | — |
| `src/pages/founder/outreach/ControlledSendPreview.tsx` | no | no | controlled-send-preview | — | — | — |
| `src/pages/founder/outreach/EngagementTracking.tsx` | no | no | — | email_queue, email_tracking_events, contacts | — | — |
| `src/pages/founder/outreach/OutreachCampaigns.tsx` | no | yes | outreach-schedule-batch | outreach_campaigns, outreach_sequences | activate_outreach_campaign, validate_campaign_activation | — |
| `src/pages/founder/outreach/OutreachDashboard.tsx` | no | no | — | email_queue, email_events, outreach_campaigns, contacts, inboxes | — | — |
| `src/pages/founder/outreach/OutreachImports.tsx` | no | no | outreach-import-leads | import_batches | — | — |
| `src/pages/founder/outreach/OutreachQueue.tsx` | no | no | outreach-send-worker | email_queue, contacts, inboxes | — | — |
| `src/pages/founder/outreach/QueueAudit.tsx` | no | yes | outreach-queue-cleanup | — | — | — |
| `src/pages/founder/partners/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/partners/Affiliates.tsx` | no | no | — | — | — | — |
| `src/pages/founder/partners/Commissions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/partners/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/partners/Performance.tsx` | no | no | — | — | — | — |
| `src/pages/founder/partners/Prospects.tsx` | no | no | — | — | — | — |
| `src/pages/founder/partners/Referrals.tsx` | no | no | — | — | — | — |
| `src/pages/founder/people/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/people/Access.tsx` | no | no | — | human_operator_access, human_operators | — | — |
| `src/pages/founder/people/Handover.tsx` | no | no | — | human_operators | — | — |
| `src/pages/founder/people/Operators.tsx` | no | no | — | human_operators | — | — |
| `src/pages/founder/people/Overview.tsx` | no | no | — | human_operators | — | — |
| `src/pages/founder/people/Quality.tsx` | no | no | — | human_operator_quality_reviews, human_operators | — | — |
| `src/pages/founder/people/Tasks.tsx` | no | no | — | human_operator_tasks, human_operators | — | — |
| `src/pages/founder/people/Training.tsx` | no | no | — | human_operators | — | — |
| `src/pages/founder/platform-monitor/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/platform-monitor/Costs.tsx` | no | no | — | — | — | — |
| `src/pages/founder/platform-monitor/Errors.tsx` | no | no | — | — | — | — |
| `src/pages/founder/platform-monitor/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/platform-monitor/Performance.tsx` | no | no | — | — | — | — |
| `src/pages/founder/platform-monitor/RateLimits.tsx` | no | no | — | — | — | — |
| `src/pages/founder/platform-monitor/Recommendations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/platform-monitor/Scalability.tsx` | no | no | — | — | — | — |
| `src/pages/founder/PlatformExpansion.tsx` | no | yes | — | launched_platforms, system_templates, launch_checklist | — | — |
| `src/pages/founder/PlatformLaunchDetail.tsx` | no | yes | — | launched_platforms, launch_checklist, template_components | — | — |
| `src/pages/founder/PlatformTesting.tsx` | no | no | platform-diagnostics, platform-sandbox, platform-testing | platform_diagnostic_runs, platform_test_runs, platform_test_results | — | — |
| `src/pages/founder/policies/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/policies/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/policies/Coverage.tsx` | no | no | — | — | — | — |
| `src/pages/founder/policies/Drafts.tsx` | no | no | — | — | — | — |
| `src/pages/founder/policies/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/policies/PublicPages.tsx` | no | no | — | — | — | — |
| `src/pages/founder/policies/Review.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/Access.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/Adviser.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/Customer.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/DocumentUpload.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/Partner.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/PortalAdminPage.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/Seller.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portals/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-diversity/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-exit-targets/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-exit-targets/Alerts.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-exit-targets/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-exit-targets/Dashboard.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-exit-targets/Detail.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-exit-targets/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-memory/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-memory/AdviserBriefs.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-memory/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-memory/BuyerBriefs.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-memory/HandoverPacks.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-memory/History.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-memory/OperatorBriefs.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-memory/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-prioritisation/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-prioritisation/BuildNow.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-prioritisation/Decisions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-prioritisation/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-prioritisation/Park.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-prioritisation/Scale.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-prioritisation/Scores.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-risk/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-risk/Actions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-risk/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-risk/Critical.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-risk/Matrix.tsx` | no | no | — | — | — | — |
| `src/pages/founder/portfolio-risk/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/PortfolioBuyerWarmUp.tsx` | no | no | — | ma_portfolio_assets, ma_buyer_matches, ma_approval_queue | — | — |
| `src/pages/founder/PortfolioCompetitorIntelligence.tsx` | no | no | — | ma_portfolio_assets, ma_competitor_profiles, ma_evidence_links | — | — |
| `src/pages/founder/PortfolioCRM.tsx` | no | no | — | — | — | — |
| `src/pages/founder/PortfolioExitAssetDetail.tsx` | no | no | — | ma_portfolio_assets, ma_exit_targets, ma_buyer_matches, ma_investors, ma_competitor_profiles, ma_execution_targets, ma_data_room_items | — | — |
| `src/pages/founder/PortfolioExitCommandCentre.tsx` | no | no | — | ma_portfolio_assets, ma_buyer_matches, ma_execution_targets | — | — |
| `src/pages/founder/PortfolioExitControls.tsx` | no | yes | ma-intelligence-orchestrator | ma_lifecycle_transitions, ma_portfolio_assets, ma_ai_recommendations, ma_cost_entries, ma_budgets, ma_data_classifications, ma_backup_events, ma_prompt_versions, ma_alerts, ma_workload_capacity, ma_capital_allocation, ma_do_not_build_patterns | — | — |
| `src/pages/founder/PortfolioExitHardening.tsx` | no | yes | — | ma_acceptance_criteria, ma_data_quality_scores, ma_data_room_items, ma_reporting_packs, ma_incidents, ma_error_queue, ma_environment_mode, ma_backup_events, ma_strategic_assumptions | — | — |
| `src/pages/founder/PortfolioExitManual.tsx` | no | no | — | — | — | — |
| `src/pages/founder/PortfolioExitReleaseGate.tsx` | no | yes | — | ma_release_gate_checks, ma_integration_allowlist, ma_rate_cost_limits, ma_lockdown_controls, ma_privacy_records, ma_red_team_reviews | — | — |
| `src/pages/founder/PortfolioInvestorIntelligence.tsx` | no | no | — | ma_investors, ma_deals, ma_buyer_matches | — | — |
| `src/pages/founder/PortfolioOperatingPanels.tsx` | no | no | — | — | — | — |
| `src/pages/founder/pricing-margin/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/pricing-margin/Breakeven.tsx` | no | no | — | — | — | — |
| `src/pages/founder/pricing-margin/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/pricing-margin/Discounts.tsx` | no | no | — | — | — | — |
| `src/pages/founder/pricing-margin/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/pricing-margin/Products.tsx` | no | no | — | — | — | — |
| `src/pages/founder/pricing-margin/Recommendations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/priority/PriorityDashboard.tsx` | no | yes | — | priority_scores, system_tasks | — | — |
| `src/pages/founder/privacy/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/privacy/Breaches.tsx` | no | no | — | privacy_breach_events | — | — |
| `src/pages/founder/privacy/Consent.tsx` | no | no | — | consent_records | — | — |
| `src/pages/founder/privacy/DSAR.tsx` | no | no | — | privacy_requests | — | — |
| `src/pages/founder/privacy/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/privacy/Processors.tsx` | no | no | — | processor_register | — | — |
| `src/pages/founder/privacy/Retention.tsx` | no | no | — | data_retention_rules | — | — |
| `src/pages/founder/privacy/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/ProcessDetail.tsx` | no | yes | — | processes, process_steps, ai_agents, automation_workflows | — | — |
| `src/pages/founder/ProcessDirectory.tsx` | no | yes | — | processes | — | — |
| `src/pages/founder/product-catalogue/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product-catalogue/AddOns.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product-catalogue/Claims.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product-catalogue/Offers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product-catalogue/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product-catalogue/Packages.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product-catalogue/Pricing.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product-catalogue/Products.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product/Bugs.tsx` | no | no | — | product_bugs | — | — |
| `src/pages/founder/product/Features.tsx` | no | no | — | product_features | — | — |
| `src/pages/founder/product/KnownIssues.tsx` | no | no | — | product_bugs | — | — |
| `src/pages/founder/product/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/product/QA.tsx` | no | no | — | qa_checklists | — | — |
| `src/pages/founder/product/Releases.tsx` | no | no | — | release_records | — | — |
| `src/pages/founder/product/Rollback.tsx` | no | no | — | release_records | — | — |
| `src/pages/founder/ProposalDetail.tsx` | no | yes | — | proposals, activity_log | — | — |
| `src/pages/founder/proposals/DemosDashboard.tsx` | no | yes | — | demo_access, demo_events | — | — |
| `src/pages/founder/proposals/InternalProposalDetail.tsx` | no | yes | internal-proposal-send | internal_proposals, contacts, demo_access | accept_proposal_by_token | — |
| `src/pages/founder/proposals/InternalProposals.tsx` | no | no | internal-proposal-generate | internal_proposals, contacts, demo_access | — | — |
| `src/pages/founder/quarterly-production-machine/BuildPackValidator.tsx` | no | no | — | ma_build_candidates, portfolio_assets, funding_shortlist, funding_radar_companies, funding_problem_clusters, funding_market_maps | — | — |
| `src/pages/founder/quarterly-production-machine/LovablePack.tsx` | no | no | — | ma_build_candidates, portfolio_assets, funding_shortlist, funding_radar_companies, funding_problem_clusters, funding_market_maps | — | — |
| `src/pages/founder/quarterly-production-machine/ProductionPack.tsx` | no | no | — | ma_build_candidates, portfolio_assets, funding_shortlist, funding_radar_companies, funding_problem_clusters, funding_market_maps | — | — |
| `src/pages/founder/quarterly-production-machine/PromptQueue.tsx` | no | no | — | ma_build_candidates, portfolio_assets, funding_shortlist, funding_radar_companies, funding_problem_clusters, funding_market_maps | — | — |
| `src/pages/founder/quarterly-production-machine/VerticalLaunch.tsx` | no | no | — | ma_build_candidates, portfolio_assets, funding_shortlist, funding_radar_companies, funding_problem_clusters, funding_market_maps | — | — |
| `src/pages/founder/QuarterlyBuildSelector.tsx` | no | yes | — | ma_build_candidates, ma_weekly_signals, ma_companies, ma_competitor_profiles, ma_buyer_matches, ma_portfolio_assets | — | — |
| `src/pages/founder/QuarterlyProductionMachine.tsx` | no | no | — | funding_monthly_runs, ma_build_candidates, portfolio_assets, funding_shortlist, funding_radar_companies, funding_problem_clusters, funding_market_maps | — | — |
| `src/pages/founder/quote-to-cash/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/quote-to-cash/Invoices.tsx` | no | yes | — | qtc_invoices | — | — |
| `src/pages/founder/quote-to-cash/Overview.tsx` | no | no | — | qtc_quotes, qtc_proposals, qtc_invoices, qtc_payments, qtc_revenue_confirmations | — | — |
| `src/pages/founder/quote-to-cash/PaymentArchitectureReadiness.tsx` | no | no | stripe-config-status | qtc_payments, stripe_webhook_events, qtc_revenue_confirmations | — | — |
| `src/pages/founder/quote-to-cash/PaymentControlCentre.tsx` | no | no | stripe-config-status, qtc-mark-reconciled | qtc_payments, stripe_webhook_events | — | — |
| `src/pages/founder/quote-to-cash/Payments.tsx` | no | yes | — | qtc_payments | — | — |
| `src/pages/founder/quote-to-cash/Proposals.tsx` | no | yes | — | qtc_proposals | — | — |
| `src/pages/founder/quote-to-cash/Quotes.tsx` | no | yes | — | qtc_quotes | — | — |
| `src/pages/founder/quote-to-cash/RevenueConfirmation.tsx` | no | no | — | qtc_revenue_confirmations | — | — |
| `src/pages/founder/quote-to-cash/Settings.tsx` | no | no | stripe-config-status | — | — | — |
| `src/pages/founder/quote-to-cash/StripePriceMapping.tsx` | no | yes | — | customer_sales_offers, customer_sales_products | — | — |
| `src/pages/founder/reconciliation/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reconciliation/Bank.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reconciliation/Invoices.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reconciliation/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reconciliation/Payments.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reconciliation/Payouts.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reconciliation/Refunds.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reconciliation/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reconciliation/Unmatched.tsx` | no | no | — | — | — | — |
| `src/pages/founder/recovery/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/relationship-health/_board.tsx` | no | no | — | — | — | — |
| `src/pages/founder/relationship-health/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/relationship-health/Customers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/relationship-health/Opportunities.tsx` | no | no | — | — | — | — |
| `src/pages/founder/relationship-health/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/relationship-health/Partners.tsx` | no | no | — | — | — | — |
| `src/pages/founder/relationship-health/Risks.tsx` | no | no | — | — | — | — |
| `src/pages/founder/relationship-health/Sellers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/RelationshipIntelligence.tsx` | no | yes | — | relationship_intelligence_contacts, relationship_intelligence_events | — | — |
| `src/pages/founder/RelationshipIntelligenceImport.tsx` | no | no | ri-upsert-import | — | — | — |
| `src/pages/founder/reporting-truth/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reporting-truth/Conflicts.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reporting-truth/Definitions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reporting-truth/KpiDictionary.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reporting-truth/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reporting-truth/Reconciliation.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reporting-truth/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reports/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reports/Archive.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reports/Decisions.tsx` | no | no | — | founder_report_items | — | — |
| `src/pages/founder/reports/Monthly.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reports/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reports/Portfolio.tsx` | no | no | — | — | — | — |
| `src/pages/founder/reports/ReportList.tsx` | no | no | — | founder_reports, founder_report_items | — | — |
| `src/pages/founder/reports/Weekly.tsx` | no | no | — | — | — | — |
| `src/pages/founder/resource-allocation/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/resource-allocation/AIBudget.tsx` | no | no | — | — | — | — |
| `src/pages/founder/resource-allocation/Cash.tsx` | no | no | — | — | — | — |
| `src/pages/founder/resource-allocation/FounderAttention.tsx` | no | no | — | — | — | — |
| `src/pages/founder/resource-allocation/HumanTime.tsx` | no | no | — | — | — | — |
| `src/pages/founder/resource-allocation/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/resource-allocation/Recommendations.tsx` | no | no | — | — | — | — |
| `src/pages/founder/resource-allocation/TypePage.tsx` | no | no | — | — | — | — |
| `src/pages/founder/revenue-autopilot/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/revenue-autopilot/Approvals.tsx` | no | no | — | customer_sales_close_actions | — | — |
| `src/pages/founder/revenue-autopilot/Gaps.tsx` | no | no | — | — | — | — |
| `src/pages/founder/revenue-autopilot/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/revenue-autopilot/Targets.tsx` | no | no | — | sales_revenue_targets | — | — |
| `src/pages/founder/revenue-autopilot/Tasks.tsx` | no | yes | — | revenue_autopilot_tasks | — | — |
| `src/pages/founder/revenue-autopilot/Today.tsx` | no | no | — | — | — | — |
| `src/pages/founder/roles/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/roles/AccessRequests.tsx` | no | no | — | — | — | — |
| `src/pages/founder/roles/Audit.tsx` | no | no | — | — | — | — |
| `src/pages/founder/roles/Delegation.tsx` | no | no | — | master_work_items | — | — |
| `src/pages/founder/roles/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/roles/Permissions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/roles/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/roles/Users.tsx` | no | no | — | — | — | — |
| `src/pages/founder/runtime-mode/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/sales-coaching/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sales-coaching/Conversions.tsx` | no | no | — | sales_conversion_events | — | — |
| `src/pages/founder/sales-coaching/Dashboard.tsx` | no | no | — | sales_conversion_events, sales_win_loss_reviews, sales_script_performance | — | — |
| `src/pages/founder/sales-coaching/Objections.tsx` | no | no | — | sales_win_loss_reviews | — | — |
| `src/pages/founder/sales-coaching/Recommendations.tsx` | no | yes | — | sales_coaching_recommendations | — | — |
| `src/pages/founder/sales-coaching/Scripts.tsx` | no | no | — | sales_script_performance | — | — |
| `src/pages/founder/sales-coaching/WinsLosses.tsx` | no | no | — | sales_win_loss_reviews | — | — |
| `src/pages/founder/sales-targets/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sales-targets/ActivityPlan.tsx` | no | no | — | sales_revenue_targets | — | — |
| `src/pages/founder/sales-targets/BusinessTargets.tsx` | no | yes | — | sales_revenue_targets, sales_activity_targets | — | — |
| `src/pages/founder/sales-targets/Cockpit.tsx` | no | no | — | sales_revenue_targets, sales_activity_targets, sales_target_progress, customer_sales_close_actions, customer_sales_conversations, customer_sales_call_logs, customer_sales_follow_up_tasks | — | — |
| `src/pages/founder/sales-targets/Conversion.tsx` | no | no | — | customer_sales_conversations, customer_sales_call_logs, customer_sales_close_actions, leads | — | — |
| `src/pages/founder/sales-targets/Forecast.tsx` | no | no | — | sales_revenue_targets, customer_sales_close_actions | — | — |
| `src/pages/founder/sales-targets/Gaps.tsx` | no | no | — | sales_revenue_targets, sales_activity_targets, customer_sales_close_actions | — | — |
| `src/pages/founder/scheduled-jobs/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduled-jobs/Calendar.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduled-jobs/Failures.tsx` | no | yes | — | scheduled_job_failures | — | — |
| `src/pages/founder/scheduled-jobs/Jobs.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduled-jobs/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduled-jobs/Runs.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduled-jobs/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduling/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduling/Availability.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduling/Bookings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduling/NoShows.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduling/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduling/Resources.tsx` | no | no | — | — | — | — |
| `src/pages/founder/scheduling/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/_ResultList.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/All.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/Audit.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/Businesses.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/Communications.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/Customers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/Documents.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/search/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/security-vault/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/security-vault/BackupRestore.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/security-vault/BuildSnapshots.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/security-vault/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/security-vault/SecretsRegister.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/security-vault/SecurityAudit.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/SecurityDashboard.tsx` | no | yes | — | security_alerts, access_anomalies, risk_indicators, compliance_items, compliance_documents, security_events | — | — |
| `src/pages/founder/sending/SendingHealth.tsx` | no | no | — | inbox_health_summary, domain_usage_summary, blocked_sends_24h, warmup_progress, email_queue | — | — |
| `src/pages/founder/SendingInfrastructure.tsx` | no | no | — | smartlead_activation_checklist, inboxes | — | — |
| `src/pages/founder/SocialAutopilotPage.tsx` | no | no | social-autopilot-healthcheck | social_accounts, social_automation_settings | — | — |
| `src/pages/founder/SocialBrain.tsx` | no | no | — | — | — | — |
| `src/pages/founder/SocialRelationshipsPage.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sops/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sops/AgentUsage.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sops/Conflicts.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sops/Library.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sops/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sops/Reviews.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sops/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/sops/Versions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/StarterPackMaterialiser.tsx` | no | no | — | — | — | — |
| `src/pages/founder/StartHere.tsx` | no | no | — | — | — | — |
| `src/pages/founder/StartHereSetupBusiness.tsx` | no | no | — | — | — | — |
| `src/pages/founder/StrategyEngine.tsx` | no | yes | — | strategy_insights, system_templates, organisations, automation_workflows, launched_platforms | — | — |
| `src/pages/founder/suppliers/AssignmentsDashboard.tsx` | no | yes | — | assignments, suppliers, deals | eligible_suppliers_for_deal, founder_confirm_assignment, suggest_replacement_supplier | — |
| `src/pages/founder/suppliers/SupplierDetail.tsx` | no | yes | — | suppliers, supplier_pipeline, supplier_availability, assignments, supplier_users | — | — |
| `src/pages/founder/suppliers/SuppliersDashboard.tsx` | no | yes | — | suppliers, supplier_availability, assignments | supplier_portal_stats | — |
| `src/pages/founder/support-tickets/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/support-tickets/Escalations.tsx` | no | no | — | support_tickets | — | — |
| `src/pages/founder/support-tickets/Knowledge.tsx` | no | no | — | support_knowledge_articles | — | — |
| `src/pages/founder/support-tickets/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/support-tickets/Queue.tsx` | no | no | — | support_tickets | — | — |
| `src/pages/founder/support-tickets/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/support-tickets/SLA.tsx` | no | no | — | support_tickets, support_sla_policies | — | — |
| `src/pages/founder/SupportHub.tsx` | no | no | — | — | — | — |
| `src/pages/founder/SupportKnowledgeAgent.tsx` | no | no | — | — | — | — |
| `src/pages/founder/system-config/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/system-config/Audit.tsx` | no | no | — | — | — | — |
| `src/pages/founder/system-config/BusinessOverrides.tsx` | no | no | — | — | — | — |
| `src/pages/founder/system-config/ExternalActions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/system-config/FeatureFlags.tsx` | no | no | — | — | — | — |
| `src/pages/founder/system-config/Modules.tsx` | no | no | — | — | — | — |
| `src/pages/founder/system-config/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/system-health/Overview.tsx` | yes | no | — | — | — | — |
| `src/pages/founder/system/ExecutionModes.tsx` | no | yes | — | system_execution_modes, system_feature_flags, businesses | — | — |
| `src/pages/founder/system/SystemDashboard.tsx` | no | no | — | system_health_score, system_events, retry_queue | detect_anomalies | — |
| `src/pages/founder/system/SystemEvents.tsx` | no | yes | — | system_events | — | — |
| `src/pages/founder/system/SystemHealth.tsx` | no | no | — | system_health | — | — |
| `src/pages/founder/TemplateDetail.tsx` | no | yes | — | system_templates, template_components | — | — |
| `src/pages/founder/TemplateDirectory.tsx` | no | yes | — | system_templates, architectures | — | — |
| `src/pages/founder/trust-safety/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/trust-safety/Accounts.tsx` | no | no | — | — | — | — |
| `src/pages/founder/trust-safety/Actions.tsx` | no | no | — | — | — | — |
| `src/pages/founder/trust-safety/Messages.tsx` | no | no | — | — | — | — |
| `src/pages/founder/trust-safety/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/trust-safety/Payments.tsx` | no | no | — | — | — | — |
| `src/pages/founder/trust-safety/RiskEvents.tsx` | no | no | — | — | — | — |
| `src/pages/founder/trust-safety/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/UserManualPage.tsx` | no | no | — | — | — | — |
| `src/pages/founder/vendors/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/vendors/Access.tsx` | no | no | — | vendor_access_records | — | — |
| `src/pages/founder/vendors/Contracts.tsx` | no | no | — | vendors | — | — |
| `src/pages/founder/vendors/Costs.tsx` | no | no | — | vendor_subscriptions | — | — |
| `src/pages/founder/vendors/Overview.tsx` | no | no | — | vendors | — | — |
| `src/pages/founder/vendors/Renewals.tsx` | no | no | — | vendor_subscriptions | — | — |
| `src/pages/founder/vendors/Risk.tsx` | no | no | — | vendor_risk_reviews, vendors | — | — |
| `src/pages/founder/vendors/Saas.tsx` | no | no | — | vendor_subscriptions | — | — |
| `src/pages/founder/VideoLibrary.tsx` | no | yes | vid-privacy-scan, vid-ingest-transcript, vid-search, vid-ask | video_library_items, video_library_training_assignments, video_library_audit_events | recompute_video_buyer_handover_ready | — |
| `src/pages/founder/VideoSopFactory.tsx` | no | yes | video-sop-generate-script | video_sop_assets, video_sop_scripts, video_sop_links, video_sop_training_assignments, businesses, video_sop_audit_events | — | — |
| `src/pages/founder/webhooks/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/webhooks/Failures.tsx` | no | no | — | — | — | — |
| `src/pages/founder/webhooks/Inbox.tsx` | no | no | — | — | — | — |
| `src/pages/founder/webhooks/NormalisedEvents.tsx` | no | no | — | — | — | — |
| `src/pages/founder/webhooks/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/webhooks/Providers.tsx` | no | no | — | — | — | — |
| `src/pages/founder/webhooks/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/wind-down/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/wind-down/Archive.tsx` | no | no | — | — | — | — |
| `src/pages/founder/wind-down/ClosureChecklist.tsx` | no | no | — | — | — | — |
| `src/pages/founder/wind-down/CustomerOffboarding.tsx` | no | no | — | — | — | — |
| `src/pages/founder/wind-down/DataRetention.tsx` | no | no | — | — | — | — |
| `src/pages/founder/wind-down/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/wind-down/Pause.tsx` | no | no | — | — | — | — |
| `src/pages/founder/wind-down/VendorCancellation.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/_shared.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/Approvals.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/Blocked.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/ByAgent.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/ByBusiness.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/HighValue.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/Overdue.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/Overview.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/Settings.tsx` | no | no | — | — | — | — |
| `src/pages/founder/work-queue/Today.tsx` | no | no | — | — | — | — |
| `src/pages/founder/WorkerHelpAudit.tsx` | yes | yes | — | worker_help_requests, worker_profiles | — | — |
| `src/pages/founder/WorkerManuals.tsx` | yes | yes | — | worker_manuals, worker_manual_sections | — | — |
| `src/pages/founder/WorkflowDetail.tsx` | no | yes | — | automation_workflows, workflow_steps, ai_agents, workflow_activity_logs, workflow_alerts | — | — |
| `src/pages/founder/WorkflowDirectory.tsx` | no | yes | — | automation_workflows, monitored_systems, workflow_alerts | — | — |
| `src/pages/Index.tsx` | no | no | — | — | — | — |
| `src/pages/Industries.tsx` | no | no | — | — | — | — |
| `src/pages/legal/AcceptableUse.tsx` | no | no | — | — | — | — |
| `src/pages/legal/AIOutputDisclaimer.tsx` | no | no | — | — | — | — |
| `src/pages/legal/AIUsagePolicy.tsx` | no | no | — | — | — | — |
| `src/pages/legal/AutomationLiabilityDisclaimer.tsx` | no | no | — | — | — | — |
| `src/pages/legal/AutomationSafetyPolicy.tsx` | no | no | — | — | — | — |
| `src/pages/legal/CookiePolicy.tsx` | no | no | — | — | — | — |
| `src/pages/legal/DataProcessingAgreement.tsx` | no | no | — | — | — | — |
| `src/pages/legal/EnterpriseServicesAgreement.tsx` | no | no | — | — | — | — |
| `src/pages/legal/LegalHub.tsx` | no | no | — | — | — | — |
| `src/pages/legal/LegalPagePlaceholder.tsx` | no | no | — | — | — | — |
| `src/pages/legal/PrivacyPolicy.tsx` | no | no | — | — | — | — |
| `src/pages/legal/SecurityPolicy.tsx` | no | no | — | — | — | — |
| `src/pages/legal/SecurityReporting.tsx` | no | no | — | — | — | — |
| `src/pages/legal/TermsOfService.tsx` | no | no | — | — | — | — |
| `src/pages/Method.tsx` | no | no | — | — | — | — |
| `src/pages/NotFound.tsx` | no | no | — | — | — | — |
| `src/pages/partner/PartnerDashboard.tsx` | no | no | — | profiles, partner_opportunities, partner_messages | — | — |
| `src/pages/partner/PartnerDocuments.tsx` | no | no | — | profiles, partner_opportunities, partner_documents | — | — |
| `src/pages/partner/PartnerMessages.tsx` | no | no | — | profiles, partner_opportunities, partner_messages | — | — |
| `src/pages/partner/PartnerOpportunities.tsx` | no | yes | — | profiles, partner_opportunities | — | — |
| `src/pages/partner/PartnerOpportunityDetail.tsx` | no | yes | — | partner_opportunities, partner_messages, partner_documents | — | — |
| `src/pages/partner/PartnerProjectDetail.tsx` | no | no | — | projects, project_stages, project_milestones, project_updates | — | — |
| `src/pages/partner/PartnerProjects.tsx` | no | no | — | profiles, partner_opportunities | — | — |
| `src/pages/PartnerProgram.tsx` | no | yes | — | partner_applications | — | — |
| `src/pages/Platform.tsx` | no | no | — | — | — | — |
| `src/pages/portal/_PortalPlaceholder.tsx` | no | no | — | — | — | — |
| `src/pages/portal/Adviser.tsx` | no | no | — | — | — | — |
| `src/pages/portal/ClientAnalytics.tsx` | no | no | — | profiles, monitored_systems, workflow_executions, ai_agents, automation_workflows | — | — |
| `src/pages/portal/ClientControlPanel.tsx` | no | no | — | profiles, monitored_systems, ai_agents, automation_workflows, workflow_executions, system_alerts | — | — |
| `src/pages/portal/ClientOptimisation.tsx` | no | no | — | profiles, monitored_systems, optimisation_insights, automation_workflows, ai_agents | — | — |
| `src/pages/portal/ClientSystemDetail.tsx` | no | no | — | monitored_systems, ai_agents, automation_workflows, workflow_executions, system_alerts, agent_activity_logs, project_documents | — | — |
| `src/pages/portal/ClientSystemMonitoring.tsx` | no | no | — | profiles, monitored_systems, automation_workflows, ai_agents, system_alerts | — | — |
| `src/pages/portal/Customer.tsx` | no | no | — | — | — | — |
| `src/pages/portal/Dashboard.tsx` | no | no | — | profiles, projects, project_updates | — | — |
| `src/pages/portal/Documents.tsx` | no | no | — | project_documents | — | — |
| `src/pages/portal/FeatureRequests.tsx` | no | yes | — | profiles, subscriptions, feature_requests | — | — |
| `src/pages/portal/ForgotPassword.tsx` | no | no | — | — | — | — |
| `src/pages/portal/MaintenanceDashboard.tsx` | no | no | — | profiles, subscriptions, system_status, maintenance_events, update_logs, support_requests | — | — |
| `src/pages/portal/MaintenanceSchedule.tsx` | no | no | — | profiles, subscriptions, maintenance_events | — | — |
| `src/pages/portal/MaintenanceUpdates.tsx` | no | no | — | profiles, subscriptions, update_logs | — | — |
| `src/pages/portal/Messages.tsx` | no | yes | — | projects, project_messages | — | — |
| `src/pages/portal/Partner.tsx` | no | no | — | — | — | — |
| `src/pages/portal/PortalLogin.tsx` | no | no | — | — | — | — |
| `src/pages/portal/PortalSignup.tsx` | no | yes | — | user_legal_acceptance | — | — |
| `src/pages/portal/ProjectDetail.tsx` | no | no | — | projects, project_stages, project_milestones, project_updates | — | — |
| `src/pages/portal/Projects.tsx` | no | no | — | projects | — | — |
| `src/pages/portal/ResetPassword.tsx` | no | no | — | — | — | — |
| `src/pages/portal/Seller.tsx` | no | no | — | — | — | — |
| `src/pages/portal/Support.tsx` | no | yes | — | projects, support_requests | — | — |
| `src/pages/portal/Upload.tsx` | no | no | — | — | — | — |
| `src/pages/ProjectDiscovery.tsx` | no | no | — | — | — | — |
| `src/pages/public/CustomerOnboardingView.tsx` | yes | no | — | customer_onboarding_plans, customer_onboarding_tasks | — | — |
| `src/pages/public/CustomerReportView.tsx` | yes | no | — | — | get_customer_quarterly_report_by_token | — |
| `src/pages/public/PublicDemo.tsx` | no | no | — | — | log_demo_event | — |
| `src/pages/public/PublicProposalAccept.tsx` | no | no | — | — | accept_proposal_by_token | — |
| `src/pages/public/PublicProposalView.tsx` | no | no | — | demo_access | get_proposal_by_token | — |
| `src/pages/public/SurveyResponse.tsx` | yes | yes | — | customer_survey_templates, businesses, customer_survey_responses, customer_survey_requests | get_customer_survey_request_by_token | — |
| `src/pages/supplier/SupplierAssignments.tsx` | no | no | — | — | supplier_list_assignments, supplier_update_assignment_status | — |
| `src/pages/supplier/SupplierDashboard.tsx` | no | no | — | — | supplier_list_assignments | — |
| `src/pages/supplier/SupplierLogin.tsx` | no | no | — | — | supplier_login_with_token | — |
| `src/pages/Systems.tsx` | no | no | — | — | — | — |
| `src/pages/WhatWeBuild.tsx` | no | no | — | — | — | — |
| `src/pages/worker/OperatorLogin.tsx` | yes | no | — | — | — | — |
| `src/pages/worker/OperatorPortal.tsx` | yes | yes | — | worker_tasks, worker_task_logs, worker_evidence_uploads | — | — |
| `src/pages/worker/OversightLogin.tsx` | yes | no | — | — | — | — |
| `src/pages/worker/OversightPortal.tsx` | yes | yes | — | worker_task_logs, worker_evidence_uploads, worker_oversight_reviews, worker_tasks | — | — |
| `src/pages/worker/WorkerLogin.tsx` | no | no | — | user_roles | — | — |
