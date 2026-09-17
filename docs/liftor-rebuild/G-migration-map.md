# Appendix G — Migration Map

_Generated from commit `aa39057614a670f1b8c64d2990c95e1f622074b9` by `scripts/generate-rebuild-manual-catalogs.mjs`. Regenerate with `node scripts/generate-rebuild-manual-catalogs.mjs`._

**Total migrations: 442.** Applying them in filename order against a blank Postgres/Supabase database reproduces the current schema. Each row lists the objects the migration creates or alters, extracted from its DDL.

| # | Migration | Creates tables | Creates views | Creates functions | Policies | Enables RLS | Drops |
|---|---|---|---|---|---|---|---|
| 1 | `20260311142429_021611c7-5530-4133-a59e-6311e398fd2e.sql` | proposals | — | update_updated_at_column | 2 | 1 | — |
| 2 | `20260311142759_b6e5b233-a24b-4cfd-8fbe-2da5a78cb1c3.sql` | profiles, projects, project_stages, project_milestones, project_updates, project_documents, project_messages, support_requests | — | handle_new_user | 13 | 8 | — |
| 3 | `20260311143209_9deab577-ba50-4e20-901a-ca337ee65acd.sql` | user_roles, activity_log | — | has_role, log_new_proposal, log_new_support_request | 23 | 2 | policy |
| 4 | `20260311143840_fdf86e6e-4314-4a78-b90f-918352a78a9e.sql` | — | — | — | — | — | — |
| 5 | `20260311143905_0d9e6f27-acad-4bbd-855c-766364116353.sql` | partner_applications, partner_opportunities, partner_messages, partner_documents | — | log_new_opportunity | 21 | 4 | — |
| 6 | `20260311144236_f321a38d-3984-48c3-bafd-293c97b51c88.sql` | subscriptions, system_status, maintenance_events, update_logs, feature_requests | — | — | 11 | 5 | — |
| 7 | `20260311144505_a4e30797-5611-49fa-864f-feb385154a2d.sql` | monitored_systems, automation_workflows, ai_agents, system_alerts | — | — | 8 | 4 | — |
| 8 | `20260311144819_f3c40b0a-2e66-4239-8c77-9e6a22f3d349.sql` | agent_system_assignments, agent_activity_logs, agent_task_stats, agent_alerts | — | — | 8 | 4 | — |
| 9 | `20260311145044_d097cb98-8502-447c-8d29-36041330a28d.sql` | workflow_steps, workflow_activity_logs, workflow_alerts | — | — | 6 | 3 | — |
| 10 | `20260311145322_a8941732-bfab-42b2-abfd-dfc275d3255c.sql` | integrations, integration_linked_systems, integration_activity_logs, integration_alerts | — | — | 4 | 4 | — |
| 11 | `20260311145544_809e2efc-fb21-4958-bf66-9d2ecc7b5220.sql` | workflow_executions, execution_steps, execution_logs | — | — | 6 | 3 | — |
| 12 | `20260311150018_8e66294f-4735-4507-861e-53ac4e5aebfb.sql` | processes, process_steps, process_documents | — | — | 3 | 3 | — |
| 13 | `20260311150227_9183a4cd-32ab-4cf3-a64d-d47d98222de3.sql` | architectures, architecture_components, architecture_relationships | — | — | 3 | 3 | — |
| 14 | `20260311150445_549dbbc7-e94a-42a3-a4e5-32329e26c88c.sql` | deployments, deployment_stages, deployment_checklist, deployment_logs | — | — | 4 | 4 | — |
| 15 | `20260311151133_70a466b8-1e31-4f2c-a43b-d60de0f1c49e.sql` | optimisation_insights | — | — | 2 | 1 | — |
| 16 | `20260311151355_61ee70de-171e-408c-8ca5-b4628d023a00.sql` | knowledge_entries, knowledge_documents | — | — | 5 | 2 | — |
| 17 | `20260311151809_e188218c-0a19-464d-b9cf-3871426bdcde.sql` | organisations, organisation_members, organisation_documents | — | — | 6 | 3 | — |
| 18 | `20260311152042_0e004833-758c-4bb1-b7df-0f0d9c1ea76b.sql` | platform_roles, role_permissions, user_platform_roles, access_audit_log | — | — | 7 | 4 | — |
| 19 | `20260311152300_73fa4db0-9ebc-4819-87a5-075abefc742d.sql` | security_alerts, access_anomalies, risk_indicators, compliance_items, compliance_documents, security_events | — | — | 7 | 6 | — |
| 20 | `20260311152511_ad78bf99-610f-48c8-8dca-a05844c21bfc.sql` | system_templates, template_components | — | — | 2 | 2 | — |
| 21 | `20260311152713_1f52eb3d-fe8e-41e9-9a09-7a53ae5b9253.sql` | launched_platforms, launch_checklist | — | — | 2 | 2 | — |
| 22 | `20260311152941_a612f060-6f0f-4598-8625-3ecc49d47c24.sql` | manual_pages, manual_versions, build_log_entries | — | — | 4 | 3 | — |
| 23 | `20260311153236_eb3d9608-2b94-409c-94b5-6520686cd766.sql` | revenue_records, partner_deals | — | — | 2 | 2 | — |
| 24 | `20260311153505_5da06fbc-4066-441b-bc10-bfd5115dbb77.sql` | brain_insights, brain_learning_records, brain_recommendations | — | — | 3 | 3 | — |
| 25 | `20260311153722_66c0a7aa-c467-4be4-a03e-44c3dff1c62d.sql` | decision_recommendations | — | — | 1 | 1 | — |
| 26 | `20260311153907_92dac8c0-175b-4420-b37d-f490ce8cfa66.sql` | strategy_insights | — | — | 1 | 1 | — |
| 27 | `20260312101632_36bb03fb-13b9-4b0a-91cc-851684bc9c1d.sql` | platform_test_runs, platform_test_results | — | — | 2 | 2 | — |
| 28 | `20260312111015_e4bb8b59-b807-48a4-b0ae-1a690e0998b2.sql` | legal_document_versions, user_legal_acceptance | — | — | 5 | 2 | — |
| 29 | `20260312111538_e0f2f9fe-23ad-418c-966b-09e88b15e554.sql` | platform_diagnostic_runs | — | — | 1 | 1 | — |
| 30 | `20260312145406_f785be21-923e-4f06-a666-8b97f4ebcff4.sql` | — | — | — | — | — | — |
| 31 | `20260312145736_45badbef-768f-41cc-8bcf-d158df70680d.sql` | — | — | — | — | — | — |
| 32 | `20260312150505_5c49e4f6-28ab-45f7-805f-c65486424253.sql` | proposal_rate_limits | — | — | 2 | 1 | — |
| 33 | `20260420103233_3622870f-d246-4c7e-bb2b-29277aae7b27.sql` | — | — | — | — | — | — |
| 34 | `20260420105944_f8247595-7646-47e0-a009-bbd1048952c4.sql` | inboxes, contacts, communications, email_events | — | handle_new_communication, handle_email_bounce, expire_inactive_conversations, check_outreach_allowed, upsert_contact | 4 | 4 | — |
| 35 | `20260420110522_7e20be29-8174-48ad-837a-f4385794caea.sql` | — | — | check_outreach_allowed | — | — | — |
| 36 | `20260420111056_f76d94ca-4540-4cb2-ab4b-c4248676a3c1.sql` | revenue_targets, deals, invoices, payments, payment_events | — | generate_invoice_number, handle_deal_won, handle_payment_received, finance_mark_overdue_invoices, finance_target_vs_actual | 5 | 5 | — |
| 37 | `20260420111812_60b61ad2-5bfd-4d14-9a65-cb1797f08572.sql` | — | — | set_invoice_expected_amount, stamp_business_name_from_invoice, handle_payment_received, handle_deal_won, finance_mark_overdue_invoices | — | — | — |
| 38 | `20260420112147_b148fe88-375e-4e94-8d37-e2951c663f31.sql` | import_batches, imported_leads, lead_scores, outreach_campaigns, outreach_sequences, email_queue, campaign_metrics | — | score_contact, assign_inbox_for_contact, bump_inbox_send_count, reset_inbox_send_counts, recompute_campaign_metrics | 7 | 7 | policy |
| 39 | `20260420112733_46d3a0de-fd02-4a85-9f63-bed7957696e3.sql` | — | — | guard_email_queue_single_campaign, cancel_queue_on_reply, cancel_queue_on_inbound_comm | — | — | — |
| 40 | `20260420113125_b32fd716-0c1d-4038-a963-680c6dd1bc31.sql` | conversations, messages, ai_actions | — | mirror_comm_to_messages_and_invoke_ai, ai_actions_today | 3 | 3 | policy |
| 41 | `20260420113718_32275b2a-24d6-4f20-ae74-00ba8bbc7882.sql` | — | — | — | — | — | — |
| 42 | `20260420114416_66882545-e885-4745-9d41-0897f0072561.sql` | internal_proposals, internal_proposal_versions, demo_access, demo_events | — | expire_demos, get_proposal_by_token, accept_proposal_by_token, log_demo_event | 4 | 4 | — |
| 43 | `20260420115111_639738a0-1a91-4ae9-a544-d9efc6cb89a8.sql` | — | — | set_proposal_followup_due, proposals_needing_followup, recompute_proposal_score, trg_recompute_score_on_demo_event, log_demo_event | — | — | — |
| 44 | `20260420115249_26c66052-78b0-4315-80e5-6222db7e5fc7.sql` | — | — | — | — | — | — |
| 45 | `20260420120047_8081d501-b430-47ec-9d31-1fd2c09b849c.sql` | suppliers, supplier_pipeline, supplier_availability, assignments | — | guard_assignment_supplier_approved, seed_supplier_records, handle_supplier_status_change, sync_supplier_availability_from_assignment, handle_availability_override_change | 4 | 4 | — |
| 46 | `20260420120858_54495278-bf2d-4152-b086-6a46bc262161.sql` | supplier_users | — | supplier_login_with_token, supplier_list_assignments, supplier_update_assignment_status, supplier_portal_stats | 1 | 1 | — |
| 47 | `20260420121413_fbdef89f-112a-41e5-a0da-543293a75de1.sql` | — | — | compute_assignment_sla, set_assignment_sla, refresh_all_assignment_sla, sync_supplier_availability_from_assignment, eligible_suppliers_for_deal | — | — | — |
| 48 | `20260420121824_5944c0f8-b670-405b-be01-a1b0ddb4879e.sql` | — | — | supplier_update_assignment_status, supplier_login_with_token, flag_idle_assignments, recompute_supplier_score, recompute_all_supplier_scores | — | — | — |
| 49 | `20260420122318_ed201cf4-b694-483e-94a0-a0f112c30d36.sql` | compliance_rules, compliance_events, jurisdiction_profiles, contract_templates, compliance_scores | — | severity_weight, recompute_compliance_score, log_compliance_event, compliance_check_outbound_communication, compliance_check_contact | 5 | 5 | — |
| 50 | `20260420123115_03273589-53e5-499d-b205-4be97e6de535.sql` | business_risk_scores | — | recompute_compliance_score, recompute_business_risk_score, refresh_all_business_risk_scores, bump_rule_hit_count, stamp_compliance_event_resolution | 1 | 1 | policy |
| 51 | `20260420123135_08b0b788-e1b9-45b0-a574-8367a651eb7c.sql` | — | — | bump_rule_hit_count, stamp_compliance_event_resolution | — | — | — |
| 52 | `20260420123829_3b971c53-3b9d-4491-9630-98924f52ba53.sql` | priority_scores, system_tasks | high_priority_contacts, high_priority_deals, at_risk_assignments, hot_conversations | priority_level_from_score, compliance_score_for, priority_score_deal, priority_score_assignment, priority_score_contact | 2 | 2 | policy |
| 53 | `20260420123850_5a99277b-8148-495e-8f37-dbdc3e687ab3.sql` | — | — | trg_priority_deal, trg_priority_from_compliance | — | — | — |
| 54 | `20260420130345_e8e1289b-dce0-49a6-95a8-b7ccff3eba46.sql` | send_windows, sending_domains, reputation_events | inbox_health_summary, domain_usage_summary, blocked_sends_24h, warmup_progress | country_to_timezone, resolve_contact_timezone, inbox_warmup_limit, domain_for_inbox, next_valid_send_time | 3 | 3 | policy, view |
| 55 | `20260420130403_272bf6df-3872-46e6-8204-a57acadb8bcf.sql` | — | — | — | — | — | — |
| 56 | `20260420130837_e98e4418-45e6-4493-acb9-5b0cb7db9161.sql` | — | — | recompute_domain_reputation, sync_domain_reputation_on_inbox_change, pick_inbox_for_business, mark_send_failure, check_send_throttle | — | — | — |
| 57 | `20260420131220_d274f287-c51e-46cc-a6dc-b9f699e37005.sql` | system_events, retry_queue, system_health | system_health_score | log_system_event, detect_anomalies, auto_resolve_system_events, process_retry_queue, compute_system_health | 7 | 3 | — |
| 58 | `20260420131255_8727c71d-7404-4bc5-ad38-a0b9b6c258bb.sql` | — | system_health_score | — | 5 | — | view, policy |
| 59 | `20260420133427_834ba481-c00b-4221-b854-c6f6a2db88b3.sql` | — | — | — | — | — | — |
| 60 | `20260420133552_4a6b3939-bcc4-4480-9045-448da24c0100.sql` | — | — | resolve_entity_country, compliance_check_contact, compliance_check_outbound_communication, handle_deal_won, priority_score_deal | — | — | — |
| 61 | `20260420133628_aec9c6aa-ba5a-4550-a0c9-b65500de03d3.sql` | — | — | auto_resolve_system_events | — | — | — |
| 62 | `20260420134353_b5472060-790c-4b7c-93d5-a8dc5376ccb0.sql` | system_settings | — | get_system_mode, recompute_inbox_performance, recompute_all_inbox_performance, pick_inbox_for_business, enrich_contact | 2 | 1 | policy |
| 63 | `20260420134423_874a8cce-115b-438e-a682-8e7903f4dd84.sql` | — | — | evaluate_ai_reply | — | — | — |
| 64 | `20260420135510_1fae3eb7-4f89-42c0-95bc-f82b214972d4.sql` | — | — | — | — | — | — |
| 65 | `20260420135743_ffe41b5a-5e37-4f1a-bf47-f71ea4d1b10a.sql` | — | — | compute_system_health | — | — | function |
| 66 | `20260420140407_71bb89ca-4458-43bb-99e2-acd9f488dfb2.sql` | system_content, system_pages_index, system_backend_objects, system_workflows_full, system_workflow_steps, system_rules, system_integrations_full, system_data_flows _(+3)_ | — | record_system_change, rebuild_full_manual, validate_full_system_coverage | 12 | 11 | policy |
| 67 | `20260420140434_fa644b8e-807f-44ff-86ce-5175cd673987.sql` | — | — | record_system_change | 1 | — | policy |
| 68 | `20260420141146_88025a21-9e2f-4e45-9390-295252d5c3fc.sql` | system_version_diffs | — | compare_system_versions, validate_runtime_vs_documentation, detect_orphan_content, export_full_system_snapshot, validate_full_system_coverage | 2 | 1 | policy, table, function |
| 69 | `20260420162318_768b2cb2-0ebe-49d6-bd83-37b1e12f646e.sql` | domain_protection_alerts | high_intent_review_queue | get_system_mode, set_system_mode, validate_inbox_mapping, enforce_inbox_ramp, run_domain_protection_check | 2 | 1 | policy |
| 70 | `20260421115937_77b6d290-c307-4857-80ff-392ae697fcf4.sql` | system_execution_modes, system_feature_flags, if, businesses | — | get_active_execution_mode, is_feature_enabled, log_feature_skip, handle_deal_won, guard_deal_creation | 6 | 3 | — |
| 71 | `20260421120450_589a710a-c9a5-4827-9dc2-6517fae4c9dc.sql` | — | — | try_auto_assign_supplier_on_deal_won, guard_deal_creation, guard_proposal_creation, guard_demo_creation, guard_assignment_creation | — | — | — |
| 72 | `20260421120556_74f21aff-e3cd-4742-9fb0-bc564a81749d.sql` | — | — | handle_deal_won | — | — | — |
| 73 | `20260421121044_4b0fcb6e-bcef-4ef9-b7d6-80ac93ca7ae2.sql` | — | — | — | — | — | — |
| 74 | `20260430145815_ff389db2-84a6-4ae8-9d26-6d250e1c05ca.sql` | — | — | get_outbound_status, set_system_mode | — | — | — |
| 75 | `20260430145831_4b8692d8-5901-48ae-93b8-84cad18bbfb8.sql` | — | — | — | — | — | — |
| 76 | `20260430184750_b3b7968b-d178-4421-ac07-aab34d9cbb55.sql` | inbox_credentials | inbox_credentials_public | save_inbox_credentials, get_inbox_credentials_for_send, record_inbox_test_send, inbox_is_live_ready | — | 1 | — |
| 77 | `20260430184813_b7db527a-1584-4ebf-af73-896d0c8dbc12.sql` | — | — | list_inbox_credentials_public | — | — | view |
| 78 | `20260430185008_f02b8d3e-8615-4adf-810e-45599c1ebe7f.sql` | — | — | activate_outreach_campaign | — | — | — |
| 79 | `20260430191414_9fc031fd-ce7d-4474-a1de-b17d958d0a52.sql` | — | — | save_inbox_credentials, get_inbox_credentials_for_send | — | — | — |
| 80 | `20260430191854_b5a8b762-7509-4b18-aff1-10e86b72c46f.sql` | — | — | — | — | — | — |
| 81 | `20260430194010_ff00c7d4-8dee-407c-922f-a7cab4ba27d0.sql` | inbound_messages, ai_drafts | — | save_inbox_inbound_config, get_inbox_imap_credentials, record_inbound_poll, list_inbox_credentials_public | 2 | 2 | policy, function |
| 82 | `20260430210523_2297bb07-bb94-4303-953f-ce4159b63b80.sql` | — | — | — | — | — | — |
| 83 | `20260430210633_78830472-59e8-4613-bb95-af14aad4297b.sql` | — | — | — | — | — | — |
| 84 | `20260430214923_b86c5e10-b63e-4637-aeb1-f53d8f3e1292.sql` | — | — | has_live_ready_inbox, get_business_outbound_status, activate_outreach_campaign | — | — | — |
| 85 | `20260430215059_e79377a8-ec96-4d30-a93d-e01c59a82e20.sql` | — | — | activate_outreach_campaign | — | — | — |
| 86 | `20260430215413_77db8612-3d2d-420d-8c4a-ea3e94e1697e.sql` | — | — | validate_campaign_activation | — | — | — |
| 87 | `20260501091242_95a9b2fc-db24-4068-abf0-582eb1c1fce9.sql` | — | — | — | — | — | — |
| 88 | `20260501091548_ebd6a00a-556c-4d7a-a6ef-ead5cbb2c579.sql` | — | — | — | — | — | — |
| 89 | `20260501095941_1829d648-b9dd-4219-a1bc-68fb351dc304.sql` | business_contact_relationships, apollo_connections, apollo_sync_segments, apollo_sync_runs, apollo_leads | — | guard_bcr_global_suppression, apollo_encrypt_key, apollo_decrypt_key | 5 | 5 | — |
| 90 | `20260501100815_0327fd79-dc8d-4579-9171-555841269caa.sql` | — | — | — | — | — | — |
| 91 | `20260501100838_1b6de048-204b-4ca0-a4f9-19996db069f4.sql` | — | — | apollo_encrypt_key, apollo_decrypt_key | — | — | — |
| 92 | `20260501110652_86b2bb52-c940-4dbe-b9f8-9f4a39a12837.sql` | — | — | — | — | — | — |
| 93 | `20260501112133_b3ef139b-fd10-402c-895e-5f970f3b6a5f.sql` | apollo_automation_runs | — | — | 1 | 1 | — |
| 94 | `20260501124151_f2e988de-c5e9-49cd-bcab-1bf33d5ea28d.sql` | — | — | — | — | — | — |
| 95 | `20260501132545_a7dc58b8-387f-4764-9b41-16c5e12b65ec.sql` | — | — | check_outreach_allowed | — | — | — |
| 96 | `20260501133631_67c6e73b-af0e-47f4-937d-d842b710be1b.sql` | cleanup_archive, cleanup_audit_log | — | — | 2 | 2 | policy |
| 97 | `20260501134912_56d70d72-96f8-4a0f-b461-cb4f59879e04.sql` | — | — | inbox_set_provider_blocked | — | — | — |
| 98 | `20260512122319_9b6feedf-ebe5-476c-8ae2-8036d1d9c444.sql` | — | — | — | — | — | — |
| 99 | `20260512133513_3dcd79f5-7a01-464a-960a-48545632b039.sql` | — | — | get_system_mode, set_system_mode, get_outbound_status, get_business_outbound_status | — | — | — |
| 100 | `20260512141222_94cad2b0-bb6c-45fc-b84c-dbe1bddac0fa.sql` | lead_quality_profiles | apollo_raw_leads, lead_quality_overview | — | 1 | 1 | — |
| 101 | `20260512141309_d6a0a141-2347-422f-9e97-cfc98fa887f1.sql` | — | — | — | — | — | — |
| 102 | `20260512142525_0acc4efa-84d1-4bae-8a75-fcb950476408.sql` | — | cadence_status | — | — | — | view |
| 103 | `20260512143218_83c19ec0-9baf-487a-ac37-49e253c9d1c1.sql` | — | — | validate_full_system_coverage | — | — | — |
| 104 | `20260512143555_a7a1b6c4-2141-414a-a55d-79390ad95a14.sql` | internal_email_identities | command_centre_active_inboxes | is_internal_email | 4 | 1 | policy, view |
| 105 | `20260512143634_49ca5039-180f-4e7c-8cfd-7026cc5f2f0e.sql` | — | — | — | — | — | — |
| 106 | `20260512163444_11e1ecc3-8687-4ca3-a089-fd4a12fda5e0.sql` | — | — | — | — | — | — |
| 107 | `20260512172811_220f14d7-040f-4893-bc4c-0cef003e9561.sql` | — | proposal_crm_reconciliation, crm_spine_summary | is_internal_identity, resolve_contact_by_email, proposals_reconcile_crm | — | — | — |
| 108 | `20260512182613_dcc9b34e-3eb2-4230-8d6d-7c4e45c9701f.sql` | business_sourcing_briefs | — | — | 1 | 1 | — |
| 109 | `20260512183551_dff89ec5-40cf-45bc-b445-82826d7bf67f.sql` | — | lead_lifecycle_summary | — | — | — | — |
| 110 | `20260512184621_555bab2d-cad5-45df-a209-6ceb12a3f9e3.sql` | — | lead_lifecycle_summary | — | — | — | view |
| 111 | `20260512185050_4adbe490-b1a2-4cc3-955c-f00ce45fb8ab.sql` | business_autopilot_settings, autopilot_runs, founder_decisions | — | — | 3 | 3 | — |
| 112 | `20260512190931_487479da-1be2-4f67-86d1-8046cddcdb64.sql` | brief_audit_log | — | update_updated_at_column | 2 | 1 | — |
| 113 | `20260512195142_b1f7bdac-615e-470e-9d60-9905c1b07585.sql` | — | — | update_updated_at_column | — | — | — |
| 114 | `20260512200100_ed029132-656f-4dd7-b9ef-0f8e61d39e71.sql` | — | lead_lifecycle_summary | — | — | — | view |
| 115 | `20260512200652_b371a733-b317-4ec3-9eec-cbd559144dfa.sql` | — | lead_lifecycle_summary | — | — | — | view |
| 116 | `20260513080401_c3b0580e-16df-4c85-a2e5-51c250239203.sql` | apollo_credit_ledger, autopilot_run_log, founder_decision_queue | — | — | 4 | 3 | — |
| 117 | `20260513080925_b32613ff-c32b-48bc-a4f2-ff2a027557e1.sql` | — | — | — | — | — | table |
| 118 | `20260513093132_78949903-8398-48fc-a142-ea050e0abd8a.sql` | — | — | — | — | — | — |
| 119 | `20260513113711_b5033e38-81c1-4764-af88-c9ce85e39496.sql` | — | — | — | — | — | — |
| 120 | `20260513142829_7de42b65-b54e-449d-94f6-cbff7758e66e.sql` | contact_compliance_events | — | handle_email_bounce, apply_reply_stop_suppression, check_outreach_allowed | 1 | 1 | policy |
| 121 | `20260513143614_e0d25968-201c-4674-8a41-e3a1010d9790.sql` | — | — | — | — | — | — |
| 122 | `20260513151201_5be09cb1-a495-4318-9968-a1284f3f51dd.sql` | — | — | — | — | — | — |
| 123 | `20260513151716_d7c0a915-decf-4731-b7ba-eb4bbe110754.sql` | — | — | — | — | — | — |
| 124 | `20260513152235_61f6af4b-7eec-44e7-883d-1f440249118b.sql` | email_tracking_events | — | — | 2 | 1 | policy |
| 125 | `20260513161601_a79aa952-0498-4989-99a5-6bdfbff4573e.sql` | — | — | get_outreach_send_cron_status | — | — | — |
| 126 | `20260515110552_e1dc27d6-304e-49f7-9d56-928e574ba8d5.sql` | outbound_providers | — | — | 3 | 1 | — |
| 127 | `20260515111806_d43a95b2-c0d0-441e-aa63-62f73135caa9.sql` | — | — | — | — | — | — |
| 128 | `20260515113335_cd54b1f4-2f48-4d4c-9199-36461acd3240.sql` | outbound_provider_campaign_mappings, outbound_provider_events | — | — | 6 | 2 | — |
| 129 | `20260515120035_0b6a8408-5d91-4b6d-98d4-f3003228df6f.sql` | outbound_channel_policies | — | — | 4 | 1 | — |
| 130 | `20260515121454_027ffbc8-69a9-4766-96d3-8f1f02be86f2.sql` | provider_event_intake_reviews | — | — | 3 | 1 | — |
| 131 | `20260515121811_b662e48b-6dbb-4ce1-a262-af4b1a8c62b9.sql` | outbound_provider_lead_mappings | — | — | 4 | 1 | — |
| 132 | `20260515122817_a56777f9-bca0-4135-8985-7a09b8606662.sql` | crm_interaction_types, crm_interaction_ledger | — | get_crm_interaction_ledger_summary | 8 | 2 | — |
| 133 | `20260515123130_49e4b395-81ca-4169-8f0d-8c5a429a1d4c.sql` | crm_match_candidates | — | crm_match_interaction_preview | 1 | 1 | policy |
| 134 | `20260515123505_f3566d99-d83f-457b-aa0c-7dce4392a237.sql` | crm_interaction_source_adapters | — | — | 1 | 1 | policy |
| 135 | `20260515124227_79210adc-fae9-446e-a997-295ef86959ed.sql` | — | — | get_crm_contact_timeline, get_crm_relationship_timeline, get_crm_contact_360_summary | — | — | — |
| 136 | `20260515124524_ae335147-f77a-473f-87d5-0fe2a58f41fb.sql` | crm_conversation_bridge_reviews | — | — | 2 | 1 | — |
| 137 | `20260515124937_d3dc81ef-1e65-4356-a4a4-6ed222386bcf.sql` | crm_lifecycle_stages, crm_next_action_rules, crm_founder_review_queue | — | — | 6 | 3 | — |
| 138 | `20260515125239_08157e5d-28a1-483f-a3d7-c6174d86e127.sql` | crm_integrity_findings | — | — | 2 | 1 | — |
| 139 | `20260515130201_813a9452-8037-4281-a5ea-770f03d1b747.sql` | crm_hardening_test_runs | — | — | 2 | 1 | policy |
| 140 | `20260515130442_96d5e988-a085-4117-9c28-ccf4bc10826f.sql` | ai_agent_roles, ai_agent_permissions, ai_agent_operating_status | — | — | 6 | 3 | policy |
| 141 | `20260515130800_788fce39-6241-4950-a6ae-59ddf8f99840.sql` | ai_agent_task_queue, ai_agent_task_types | — | — | 4 | 2 | policy |
| 142 | `20260515131242_d6525b70-438c-422f-a001-bfa0d6c83b1f.sql` | ai_conversation_draft_reviews, ai_reply_tone_profiles | — | — | 2 | 2 | policy |
| 143 | `20260515131724_ed0e0647-d7b2-4bd9-9ecc-6413d9704ad0.sql` | founder_approval_items, founder_approval_types | — | — | 2 | 2 | policy |
| 144 | `20260515132133_87bb312f-fa1d-4cb4-8573-26a2ed458e4f.sql` | commercial_handoff_reviews | — | — | 1 | 1 | policy |
| 145 | `20260515132636_137f998b-7b26-4ff8-8682-471b9bfbb4f8.sql` | revenue_operations_reviews | — | — | 1 | 1 | — |
| 146 | `20260515133229_c424c2ff-3eb3-4560-8811-0d740c060013.sql` | liftor_operating_test_scenarios, liftor_operating_test_runs, liftor_live_readiness_gates | — | — | 4 | 3 | — |
| 147 | `20260515133949_6bb6e281-f1bf-423e-b193-696546b5492e.sql` | agent_business_live_settings, agent_action_audit_log | — | is_agent_live_setting_enabled | 2 | 2 | policy |
| 148 | `20260515140546_17f7c3e9-979b-42d7-bd03-a4de0ab6c0c8.sql` | business_operating_profiles, business_operating_modules, business_agent_assignments_v2 | — | — | 3 | 3 | — |
| 149 | `20260515140955_cc2415e8-0efa-44f2-9a1e-372dd69db56d.sql` | business_launch_templates, business_launch_plans | — | — | 2 | 2 | — |
| 150 | `20260515141429_e0328266-eeb6-4b42-bf20-da82931962b0.sql` | business_knowledge_profiles, business_knowledge_assets | — | — | 2 | 2 | — |
| 151 | `20260515141955_53f3608c-fd92-4cd8-9111-adaef16ea5dc.sql` | portfolio_operating_snapshots | — | — | 1 | 1 | — |
| 152 | `20260515142402_5558bc74-0070-4fe4-889d-31ab11807b92.sql` | internal_operating_schedules | — | — | 1 | 1 | — |
| 153 | `20260515142741_de898397-90b3-4115-81d9-42e21e57f653.sql` | provider_secret_registry | — | — | 2 | 1 | policy |
| 154 | `20260515143157_4cf2364d-d4dd-4de4-91a2-c26d85d99555.sql` | client_system_packages | — | — | 2 | 1 | policy |
| 155 | `20260515143701_e5904d4b-e18b-4fd5-b76d-fcde99d87f62.sql` | execution_result_log | — | — | 1 | 1 | — |
| 156 | `20260515144042_c408a0f0-1160-4099-aaa6-a1ddbe7c34a7.sql` | external_action_gates | — | — | 1 | 1 | — |
| 157 | `20260515144413_46efaa5e-05f7-48f0-a241-793544db9bcf.sql` | smartlead_activation_checklist | — | — | 1 | 1 | — |
| 158 | `20260515144845_da9ac1e9-04de-4cb7-8666-c305b2df49eb.sql` | business_operating_runbooks | — | — | 4 | 1 | — |
| 159 | `20260515145655_97caaf6f-ff4b-4540-bb47-c44610b7e330.sql` | autonomy_levels, autonomy_policies, autonomy_action_audit | — | — | 6 | 3 | — |
| 160 | `20260515150054_a9f6d044-1f19-4eb8-a092-9be8966d58d8.sql` | global_market_profiles, contact_timezone_profiles, founder_brief_windows | — | — | 6 | 3 | — |
| 161 | `20260515150424_cf499716-3767-4d82-8dd6-8d87a3cec790.sql` | supported_languages, multilingual_interaction_reviews | — | — | 4 | 2 | — |
| 162 | `20260515150855_1f4bcad8-b572-41c6-bf3b-857b55846fe4.sql` | jurisdiction_policy_profiles, jurisdiction_review_queue | — | — | 4 | 2 | — |
| 163 | `20260515151324_f9c229fa-7580-4167-a55c-169b102705b3.sql` | communication_channels, multi_channel_inbound_events | — | — | 4 | 2 | — |
| 164 | `20260515151732_8e6bc8f8-f305-493a-9d6d-5679dfd49850.sql` | agent_handover_rules, agent_handover_log | — | — | 4 | 2 | — |
| 165 | `20260515152046_56a46dec-75d9-43b0-a05d-ebf6d9f1543f.sql` | business_learning_signals, optimisation_recommendations | — | — | 4 | 2 | — |
| 166 | `20260515152441_7698cd85-6420-41f9-bfd3-5fa7d2e854be.sql` | self_healing_rules, self_healing_findings | — | — | 4 | 2 | — |
| 167 | `20260515152748_ef5426fd-cb2b-4f0c-bea4-b2e6afdb1ee6.sql` | portfolio_intelligence_scores, portfolio_strategy_recommendations | — | — | 4 | 2 | — |
| 168 | `20260515153056_365fc728-e493-4fda-8386-b6481e1a3361.sql` | autopilot_activation_gates | — | — | 4 | 1 | — |
| 169 | `20260515153605_526b8256-6017-42ad-b797-3d2bda13f0a8.sql` | global_brain_status_snapshots | — | — | 2 | 1 | — |
| 170 | `20260515154150_9dd92d71-febf-4ea4-8f76-5495e55ddee4.sql` | customer_stewardship_assignments | — | — | 4 | 1 | policy |
| 171 | `20260515155035_6dc49e21-6f70-459b-abec-3022bfe73486.sql` | — | — | — | — | — | — |
| 172 | `20260515155458_c25670ce-d7ec-4419-8a40-8756903fe0b2.sql` | social_business_profiles, social_platform_accounts | — | — | 4 | 2 | — |
| 173 | `20260515155920_83dde3b4-1fde-421b-8af8-3703744d2cab.sql` | social_content_calendars, social_post_drafts | — | — | 4 | 2 | — |
| 174 | `20260515160229_33fdbd50-7c98-4e0c-95c1-dbebe044d547.sql` | social_source_assets, social_repurposing_jobs | — | — | 4 | 2 | — |
| 175 | `20260515160545_5689089e-3f62-4b77-90d6-5198cd116d0a.sql` | social_scheduling_queue, metricool_export_batches | — | — | 4 | 2 | — |
| 176 | `20260515160914_01aecd84-fb38-4988-99a2-1ef8057ff3d9.sql` | social_engagement_events, manychat_flow_blueprints | — | — | 4 | 2 | — |
| 177 | `20260515161329_6b171430-b7de-4813-a4d0-a3d6ecbe7990.sql` | social_performance_metrics, social_competitor_profiles, social_trend_watch_items | — | — | 6 | 3 | — |
| 178 | `20260515161928_844a8fc4-fa70-44d0-862f-04fa454835a5.sql` | command_centre_modules, business_module_status | — | — | 2 | 2 | policy |
| 179 | `20260515162821_67f37b7c-bf44-4179-83fc-a4db5f89bbc7.sql` | marketing_content_assets, marketing_campaign_briefs | — | — | 2 | 2 | — |
| 180 | `20260515163307_853ff8cb-3947-4c39-b2a5-4d960b8f97a0.sql` | support_knowledge_articles, support_interaction_reviews | — | — | 2 | 2 | — |
| 181 | `20260515163700_f5b6e80a-16d9-45e2-a1e7-d820b0e129d6.sql` | creative_asset_library, creative_asset_usage | — | — | 2 | 2 | — |
| 182 | `20260515164808_865b10ca-ddcf-43ab-827e-d88113e39875.sql` | command_centre_manual_registry, command_centre_workflow_registry, command_centre_data_flow_registry | — | touch_updated_at | 3 | 3 | — |
| 183 | `20260515165238_c6a7dac5-e0fc-45d9-ba06-4a2579de6b7d.sql` | command_centre_link_audit, command_centre_customer_journey_steps | — | — | 3 | 2 | — |
| 184 | `20260515165832_8b645d86-ba5e-45ca-9633-befe40bdc0ac.sql` | customer_survey_templates, customer_survey_requests, customer_survey_responses | — | — | 5 | 3 | — |
| 185 | `20260515170415_18093b56-3bc3-48cb-9b16-ffb28cfea417.sql` | customer_memory_profiles, response_context_checks | — | — | 2 | 2 | — |
| 186 | `20260515170944_ecb9e591-5a71-4a63-a71d-85bb7b6db7c6.sql` | customer_success_plans, customer_package_catalog, customer_upsell_recommendations | — | — | 3 | 3 | — |
| 187 | `20260515171434_2a9b11aa-fff8-469f-a2e6-e5e8422bca7a.sql` | competitor_business_profiles, competitor_learning_insights | — | — | 2 | 2 | — |
| 188 | `20260515172537_c0bd03f8-1e2f-43a7-aa11-5967edabf139.sql` | customer_quarterly_reports, customer_usage_snapshots, customer_account_reviews | — | — | 4 | 3 | — |
| 189 | `20260515173254_26024d9d-0d30-4e8c-83d5-7ba7412c714d.sql` | customer_onboarding_plans, customer_onboarding_tasks, onboarding_email_drafts | — | — | 3 | 3 | — |
| 190 | `20260515174055_0e40d6a1-928b-443d-9b64-9f5612972275.sql` | customer_complaints, customer_disputes, complaint_resolution_plans | — | — | 3 | 3 | — |
| 191 | `20260515174903_c6e0b275-e44e-4a89-8989-8b2f568005fe.sql` | customer_retention_scores, retention_risk_recommendations | — | — | 2 | 2 | — |
| 192 | `20260515175802_c8f9444b-6626-408e-9a21-4364c6065d33.sql` | customer_winback_plans | crm_universal_interaction_log | — | 1 | 1 | — |
| 193 | `20260515180754_93797b2d-a97b-4ad7-a03b-ee3d122b7cc7.sql` | prospecting_source_registry, prospecting_search_jobs, strategic_target_accounts, prospect_ranking_models, strategic_account_lists, strategic_account_list_items | — | — | 6 | 6 | — |
| 194 | `20260515181619_d1f6d11f-4391-442d-813d-a18db05befae.sql` | group_entity_register, group_obligation_calendar, group_governance_reviews | — | — | 3 | 3 | — |
| 195 | `20260515182144_0022b378-f01f-44ea-87fd-85f8454c9e35.sql` | group_bank_accounts, cashflow_forecasts, cashflow_forecast_items, accounting_close_tasks | — | — | 4 | 4 | — |
| 196 | `20260515182807_d6a0c87f-cfba-4f63-a3f4-f4ca2f3486d1.sql` | contract_register, procurement_requests, supplier_risk_reviews | — | — | 3 | 3 | — |
| 197 | `20260515183402_56e4161e-37bb-4ab4-8446-9de67eea9b55.sql` | people_register, access_review_items, training_sop_records | — | — | 3 | 3 | — |
| 198 | `20260515183956_3fea9018-a42e-4023-99f5-1d760febc6cb.sql` | group_risk_register, insurance_policy_register, incident_register, business_continuity_plans | — | — | 4 | 4 | — |
| 199 | `20260515184506_1afe502b-44e0-446a-a262-0e8cb740c4f9.sql` | product_roadmap_items, qa_test_cases, release_plans | — | — | 3 | 3 | — |
| 200 | `20260515184906_f36d8049-7dc9-46ba-a417-5f644fac03a4.sql` | ai_prompt_registry, ai_draft_quality_reviews | — | — | 2 | 2 | — |
| 201 | `20260515185453_3219b363-13b9-400b-b75d-10917bd063bd.sql` | operating_cost_register, usage_credit_ledger, business_margin_snapshots | — | — | 3 | 3 | — |
| 202 | `20260515190052_81e8485c-e230-4c54-85e1-c97756a4d19a.sql` | data_privacy_requests, customer_data_inventory | — | — | 2 | 2 | — |
| 203 | `20260515190715_b8f83b60-3a30-4bd9-aeea-fcfb3b8f923b.sql` | ip_asset_register, ip_rights_checklists | — | — | 2 | 2 | — |
| 204 | `20260515191233_cc7167b0-1d66-4f05-a208-8b0ed9c2d0be.sql` | customer_subscriptions, renewal_review_tasks | — | — | 2 | 2 | — |
| 205 | `20260515191824_5ca5ba41-fa0b-425d-8b56-27a28266e8ea.sql` | meeting_call_records, meeting_action_items | — | — | 2 | 2 | — |
| 206 | `20260515192451_9a8e93f3-c3ce-4fde-b944-e472cc06e05a.sql` | knowledge_source_registry, knowledge_conflict_flags | — | — | 2 | 2 | — |
| 207 | `20260515193724_d12d1671-456f-402f-8f6b-f738ec506590.sql` | funding_exit_readiness, investor_buyer_targets | — | — | 2 | 2 | — |
| 208 | `20260515194417_cbb1da31-1795-48e5-9348-22741a9da26c.sql` | brand_reputation_events, crisis_response_plans | — | — | 2 | 2 | — |
| 209 | `20260515194948_28523385-69f7-4b87-8729-bafb79a0b7ff.sql` | business_kpis, business_okrs, performance_scorecards | — | — | 3 | 3 | — |
| 210 | `20260515195532_9f0eef1e-4678-4c72-a516-ab554158d34b.sql` | partnership_accounts, referral_links, affiliate_payouts | — | — | 3 | 3 | — |
| 211 | `20260515200030_0c498a2a-80e7-4267-8909-563c54de8633.sql` | partnership_programs, partner_referral_records | — | — | 2 | 2 | — |
| 212 | `20260515200505_e170397b-2c99-4605-9f5e-002686b4f983.sql` | founder_alert_rules, founder_notification_queue | — | — | 2 | 2 | — |
| 213 | `20260515201642_c99abf7c-1c0f-4bec-bb70-c1977545218e.sql` | business_activation_profiles, business_activation_checklist_items, integration_activation_status, customer_data_import_readiness, approved_template_library | — | — | 5 | 5 | — |
| 214 | `20260515202243_4ce5d93c-5d08-46ee-80d6-18e7f96509af.sql` | business_knowledge_uploads, business_training_runs, business_execution_starter_packs | — | — | 3 | 3 | — |
| 215 | `20260515203229_a7701e71-76b8-4caa-883a-8305e4c02dbd.sql` | business_rehearsal_runs, business_rehearsal_scenarios, operator_training_checklists | — | — | 3 | 3 | — |
| 216 | `20260515203730_593023eb-69e3-4315-9893-4a3dfa846131.sql` | rehearsal_data_registry, rehearsal_cleanliness_checks | — | — | 2 | 2 | — |
| 217 | `20260515204417_7330ee37-0b34-45ec-bd2c-5f56c827c5d7.sql` | business_pre_live_baselines, business_operating_standards, baseline_change_log | — | — | 3 | 3 | — |
| 218 | `20260515204924_0a5d947a-939a-426e-aaa2-451de708760b.sql` | business_revenue_targets, revenue_target_activity_plans, revenue_goal_progress_snapshots | — | — | 3 | 3 | — |
| 219 | `20260515214132_d2e7ef86-515a-4647-b34f-1f2198cf2552.sql` | business_valuation_snapshots, business_valuation_assumptions | — | — | 2 | 2 | — |
| 220 | `20260519115344_7d2d46bc-7616-4fab-ac58-4190fbb71f97.sql` | social_provider_adapters, social_accounts, social_assets, social_content_items, social_publish_jobs, social_inbox_messages, social_reply_jobs, social_performance_logs _(+1)_ | — | social_set_updated_at | 1 | 9 | policy |
| 221 | `20260519115820_663485db-ddf2-4912-9f06-2ed3a696dc54.sql` | business_social_knowledge_sources, business_social_brain_profiles, business_social_brain_extractions, business_social_profile_approval_log | — | — | 1 | 4 | policy |
| 222 | `20260519120638_1c5a8513-55ed-470e-ba56-9b6a6a7f74ce.sql` | business_social_content_pillars, business_social_platform_rules, business_social_offer_mappings, business_social_risk_flags, business_social_profile_versions | — | update_updated_at_column | 1 | 5 | policy |
| 223 | `20260519121719_a5b2d00b-cf37-495e-b999-a15fbf19ffb1.sql` | social_asset_usage_log, social_asset_requirements, social_asset_rights_reviews, social_asset_collections, social_asset_collection_items, social_hook_caption_bank | — | — | 1 | 6 | policy |
| 224 | `20260519124115_34275733-9b4b-493b-8386-30c0405a56d4.sql` | social_campaign_plans, social_campaign_content_map, social_revenue_content_strategy, social_customer_journey_content_rules, social_campaign_readiness_reviews | — | — | 5 | 5 | policy |
| 225 | `20260519125212_1dbb5622-9de1-4479-8045-dba184ae4b53.sql` | social_calendars, social_calendar_items, social_calendar_generation_runs, social_calendar_cadence_rules, social_calendar_gap_reviews | — | — | 1 | 5 | policy |
| 226 | `20260519130217_29fb38fc-6d01-4189-bf01-6247cad55639.sql` | social_approval_reviews, social_approval_decisions, social_approval_batches, social_approval_batch_items, social_approval_rules | — | — | 1 | 5 | policy |
| 227 | `20260519131234_669518fb-2745-41ad-ac30-f364c348b13a.sql` | social_provider_connections, social_provider_execution_gates, social_publish_queue_batches, social_publish_queue_audit, social_manual_export_batches | — | — | 5 | 5 | — |
| 228 | `20260519132609_61105c66-11c2-4aa7-9c75-d9d89aa608f3.sql` | social_scheduler_export_rows, social_scheduler_export_templates, social_operator_scheduling_tasks, social_scheduler_export_audit | — | — | 4 | 4 | — |
| 229 | `20260519133907_1f62b3d6-2692-436e-9cb3-76ee32544cf3.sql` | social_keyword_trigger_rules, social_dm_flow_blueprints, social_dm_flow_steps, social_manychat_manual_exports, social_engagement_flow_audit | — | — | 1 | 5 | policy |
| 230 | `20260519135225_e673a96e-de25-4eef-b8c6-90f34fbca1f4.sql` | social_engagement_classifications, social_engagement_crm_matches, social_engagement_reply_drafts, social_engagement_escalations, social_engagement_import_batches, social_engagement_audit | — | update_updated_at_column | 2 | 1 | policy |
| 231 | `20260519140837_0f13e8ec-c6fe-4fa0-9aa5-23e21f9ad31b.sql` | social_performance_import_batches, social_content_performance_summaries, social_learning_signals, social_strategy_recommendations, social_analytics_audit | — | — | 1 | 5 | policy |
| 232 | `20260519142343_e8d56925-cc0e-44fe-8aec-06ed634b815d.sql` | social_competitor_profiles, social_competitor_accounts, social_competitor_observations, social_competitor_content_patterns, social_trend_signals, social_market_positioning_reviews, social_market_learning_signals, social_competitor_trend_audit | — | — | 1 | 8 | policy |
| 233 | `20260519143947_9370356a-6434-456b-a1a7-a71b9c79fb1c.sql` | website_funnel_strategies, website_landing_page_drafts, website_page_sections, lead_magnet_assets, conversion_cta_maps, conversion_asset_packs, website_funnel_gap_reviews, website_funnel_audit | — | — | 1 | 8 | policy |
| 234 | `20260519145734_1cefb7f4-4450-4c15-a370-464663696c78.sql` | longform_content_strategies, seo_content_briefs, longform_content_drafts, newsletter_sequence_plans, longform_repurposing_maps, longform_content_gap_reviews, longform_manual_export_packs, longform_content_audit | — | — | 8 | 8 | — |
| 235 | `20260519151244_6763e229-00c7-4349-9d8f-ce1ecb8149d6.sql` | paid_media_campaign_plans, paid_media_audience_segments, paid_media_creative_variants, paid_media_budget_guards, paid_media_spend_scenarios, paid_media_readiness_checks, paid_media_manual_export_packs, paid_media_risk_reviews _(+1)_ | — | has_role | 1 | 1 | policy |
| 236 | `20260519152929_39b2eebd-a091-4077-9230-f5418c66ec25.sql` | support_knowledge_sources, support_faq_items, support_question_intake, support_reply_drafts, support_triage_reviews, support_escalations, support_quality_reviews, support_manual_export_packs _(+1)_ | — | — | 1 | 1 | policy |
| 237 | `20260519154822_a45c88fc-6086-461a-9b01-c3c478189a6a.sql` | customer_success_profiles, customer_welcome_packs, client_portal_blueprints, client_portal_content_packs, customer_bedding_in_reviews, customer_success_checkins, customer_satisfaction_surveys, customer_renewal_reviews _(+4)_ | — | — | 1 | 12 | policy |
| 238 | `20260519163711_c905848e-61d3-4e61-888b-b76b60cac5fd.sql` | liftor_brain_sessions, liftor_brain_messages, liftor_brain_context_packs, liftor_brain_tool_registry, liftor_brain_tool_calls, liftor_brain_drafts, liftor_brain_audit, liftor_brain_provider_config _(+1)_ | — | — | 1 | 9 | policy |
| 239 | `20260519164623_21ab7f25-3a9f-4470-944b-4e810e7d8837.sql` | liftor_brain_constitution_versions | — | — | 4 | 1 | policy |
| 240 | `20260524152352_517fe394-1663-49c3-a9cd-05499925a5c8.sql` | starter_pack_materialised_items, starter_pack_materialisation_runs | — | — | 2 | 2 | — |
| 241 | `20260524152745_f84350ea-5d11-4f13-a2a2-895166f5c1cf.sql` | business_onboarding_factory_runs | — | — | 1 | 1 | — |
| 242 | `20260524153215_2bb47511-cdd0-4d74-8927-0191629025bf.sql` | business_internal_activation_records, business_operating_runbook_items, business_internal_daily_actions | — | — | 3 | 3 | policy |
| 243 | `20260524153709_ee74fc95-a2c5-474c-b828-dde13836b609.sql` | business_daily_operating_runs, business_daily_operating_outputs | — | — | 2 | 2 | policy |
| 244 | `20260524154205_c80e70b6-7847-4412-9f03-fb2db29d91df.sql` | business_weekly_review_runs, business_weekly_review_outputs | — | — | 2 | 2 | policy |
| 245 | `20260524154735_b57b448e-9465-4e2f-ba44-c1bb9cec15bd.sql` | business_external_activation_readiness_runs, business_external_activation_channel_checks, business_external_activation_plans | — | — | 3 | 3 | policy |
| 246 | `20260524155258_ff2792e8-cb3d-4a53-bd36-25f2415d7cfc.sql` | business_micro_batch_preparation_runs, business_micro_batch_candidates, business_micro_batch_approval_packets | — | — | 3 | 3 | — |
| 247 | `20260524160024_16e39473-1f56-4e9b-b116-965a70ac832b.sql` | liftor_build_phase_closeout_records | — | — | 3 | 1 | — |
| 248 | `20260524160459_a370f848-559f-46ba-9b5f-1c7627928886.sql` | manual_source_layers, manual_update_drafts | — | — | 4 | 2 | — |
| 249 | `20260524162118_472f86ae-7fe8-411a-ba6a-81bbfad3bfd6.sql` | ma_portfolio_assets, ma_intelligence_sources, ma_companies, ma_investors, ma_deals, ma_competitor_profiles, ma_buyer_matches, ma_adviser_channels _(+7)_ | — | ma_audit_trigger | 2 | 2 | policy |
| 250 | `20260524163758_ff410855-cd96-480b-b24b-84dc468bde01.sql` | — | — | ma_generate_default_data_room | — | — | — |
| 251 | `20260524164414_222a1c54-896c-47f7-a880-94c7f02b8af6.sql` | — | — | — | — | — | — |
| 252 | `20260524164512_1f436def-afad-4b8b-81d0-a4665f1beb71.sql` | — | — | — | — | — | — |
| 253 | `20260524164542_366fb409-ea15-44b3-b548-c6865c3b6242.sql` | ma_ai_recommendations, ma_ai_briefings | — | — | 2 | 2 | — |
| 254 | `20260524170140_9ddba530-379d-4877-a17d-ac56254bd3d2.sql` | ma_data_imports, ma_import_records, ma_golden_records, ma_dedupe_suggestions, ma_evidence_links, ma_intelligence_runs, ma_governance_decisions, ma_approval_queue _(+4)_ | ma_approval_queue_open | — | 8 | 1 | — |
| 255 | `20260524170201_a39bd36d-57ee-44cf-a9c9-aa3f14989c25.sql` | — | ma_approval_queue_open | — | — | — | view |
| 256 | `20260524170715_49f1fb2a-b3ce-458f-940a-2234ecf18b0a.sql` | ma_lifecycle_transitions, ma_lifecycle_gates, ma_kpi_dictionary, ma_prompt_versions, ma_cost_entries, ma_budgets, ma_data_classifications, ma_backup_events _(+6)_ | — | — | 1 | 1 | policy |
| 257 | `20260524171707_b6de2036-ae29-4200-851e-21413b8b02d0.sql` | ma_acceptance_criteria, ma_data_quality_scores, ma_permissions_matrix, ma_reporting_packs, ma_incidents, ma_retention_policies, ma_error_queue, ma_environment_mode _(+1)_ | — | — | 1 | 1 | policy |
| 258 | `20260524172104_15668f57-633b-4e0b-ab2e-7ced033da382.sql` | ma_release_gate_checks, ma_integration_allowlist, ma_rate_cost_limits, ma_lockdown_controls, ma_red_team_reviews, ma_privacy_records | — | — | 6 | 6 | — |
| 259 | `20260524172507_eceb84d4-6912-4e6d-b55d-090d7be0ae63.sql` | ai_usage_ledger, ai_model_routing_rules, ai_business_budgets, ai_agent_cost_controls, ai_cost_alerts, ai_roi_snapshots, ai_prompt_templates, ai_cached_context_blocks | — | — | 8 | 8 | — |
| 260 | `20260524175602_1d62603c-46b2-4299-a45f-ae7ed96ddf7a.sql` | ai_provider_pricing | — | — | 1 | 1 | policy |
| 261 | `20260524175928_97fcb1fd-6354-4a1f-8654-022d50aafaef.sql` | ai_quality_scores | — | — | 4 | 1 | — |
| 262 | `20260524180921_4fc25584-2e36-4c42-b7ec-7b0e7886f836.sql` | ai_action_queue, ai_rate_limits, ai_kill_switch_state | — | — | 3 | 3 | — |
| 263 | `20260524181323_2984bf92-30a7-4273-b3fb-2984363b8992.sql` | ai_sandbox_runs | — | — | 1 | 1 | — |
| 264 | `20260524182621_bc78f21c-748a-43b4-b62b-72ca83472ea4.sql` | ai_go_live_readiness | — | — | 1 | 1 | — |
| 265 | `20260524182935_001eda90-d7af-4b73-96f1-66430ab474e1.sql` | — | — | — | — | — | — |
| 266 | `20260525074230_8eadfe79-e2cd-4dc3-a66e-7dc2f93e1e22.sql` | ai_agent_registry, ai_conversations, ai_gateway_requests, ai_runtime_events | — | — | 8 | 4 | policy |
| 267 | `20260525075044_6e79daf5-dc7f-429f-a01f-f3241ac189ad.sql` | ai_workflow_runs, ai_workflow_steps | — | — | 4 | 2 | — |
| 268 | `20260525082737_2b231635-0f40-4c0d-91d0-5322e3fb7ab4.sql` | ai_concurrency_leases | — | acquire_ai_lease, release_ai_lease, cleanup_stale_ai_leases | 1 | 1 | — |
| 269 | `20260525083157_339b9ce8-1b1e-42f5-b801-fbeefaa817c6.sql` | — | — | — | — | — | — |
| 270 | `20260525165802_f4a137f3-3f18-4454-9ece-e7d406ed6e7a.sql` | — | — | — | — | — | — |
| 271 | `20260525174051_3c1bccc7-8f27-4642-90eb-38ba8c82fcf0.sql` | customer_sales_products, customer_sales_offers, customer_sales_playbooks, customer_sales_conversations, customer_sales_call_logs, customer_sales_close_actions, customer_sales_provider_settings, customer_sales_objection_library _(+1)_ | — | — | 1 | 1 | — |
| 272 | `20260525174812_5dea9585-0a6f-4180-8157-ab4e3362db41.sql` | — | — | — | — | — | — |
| 273 | `20260525175210_a7d10c0f-35f8-42db-8f3d-32d0712c45b2.sql` | customer_sales_conversation_states, customer_sales_signal_library, customer_sales_brain_runs | — | — | 3 | 3 | — |
| 274 | `20260525180537_982171b4-b6da-426e-9f53-ea6daea11940.sql` | customer_sales_voice_runtime_events | — | — | 2 | 1 | — |
| 275 | `20260525182045_906f3569-fb5d-4b87-9b73-b8059c4d80ed.sql` | — | — | customer_sales_link_contact_by_email | — | — | — |
| 276 | `20260525183348_600a6910-502f-43c6-9940-48b62c333fac.sql` | customer_sales_close_provider_settings | — | — | 1 | 1 | policy |
| 277 | `20260525183639_1b664e01-05fe-4357-8338-b9b41b6b8279.sql` | customer_sales_safety_events, customer_sales_contact_safety, customer_sales_prohibited_claims, customer_sales_escalation_triggers | — | — | 1 | 1 | policy |
| 278 | `20260525183941_1c0b6591-1719-4426-b5c0-2d1745b87559.sql` | customer_sales_follow_up_tasks, customer_sales_follow_up_templates, customer_sales_human_handoff_tasks | — | — | 1 | 1 | policy |
| 279 | `20260525184956_734c5dbe-8aaa-4e4f-8b6d-32a18309460f.sql` | sales_revenue_targets, sales_activity_targets, sales_target_progress | — | — | 3 | 3 | — |
| 280 | `20260525185516_71e8b937-c3a2-4959-8ed7-e8ff7b46bacb.sql` | product_upgrade_ladders, customer_upgrade_opportunities, customer_upgrade_rules | — | — | 3 | 3 | — |
| 281 | `20260525190015_98471f79-5b28-45e4-b166-df2969b77e78.sql` | sales_conversion_events, sales_win_loss_reviews, sales_script_performance, sales_coaching_recommendations | — | — | 4 | 4 | — |
| 282 | `20260525190439_50dfae5a-ddb5-4447-a4db-bbc41bbfd5cc.sql` | revenue_autopilot_tasks, revenue_autopilot_snapshots, revenue_autopilot_recommendations | — | — | 3 | 3 | — |
| 283 | `20260525190942_e017c06b-5f10-4d1b-bd02-2f67200a24f2.sql` | qtc_quotes, qtc_proposals, qtc_invoices, qtc_payments, qtc_revenue_confirmations | — | qtc_on_quote_accepted, qtc_on_payment_succeeded | 5 | 5 | — |
| 284 | `20260525191346_69a69d75-cf20-4ad0-9da9-e09c4cdc6d2d.sql` | delivery_orders, delivery_tasks, delivery_completion_proof, delivery_capacity | — | — | 4 | 4 | — |
| 285 | `20260525191804_9c7e9753-47e4-4457-a86f-006207ae8f40.sql` | onboarding_records, onboarding_checklist_items, onboarding_templates | — | — | 3 | 3 | — |
| 286 | `20260525192201_744af676-4aa0-4616-9d43-990430c8ea3c.sql` | support_tickets, support_ticket_events, support_sla_policies | — | — | 3 | 3 | — |
| 287 | `20260525192601_746b23c1-ab3f-42aa-8333-b26f3a6240e8.sql` | complaint_cases, refund_requests, dispute_evidence | — | — | 3 | 3 | — |
| 288 | `20260525192858_d9ac398a-4dcf-4b55-92c3-6c14a48dc64f.sql` | contracts, contract_obligations, contract_events, contract_provider_settings | — | — | 4 | 4 | — |
| 289 | `20260525193159_e23f7fe4-1a26-463e-95f9-cfeb448b6fdc.sql` | vendors, vendor_subscriptions, vendor_access_records, vendor_risk_reviews | — | — | 4 | 4 | — |
| 290 | `20260525193540_d1143bea-b913-40a5-aa65-f3d4f3bb441b.sql` | human_operators, human_operator_tasks, human_operator_access, human_operator_quality_reviews | — | — | 4 | 4 | — |
| 291 | `20260525193958_8df457b2-36b8-4e6d-b5e4-662b2f47ed5e.sql` | access_systems, secret_inventory, access_assignments, access_audit_events | — | — | 4 | 4 | — |
| 292 | `20260525194422_2c1ed224-b70c-4c00-a2a4-a6b92b98b52a.sql` | privacy_requests, data_retention_rules, consent_records, processor_register, privacy_breach_events | — | — | 5 | 5 | — |
| 293 | `20260525194841_25124df9-faea-47eb-8838-fa63b154f8eb.sql` | incident_records, incident_timeline_events, incident_postmortems, continuity_plans | — | — | 4 | 4 | — |
| 294 | `20260525195336_9df423bd-210b-424b-9b22-de06b77b65b4.sql` | adviser_handoff_packs, adviser_pack_items, entity_structure_records, adviser_questions | — | — | 4 | 4 | — |
| 295 | `20260525195911_9e9512c0-77ef-4d23-a64b-4a43bf822a00.sql` | founder_reports, founder_report_items | — | — | 2 | 2 | — |
| 296 | `20260525200404_94ee66d4-6699-4457-8710-00a8ca11fcc7.sql` | product_features, product_bugs, release_records, qa_checklists | — | — | 4 | 4 | — |
| 297 | `20260525200817_c64bc824-a635-4c11-820d-4a35ce4f24f2.sql` | data_quality_findings, data_repair_actions | — | — | 2 | 2 | — |
| 298 | `20260525201252_8546704f-5b7d-4127-8096-214627c6058a.sql` | knowledge_sources, knowledge_conflicts, approved_claims | — | — | 3 | 3 | — |
| 299 | `20260525201713_00dfa9f8-4a2f-489e-b5ad-16f86127f290.sql` | capacity_plans, workload_items, bottleneck_alerts | — | — | 3 | 3 | — |
| 300 | `20260525203120_f4ba1094-76c1-415f-b318-291864639de1.sql` | marketplace_profiles, seller_prospects, seller_recruitment_campaigns, seller_onboarding_records, seller_verification_checks, marketplace_listings, marketplace_supply_demand_snapshots | — | — | 1 | 7 | — |
| 301 | `20260525203544_0cf4e2db-e177-42ef-8e61-e47b69b45538.sql` | seller_accounts, seller_payout_profiles, seller_terms_acceptance, seller_performance_metrics | — | — | 1 | 4 | — |
| 302 | `20260525203950_33c6be9c-3293-424f-8cf3-5740ae6ffb7b.sql` | marketplace_liquidity_scores, marketplace_growth_actions, marketplace_match_attempts | — | — | 3 | 3 | — |
| 303 | `20260525204817_52d9d61f-c573-4c80-bd91-a0b8f9763a01.sql` | business_archetypes, business_archetype_assignments, business_archetype_questions | — | — | 3 | 3 | — |
| 304 | `20260525205310_4b7487ab-2756-4457-99cc-3e3d3d72ebcb.sql` | business_operating_templates, business_template_applications, business_setup_tasks | — | — | 3 | 3 | — |
| 305 | `20260525205735_3aec215d-f0a4-4626-b3bf-847d95a5da01.sql` | legal_entities, business_entity_assignments, revenue_routing_rules, entity_policy_assignments, tax_sensitive_questions | — | — | 5 | 5 | — |
| 306 | `20260525210231_2cdfc78d-6322-44c8-a780-73ee569a59ab.sql` | business_launch_profiles, business_channel_accounts, business_launch_checklist_items | — | — | 3 | 3 | — |
| 307 | `20260525210645_83d31d22-6be9-4eaf-9d3d-d04b312fcbf6.sql` | integration_catalog, business_integration_requirements, integration_connection_status | — | — | 3 | 3 | — |
| 308 | `20260525211002_be796d52-3b64-4190-9b80-4cdb95bbbe48.sql` | business_compliance_profiles, business_compliance_rules, compliance_approval_triggers | — | — | 3 | 3 | — |
| 309 | `20260525211449_5ab5617a-c4ad-432d-b583-8bc85e2e84dd.sql` | context_guard_events, business_context_profiles | — | — | 2 | 2 | — |
| 310 | `20260525211945_06f5cc3a-ef8e-444d-bd6d-a148ba6982d3.sql` | portfolio_priority_scores, portfolio_priority_decisions | — | — | 2 | 2 | — |
| 311 | `20260525212430_9c9bbd40-52be-4fa4-9652-05811d5f2a81.sql` | resource_allocation_plans, resource_allocation_items, resource_usage_actuals | — | — | 3 | 3 | — |
| 312 | `20260526082417_a315d908-7ec3-4ef0-91f5-33acba6b53c1.sql` | portfolio_risk_scores, portfolio_risk_items | — | — | 2 | 2 | — |
| 313 | `20260526082835_e391dd0d-143f-4f32-a4c9-adae027713e7.sql` | business_lifecycle_stages, business_lifecycle_assignments, business_stage_transition_events | — | — | 3 | 3 | — |
| 314 | `20260526083146_4a6e3e61-5add-4ea3-b574-00ed17c8e88d.sql` | global_products, global_offers, offer_claims, offer_delivery_requirements | — | — | 4 | 4 | — |
| 315 | `20260526083512_69a13135-863c-4801-8c9a-5f075e5e6715.sql` | product_margin_profiles, discount_rules, breakeven_models | — | — | 3 | 3 | — |
| 316 | `20260526084006_b80d3167-e9ba-4c11-a90b-499753946aae.sql` | channel_catalog, business_channel_strategies, channel_campaign_plans | — | — | 3 | 3 | — |
| 317 | `20260526084245_45fbc0f5-46a0-43e9-846f-aa00b91dbbbd.sql` | attribution_sources, attribution_events, attribution_models | — | — | 3 | 3 | — |
| 318 | `20260526084636_dc1fdc24-107c-4b54-a4f0-05549b59bf2a.sql` | partner_prospects, referral_records, partner_commission_rules, partner_performance_snapshots | — | — | 4 | 4 | policy |
| 319 | `20260526085143_3765a718-a01a-4cf1-b831-abe50b491229.sql` | digital_assets, asset_rights_records, licensing_opportunities | — | — | 3 | 3 | policy |
| 320 | `20260526085556_56b7c615-1477-4011-8531-647f56770717.sql` | insurance_policy_records, insurance_gap_assessments, liability_events | — | — | 3 | 3 | — |
| 321 | `20260526090042_e8b3355a-c52c-4804-8c42-6f4bda721d55.sql` | exit_metric_templates, business_exit_metric_values, business_exit_readiness_scores | — | — | 3 | 3 | — |
| 322 | `20260526091442_2770d07c-1fb4-4e1d-aae9-deeb87d66efa.sql` | master_work_items, master_work_item_events, master_work_queue_rules | — | tg_mwi_touch_updated_at | 3 | 3 | — |
| 323 | `20260526203417_cfba85cb-d167-46bf-b028-29d1e78b0285.sql` | unified_notifications, escalation_records, notification_rules | — | — | 3 | 3 | — |
| 324 | `20260526204041_89266f7f-08e5-4a93-9b71-4cb13aaf868b.sql` | role_definitions, user_role_assignments, module_permission_matrix, access_requests, access_review_events | — | — | 5 | 5 | — |
| 325 | `20260526204632_00c68825-f0e8-4af9-8d44-d4dec2159614.sql` | kpi_definitions, reporting_truth_rules, reporting_conflicts, reporting_snapshots | — | — | 8 | 4 | — |
| 326 | `20260526205214_7f92b337-7dd2-46e7-a7e3-7682d3525ef8.sql` | portal_profiles, portal_users, portal_invites, portal_access_events | — | — | 8 | 4 | — |
| 327 | `20260526205801_1580450b-0051-4ae7-8365-25c32eccb2a1.sql` | reconciliation_records, payment_reconciliation_matches, marketplace_payout_records, reconciliation_exceptions | — | — | 4 | 4 | — |
| 328 | `20260526210352_3b6a77c0-c932-46f5-a8df-e141a544c367.sql` | currency_settings, jurisdiction_records, tax_treatment_flags, jurisdiction_adviser_review_items | — | — | 4 | 4 | — |
| 329 | `20260526210928_a8d0ea52-e95d-453f-aca4-0b80b3d24960.sql` | ecommerce_products, inventory_records, ecommerce_orders, ecommerce_order_items, fulfilment_shipments, return_requests, ecommerce_suppliers | — | — | 14 | 7 | — |
| 330 | `20260526211435_b0d9ef67-e181-44d3-8c31-1913d7a05cb5.sql` | scheduling_resources, availability_windows, booking_records, booking_events | — | — | 8 | 4 | — |
| 331 | `20260526211912_5f97f41f-be5f-4b8c-8bdd-c1f32a4af095.sql` | document_vault_items, document_access_rules, data_room_profiles, data_room_items, evidence_records | — | — | 5 | 5 | — |
| 332 | `20260526212503_99059f51-83f3-4f7c-8068-660a125df198.sql` | ai_eval_test_suites, ai_eval_test_cases, ai_eval_runs, ai_eval_results | — | — | 4 | 4 | — |
| 333 | `20260526213125_fb20300c-827e-427e-9c62-1b410245b20a.sql` | sop_documents, sop_versions, sop_agent_usage, sop_review_tasks, sop_conflicts | — | — | 5 | 5 | — |
| 334 | `20260526213531_1e237506-429b-49f6-8ece-a763120affb0.sql` | backup_status_records, export_requests, recovery_checklists, emergency_operating_packs | — | — | 4 | 4 | — |
| 335 | `20260526214118_f3818315-cf8e-467f-9f25-66753055ccb0.sql` | founder_decision_events, decision_review_reminders | — | — | 2 | 2 | — |
| 336 | `20260526214815_6f24a41c-ab1e-486c-877e-4d1a0d460666.sql` | business_memory_summaries, handover_packs, handover_pack_items, portfolio_history_events | — | — | 4 | 4 | — |
| 337 | `20260526220141_7ac07e79-5603-47d0-b10b-ff44a8449bd4.sql` | liftor_events, workflow_definitions, workflow_runs, workflow_step_runs, workflow_failure_events | — | — | 5 | 5 | — |
| 338 | `20260526220752_4a723fd9-16d4-4d1e-9094-7bcd001fdf39.sql` | scheduled_job_definitions, scheduled_job_runs, scheduled_job_failures | — | — | 6 | 3 | — |
| 339 | `20260526221323_4eec3b5c-2a78-41fb-85a3-cf2b2c729e25.sql` | feature_flags, business_feature_overrides, system_configuration_values, configuration_audit_events | — | log_feature_flag_change, log_business_override_change, log_system_config_change | 8 | 4 | — |
| 340 | `20260526221755_fabdbed9-f9a4-45a8-950e-bda4956b7a8e.sql` | connector_registry, business_connector_assignments, connector_health_checks, connector_webhook_endpoints | — | — | 8 | 4 | — |
| 341 | `20260526222328_27ea1d65-6e8c-433e-87a0-0c3bda58c53b.sql` | webhook_inbox_events, normalised_external_events, webhook_processing_rules | — | — | 6 | 3 | — |
| 342 | `20260526223554_c74015b4-108c-4b02-8639-f20dbdf5c685.sql` | global_audit_events | — | — | 2 | 1 | — |
| 343 | `20260526224243_69ed4545-168b-43c9-b96a-c18fc3c83183.sql` | global_search_index, search_index_jobs, saved_searches | — | — | 11 | 3 | — |
| 344 | `20260526224821_8577842e-a3b6-437b-9258-e663c1a72337.sql` | import_mappings, import_preview_rows, import_applied_records, import_rollback_events | — | — | 12 | 5 | — |
| 345 | `20260526225341_8bef7978-de3f-4631-9680-b48d761ddf7e.sql` | identity_profiles, identity_links, duplicate_identity_candidates, identity_merge_actions | — | — | 12 | 4 | — |
| 346 | `20260526225830_16b4a631-4e6f-4bdd-bc25-48806c19809e.sql` | communication_records, communication_threads, communication_thread_messages, communication_safety_flags | — | — | 10 | 4 | — |
| 347 | `20260526230314_b160d670-5ab3-4695-b0c4-db2ba665ff25.sql` | relationship_health_scores, relationship_health_events, relationship_opportunities | — | — | 8 | 3 | — |
| 348 | `20260526230651_179bacd0-65a8-4802-a2ce-84ea74f84e3b.sql` | trust_risk_events, trust_action_recommendations, abuse_message_flags | — | — | 8 | 3 | — |
| 349 | `20260526231030_69ff63e9-76fa-41a4-b9c1-25c1dd66f1a5.sql` | internal_handoff_records, internal_sla_policies, internal_sla_breaches | — | — | 9 | 3 | — |
| 350 | `20260526231609_1f54fae2-e4d3-4915-9bd1-2312f3882365.sql` | environment_records, deployment_records, migration_records, edge_function_records, environment_variable_records | — | — | 15 | 5 | — |
| 351 | `20260526232125_76d451af-31bc-42e0-99ec-db7f087d57f7.sql` | platform_performance_events, platform_cost_records, platform_scalability_recommendations | — | — | 12 | 3 | — |
| 352 | `20260527070329_d5d0922b-2a26-4e73-86ed-028832fd2561.sql` | collections_overdue_invoices, collections_failed_payments, collections_recovery_actions, collections_reminder_drafts, collections_payment_plans, collections_service_hold_recommendations, collections_writeoff_decisions | — | — | 1 | 7 | — |
| 353 | `20260527071353_45c4bc74-dce8-4c91-9a97-85a5350c3d35.sql` | voc_feedback_records, voc_feature_requests, voc_testimonial_candidates, voc_review_requests, voc_churn_reasons, voc_pmf_signals, voc_insights | — | — | 1 | 7 | — |
| 354 | `20260527071910_0efb3e77-c006-4850-96c7-76423e97ea52.sql` | experiment_plans, experiment_variants, experiment_metrics, experiment_results, experiment_winners, experiment_failures, experiment_learnings | — | — | 7 | 7 | — |
| 355 | `20260527072353_bf5423af-1b56-4858-8172-c5431e1e37a2.sql` | winddown_plans, winddown_checklist_items, winddown_customer_offboarding, winddown_vendor_cancellations, winddown_contract_terminations, winddown_data_retention, winddown_legal_reviews | — | — | 7 | 7 | — |
| 356 | `20260527072811_64b53983-1f3c-4d1a-88d9-ed1a402a9471.sql` | policy_templates, policy_requirements, policy_drafts, policy_approvals, policy_public_pages, policy_review_events | — | — | 6 | 6 | — |
| 357 | `20260527073320_d98e5a98-45d7-4807-9c08-e43013b34785.sql` | agent_registry, agent_capabilities, agent_prohibited_actions, agent_approval_requirements, agent_escalation_triggers, agent_module_permissions, agent_boundary_violations | — | — | 7 | 7 | — |
| 358 | `20260527073814_38169eef-67bc-41a0-83cf-09d46d109143.sql` | attention_load_snapshots, attention_noise_rules, attention_focus_priorities, attention_fatigue_warnings, attention_delegation_items, attention_never_hide_items | — | — | 6 | 6 | — |
| 359 | `20260527080557_2e3d410b-f083-4473-a601-47322b75f741.sql` | system_runtime_state, system_mode_ledger | — | log_system_mode_change | 4 | 2 | — |
| 360 | `20260527082242_b9920dc2-2892-47b4-b00b-05ebce835d94.sql` | liftor_snapshots, liftor_recovery_actions | — | tg_liftor_snapshots_immutable, tg_liftor_recovery_actions_append_only | 4 | 2 | — |
| 361 | `20260527082631_62b30b52-96c6-4153-8783-df8fcdfefa4b.sql` | business_runtime_activation, business_runtime_activation_log | — | block_activation_log_mutation | 6 | 2 | — |
| 362 | `20260528074733_d52d73bb-583f-4150-91f8-6e4e218e113f.sql` | funding_imports, funding_problem_clusters, funding_radar_companies, funding_radar_scores, funding_monthly_runs, funding_shortlist | — | — | 24 | 6 | — |
| 363 | `20260528093628_a819f3aa-51ca-4e24-9408-f464079b9827.sql` | funding_watchlist, funding_weakness_signals | — | — | 8 | 2 | — |
| 364 | `20260528094710_8f0f5d60-474d-4e30-b0d9-9caf55d7ea44.sql` | funding_market_maps, funding_white_space_opportunities | — | — | 8 | 2 | — |
| 365 | `20260528101509_98d8a6a8-dcc2-447f-bc6b-d8d93dba988e.sql` | business_autopsies | — | — | 4 | 1 | — |
| 366 | `20260601083608_dcc5af8f-90cd-4736-b95d-6746f22f5beb.sql` | — | — | get_customer_quarterly_report_by_token, get_customer_survey_request_by_token | 4 | — | policy |
| 367 | `20260603112845_2d003256-517b-4542-869c-d348eb0a171d.sql` | ai_compliance_systems, ai_data_flow_records, ai_human_oversight_records, ai_compliance_evidence_items, ai_compliance_gap_actions | — | update_updated_at_column | 5 | 5 | — |
| 368 | `20260603143234_ab041d67-0721-40e2-9cbf-4eb5a9bd295f.sql` | portfolio_exit_target_settings, portfolio_exit_targets, portfolio_exit_target_alerts | — | — | 3 | 3 | — |
| 369 | `20260603144940_6ff1509c-13f3-4f8e-8244-6b196d08dde6.sql` | distressed_acquisition_opportunities, distressed_disposal_assets, distressed_deal_financing_options | — | — | 3 | 3 | — |
| 370 | `20260603151256_1eac80e0-7b73-47e2-88bb-e640df19c33b.sql` | acquisition_funding_opportunities, acquisition_funding_sources, acquisition_funding_deal_structures, acquisition_funding_pitch_packs | — | touch_acquisition_funding_updated_at | 4 | 4 | — |
| 371 | `20260605093325_dec4062c-563a-4b1e-972e-ea93904e6ac3.sql` | — | — | — | — | — | — |
| 372 | `20260605093444_66621891-36ea-47bc-9649-0d144901329c.sql` | worker_profiles, worker_access_windows, worker_sessions, worker_tasks, worker_task_logs, worker_evidence_uploads, worker_oversight_reviews, worker_audit_events _(+3)_ | — | hwc_touch_updated_at, current_worker_id, is_kill_switch_active, worker_has_active_window, is_founder | 34 | 11 | — |
| 373 | `20260605094241_dfb2dbdb-f03f-46e5-aa91-4aab3ffc26f0.sql` | automation_runbooks, campaign_factory_batches, business_campaign_plans, outreach_campaign_drafts, social_campaign_drafts, campaign_approval_packs, campaign_operator_checks, campaign_oversight_checks | — | — | 19 | 8 | — |
| 374 | `20260605094807_adc1a33b-37ab-4f2b-aba5-2dd7d48d0026.sql` | worker_manuals, worker_manual_sections, worker_help_requests | — | — | 7 | 3 | — |
| 375 | `20260605104321_7d1829d5-67a0-486c-96f4-7f962cc75ad8.sql` | — | — | get_proposal_by_token | 20 | — | policy, function |
| 376 | `20260610111209_13a0d711-e704-4061-a033-e65ae5a3c1ca.sql` | — | qtc_payment_architecture_readiness | qtc_payments_normalise, qtc_on_payment_succeeded | — | — | — |
| 377 | `20260610111233_c88dd5f1-15bd-40b9-821c-1f58b7fdb956.sql` | — | — | — | — | — | view |
| 378 | `20260610111912_698fcf4d-6091-4d10-822f-59f39ab84f41.sql` | stripe_webhook_events | — | — | 1 | 1 | — |
| 379 | `20260610112828_dfb84e16-8e0b-43fa-b085-3c3a1139f86f.sql` | — | — | — | — | — | — |
| 380 | `20260610123007_6ab31cde-1599-4113-9d06-811835c2469a.sql` | video_sop_assets, video_sop_scripts, video_sop_training_assignments, video_sop_links, video_sop_audit_events | — | — | 6 | 5 | — |
| 381 | `20260610123632_ae6659bd-964a-454f-b659-950745974ca7.sql` | — | — | — | — | — | — |
| 382 | `20260610124901_1418d9bb-0f72-4af4-a2a0-8421fda1fb1e.sql` | — | — | — | — | — | — |
| 383 | `20260610125820_dece298c-207b-45a3-82d1-93b96de15868.sql` | relationship_intelligence_contacts, relationship_intelligence_events | — | — | 2 | 2 | — |
| 384 | `20260615124641_a6f10d9c-fee7-4e94-9e6b-70c0ce196d5b.sql` | — | — | — | — | 2 | — |
| 385 | `20260615132136_7ad50603-919b-42b8-8ef2-74cb3b63617a.sql` | pr_sources, pr_inbound_messages, media_opportunities, media_outlets, journalist_relationships, sector_leader_profiles, media_opportunity_matches, business_press_readiness _(+8)_ | — | — | 1 | 1 | — |
| 386 | `20260615175242_39fb808d-2160-483f-a8c5-bda37514b1d0.sql` | — | — | — | — | — | — |
| 387 | `20260616094212_f54cbbc1-921e-4621-8a04-ed26ceced035.sql` | video_library_items, video_transcript_segments, video_library_chapters, video_library_access_grants, video_library_training_assignments, video_library_qa_log, video_library_redaction_reviews, video_library_search_audit _(+1)_ | — | video_library_touch_updated_at, match_video_segments | 9 | 9 | — |
| 388 | `20260616095512_de377659-19ab-468c-b00f-d7e318d35484.sql` | video_library_audit_events | — | — | 2 | 1 | — |
| 389 | `20260616101108_3f98c137-f56d-4280-8786-806d1a637d00.sql` | — | — | recompute_video_buyer_handover_ready | — | — | — |
| 390 | `20260616112310_ef9b0f7f-e581-4d4a-a815-8a4370d7c225.sql` | healthcare_readiness, healthcare_credentials, healthcare_safeguarding_records, healthcare_clinical_incidents, healthcare_regulatory_evidence, healthcare_data_governance, healthcare_audit_events | — | is_founder_or_admin, healthcare_set_updated_at | 8 | 7 | — |
| 391 | `20260616124220_3ee6d314-8fca-4151-8add-3f1fd2445e2f.sql` | insurance_claims, insurance_claim_events, statutory_filings, statutory_filing_events, corporate_secretarial_records, corporate_secretarial_events, international_expansion_runs, international_expansion_events _(+7)_ | — | tg_set_updated_at | 15 | 15 | — |
| 392 | `20260616124248_a0f95598-89dd-4a32-a63c-cbffaa261afa.sql` | — | — | tg_set_updated_at | — | — | — |
| 393 | `20260616144056_fcff2bce-81bd-42a0-8d12-540c21d76f39.sql` | founder_led_sale_reviews, founder_led_buyer_targets, founder_led_sale_readiness_scores | — | enforce_founder_approval_for_buyer_outreach | 3 | 3 | — |
| 394 | `20260616144411_30ef7d6c-aef6-4cec-8e1e-4acbc4c878c2.sql` | business_exit_intelligence_profiles, competitor_intelligence_map, customer_prospect_segment_map | — | auto_create_exit_intelligence_profile | 3 | 3 | — |
| 395 | `20260616144716_fd94bf13-a167-408c-8fe3-fe18077f95c3.sql` | founder_led_buyer_warm_up_actions | — | enforce_founder_approval_for_warm_up_action | 1 | 1 | — |
| 396 | `20260617101418_502a11d6-ccb6-47bc-a920-8127bceabe75.sql` | business_setup_tunnel_runs | — | — | 1 | 1 | — |
| 397 | `20260617133838_ba4e92c9-11e7-4da3-abfe-c59c5191a2f1.sql` | — | — | — | — | — | — |
| 398 | `20260617145714_1de2fbc3-e11c-45f8-b228-7f46b4294449.sql` | business_sales_targets, business_sales_pace_calculations, business_revenue_events, business_commercial_daily_snapshots | — | — | 4 | 4 | — |
| 399 | `20260622130255_96de5c57-00c7-491c-a55a-363e84e3eb8a.sql` | relationship_intelligence_import_holds, relationship_intelligence_import_audit | — | — | 3 | 2 | — |
| 400 | `20260623195504_d69af0e8-039d-461d-a9f1-d4b672724874.sql` | — | — | — | 9 | — | policy |
| 401 | `20260804195001_8f8295a8-8af8-43e8-a464-a079ee52927f.sql` | social_provider_channels, social_business_channel_map, social_distribution_policies, social_distribution_pauses | — | update_updated_at_column | 4 | 4 | — |
| 402 | `20260804200430_7a0512a2-bc81-4b3b-91e5-9feb57530ab1.sql` | — | — | social_claim_distribution_job | — | — | — |
| 403 | `20260805021320_1954d656-ef53-4179-afe6-216ffc0ec32e.sql` | social_distribution_dispatch_runs | — | — | 1 | 1 | — |
| 404 | `20260805055211_b7395c17-2cd0-4ea3-b731-da61458b6791.sql` | social_relationship_provider_connections, social_relationship_accounts, social_relationship_capabilities, social_relationship_searches, social_relationship_profiles, social_relationship_target_lists, social_relationship_targets, social_relationship_action_queue _(+10)_ | — | — | 4 | 1 | policy |
| 405 | `20260805061039_2d65dc6a-672c-4f44-a9c0-8494fbda7b42.sql` | — | — | social_relationship_claim_action | — | — | — |
| 406 | `20260805063340_2b6ad32c-e038-4887-bae8-f338e19e608d.sql` | — | — | social_relationship_claim_action | — | — | — |
| 407 | `20260805085259_71e9963c-5a51-4402-89e2-e09551f63752.sql` | social_viral_provider_connections, social_viral_watchlists, social_viral_sync_runs, social_viral_signals, social_viral_opportunities, social_viral_score_snapshots, social_viral_content_briefs, social_viral_audit | — | — | 9 | 8 | — |
| 408 | `20260820152039_e32fceb7-81dd-4fd2-8030-aaad2ebb5c7e.sql` | billionaire_coverage, billionaire_candidate_routes, billionaire_enrichment_queue | — | rebuild_billionaire_coverage | 3 | 3 | policy |
| 409 | `20260820152142_c8682a6d-2d87-4b6d-8eb8-c2a4e469a79e.sql` | — | — | assert_founder_or_service | — | — | — |
| 410 | `20260820152213_751fa4ed-8c3c-47a1-b595-018d834f3a51.sql` | — | — | — | — | — | function |
| 411 | `20260820152924_2068445f-92b7-4fad-81dc-b089a2fe95ac.sql` | billionaire_wealth_snapshots | — | bi_normalize_name | 1 | 1 | policy |
| 412 | `20260820153209_69ef82f8-3e48-434c-a277-8dcfed82c748.sql` | — | — | derive_billionaire_route_evidence_states, map_billionaire_network_evidence, match_billionaire_wealth_snapshots | — | — | — |
| 413 | `20260820153356_eb27e57b-e5b8-4982-bc31-be27b748735b.sql` | — | billionaire_completion_metrics | rebuild_billionaire_coverage | — | — | — |
| 414 | `20260820153439_cc59e5ba-a0ba-4ef0-803a-00f1f8dc7840.sql` | — | — | match_billionaire_wealth_snapshots | — | — | — |
| 415 | `20260820164603_d9905774-39d9-46e7-a6a5-8f41ed2e2f9a.sql` | — | — | process_billionaire_enrichment_batch, run_billionaire_enrichment_batches | — | — | — |
| 416 | `20260820164714_a1e0903c-9a22-4a21-8c89-333d78c4518d.sql` | — | — | process_billionaire_enrichment_batch | — | — | table |
| 417 | `20260820164823_d4177882-92e7-4cfd-9880-0aa2d0fdcbdc.sql` | — | — | process_billionaire_enrichment_batch | — | — | table |
| 418 | `20260820164842_e79f1f76-1d93-41ac-8299-d8405f393575.sql` | — | — | — | — | — | — |
| 419 | `20260820164909_3953bfc5-939c-4984-b2c3-dd5748c5aa78.sql` | — | — | — | — | — | — |
| 420 | `20260820164948_18fcd45f-67ec-4896-a038-cb21d67ce324.sql` | — | — | — | — | — | — |
| 421 | `20260820165013_8abf5586-e921-4813-8764-91071d6d5fac.sql` | — | — | — | — | — | — |
| 422 | `20260822093600_philanthropy_network_intelligence.sql` | philanthropy_network_registry, philanthropy_network_contacts, philanthropy_network_research_queue | — | — | 3 | 3 | policy |
| 423 | `20260822104000_wealth_intelligence_crm_firewall.sql` | — | — | — | — | — | — |
| 424 | `20260824140000_create_billionaire_access_research_2026.sql` | billionaire_access_research_2026 | — | — | 1 | 1 | policy |
| 425 | `20260824140100_seed_billionaire_access_research_2026_part_1.sql` | — | — | — | — | — | — |
| 426 | `20260824140200_seed_billionaire_access_research_2026_part_2.sql` | — | — | — | — | — | — |
| 427 | `20260824140300_seed_billionaire_access_research_2026_part_3.sql` | — | — | — | — | — | — |
| 428 | `20260824140400_seed_billionaire_access_research_2026_part_4.sql` | — | — | — | — | — | — |
| 429 | `20260824140500_reconcile_billionaire_access_research_2026.sql` | — | billionaire_access_research_2026_summary | — | — | — | — |
| 430 | `20260824182239_c02d1bc3-4db1-41c6-9ea1-2edc32d19994.sql` | — | — | — | — | — | — |
| 431 | `20260824182355_87db0fb7-9f0d-456d-94bc-e73e5dfa3d97.sql` | — | — | — | — | — | — |
| 432 | `20260910124549_bcf8def1-42aa-41e0-b81a-9be1aa02d55b.sql` | apollo_portfolio_credit_policy, apollo_credit_reservations, apollo_paid_attempts | — | apollo_credit_status, apollo_credit_reserve, apollo_credit_settle, apollo_credit_release | 3 | 3 | policy |
| 433 | `20260910124626_da50de26-033a-40a0-bd29-6c551825c0f4.sql` | — | — | apollo_credit_status | — | — | — |
| 434 | `20260910130924_68337f7d-5aa5-44b9-98d2-1b4e12dff107.sql` | — | — | — | — | — | — |
| 435 | `20260910132000_education_crm_native.sql` | — | — | — | — | — | — |
| 436 | `20260910141224_c49687d4-ce8b-4236-abbc-75f074e1911d.sql` | portfolio_collision_policy, portfolio_contact_ownership, portfolio_ownership_events | education_commercial_funnel | claim_portfolio_contact, release_portfolio_contact | 4 | 3 | policy |
| 437 | `20260910141309_d77d2254-3cb3-4775-ae55-c13166b3a818.sql` | — | — | — | — | — | — |
| 438 | `20260910173215_833caa6c-0306-464e-9e23-5dc276c42ea2.sql` | gsm_sending_domains, gsm_mailboxes, gsm_sender_pools, gsm_mailbox_allocations, gsm_provider_sync_runs | — | gsm_touch_updated_at | 5 | 5 | — |
| 439 | `20260910175233_33e50675-225e-4b09-b36b-282510144fca.sql` | — | gsm_mailbox_readiness | gsm_mailbox_is_campaign_ready | — | — | — |
| 440 | `20260911115808_89a4f641-3c5c-4932-8273-19d146743349.sql` | smartlead_send_dry_run_audit | — | — | 1 | 1 | — |
| 441 | `20260911124000_smartlead_send_dry_run_audit.sql` | smartlead_send_dry_run_audit | — | — | 1 | 1 | — |
| 442 | `20260914094059_6e161001-ebbd-4f16-9462-f0241fa04b30.sql` | — | — | — | — | — | — |
