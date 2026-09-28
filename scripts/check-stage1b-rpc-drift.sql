-- Stage 1B RPC classification/effective-privilege drift checker.
-- Read-only except for PostgreSQL's procedural assertion block.
-- Run with: psql -v ON_ERROR_STOP=1 -f scripts/check-stage1b-rpc-drift.sql
--
-- The VALUES registry is deliberately checked against pg_proc so a new public
-- function cannot appear without an explicit classification.
-- The pre-change live set reconciles 18 exact anon application signatures;
-- after Stage 1B, the intended effective anon set is eight capability RPCs
-- plus has_role() for PUBLIC-targeted RLS policies (nine total).

\set ON_ERROR_STOP on

DO $stage1b_rpc_check$
DECLARE
  v_hard_findings jsonb;
  v_managed_residuals jsonb;
BEGIN
  WITH classified(typed_signature, function_name, classification) AS (
    VALUES
    ('public._is_founder_or_admin()', '_is_founder_or_admin', 'DB_INTERNAL'),
    ('public.sor_touch_updated_at()', 'sor_touch_updated_at', 'DB_INTERNAL'),
    ('public.accept_proposal_by_token(text)', 'accept_proposal_by_token', 'PUBLIC_ANON'),
    ('public.acquire_ai_lease(text, uuid, uuid, integer, integer, text, text, integer)', 'acquire_ai_lease', 'SERVICE_ROLE_INTERNAL'),
    ('public.activate_outreach_campaign(uuid)', 'activate_outreach_campaign', 'FOUNDER_ADMIN_ONLY'),
    ('public.ai_actions_today(uuid)', 'ai_actions_today', 'SERVICE_ROLE_INTERNAL'),
    ('public.apollo_credit_release(text, text)', 'apollo_credit_release', 'SERVICE_ROLE_INTERNAL'),
    ('public.apollo_credit_reserve(text, text, integer, text, uuid, text, text[], jsonb)', 'apollo_credit_reserve', 'SERVICE_ROLE_INTERNAL'),
    ('public.apollo_credit_settle(text, integer, text[], text[], jsonb)', 'apollo_credit_settle', 'SERVICE_ROLE_INTERNAL'),
    ('public.apollo_credit_status()', 'apollo_credit_status', 'FOUNDER_ADMIN_ONLY'),
    ('public.apollo_decrypt_key(bytea, text)', 'apollo_decrypt_key', 'SERVICE_ROLE_INTERNAL'),
    ('public.apollo_encrypt_key(text, text)', 'apollo_encrypt_key', 'SERVICE_ROLE_INTERNAL'),
    ('public.apply_reply_stop_suppression(uuid, text, text)', 'apply_reply_stop_suppression', 'DEAD_OR_LEGACY'),
    ('public.apply_reputation_event(uuid, uuid, reputation_event_type, text)', 'apply_reputation_event', 'DB_INTERNAL'),
    ('public.array_to_halfvec(double precision[], integer, boolean)', 'array_to_halfvec', 'DB_INTERNAL'),
    ('public.array_to_halfvec(integer[], integer, boolean)', 'array_to_halfvec', 'DB_INTERNAL'),
    ('public.array_to_halfvec(numeric[], integer, boolean)', 'array_to_halfvec', 'DB_INTERNAL'),
    ('public.array_to_halfvec(real[], integer, boolean)', 'array_to_halfvec', 'DB_INTERNAL'),
    ('public.array_to_sparsevec(double precision[], integer, boolean)', 'array_to_sparsevec', 'DB_INTERNAL'),
    ('public.array_to_sparsevec(integer[], integer, boolean)', 'array_to_sparsevec', 'DB_INTERNAL'),
    ('public.array_to_sparsevec(numeric[], integer, boolean)', 'array_to_sparsevec', 'DB_INTERNAL'),
    ('public.array_to_sparsevec(real[], integer, boolean)', 'array_to_sparsevec', 'DB_INTERNAL'),
    ('public.array_to_vector(double precision[], integer, boolean)', 'array_to_vector', 'DB_INTERNAL'),
    ('public.array_to_vector(integer[], integer, boolean)', 'array_to_vector', 'DB_INTERNAL'),
    ('public.array_to_vector(numeric[], integer, boolean)', 'array_to_vector', 'DB_INTERNAL'),
    ('public.array_to_vector(real[], integer, boolean)', 'array_to_vector', 'DB_INTERNAL'),
    ('public.assign_inbox_for_contact(uuid)', 'assign_inbox_for_contact', 'SERVICE_ROLE_INTERNAL'),
    ('public.auto_create_exit_intelligence_profile()', 'auto_create_exit_intelligence_profile', 'DB_INTERNAL'),
    ('public.auto_partial_rebuild()', 'auto_partial_rebuild', 'DEAD_OR_LEGACY'),
    ('public.auto_resolve_system_events()', 'auto_resolve_system_events', 'DB_INTERNAL'),
    ('public.bi_normalize_name(text)', 'bi_normalize_name', 'DB_INTERNAL'),
    ('public.binary_quantize(halfvec)', 'binary_quantize', 'DB_INTERNAL'),
    ('public.binary_quantize(vector)', 'binary_quantize', 'DB_INTERNAL'),
    ('public.block_activation_log_mutation()', 'block_activation_log_mutation', 'DB_INTERNAL'),
    ('public.bump_inbox_send_count()', 'bump_inbox_send_count', 'DB_INTERNAL'),
    ('public.bump_rule_hit_count()', 'bump_rule_hit_count', 'DB_INTERNAL'),
    ('public.cancel_queue_on_inbound_comm()', 'cancel_queue_on_inbound_comm', 'DB_INTERNAL'),
    ('public.cancel_queue_on_reply()', 'cancel_queue_on_reply', 'DB_INTERNAL'),
    ('public.check_outreach_allowed(uuid)', 'check_outreach_allowed', 'FOUNDER_ADMIN_ONLY'),
    ('public.check_outreach_allowed(uuid, uuid)', 'check_outreach_allowed', 'SERVICE_ROLE_INTERNAL'),
    ('public.check_send_throttle(uuid, uuid)', 'check_send_throttle', 'SERVICE_ROLE_INTERNAL'),
    ('public.claim_portfolio_contact(uuid, text, text, uuid, boolean, text)', 'claim_portfolio_contact', 'FOUNDER_ADMIN_ONLY'),
    ('public.cleanup_stale_ai_leases()', 'cleanup_stale_ai_leases', 'FOUNDER_ADMIN_ONLY'),
    ('public.compare_system_versions(integer, integer)', 'compare_system_versions', 'FOUNDER_ADMIN_ONLY'),
    ('public.compliance_check_assignment(uuid)', 'compliance_check_assignment', 'DB_INTERNAL'),
    ('public.compliance_check_contact(uuid)', 'compliance_check_contact', 'DB_INTERNAL'),
    ('public.compliance_check_demo(uuid)', 'compliance_check_demo', 'DB_INTERNAL'),
    ('public.compliance_check_invoice(uuid)', 'compliance_check_invoice', 'DB_INTERNAL'),
    ('public.compliance_check_outbound_communication(uuid)', 'compliance_check_outbound_communication', 'DB_INTERNAL'),
    ('public.compliance_check_payment(uuid)', 'compliance_check_payment', 'DB_INTERNAL'),
    ('public.compliance_check_proposal(uuid)', 'compliance_check_proposal', 'DB_INTERNAL'),
    ('public.compliance_score_for(text, uuid)', 'compliance_score_for', 'DB_INTERNAL'),
    ('public.compute_assignment_sla(date, assignment_status)', 'compute_assignment_sla', 'DB_INTERNAL'),
    ('public.compute_intent_score(uuid)', 'compute_intent_score', 'DB_INTERNAL'),
    ('public.compute_system_health()', 'compute_system_health', 'DB_INTERNAL'),
    ('public.cosine_distance(halfvec, halfvec)', 'cosine_distance', 'DB_INTERNAL'),
    ('public.cosine_distance(sparsevec, sparsevec)', 'cosine_distance', 'DB_INTERNAL'),
    ('public.cosine_distance(vector, vector)', 'cosine_distance', 'DB_INTERNAL'),
    ('public.country_to_timezone(text)', 'country_to_timezone', 'DB_INTERNAL'),
    ('public.crm_match_interaction_preview(uuid, uuid, text, text, text, uuid)', 'crm_match_interaction_preview', 'SERVICE_ROLE_INTERNAL'),
    ('public.current_worker_id()', 'current_worker_id', 'DB_INTERNAL'),
    ('public.customer_sales_link_contact_by_email(text)', 'customer_sales_link_contact_by_email', 'WEBHOOK_SYSTEM'),
    ('public.derive_billionaire_route_evidence_states()', 'derive_billionaire_route_evidence_states', 'DB_INTERNAL'),
    ('public.detect_anomalies()', 'detect_anomalies', 'FOUNDER_ADMIN_ONLY'),
    ('public.detect_orphan_content()', 'detect_orphan_content', 'FOUNDER_ADMIN_ONLY'),
    ('public.domain_for_inbox(uuid)', 'domain_for_inbox', 'DB_INTERNAL'),
    ('public.eligible_suppliers_for_deal(uuid)', 'eligible_suppliers_for_deal', 'FOUNDER_ADMIN_ONLY'),
    ('public.enforce_founder_approval_for_buyer_outreach()', 'enforce_founder_approval_for_buyer_outreach', 'DB_INTERNAL'),
    ('public.enforce_founder_approval_for_warm_up_action()', 'enforce_founder_approval_for_warm_up_action', 'DB_INTERNAL'),
    ('public.enforce_inbox_ramp(uuid)', 'enforce_inbox_ramp', 'SERVICE_ROLE_INTERNAL'),
    ('public.enrich_all_contacts()', 'enrich_all_contacts', 'DEAD_OR_LEGACY'),
    ('public.enrich_contact(uuid)', 'enrich_contact', 'DB_INTERNAL'),
    ('public.escalate_retry_failure(uuid)', 'escalate_retry_failure', 'DEAD_OR_LEGACY'),
    ('public.evaluate_ai_reply(text)', 'evaluate_ai_reply', 'DEAD_OR_LEGACY'),
    ('public.expire_demos()', 'expire_demos', 'DB_INTERNAL'),
    ('public.expire_inactive_conversations()', 'expire_inactive_conversations', 'SERVICE_ROLE_INTERNAL'),
    ('public.export_full_system_snapshot()', 'export_full_system_snapshot', 'FOUNDER_ADMIN_ONLY'),
    ('public.finance_mark_overdue_invoices()', 'finance_mark_overdue_invoices', 'SERVICE_ROLE_INTERNAL'),
    ('public.finance_target_vs_actual(text, date)', 'finance_target_vs_actual', 'FOUNDER_ADMIN_ONLY'),
    ('public.flag_idle_assignments()', 'flag_idle_assignments', 'DEAD_OR_LEGACY'),
    ('public.founder_confirm_assignment(uuid)', 'founder_confirm_assignment', 'FOUNDER_ADMIN_ONLY'),
    ('public.generate_invoice_number()', 'generate_invoice_number', 'DEAD_OR_LEGACY'),
    ('public.generate_system_tasks_from_priority(priority_entity_type, uuid)', 'generate_system_tasks_from_priority', 'DB_INTERNAL'),
    ('public.get_active_execution_mode(text)', 'get_active_execution_mode', 'DB_INTERNAL'),
    ('public.get_business_outbound_status(text)', 'get_business_outbound_status', 'FOUNDER_ADMIN_ONLY'),
    ('public.get_crm_contact_360_summary(uuid, uuid)', 'get_crm_contact_360_summary', 'FOUNDER_ADMIN_ONLY'),
    ('public.get_crm_contact_timeline(uuid, uuid, integer)', 'get_crm_contact_timeline', 'FOUNDER_ADMIN_ONLY'),
    ('public.get_crm_interaction_ledger_summary(uuid)', 'get_crm_interaction_ledger_summary', 'FOUNDER_ADMIN_ONLY'),
    ('public.get_crm_relationship_timeline(uuid, integer)', 'get_crm_relationship_timeline', 'DEAD_OR_LEGACY'),
    ('public.get_customer_quarterly_report_by_token(text)', 'get_customer_quarterly_report_by_token', 'PUBLIC_ANON'),
    ('public.get_customer_survey_request_by_token(text)', 'get_customer_survey_request_by_token', 'PUBLIC_ANON'),
    ('public.get_inbox_credentials_for_send(uuid, text)', 'get_inbox_credentials_for_send', 'SERVICE_ROLE_INTERNAL'),
    ('public.get_inbox_imap_credentials(uuid, text)', 'get_inbox_imap_credentials', 'SERVICE_ROLE_INTERNAL'),
    ('public.get_outbound_status()', 'get_outbound_status', 'FOUNDER_ADMIN_ONLY'),
    ('public.get_outreach_send_cron_status()', 'get_outreach_send_cron_status', 'SERVICE_ROLE_INTERNAL'),
    ('public.get_proposal_by_token(text)', 'get_proposal_by_token', 'PUBLIC_ANON'),
    ('public.get_system_mode()', 'get_system_mode', 'DB_INTERNAL'),
    ('public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)', 'gin_extract_query_trgm', 'DB_INTERNAL'),
    ('public.gin_extract_value_trgm(text, internal)', 'gin_extract_value_trgm', 'DB_INTERNAL'),
    ('public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)', 'gin_trgm_consistent', 'DB_INTERNAL'),
    ('public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)', 'gin_trgm_triconsistent', 'DB_INTERNAL'),
    ('public.gsm_mailbox_is_campaign_ready(text, text, text, text, text, text, integer, integer, boolean, boolean, text, text, text)', 'gsm_mailbox_is_campaign_ready', 'DEAD_OR_LEGACY'),
    ('public.gsm_touch_updated_at()', 'gsm_touch_updated_at', 'DB_INTERNAL'),
    ('public.gtrgm_compress(internal)', 'gtrgm_compress', 'DB_INTERNAL'),
    ('public.gtrgm_consistent(internal, text, smallint, oid, internal)', 'gtrgm_consistent', 'DB_INTERNAL'),
    ('public.gtrgm_decompress(internal)', 'gtrgm_decompress', 'DB_INTERNAL'),
    ('public.gtrgm_distance(internal, text, smallint, oid, internal)', 'gtrgm_distance', 'DB_INTERNAL'),
    ('public.gtrgm_in(cstring)', 'gtrgm_in', 'DB_INTERNAL'),
    ('public.gtrgm_options(internal)', 'gtrgm_options', 'DB_INTERNAL'),
    ('public.gtrgm_out(gtrgm)', 'gtrgm_out', 'DB_INTERNAL'),
    ('public.gtrgm_penalty(internal, internal, internal)', 'gtrgm_penalty', 'DB_INTERNAL'),
    ('public.gtrgm_picksplit(internal, internal)', 'gtrgm_picksplit', 'DB_INTERNAL'),
    ('public.gtrgm_same(gtrgm, gtrgm, internal)', 'gtrgm_same', 'DB_INTERNAL'),
    ('public.gtrgm_union(internal, internal)', 'gtrgm_union', 'DB_INTERNAL'),
    ('public.guard_assignment_creation()', 'guard_assignment_creation', 'DB_INTERNAL'),
    ('public.guard_assignment_supplier_approved()', 'guard_assignment_supplier_approved', 'DB_INTERNAL'),
    ('public.guard_bcr_global_suppression()', 'guard_bcr_global_suppression', 'DB_INTERNAL'),
    ('public.guard_campaign_activation()', 'guard_campaign_activation', 'DB_INTERNAL'),
    ('public.guard_deal_creation()', 'guard_deal_creation', 'DB_INTERNAL'),
    ('public.guard_demo_creation()', 'guard_demo_creation', 'DB_INTERNAL'),
    ('public.guard_email_queue_single_campaign()', 'guard_email_queue_single_campaign', 'DB_INTERNAL'),
    ('public.guard_proposal_creation()', 'guard_proposal_creation', 'DB_INTERNAL'),
    ('public.halfvec(halfvec, integer, boolean)', 'halfvec', 'DB_INTERNAL'),
    ('public.halfvec_accum(double precision[], halfvec)', 'halfvec_accum', 'DB_INTERNAL'),
    ('public.halfvec_add(halfvec, halfvec)', 'halfvec_add', 'DB_INTERNAL'),
    ('public.halfvec_avg(double precision[])', 'halfvec_avg', 'DB_INTERNAL'),
    ('public.halfvec_cmp(halfvec, halfvec)', 'halfvec_cmp', 'DB_INTERNAL'),
    ('public.halfvec_combine(double precision[], double precision[])', 'halfvec_combine', 'DB_INTERNAL'),
    ('public.halfvec_concat(halfvec, halfvec)', 'halfvec_concat', 'DB_INTERNAL'),
    ('public.halfvec_eq(halfvec, halfvec)', 'halfvec_eq', 'DB_INTERNAL'),
    ('public.halfvec_ge(halfvec, halfvec)', 'halfvec_ge', 'DB_INTERNAL'),
    ('public.halfvec_gt(halfvec, halfvec)', 'halfvec_gt', 'DB_INTERNAL'),
    ('public.halfvec_in(cstring, oid, integer)', 'halfvec_in', 'DB_INTERNAL'),
    ('public.halfvec_l2_squared_distance(halfvec, halfvec)', 'halfvec_l2_squared_distance', 'DB_INTERNAL'),
    ('public.halfvec_le(halfvec, halfvec)', 'halfvec_le', 'DB_INTERNAL'),
    ('public.halfvec_lt(halfvec, halfvec)', 'halfvec_lt', 'DB_INTERNAL'),
    ('public.halfvec_mul(halfvec, halfvec)', 'halfvec_mul', 'DB_INTERNAL'),
    ('public.halfvec_ne(halfvec, halfvec)', 'halfvec_ne', 'DB_INTERNAL'),
    ('public.halfvec_negative_inner_product(halfvec, halfvec)', 'halfvec_negative_inner_product', 'DB_INTERNAL'),
    ('public.halfvec_out(halfvec)', 'halfvec_out', 'DB_INTERNAL'),
    ('public.halfvec_recv(internal, oid, integer)', 'halfvec_recv', 'DB_INTERNAL'),
    ('public.halfvec_send(halfvec)', 'halfvec_send', 'DB_INTERNAL'),
    ('public.halfvec_spherical_distance(halfvec, halfvec)', 'halfvec_spherical_distance', 'DB_INTERNAL'),
    ('public.halfvec_sub(halfvec, halfvec)', 'halfvec_sub', 'DB_INTERNAL'),
    ('public.halfvec_to_float4(halfvec, integer, boolean)', 'halfvec_to_float4', 'DB_INTERNAL'),
    ('public.halfvec_to_sparsevec(halfvec, integer, boolean)', 'halfvec_to_sparsevec', 'DB_INTERNAL'),
    ('public.halfvec_to_vector(halfvec, integer, boolean)', 'halfvec_to_vector', 'DB_INTERNAL'),
    ('public.halfvec_typmod_in(cstring[])', 'halfvec_typmod_in', 'DB_INTERNAL'),
    ('public.hamming_distance(bit, bit)', 'hamming_distance', 'DB_INTERNAL'),
    ('public.handle_availability_override_change()', 'handle_availability_override_change', 'DB_INTERNAL'),
    ('public.handle_deal_won()', 'handle_deal_won', 'DB_INTERNAL'),
    ('public.handle_email_bounce()', 'handle_email_bounce', 'DB_INTERNAL'),
    ('public.handle_new_communication()', 'handle_new_communication', 'DB_INTERNAL'),
    ('public.handle_new_user()', 'handle_new_user', 'DB_INTERNAL'),
    ('public.handle_payment_received()', 'handle_payment_received', 'DB_INTERNAL'),
    ('public.handle_supplier_status_change()', 'handle_supplier_status_change', 'DB_INTERNAL'),
    ('public.has_live_ready_inbox(text)', 'has_live_ready_inbox', 'DB_INTERNAL'),
    ('public.has_role(uuid, app_role)', 'has_role', 'DB_INTERNAL'),
    ('public.healthcare_set_updated_at()', 'healthcare_set_updated_at', 'DB_INTERNAL'),
    ('public.hnsw_bit_support(internal)', 'hnsw_bit_support', 'DB_INTERNAL'),
    ('public.hnsw_halfvec_support(internal)', 'hnsw_halfvec_support', 'DB_INTERNAL'),
    ('public.hnsw_sparsevec_support(internal)', 'hnsw_sparsevec_support', 'DB_INTERNAL'),
    ('public.hnswhandler(internal)', 'hnswhandler', 'DB_INTERNAL'),
    ('public.hwc_touch_updated_at()', 'hwc_touch_updated_at', 'DB_INTERNAL'),
    ('public.inbox_is_live_ready(uuid)', 'inbox_is_live_ready', 'DEAD_OR_LEGACY'),
    ('public.inbox_set_provider_blocked(uuid, timestamp with time zone, text)', 'inbox_set_provider_blocked', 'SERVICE_ROLE_INTERNAL'),
    ('public.inbox_warmup_limit(uuid)', 'inbox_warmup_limit', 'DEAD_OR_LEGACY'),
    ('public.inner_product(halfvec, halfvec)', 'inner_product', 'DB_INTERNAL'),
    ('public.inner_product(sparsevec, sparsevec)', 'inner_product', 'DB_INTERNAL'),
    ('public.inner_product(vector, vector)', 'inner_product', 'DB_INTERNAL'),
    ('public.is_agent_live_setting_enabled(text)', 'is_agent_live_setting_enabled', 'SERVICE_ROLE_INTERNAL'),
    ('public.is_feature_enabled(text, text)', 'is_feature_enabled', 'DB_INTERNAL'),
    ('public.is_founder()', 'is_founder', 'DB_INTERNAL'),
    ('public.is_founder_or_admin(uuid)', 'is_founder_or_admin', 'DB_INTERNAL'),
    ('public.is_internal_email(text)', 'is_internal_email', 'WEBHOOK_SYSTEM'),
    ('public.is_internal_identity(text)', 'is_internal_identity', 'DEAD_OR_LEGACY'),
    ('public.is_kill_switch_active()', 'is_kill_switch_active', 'DB_INTERNAL'),
    ('public.is_oversight_reviewer()', 'is_oversight_reviewer', 'DB_INTERNAL'),
    ('public.ivfflat_bit_support(internal)', 'ivfflat_bit_support', 'DB_INTERNAL'),
    ('public.ivfflat_halfvec_support(internal)', 'ivfflat_halfvec_support', 'DB_INTERNAL'),
    ('public.ivfflathandler(internal)', 'ivfflathandler', 'DB_INTERNAL'),
    ('public.jaccard_distance(bit, bit)', 'jaccard_distance', 'DB_INTERNAL'),
    ('public.l1_distance(halfvec, halfvec)', 'l1_distance', 'DB_INTERNAL'),
    ('public.l1_distance(sparsevec, sparsevec)', 'l1_distance', 'DB_INTERNAL'),
    ('public.l1_distance(vector, vector)', 'l1_distance', 'DB_INTERNAL'),
    ('public.l2_distance(halfvec, halfvec)', 'l2_distance', 'DB_INTERNAL'),
    ('public.l2_distance(sparsevec, sparsevec)', 'l2_distance', 'DB_INTERNAL'),
    ('public.l2_distance(vector, vector)', 'l2_distance', 'DB_INTERNAL'),
    ('public.l2_norm(halfvec)', 'l2_norm', 'DB_INTERNAL'),
    ('public.l2_norm(sparsevec)', 'l2_norm', 'DB_INTERNAL'),
    ('public.l2_normalize(halfvec)', 'l2_normalize', 'DB_INTERNAL'),
    ('public.l2_normalize(sparsevec)', 'l2_normalize', 'DB_INTERNAL'),
    ('public.l2_normalize(vector)', 'l2_normalize', 'DB_INTERNAL'),
    ('public.list_inbox_credentials_public(uuid)', 'list_inbox_credentials_public', 'FOUNDER_ADMIN_ONLY'),
    ('public.log_activity(text, text, text, uuid, text)', 'log_activity', 'DB_INTERNAL'),
    ('public.log_business_override_change()', 'log_business_override_change', 'DB_INTERNAL'),
    ('public.log_compliance_event(text, compliance_entity_type, uuid, text, text, text, text, jsonb)', 'log_compliance_event', 'DB_INTERNAL'),
    ('public.log_demo_event(text, text, jsonb)', 'log_demo_event', 'PUBLIC_ANON'),
    ('public.log_feature_flag_change()', 'log_feature_flag_change', 'DB_INTERNAL'),
    ('public.log_feature_skip(text, text, text, uuid)', 'log_feature_skip', 'DB_INTERNAL'),
    ('public.log_new_opportunity()', 'log_new_opportunity', 'DB_INTERNAL'),
    ('public.log_new_proposal()', 'log_new_proposal', 'DB_INTERNAL'),
    ('public.log_new_support_request()', 'log_new_support_request', 'DB_INTERNAL'),
    ('public.log_system_config_change()', 'log_system_config_change', 'DB_INTERNAL'),
    ('public.log_system_event(text, text, uuid, text, system_event_severity, text, jsonb)', 'log_system_event', 'DB_INTERNAL'),
    ('public.log_system_mode_change()', 'log_system_mode_change', 'DB_INTERNAL'),
    ('public.ma_audit_trigger()', 'ma_audit_trigger', 'DB_INTERNAL'),
    ('public.ma_generate_default_data_room(uuid)', 'ma_generate_default_data_room', 'FOUNDER_ADMIN_ONLY'),
    ('public.map_billionaire_network_evidence()', 'map_billionaire_network_evidence', 'FOUNDER_ADMIN_ONLY'),
    ('public.mark_contact_for_founder_review(uuid, text)', 'mark_contact_for_founder_review', 'DEAD_OR_LEGACY'),
    ('public.mark_send_failure(uuid, text)', 'mark_send_failure', 'SERVICE_ROLE_INTERNAL'),
    ('public.match_billionaire_wealth_snapshots(text, date)', 'match_billionaire_wealth_snapshots', 'FOUNDER_ADMIN_ONLY'),
    ('public.match_video_segments(text, vector, integer, uuid, uuid, numeric)', 'match_video_segments', 'SERVICE_ROLE_INTERNAL'),
    ('public.mirror_comm_to_messages_and_invoke_ai()', 'mirror_comm_to_messages_and_invoke_ai', 'DB_INTERNAL'),
    ('public.next_valid_send_time(uuid, timestamp with time zone)', 'next_valid_send_time', 'DEAD_OR_LEGACY'),
    ('public.pick_inbox_for_business(text)', 'pick_inbox_for_business', 'DEAD_OR_LEGACY'),
    ('public.pick_supplier_for_deal(uuid)', 'pick_supplier_for_deal', 'DEAD_OR_LEGACY'),
    ('public.priority_level_from_score(integer)', 'priority_level_from_score', 'DB_INTERNAL'),
    ('public.priority_score_assignment(uuid)', 'priority_score_assignment', 'DB_INTERNAL'),
    ('public.priority_score_contact(uuid)', 'priority_score_contact', 'DB_INTERNAL'),
    ('public.priority_score_conversation(uuid)', 'priority_score_conversation', 'DB_INTERNAL'),
    ('public.priority_score_deal(uuid)', 'priority_score_deal', 'DB_INTERNAL'),
    ('public.priority_score_invoice(uuid)', 'priority_score_invoice', 'DB_INTERNAL'),
    ('public.process_billionaire_enrichment_batch(integer)', 'process_billionaire_enrichment_batch', 'DB_INTERNAL'),
    ('public.process_retry_queue()', 'process_retry_queue', 'DB_INTERNAL'),
    ('public.propagate_billionaire_institution_access()', 'propagate_billionaire_institution_access', 'DEAD_OR_LEGACY'),
    ('public.proposals_needing_followup()', 'proposals_needing_followup', 'DEAD_OR_LEGACY'),
    ('public.proposals_reconcile_crm()', 'proposals_reconcile_crm', 'DB_INTERNAL'),
    ('public.qtc_on_payment_succeeded()', 'qtc_on_payment_succeeded', 'DB_INTERNAL'),
    ('public.qtc_on_quote_accepted()', 'qtc_on_quote_accepted', 'DB_INTERNAL'),
    ('public.qtc_payments_normalise()', 'qtc_payments_normalise', 'DB_INTERNAL'),
    ('public.rebuild_billionaire_coverage()', 'rebuild_billionaire_coverage', 'FOUNDER_ADMIN_ONLY'),
    ('public.rebuild_full_manual()', 'rebuild_full_manual', 'FOUNDER_ADMIN_ONLY'),
    ('public.recalculate_priority(priority_entity_type, uuid)', 'recalculate_priority', 'DB_INTERNAL'),
    ('public.recompute_all_inbox_performance()', 'recompute_all_inbox_performance', 'DEAD_OR_LEGACY'),
    ('public.recompute_all_intent_scores()', 'recompute_all_intent_scores', 'DEAD_OR_LEGACY'),
    ('public.recompute_all_supplier_scores()', 'recompute_all_supplier_scores', 'DEAD_OR_LEGACY'),
    ('public.recompute_business_risk_score(text)', 'recompute_business_risk_score', 'DB_INTERNAL'),
    ('public.recompute_campaign_metrics(uuid)', 'recompute_campaign_metrics', 'SERVICE_ROLE_INTERNAL'),
    ('public.recompute_compliance_score(compliance_entity_type, uuid)', 'recompute_compliance_score', 'DB_INTERNAL'),
    ('public.recompute_domain_reputation(text)', 'recompute_domain_reputation', 'DB_INTERNAL'),
    ('public.recompute_inbox_performance(uuid)', 'recompute_inbox_performance', 'DB_INTERNAL'),
    ('public.recompute_proposal_score(uuid)', 'recompute_proposal_score', 'DB_INTERNAL'),
    ('public.recompute_supplier_load(uuid)', 'recompute_supplier_load', 'DB_INTERNAL'),
    ('public.recompute_supplier_score(uuid)', 'recompute_supplier_score', 'DB_INTERNAL'),
    ('public.recompute_video_buyer_handover_ready(uuid)', 'recompute_video_buyer_handover_ready', 'FOUNDER_ADMIN_ONLY'),
    ('public.record_inbound_poll(uuid, boolean, text, integer)', 'record_inbound_poll', 'WEBHOOK_SYSTEM'),
    ('public.record_inbox_test_send(uuid, boolean, text, text)', 'record_inbox_test_send', 'SERVICE_ROLE_INTERNAL'),
    ('public.record_system_change(text, uuid, text, text, text, integer)', 'record_system_change', 'DB_INTERNAL'),
    ('public.refresh_all_assignment_sla()', 'refresh_all_assignment_sla', 'DEAD_OR_LEGACY'),
    ('public.refresh_all_business_risk_scores()', 'refresh_all_business_risk_scores', 'DEAD_OR_LEGACY'),
    ('public.release_ai_lease(text, boolean)', 'release_ai_lease', 'SERVICE_ROLE_INTERNAL'),
    ('public.release_portfolio_contact(uuid, text, text)', 'release_portfolio_contact', 'FOUNDER_ADMIN_ONLY'),
    ('public.reset_inbox_hourly_counts()', 'reset_inbox_hourly_counts', 'DEAD_OR_LEGACY'),
    ('public.reset_inbox_send_counts()', 'reset_inbox_send_counts', 'DB_INTERNAL'),
    ('public.resolve_contact_by_email(text)', 'resolve_contact_by_email', 'DEAD_OR_LEGACY'),
    ('public.resolve_contact_timezone(uuid)', 'resolve_contact_timezone', 'DB_INTERNAL'),
    ('public.resolve_entity_country(uuid, text)', 'resolve_entity_country', 'DB_INTERNAL'),
    ('public.run_billionaire_enrichment_batches(integer, integer)', 'run_billionaire_enrichment_batches', 'DEAD_OR_LEGACY'),
    ('public.run_compliance_checks(compliance_entity_type, uuid)', 'run_compliance_checks', 'DEAD_OR_LEGACY'),
    ('public.run_domain_protection_check()', 'run_domain_protection_check', 'DEAD_OR_LEGACY'),
    ('public.save_inbox_credentials(uuid, text, text, integer, text, text, text, text, text, text, text)', 'save_inbox_credentials', 'SERVICE_ROLE_INTERNAL'),
    ('public.save_inbox_inbound_config(uuid, text, text, integer, boolean, text, text, boolean, boolean, text, text)', 'save_inbox_inbound_config', 'SERVICE_ROLE_INTERNAL'),
    ('public.score_contact(uuid, text)', 'score_contact', 'SERVICE_ROLE_INTERNAL'),
    ('public.score_proposal_quality(uuid)', 'score_proposal_quality', 'DB_INTERNAL'),
    ('public.seed_supplier_records()', 'seed_supplier_records', 'DB_INTERNAL'),
    ('public.set_assignment_sla()', 'set_assignment_sla', 'DB_INTERNAL'),
    ('public.set_invoice_expected_amount()', 'set_invoice_expected_amount', 'DB_INTERNAL'),
    ('public.set_limit(real)', 'set_limit', 'DB_INTERNAL'),
    ('public.set_proposal_followup_due()', 'set_proposal_followup_due', 'DB_INTERNAL'),
    ('public.set_queue_priority_on_reply()', 'set_queue_priority_on_reply', 'DB_INTERNAL'),
    ('public.set_system_mode(text)', 'set_system_mode', 'DEAD_OR_LEGACY'),
    ('public.set_timezone_confidence()', 'set_timezone_confidence', 'DB_INTERNAL'),
    ('public.severity_weight(compliance_severity)', 'severity_weight', 'DB_INTERNAL'),
    ('public.show_limit()', 'show_limit', 'DB_INTERNAL'),
    ('public.show_trgm(text)', 'show_trgm', 'DB_INTERNAL'),
    ('public.similarity(text, text)', 'similarity', 'DB_INTERNAL'),
    ('public.similarity_dist(text, text)', 'similarity_dist', 'DB_INTERNAL'),
    ('public.similarity_op(text, text)', 'similarity_op', 'DB_INTERNAL'),
    ('public.snapshot_deal_compliance_on_won()', 'snapshot_deal_compliance_on_won', 'DB_INTERNAL'),
    ('public.social_claim_distribution_job(uuid, uuid, text, uuid)', 'social_claim_distribution_job', 'SERVICE_ROLE_INTERNAL'),
    ('public.social_relationship_claim_action(uuid)', 'social_relationship_claim_action', 'SERVICE_ROLE_INTERNAL'),
    ('public.social_set_updated_at()', 'social_set_updated_at', 'DB_INTERNAL'),
    ('public.sparsevec(sparsevec, integer, boolean)', 'sparsevec', 'DB_INTERNAL'),
    ('public.sparsevec_cmp(sparsevec, sparsevec)', 'sparsevec_cmp', 'DB_INTERNAL'),
    ('public.sparsevec_eq(sparsevec, sparsevec)', 'sparsevec_eq', 'DB_INTERNAL'),
    ('public.sparsevec_ge(sparsevec, sparsevec)', 'sparsevec_ge', 'DB_INTERNAL'),
    ('public.sparsevec_gt(sparsevec, sparsevec)', 'sparsevec_gt', 'DB_INTERNAL'),
    ('public.sparsevec_in(cstring, oid, integer)', 'sparsevec_in', 'DB_INTERNAL'),
    ('public.sparsevec_l2_squared_distance(sparsevec, sparsevec)', 'sparsevec_l2_squared_distance', 'DB_INTERNAL'),
    ('public.sparsevec_le(sparsevec, sparsevec)', 'sparsevec_le', 'DB_INTERNAL'),
    ('public.sparsevec_lt(sparsevec, sparsevec)', 'sparsevec_lt', 'DB_INTERNAL'),
    ('public.sparsevec_ne(sparsevec, sparsevec)', 'sparsevec_ne', 'DB_INTERNAL'),
    ('public.sparsevec_negative_inner_product(sparsevec, sparsevec)', 'sparsevec_negative_inner_product', 'DB_INTERNAL'),
    ('public.sparsevec_out(sparsevec)', 'sparsevec_out', 'DB_INTERNAL'),
    ('public.sparsevec_recv(internal, oid, integer)', 'sparsevec_recv', 'DB_INTERNAL'),
    ('public.sparsevec_send(sparsevec)', 'sparsevec_send', 'DB_INTERNAL'),
    ('public.sparsevec_to_halfvec(sparsevec, integer, boolean)', 'sparsevec_to_halfvec', 'DB_INTERNAL'),
    ('public.sparsevec_to_vector(sparsevec, integer, boolean)', 'sparsevec_to_vector', 'DB_INTERNAL'),
    ('public.sparsevec_typmod_in(cstring[])', 'sparsevec_typmod_in', 'DB_INTERNAL'),
    ('public.stamp_business_name_from_invoice()', 'stamp_business_name_from_invoice', 'DB_INTERNAL'),
    ('public.stamp_compliance_event_resolution()', 'stamp_compliance_event_resolution', 'DB_INTERNAL'),
    ('public.strict_word_similarity(text, text)', 'strict_word_similarity', 'DB_INTERNAL'),
    ('public.strict_word_similarity_commutator_op(text, text)', 'strict_word_similarity_commutator_op', 'DB_INTERNAL'),
    ('public.strict_word_similarity_dist_commutator_op(text, text)', 'strict_word_similarity_dist_commutator_op', 'DB_INTERNAL'),
    ('public.strict_word_similarity_dist_op(text, text)', 'strict_word_similarity_dist_op', 'DB_INTERNAL'),
    ('public.strict_word_similarity_op(text, text)', 'strict_word_similarity_op', 'DB_INTERNAL'),
    ('public.subvector(halfvec, integer, integer)', 'subvector', 'DB_INTERNAL'),
    ('public.subvector(vector, integer, integer)', 'subvector', 'DB_INTERNAL'),
    ('public.suggest_replacement_supplier(uuid)', 'suggest_replacement_supplier', 'FOUNDER_ADMIN_ONLY'),
    ('public.supplier_list_assignments(text)', 'supplier_list_assignments', 'PUBLIC_ANON'),
    ('public.supplier_login_with_token(text)', 'supplier_login_with_token', 'PUBLIC_ANON'),
    ('public.supplier_portal_stats()', 'supplier_portal_stats', 'FOUNDER_ADMIN_ONLY'),
    ('public.supplier_update_assignment_status(text, uuid, text, text)', 'supplier_update_assignment_status', 'PUBLIC_ANON'),
    ('public.sync_domain_reputation_on_inbox_change()', 'sync_domain_reputation_on_inbox_change', 'DB_INTERNAL'),
    ('public.sync_supplier_availability_from_assignment()', 'sync_supplier_availability_from_assignment', 'DB_INTERNAL'),
    ('public.tg_liftor_recovery_actions_append_only()', 'tg_liftor_recovery_actions_append_only', 'DB_INTERNAL'),
    ('public.tg_liftor_snapshots_immutable()', 'tg_liftor_snapshots_immutable', 'DB_INTERNAL'),
    ('public.tg_mwi_touch_updated_at()', 'tg_mwi_touch_updated_at', 'DB_INTERNAL'),
    ('public.tg_set_updated_at()', 'tg_set_updated_at', 'DB_INTERNAL'),
    ('public.touch_acquisition_funding_updated_at()', 'touch_acquisition_funding_updated_at', 'DB_INTERNAL'),
    ('public.touch_updated_at()', 'touch_updated_at', 'DB_INTERNAL'),
    ('public.trg_compliance_assignment()', 'trg_compliance_assignment', 'DB_INTERNAL'),
    ('public.trg_compliance_communication()', 'trg_compliance_communication', 'DB_INTERNAL'),
    ('public.trg_compliance_contact()', 'trg_compliance_contact', 'DB_INTERNAL'),
    ('public.trg_compliance_demo()', 'trg_compliance_demo', 'DB_INTERNAL'),
    ('public.trg_compliance_invoice()', 'trg_compliance_invoice', 'DB_INTERNAL'),
    ('public.trg_compliance_payment()', 'trg_compliance_payment', 'DB_INTERNAL'),
    ('public.trg_compliance_proposal()', 'trg_compliance_proposal', 'DB_INTERNAL'),
    ('public.trg_priority_assignment()', 'trg_priority_assignment', 'DB_INTERNAL'),
    ('public.trg_priority_communication()', 'trg_priority_communication', 'DB_INTERNAL'),
    ('public.trg_priority_conversation()', 'trg_priority_conversation', 'DB_INTERNAL'),
    ('public.trg_priority_deal()', 'trg_priority_deal', 'DB_INTERNAL'),
    ('public.trg_priority_demo_event()', 'trg_priority_demo_event', 'DB_INTERNAL'),
    ('public.trg_priority_from_compliance()', 'trg_priority_from_compliance', 'DB_INTERNAL'),
    ('public.trg_priority_invoice()', 'trg_priority_invoice', 'DB_INTERNAL'),
    ('public.trg_recompute_score_on_demo_event()', 'trg_recompute_score_on_demo_event', 'DB_INTERNAL'),
    ('public.trg_recompute_supplier_load()', 'trg_recompute_supplier_load', 'DB_INTERNAL'),
    ('public.trg_recompute_supplier_score_on_assignment()', 'trg_recompute_supplier_score_on_assignment', 'DB_INTERNAL'),
    ('public.trg_reputation_from_email_event()', 'trg_reputation_from_email_event', 'DB_INTERNAL'),
    ('public.trg_score_proposal_quality()', 'trg_score_proposal_quality', 'DB_INTERNAL'),
    ('public.trg_spam_on_dnc()', 'trg_spam_on_dnc', 'DB_INTERNAL'),
    ('public.try_auto_assign_supplier_on_deal_won()', 'try_auto_assign_supplier_on_deal_won', 'DB_INTERNAL'),
    ('public.update_updated_at_column()', 'update_updated_at_column', 'DB_INTERNAL'),
    ('public.upsert_contact(text, text, text, text, text, text, uuid)', 'upsert_contact', 'FOUNDER_ADMIN_ONLY'),
    ('public.validate_campaign_activation(uuid)', 'validate_campaign_activation', 'FOUNDER_ADMIN_ONLY'),
    ('public.validate_full_system_coverage()', 'validate_full_system_coverage', 'FOUNDER_ADMIN_ONLY'),
    ('public.validate_go_live_readiness()', 'validate_go_live_readiness', 'DEAD_OR_LEGACY'),
    ('public.validate_inbox_mapping(uuid)', 'validate_inbox_mapping', 'WEBHOOK_SYSTEM'),
    ('public.validate_runtime_vs_documentation()', 'validate_runtime_vs_documentation', 'FOUNDER_ADMIN_ONLY'),
    ('public.validate_system_integrity()', 'validate_system_integrity', 'DEAD_OR_LEGACY'),
    ('public.vector(vector, integer, boolean)', 'vector', 'DB_INTERNAL'),
    ('public.vector_accum(double precision[], vector)', 'vector_accum', 'DB_INTERNAL'),
    ('public.vector_add(vector, vector)', 'vector_add', 'DB_INTERNAL'),
    ('public.vector_avg(double precision[])', 'vector_avg', 'DB_INTERNAL'),
    ('public.vector_cmp(vector, vector)', 'vector_cmp', 'DB_INTERNAL'),
    ('public.vector_combine(double precision[], double precision[])', 'vector_combine', 'DB_INTERNAL'),
    ('public.vector_concat(vector, vector)', 'vector_concat', 'DB_INTERNAL'),
    ('public.vector_dims(halfvec)', 'vector_dims', 'DB_INTERNAL'),
    ('public.vector_dims(vector)', 'vector_dims', 'DB_INTERNAL'),
    ('public.vector_eq(vector, vector)', 'vector_eq', 'DB_INTERNAL'),
    ('public.vector_ge(vector, vector)', 'vector_ge', 'DB_INTERNAL'),
    ('public.vector_gt(vector, vector)', 'vector_gt', 'DB_INTERNAL'),
    ('public.vector_in(cstring, oid, integer)', 'vector_in', 'DB_INTERNAL'),
    ('public.vector_l2_squared_distance(vector, vector)', 'vector_l2_squared_distance', 'DB_INTERNAL'),
    ('public.vector_le(vector, vector)', 'vector_le', 'DB_INTERNAL'),
    ('public.vector_lt(vector, vector)', 'vector_lt', 'DB_INTERNAL'),
    ('public.vector_mul(vector, vector)', 'vector_mul', 'DB_INTERNAL'),
    ('public.vector_ne(vector, vector)', 'vector_ne', 'DB_INTERNAL'),
    ('public.vector_negative_inner_product(vector, vector)', 'vector_negative_inner_product', 'DB_INTERNAL'),
    ('public.vector_norm(vector)', 'vector_norm', 'DB_INTERNAL'),
    ('public.vector_out(vector)', 'vector_out', 'DB_INTERNAL'),
    ('public.vector_recv(internal, oid, integer)', 'vector_recv', 'DB_INTERNAL'),
    ('public.vector_send(vector)', 'vector_send', 'DB_INTERNAL'),
    ('public.vector_spherical_distance(vector, vector)', 'vector_spherical_distance', 'DB_INTERNAL'),
    ('public.vector_sub(vector, vector)', 'vector_sub', 'DB_INTERNAL'),
    ('public.vector_to_float4(vector, integer, boolean)', 'vector_to_float4', 'DB_INTERNAL'),
    ('public.vector_to_halfvec(vector, integer, boolean)', 'vector_to_halfvec', 'DB_INTERNAL'),
    ('public.vector_to_sparsevec(vector, integer, boolean)', 'vector_to_sparsevec', 'DB_INTERNAL'),
    ('public.vector_typmod_in(cstring[])', 'vector_typmod_in', 'DB_INTERNAL'),
    ('public.video_library_touch_updated_at()', 'video_library_touch_updated_at', 'DB_INTERNAL'),
    ('public.word_similarity(text, text)', 'word_similarity', 'DB_INTERNAL'),
    ('public.word_similarity_commutator_op(text, text)', 'word_similarity_commutator_op', 'DB_INTERNAL'),
    ('public.word_similarity_dist_commutator_op(text, text)', 'word_similarity_dist_commutator_op', 'DB_INTERNAL'),
    ('public.word_similarity_dist_op(text, text)', 'word_similarity_dist_op', 'DB_INTERNAL'),
    ('public.word_similarity_op(text, text)', 'word_similarity_op', 'DB_INTERNAL'),
    ('public.worker_has_active_window(uuid, text)', 'worker_has_active_window', 'DB_INTERNAL')
  ),
  rls_helpers(typed_signature) AS (
    VALUES
      ('public._is_founder_or_admin()'),
      ('public.current_worker_id()'),
      ('public.has_role(uuid, app_role)'),
      ('public.is_founder()'),
      ('public.is_founder_or_admin(uuid)'),
      ('public.is_oversight_reviewer()'),
      ('public.worker_has_active_window(uuid, text)')
  ),
  anon_rls_helpers(typed_signature) AS (
    VALUES ('public.has_role(uuid, app_role)')
  ),
  live AS (
    SELECT
      p.oid,
      format('%I.%I(%s)', n.nspname, p.proname,
        COALESCE((
          SELECT string_agg(format_type(a, NULL), ', ' ORDER BY ordinality)
          FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY AS u(a, ordinality)
        ), '')
      ) AS typed_signature,
      p.proname AS function_name,
      l.lanname AS language,
      pg_get_userbyid(p.proowner) AS owner,
      p.prorettype = 'trigger'::regtype AS returns_trigger,
      p.prosecdef,
      p.proconfig,
      pg_get_functiondef(p.oid) AS definition,
      EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
      ) AS public_execute,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
      has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  ),
  findings AS (
    SELECT jsonb_build_object('code','UNCLASSIFIED_FUNCTION','signature',l.typed_signature) AS finding
    FROM live l LEFT JOIN classified c USING (typed_signature)
    WHERE c.typed_signature IS NULL

    UNION ALL
    SELECT jsonb_build_object('code','PUBLIC_EXECUTE','signature',l.typed_signature)
    FROM live l
    WHERE l.public_execute
      AND NOT (l.language='c' AND l.owner='supabase_admin' AND NOT l.prosecdef)

    UNION ALL
    SELECT jsonb_build_object('code','TRIGGER_HELPER_CLIENT_EXECUTE','signature',l.typed_signature)
    FROM live l
    WHERE l.typed_signature = 'public.sor_touch_updated_at()'
      AND (l.anon_execute OR l.authenticated_execute)

    UNION ALL
    SELECT jsonb_build_object('code','ANON_NOT_ALLOWLISTED','signature',l.typed_signature,'classification',c.classification)
    FROM live l JOIN classified c USING (typed_signature)
    WHERE l.anon_execute
      AND NOT (l.language='c' AND l.owner='supabase_admin' AND NOT l.prosecdef)
      AND NOT l.returns_trigger
      AND c.classification <> 'PUBLIC_ANON'
      AND NOT EXISTS (
        SELECT 1 FROM anon_rls_helpers h WHERE h.typed_signature=l.typed_signature
      )

    UNION ALL
    SELECT jsonb_build_object(
      'code','ANON_APPLICATION_ALLOWLIST_RECONCILIATION_REQUIRED',
      'expected_live_count',9,
      'reconciled_prechange_signature_count',18,
      'candidate_allowlist_count',
        (SELECT count(*) FROM classified WHERE classification='PUBLIC_ANON')
        + (SELECT count(*) FROM anon_rls_helpers),
      'live_count',count(*),
      'live_signatures',COALESCE(jsonb_agg(jsonb_build_object(
        'signature',l.typed_signature,
        'classification',c.classification,
        'owner',l.owner,
        'security_definer',l.prosecdef,
        'search_path',l.proconfig
      ) ORDER BY l.typed_signature),'[]'::jsonb)
    )
    FROM live l LEFT JOIN classified c USING (typed_signature)
    WHERE l.anon_execute
      AND NOT l.returns_trigger
      AND NOT (l.language='c' AND l.owner='supabase_admin' AND NOT l.prosecdef)
    HAVING count(*) <> 9
        OR (SELECT count(*) FROM classified WHERE classification='PUBLIC_ANON')
           + (SELECT count(*) FROM anon_rls_helpers) <> 9

    UNION ALL
    SELECT jsonb_build_object(
      'code','ANON_APPLICATION_COUNT_NOT_CAPTURED',
      'expected_live_count',9,
      'live_count',count(*)
    )
    FROM live l
    WHERE l.anon_execute
      AND NOT l.returns_trigger
      AND NOT (l.language='c' AND l.owner='supabase_admin' AND NOT l.prosecdef)
    HAVING count(*) <> 9

    UNION ALL
    SELECT jsonb_build_object('code','AUTHENTICATED_NOT_ALLOWLISTED','signature',l.typed_signature,'classification',c.classification)
    FROM live l JOIN classified c USING (typed_signature)
    WHERE l.authenticated_execute
      AND NOT (l.language='c' AND l.owner='supabase_admin' AND NOT l.prosecdef)
      AND NOT l.returns_trigger
      AND c.classification NOT IN ('PUBLIC_ANON','FOUNDER_ADMIN_ONLY')
      AND NOT EXISTS (
        SELECT 1 FROM rls_helpers h WHERE h.typed_signature=l.typed_signature
      )

    UNION ALL
    SELECT jsonb_build_object('code','MUTATING_DEFINER_ANON_EXECUTE','signature',l.typed_signature)
    FROM live l JOIN classified c USING (typed_signature)
    WHERE l.prosecdef
      AND l.anon_execute
      AND lower(l.definition) ~ '(insert[[:space:]]+into|[[:space:]]update[[:space:]]+[a-z_]|delete[[:space:]]+from|truncate[[:space:]]|create[[:space:]]+(table|temp|temporary|trigger)|drop[[:space:]]+(table|trigger)|alter[[:space:]]+(table|role|default|function)|grant[[:space:]]|revoke[[:space:]]|execute[[:space:]]+)'
      AND c.classification <> 'PUBLIC_ANON'

    UNION ALL
    SELECT jsonb_build_object('code','FOUNDER_SERVER_AUTH_MISSING','signature',l.typed_signature)
    FROM live l JOIN classified c USING (typed_signature)
    WHERE c.classification = 'FOUNDER_ADMIN_ONLY'
      AND lower(l.definition) !~ '(auth[[:space:]]*[.][[:space:]]*(uid|role)|has_role|_is_founder_or_admin)'

    UNION ALL
    SELECT jsonb_build_object('code','DEFINER_AUTH_USES_CURRENT_USER','signature',l.typed_signature)
    FROM live l JOIN classified c USING (typed_signature)
    WHERE l.prosecdef
      AND c.classification = 'FOUNDER_ADMIN_ONLY'
      AND position('current_user' in lower(l.definition)) > 0

    UNION ALL
    SELECT jsonb_build_object('code','NULLABLE_SERVICE_ROLE_GUARD','signature',l.typed_signature)
    FROM live l
    WHERE l.prosecdef
      AND lower(l.definition) ~ 'auth[[:space:]]*[.][[:space:]]*role[[:space:]]*[(][[:space:]]*[)][[:space:]]*(<>|!=)[[:space:]]*''service_role'''

    UNION ALL
    SELECT jsonb_build_object('code','CALLER_IDENTITY_NOT_BOUND','signature',l.typed_signature)
    FROM live l
    WHERE (l.typed_signature = 'public.has_role(uuid, app_role)'
           AND position('_user_id is distinct from auth.uid()' in lower(l.definition)) = 0)
       OR (l.typed_signature = 'public.is_founder_or_admin(uuid)'
           AND position('_uid is distinct from auth.uid()' in lower(l.definition)) = 0)
       OR (l.typed_signature = 'public.worker_has_active_window(uuid, text)'
           AND position('_worker_id = public.current_worker_id()' in lower(l.definition)) = 0)

    UNION ALL
    SELECT jsonb_build_object('code','DEFINER_SEARCH_PATH_MISSING','signature',l.typed_signature)
    FROM live l
    WHERE l.prosecdef
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(l.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg LIKE 'search_path=%'
      )

    UNION ALL
    SELECT jsonb_build_object('code','DEFINER_SEARCH_PATH_UNSAFE','signature',l.typed_signature,'path',trim(path))
    FROM live l
    CROSS JOIN LATERAL unnest(COALESCE(l.proconfig, ARRAY[]::text[])) cfg
    CROSS JOIN LATERAL regexp_split_to_table(
      regexp_replace(cfg, '^search_path=', ''), '[[:space:]]*,[[:space:]]*'
    ) AS path
    WHERE l.prosecdef
      AND cfg LIKE 'search_path=%'
      AND trim(path) NOT IN ('public','extensions','pg_catalog','cron')

    UNION ALL
    SELECT jsonb_build_object('code','SERVICE_ROLE_EXECUTE_LOST','signature',l.typed_signature)
    FROM live l
    WHERE NOT l.service_role_execute AND NOT l.returns_trigger

    UNION ALL
    SELECT jsonb_build_object(
      'code','POSTGRES_FUTURE_EXECUTE_DANGER',
      'owner_role',d.defaclrole::regrole::text,
      'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
      'privilege',x.privilege_type
    )
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclnamespace='public'::regnamespace
      AND d.defaclobjtype='f'
      AND d.defaclrole::regrole::text='postgres'
      AND x.privilege_type='EXECUTE'
      AND (x.grantee=0 OR pg_get_userbyid(x.grantee) IN ('anon','authenticated'))
  )
  SELECT COALESCE(jsonb_agg(finding), '[]'::jsonb)
  INTO v_hard_findings
  FROM findings;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code','SUPABASE_ADMIN_MANAGED_FUTURE_EXECUTE',
    'owner_role',d.defaclrole::regrole::text,
    'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
    'privilege',x.privilege_type,
    'grantor',pg_get_userbyid(x.grantor)
  )), '[]'::jsonb)
  INTO v_managed_residuals
  FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) x
  WHERE d.defaclnamespace='public'::regnamespace
    AND d.defaclobjtype='f'
    AND d.defaclrole::regrole::text='supabase_admin'
    AND x.privilege_type='EXECUTE'
    AND (x.grantee=0 OR pg_get_userbyid(x.grantee) IN ('anon','authenticated'));

  IF jsonb_array_length(v_hard_findings) > 0 THEN
    RAISE EXCEPTION 'Stage 1B RPC drift: %', v_hard_findings;
  END IF;

  IF jsonb_array_length(v_managed_residuals) > 0 THEN
    RAISE EXCEPTION
      'Stage 1B blocker: Supabase-managed supabase_admin future function defaults remain; current migration role cannot alter them: %',
      v_managed_residuals;
  END IF;
END
$stage1b_rpc_check$;

SELECT jsonb_build_object(
  'status','PASS',
  'public_functions',count(*),
  'public_execute_acl',count(*) FILTER (WHERE EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE a.grantee=0 AND a.privilege_type='EXECUTE'
  )),
  'anon_effective_execute',count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'EXECUTE')),
  'authenticated_effective_execute',count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  'managed_extension_public_execute',count(*) FILTER (WHERE l.lanname='c' AND pg_get_userbyid(p.proowner)='supabase_admin' AND EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE a.grantee=0 AND a.privilege_type='EXECUTE'
  )),
  'managed_extension_anon_execute',count(*) FILTER (WHERE l.lanname='c' AND pg_get_userbyid(p.proowner)='supabase_admin' AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  'managed_extension_authenticated_execute',count(*) FILTER (WHERE l.lanname='c' AND pg_get_userbyid(p.proowner)='supabase_admin' AND has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  'service_role_effective_execute',count(*) FILTER (WHERE has_function_privilege('service_role', p.oid, 'EXECUTE'))
) AS stage1b_rpc_security_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' AND p.prokind='f';
