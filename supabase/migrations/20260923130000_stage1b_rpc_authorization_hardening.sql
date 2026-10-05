-- Stage 1B public RPC/security-definer authorization hardening.
-- Pre-change freeze: docs/liftor-rebuild/stage1b-public-rpc-prechange-inventory.json
-- Review/classification: docs/liftor-rebuild/stage1b-public-rpc-review.json
-- This migration changes function EXECUTE ACLs and authorization guards only.
-- It does not change table CRUD grants, RLS policies, data, or external providers.

BEGIN;

-- The authorized read-only Liftor catalog capture dated 2026-09-24 reconciles
-- all 18 live anon application signatures. The exact signature gate below is
-- retained as a fail-closed drift check and aborts if the live catalog changes.
-- Evidence and per-function decisions are recorded in
-- docs/liftor-rebuild/stage1b-live-rpc-catalog-evidence.json and
-- docs/liftor-rebuild/stage1b-rpc-reconciliation.json.
DO $stage1b_catalog_gate$
DECLARE
  v_reviewed_signatures text[] := ARRAY[
    'public._is_founder_or_admin()',
    'public.accept_proposal_by_token(text)',
    'public.acquire_ai_lease(text, uuid, uuid, integer, integer, text, text, integer)',
    'public.activate_outreach_campaign(uuid)',
    'public.ai_actions_today(uuid)',
    'public.apollo_credit_release(text, text)',
    'public.apollo_credit_reserve(text, text, integer, text, uuid, text, text[], jsonb)',
    'public.apollo_credit_settle(text, integer, text[], text[], jsonb)',
    'public.apollo_credit_status()',
    'public.apollo_decrypt_key(bytea, text)',
    'public.apollo_encrypt_key(text, text)',
    'public.apply_reply_stop_suppression(uuid, text, text)',
    'public.apply_reputation_event(uuid, uuid, reputation_event_type, text)',
    'public.array_to_halfvec(double precision[], integer, boolean)',
    'public.array_to_halfvec(integer[], integer, boolean)',
    'public.array_to_halfvec(numeric[], integer, boolean)',
    'public.array_to_halfvec(real[], integer, boolean)',
    'public.array_to_sparsevec(double precision[], integer, boolean)',
    'public.array_to_sparsevec(integer[], integer, boolean)',
    'public.array_to_sparsevec(numeric[], integer, boolean)',
    'public.array_to_sparsevec(real[], integer, boolean)',
    'public.array_to_vector(double precision[], integer, boolean)',
    'public.array_to_vector(integer[], integer, boolean)',
    'public.array_to_vector(numeric[], integer, boolean)',
    'public.array_to_vector(real[], integer, boolean)',
    'public.assign_inbox_for_contact(uuid)',
    'public.auto_create_exit_intelligence_profile()',
    'public.auto_partial_rebuild()',
    'public.auto_resolve_system_events()',
    'public.bi_normalize_name(text)',
    'public.binary_quantize(halfvec)',
    'public.binary_quantize(vector)',
    'public.block_activation_log_mutation()',
    'public.bump_inbox_send_count()',
    'public.bump_rule_hit_count()',
    'public.cancel_queue_on_inbound_comm()',
    'public.cancel_queue_on_reply()',
    'public.check_outreach_allowed(uuid)',
    'public.check_outreach_allowed(uuid, uuid)',
    'public.check_send_throttle(uuid, uuid)',
    'public.claim_portfolio_contact(uuid, text, text, uuid, boolean, text)',
    'public.cleanup_stale_ai_leases()',
    'public.compare_system_versions(integer, integer)',
    'public.compliance_check_assignment(uuid)',
    'public.compliance_check_contact(uuid)',
    'public.compliance_check_demo(uuid)',
    'public.compliance_check_invoice(uuid)',
    'public.compliance_check_outbound_communication(uuid)',
    'public.compliance_check_payment(uuid)',
    'public.compliance_check_proposal(uuid)',
    'public.compliance_score_for(text, uuid)',
    'public.compute_assignment_sla(date, assignment_status)',
    'public.compute_intent_score(uuid)',
    'public.compute_system_health()',
    'public.cosine_distance(halfvec, halfvec)',
    'public.cosine_distance(sparsevec, sparsevec)',
    'public.cosine_distance(vector, vector)',
    'public.country_to_timezone(text)',
    'public.crm_match_interaction_preview(uuid, uuid, text, text, text, uuid)',
    'public.current_worker_id()',
    'public.customer_sales_link_contact_by_email(text)',
    'public.derive_billionaire_route_evidence_states()',
    'public.detect_anomalies()',
    'public.detect_orphan_content()',
    'public.domain_for_inbox(uuid)',
    'public.eligible_suppliers_for_deal(uuid)',
    'public.enforce_founder_approval_for_buyer_outreach()',
    'public.enforce_founder_approval_for_warm_up_action()',
    'public.enforce_inbox_ramp(uuid)',
    'public.enrich_all_contacts()',
    'public.enrich_contact(uuid)',
    'public.escalate_retry_failure(uuid)',
    'public.evaluate_ai_reply(text)',
    'public.expire_demos()',
    'public.expire_inactive_conversations()',
    'public.export_full_system_snapshot()',
    'public.finance_mark_overdue_invoices()',
    'public.finance_target_vs_actual(text, date)',
    'public.flag_idle_assignments()',
    'public.founder_confirm_assignment(uuid)',
    'public.generate_invoice_number()',
    'public.generate_system_tasks_from_priority(priority_entity_type, uuid)',
    'public.get_active_execution_mode(text)',
    'public.get_business_outbound_status(text)',
    'public.get_crm_contact_360_summary(uuid, uuid)',
    'public.get_crm_contact_timeline(uuid, uuid, integer)',
    'public.get_crm_interaction_ledger_summary(uuid)',
    'public.get_crm_relationship_timeline(uuid, integer)',
    'public.get_customer_quarterly_report_by_token(text)',
    'public.get_customer_survey_request_by_token(text)',
    'public.get_inbox_credentials_for_send(uuid, text)',
    'public.get_inbox_imap_credentials(uuid, text)',
    'public.get_outbound_status()',
    'public.get_outreach_send_cron_status()',
    'public.get_proposal_by_token(text)',
    'public.get_system_mode()',
    'public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)',
    'public.gin_extract_value_trgm(text, internal)',
    'public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)',
    'public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)',
    'public.gsm_mailbox_is_campaign_ready(text, text, text, text, text, text, integer, integer, boolean, boolean, text, text, text)',
    'public.gsm_touch_updated_at()',
    'public.gtrgm_compress(internal)',
    'public.gtrgm_consistent(internal, text, smallint, oid, internal)',
    'public.gtrgm_decompress(internal)',
    'public.gtrgm_distance(internal, text, smallint, oid, internal)',
    'public.gtrgm_in(cstring)',
    'public.gtrgm_options(internal)',
    'public.gtrgm_out(gtrgm)',
    'public.gtrgm_penalty(internal, internal, internal)',
    'public.gtrgm_picksplit(internal, internal)',
    'public.gtrgm_same(gtrgm, gtrgm, internal)',
    'public.gtrgm_union(internal, internal)',
    'public.guard_assignment_creation()',
    'public.guard_assignment_supplier_approved()',
    'public.guard_bcr_global_suppression()',
    'public.guard_campaign_activation()',
    'public.guard_deal_creation()',
    'public.guard_demo_creation()',
    'public.guard_email_queue_single_campaign()',
    'public.guard_proposal_creation()',
    'public.halfvec(halfvec, integer, boolean)',
    'public.halfvec_accum(double precision[], halfvec)',
    'public.halfvec_add(halfvec, halfvec)',
    'public.halfvec_avg(double precision[])',
    'public.halfvec_cmp(halfvec, halfvec)',
    'public.halfvec_combine(double precision[], double precision[])',
    'public.halfvec_concat(halfvec, halfvec)',
    'public.halfvec_eq(halfvec, halfvec)',
    'public.halfvec_ge(halfvec, halfvec)',
    'public.halfvec_gt(halfvec, halfvec)',
    'public.halfvec_in(cstring, oid, integer)',
    'public.halfvec_l2_squared_distance(halfvec, halfvec)',
    'public.halfvec_le(halfvec, halfvec)',
    'public.halfvec_lt(halfvec, halfvec)',
    'public.halfvec_mul(halfvec, halfvec)',
    'public.halfvec_ne(halfvec, halfvec)',
    'public.halfvec_negative_inner_product(halfvec, halfvec)',
    'public.halfvec_out(halfvec)',
    'public.halfvec_recv(internal, oid, integer)',
    'public.halfvec_send(halfvec)',
    'public.halfvec_spherical_distance(halfvec, halfvec)',
    'public.halfvec_sub(halfvec, halfvec)',
    'public.halfvec_to_float4(halfvec, integer, boolean)',
    'public.halfvec_to_sparsevec(halfvec, integer, boolean)',
    'public.halfvec_to_vector(halfvec, integer, boolean)',
    'public.halfvec_typmod_in(cstring[])',
    'public.hamming_distance(bit, bit)',
    'public.handle_availability_override_change()',
    'public.handle_deal_won()',
    'public.handle_email_bounce()',
    'public.handle_new_communication()',
    'public.handle_new_user()',
    'public.handle_payment_received()',
    'public.handle_supplier_status_change()',
    'public.has_live_ready_inbox(text)',
    'public.has_role(uuid, app_role)',
    'public.healthcare_set_updated_at()',
    'public.hnsw_bit_support(internal)',
    'public.hnsw_halfvec_support(internal)',
    'public.hnsw_sparsevec_support(internal)',
    'public.hnswhandler(internal)',
    'public.hwc_touch_updated_at()',
    'public.inbox_is_live_ready(uuid)',
    'public.inbox_set_provider_blocked(uuid, timestamp with time zone, text)',
    'public.inbox_warmup_limit(uuid)',
    'public.inner_product(halfvec, halfvec)',
    'public.inner_product(sparsevec, sparsevec)',
    'public.inner_product(vector, vector)',
    'public.is_agent_live_setting_enabled(text)',
    'public.is_feature_enabled(text, text)',
    'public.is_founder()',
    'public.is_founder_or_admin(uuid)',
    'public.is_internal_email(text)',
    'public.is_internal_identity(text)',
    'public.is_kill_switch_active()',
    'public.is_oversight_reviewer()',
    'public.ivfflat_bit_support(internal)',
    'public.ivfflat_halfvec_support(internal)',
    'public.ivfflathandler(internal)',
    'public.jaccard_distance(bit, bit)',
    'public.l1_distance(halfvec, halfvec)',
    'public.l1_distance(sparsevec, sparsevec)',
    'public.l1_distance(vector, vector)',
    'public.l2_distance(halfvec, halfvec)',
    'public.l2_distance(sparsevec, sparsevec)',
    'public.l2_distance(vector, vector)',
    'public.l2_norm(halfvec)',
    'public.l2_norm(sparsevec)',
    'public.l2_normalize(halfvec)',
    'public.l2_normalize(sparsevec)',
    'public.l2_normalize(vector)',
    'public.list_inbox_credentials_public(uuid)',
    'public.log_activity(text, text, text, uuid, text)',
    'public.log_business_override_change()',
    'public.log_compliance_event(text, compliance_entity_type, uuid, text, text, text, text, jsonb)',
    'public.log_demo_event(text, text, jsonb)',
    'public.log_feature_flag_change()',
    'public.log_feature_skip(text, text, text, uuid)',
    'public.log_new_opportunity()',
    'public.log_new_proposal()',
    'public.log_new_support_request()',
    'public.log_system_config_change()',
    'public.log_system_event(text, text, uuid, text, system_event_severity, text, jsonb)',
    'public.log_system_mode_change()',
    'public.ma_audit_trigger()',
    'public.ma_generate_default_data_room(uuid)',
    'public.map_billionaire_network_evidence()',
    'public.mark_contact_for_founder_review(uuid, text)',
    'public.mark_send_failure(uuid, text)',
    'public.match_billionaire_wealth_snapshots(text, date)',
    'public.match_video_segments(text, vector, integer, uuid, uuid, numeric)',
    'public.mirror_comm_to_messages_and_invoke_ai()',
    'public.next_valid_send_time(uuid, timestamp with time zone)',
    'public.pick_inbox_for_business(text)',
    'public.pick_supplier_for_deal(uuid)',
    'public.priority_level_from_score(integer)',
    'public.priority_score_assignment(uuid)',
    'public.priority_score_contact(uuid)',
    'public.priority_score_conversation(uuid)',
    'public.priority_score_deal(uuid)',
    'public.priority_score_invoice(uuid)',
    'public.process_billionaire_enrichment_batch(integer)',
    'public.process_retry_queue()',
    'public.propagate_billionaire_institution_access()',
    'public.proposals_needing_followup()',
    'public.proposals_reconcile_crm()',
    'public.qtc_on_payment_succeeded()',
    'public.qtc_on_quote_accepted()',
    'public.qtc_payments_normalise()',
    'public.rebuild_billionaire_coverage()',
    'public.rebuild_full_manual()',
    'public.recalculate_priority(priority_entity_type, uuid)',
    'public.recompute_all_inbox_performance()',
    'public.recompute_all_intent_scores()',
    'public.recompute_all_supplier_scores()',
    'public.recompute_business_risk_score(text)',
    'public.recompute_campaign_metrics(uuid)',
    'public.recompute_compliance_score(compliance_entity_type, uuid)',
    'public.recompute_domain_reputation(text)',
    'public.recompute_inbox_performance(uuid)',
    'public.recompute_proposal_score(uuid)',
    'public.recompute_supplier_load(uuid)',
    'public.recompute_supplier_score(uuid)',
    'public.recompute_video_buyer_handover_ready(uuid)',
    'public.record_inbound_poll(uuid, boolean, text, integer)',
    'public.record_inbox_test_send(uuid, boolean, text, text)',
    'public.record_system_change(text, uuid, text, text, text, integer)',
    'public.refresh_all_assignment_sla()',
    'public.refresh_all_business_risk_scores()',
    'public.release_ai_lease(text, boolean)',
    'public.release_portfolio_contact(uuid, text, text)',
    'public.reset_inbox_hourly_counts()',
    'public.reset_inbox_send_counts()',
    'public.resolve_contact_by_email(text)',
    'public.resolve_contact_timezone(uuid)',
    'public.resolve_entity_country(uuid, text)',
    'public.run_billionaire_enrichment_batches(integer, integer)',
    'public.run_compliance_checks(compliance_entity_type, uuid)',
    'public.run_domain_protection_check()',
    'public.save_inbox_credentials(uuid, text, text, integer, text, text, text, text, text, text, text)',
    'public.save_inbox_inbound_config(uuid, text, text, integer, boolean, text, text, boolean, boolean, text, text)',
    'public.score_contact(uuid, text)',
    'public.score_proposal_quality(uuid)',
    'public.seed_supplier_records()',
    'public.set_assignment_sla()',
    'public.set_invoice_expected_amount()',
    'public.set_limit(real)',
    'public.set_proposal_followup_due()',
    'public.set_queue_priority_on_reply()',
    'public.set_system_mode(text)',
    'public.set_timezone_confidence()',
    'public.severity_weight(compliance_severity)',
    'public.show_limit()',
    'public.show_trgm(text)',
    'public.similarity(text, text)',
    'public.similarity_dist(text, text)',
    'public.similarity_op(text, text)',
    'public.snapshot_deal_compliance_on_won()',
    'public.social_claim_distribution_job(uuid, uuid, text, uuid)',
    'public.social_relationship_claim_action(uuid)',
    'public.social_set_updated_at()',
    'public.sor_touch_updated_at()',
    'public.sparsevec(sparsevec, integer, boolean)',
    'public.sparsevec_cmp(sparsevec, sparsevec)',
    'public.sparsevec_eq(sparsevec, sparsevec)',
    'public.sparsevec_ge(sparsevec, sparsevec)',
    'public.sparsevec_gt(sparsevec, sparsevec)',
    'public.sparsevec_in(cstring, oid, integer)',
    'public.sparsevec_l2_squared_distance(sparsevec, sparsevec)',
    'public.sparsevec_le(sparsevec, sparsevec)',
    'public.sparsevec_lt(sparsevec, sparsevec)',
    'public.sparsevec_ne(sparsevec, sparsevec)',
    'public.sparsevec_negative_inner_product(sparsevec, sparsevec)',
    'public.sparsevec_out(sparsevec)',
    'public.sparsevec_recv(internal, oid, integer)',
    'public.sparsevec_send(sparsevec)',
    'public.sparsevec_to_halfvec(sparsevec, integer, boolean)',
    'public.sparsevec_to_vector(sparsevec, integer, boolean)',
    'public.sparsevec_typmod_in(cstring[])',
    'public.stamp_business_name_from_invoice()',
    'public.stamp_compliance_event_resolution()',
    'public.strict_word_similarity(text, text)',
    'public.strict_word_similarity_commutator_op(text, text)',
    'public.strict_word_similarity_dist_commutator_op(text, text)',
    'public.strict_word_similarity_dist_op(text, text)',
    'public.strict_word_similarity_op(text, text)',
    'public.subvector(halfvec, integer, integer)',
    'public.subvector(vector, integer, integer)',
    'public.suggest_replacement_supplier(uuid)',
    'public.supplier_list_assignments(text)',
    'public.supplier_login_with_token(text)',
    'public.supplier_portal_stats()',
    'public.supplier_update_assignment_status(text, uuid, text, text)',
    'public.sync_domain_reputation_on_inbox_change()',
    'public.sync_supplier_availability_from_assignment()',
    'public.tg_liftor_recovery_actions_append_only()',
    'public.tg_liftor_snapshots_immutable()',
    'public.tg_mwi_touch_updated_at()',
    'public.tg_set_updated_at()',
    'public.touch_acquisition_funding_updated_at()',
    'public.touch_updated_at()',
    'public.trg_compliance_assignment()',
    'public.trg_compliance_communication()',
    'public.trg_compliance_contact()',
    'public.trg_compliance_demo()',
    'public.trg_compliance_invoice()',
    'public.trg_compliance_payment()',
    'public.trg_compliance_proposal()',
    'public.trg_priority_assignment()',
    'public.trg_priority_communication()',
    'public.trg_priority_conversation()',
    'public.trg_priority_deal()',
    'public.trg_priority_demo_event()',
    'public.trg_priority_from_compliance()',
    'public.trg_priority_invoice()',
    'public.trg_recompute_score_on_demo_event()',
    'public.trg_recompute_supplier_load()',
    'public.trg_recompute_supplier_score_on_assignment()',
    'public.trg_reputation_from_email_event()',
    'public.trg_score_proposal_quality()',
    'public.trg_spam_on_dnc()',
    'public.try_auto_assign_supplier_on_deal_won()',
    'public.update_updated_at_column()',
    'public.upsert_contact(text, text, text, text, text, text, uuid)',
    'public.validate_campaign_activation(uuid)',
    'public.validate_full_system_coverage()',
    'public.validate_go_live_readiness()',
    'public.validate_inbox_mapping(uuid)',
    'public.validate_runtime_vs_documentation()',
    'public.validate_system_integrity()',
    'public.vector(vector, integer, boolean)',
    'public.vector_accum(double precision[], vector)',
    'public.vector_add(vector, vector)',
    'public.vector_avg(double precision[])',
    'public.vector_cmp(vector, vector)',
    'public.vector_combine(double precision[], double precision[])',
    'public.vector_concat(vector, vector)',
    'public.vector_dims(halfvec)',
    'public.vector_dims(vector)',
    'public.vector_eq(vector, vector)',
    'public.vector_ge(vector, vector)',
    'public.vector_gt(vector, vector)',
    'public.vector_in(cstring, oid, integer)',
    'public.vector_l2_squared_distance(vector, vector)',
    'public.vector_le(vector, vector)',
    'public.vector_lt(vector, vector)',
    'public.vector_mul(vector, vector)',
    'public.vector_ne(vector, vector)',
    'public.vector_negative_inner_product(vector, vector)',
    'public.vector_norm(vector)',
    'public.vector_out(vector)',
    'public.vector_recv(internal, oid, integer)',
    'public.vector_send(vector)',
    'public.vector_spherical_distance(vector, vector)',
    'public.vector_sub(vector, vector)',
    'public.vector_to_float4(vector, integer, boolean)',
    'public.vector_to_halfvec(vector, integer, boolean)',
    'public.vector_to_sparsevec(vector, integer, boolean)',
    'public.vector_typmod_in(cstring[])',
    'public.video_library_touch_updated_at()',
    'public.word_similarity(text, text)',
    'public.word_similarity_commutator_op(text, text)',
    'public.word_similarity_dist_commutator_op(text, text)',
    'public.word_similarity_dist_op(text, text)',
    'public.word_similarity_op(text, text)',
    'public.worker_has_active_window(uuid, text)'
  ];
  v_live_signatures text[];
  v_actual_anon_signatures text[];
  v_candidate_anon_signatures text[] := ARRAY[
    'public._is_founder_or_admin()',
    'public.accept_proposal_by_token(text)',
    'public.current_worker_id()',
    'public.get_business_outbound_status(text)',
    'public.get_customer_quarterly_report_by_token(text)',
    'public.get_customer_survey_request_by_token(text)',
    'public.get_outbound_status()',
    'public.get_proposal_by_token(text)',
    'public.has_role(uuid, app_role)',
    'public.is_founder()',
    'public.is_founder_or_admin(uuid)',
    'public.is_kill_switch_active()',
    'public.is_oversight_reviewer()',
    'public.log_demo_event(text, text, jsonb)',
    'public.supplier_list_assignments(text)',
    'public.supplier_login_with_token(text)',
    'public.supplier_update_assignment_status(text, uuid, text, text)',
    'public.worker_has_active_window(uuid, text)'
  ];
  v_total integer;
  v_postgres_owned integer;
  v_other_owner_count integer;
BEGIN
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Stage 1B requires the reviewed postgres migration owner';
  END IF;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE r.rolname = 'postgres')::integer,
         count(*) FILTER (WHERE r.rolname NOT IN ('postgres','supabase_admin'))::integer,
         array_agg(format('%I.%I(%s)', n.nspname, p.proname, COALESCE(args.identity_types, ''))
                   ORDER BY format('%I.%I(%s)', n.nspname, p.proname, COALESCE(args.identity_types, '')) COLLATE "C")
    INTO v_total, v_postgres_owned, v_other_owner_count, v_live_signatures
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    LEFT JOIN LATERAL (
      SELECT string_agg(format_type(a, NULL), ', ' ORDER BY u.ordinality) AS identity_types
      FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY AS u(a, ordinality)
    ) args ON true
   WHERE n.nspname = 'public' AND p.prokind = 'f';

  IF v_total <> 387 OR v_postgres_owned <> 242 OR v_other_owner_count <> 0 THEN
    RAISE EXCEPTION 'Stage 1B live catalog differs from freeze: functions %, postgres-owned %, unexpected owners %; run the authorized evidence query',
      v_total, v_postgres_owned, v_other_owner_count;
  END IF;
  IF v_live_signatures IS DISTINCT FROM v_reviewed_signatures THEN
    RAISE EXCEPTION 'Stage 1B live signatures differ from frozen classification; run scripts/stage1b-live-catalog-evidence.sql';
  END IF;

  SELECT array_agg(format('%I.%I(%s)', n.nspname, p.proname, COALESCE(args.identity_types, ''))
                   ORDER BY format('%I.%I(%s)', n.nspname, p.proname, COALESCE(args.identity_types, '')) COLLATE "C")
    INTO v_actual_anon_signatures
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_roles r ON r.oid = p.proowner
    JOIN pg_language l ON l.oid = p.prolang
    LEFT JOIN LATERAL (
      SELECT string_agg(format_type(a, NULL), ', ' ORDER BY u.ordinality) AS identity_types
      FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY AS u(a, ordinality)
    ) args ON true
   WHERE n.nspname = 'public' AND p.prokind = 'f'
     AND has_function_privilege('anon', p.oid, 'EXECUTE')
     AND p.prorettype <> 'trigger'::regtype
     AND NOT (r.rolname = 'supabase_admin' AND l.lanname = 'c' AND NOT p.prosecdef);

  IF cardinality(v_candidate_anon_signatures) <> 18
     OR cardinality(v_actual_anon_signatures) <> 18
     OR v_actual_anon_signatures IS DISTINCT FROM v_candidate_anon_signatures THEN
    RAISE EXCEPTION 'Stage 1B BLOCKED: anon application EXECUTE requires 18 exact signatures; candidate has %, live has %. Live signatures: %',
      cardinality(v_candidate_anon_signatures), cardinality(v_actual_anon_signatures),
      array_to_string(v_actual_anon_signatures, E'\n');
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proowner = 'postgres'::regrole
      AND EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.grantor <> p.proowner
      )
  ) THEN
    RAISE EXCEPTION 'Stage 1B blocked: a postgres-owned function ACL has a non-owner grantor and cannot be restored exactly by this migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proowner = 'postgres'::regrole AND p.proacl IS NULL
  ) THEN
    RAISE EXCEPTION 'Stage 1B blocked: exact raw ACL rollback requires explicit proacl values for every affected function';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proowner = 'postgres'::regrole
      AND (
        (SELECT count(*)
         FROM unnest(p.proacl) WITH ORDINALITY AS acl_item(item, ordinal)
         CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
         WHERE a.grantee = p.proowner AND a.privilege_type = 'EXECUTE') <> 1
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p.proacl) WITH ORDINALITY AS acl_item(item, ordinal)
          CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
          WHERE acl_item.ordinal = 1
            AND a.grantee = p.proowner
            AND a.privilege_type = 'EXECUTE'
        )
        OR EXISTS (
          SELECT 1
          FROM unnest(p.proacl) AS acl_item(item)
          CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
          WHERE a.privilege_type <> 'EXECUTE'
        )
        OR EXISTS (
          SELECT a.grantee, a.grantor
          FROM unnest(p.proacl) AS acl_item(item)
          CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
          GROUP BY a.grantee, a.grantor
          HAVING count(*) > 1
        )
      )
  ) THEN
    RAISE EXCEPTION 'Stage 1B blocked: prior function ACL entries cannot be reconstructed in exact raw order';
  END IF;
END
$stage1b_catalog_gate$;

-- Save the exact pre-change body, owner, raw ACL, expanded ACL entries, and
-- service_role EXECUTE state for every application-owned public function.
-- This private schema is not exposed through PostgREST; app roles receive no
-- privileges. The snapshot remains after COMMIT and is the only rollback source.
CREATE SCHEMA stage1b_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA stage1b_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE stage1b_private.rpc_state_snapshot (
  change_id text NOT NULL,
  typed_signature text NOT NULL,
  owner_name text NOT NULL,
  raw_acl text,
  raw_acl_was_null boolean NOT NULL,
  acl_entries jsonb NOT NULL,
  prior_security_definer boolean NOT NULL,
  prior_proconfig text[],
  prior_definition text NOT NULL,
  prior_definition_md5 text NOT NULL,
  prior_anon_execute boolean NOT NULL,
  prior_authenticated_execute boolean NOT NULL,
  prior_public_execute boolean NOT NULL,
  prior_service_role_execute boolean NOT NULL,
  after_raw_acl text,
  after_definition_md5 text,
  after_service_role_execute boolean,
  captured_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (change_id, typed_signature)
);
REVOKE ALL ON TABLE stage1b_private.rpc_state_snapshot FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO stage1b_private.rpc_state_snapshot (
  change_id, typed_signature, owner_name, raw_acl, raw_acl_was_null, acl_entries,
  prior_security_definer, prior_proconfig, prior_definition, prior_definition_md5,
  prior_anon_execute, prior_authenticated_execute, prior_public_execute,
  prior_service_role_execute
)
SELECT
  '20260923130000_stage1b_rpc_authorization_hardening',
  format('%I.%I(%s)', n.nspname, p.proname, COALESCE(args.identity_types, '')),
  pg_get_userbyid(p.proowner), p.proacl::text, p.proacl IS NULL,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'acl_ordinal', acl_item.ordinal,
      'grantee', CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'grantor', pg_get_userbyid(a.grantor),
      'privilege', a.privilege_type,
      'grantable', a.is_grantable
    ) ORDER BY acl_item.ordinal, a.grantee, a.grantor, a.privilege_type)
    FROM unnest(COALESCE(p.proacl, acldefault('f', p.proowner)))
      WITH ORDINALITY AS acl_item(item, ordinal)
    CROSS JOIN LATERAL aclexplode(ARRAY[acl_item.item]) a
  ), '[]'::jsonb),
  p.prosecdef, p.proconfig, pg_get_functiondef(p.oid),
  md5(pg_get_functiondef(p.oid)),
  has_function_privilege('anon', p.oid, 'EXECUTE'),
  has_function_privilege('authenticated', p.oid, 'EXECUTE'),
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
  ),
  has_function_privilege('service_role', p.oid, 'EXECUTE')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles owner_role ON owner_role.oid = p.proowner
LEFT JOIN LATERAL (
  SELECT string_agg(format_type(a, NULL), ', ' ORDER BY u.ordinality) AS identity_types
  FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY AS u(a, ordinality)
) args ON true
WHERE n.nspname = 'public' AND p.prokind = 'f' AND owner_role.rolname = 'postgres'
  -- Post-freeze internal trigger helper: frozen in the catalog gate above, but
  -- its client EXECUTE revocation is owned by 20260928120000_stage1b_sor_touch_acl_hardening.
  AND p.oid IS DISTINCT FROM to_regprocedure('public.sor_touch_updated_at()');

DO $stage1b_snapshot_count$
BEGIN
  IF (SELECT count(*) FROM stage1b_private.rpc_state_snapshot
       WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening') <> 241 THEN
    RAISE EXCEPTION 'Stage 1B rollback snapshot does not contain the exact 241 postgres-owned functions';
  END IF;
END
$stage1b_snapshot_count$;

-- ACL edits are object-by-object from the snapshot (no ON ALL FUNCTIONS sweep).
-- service_role EXECUTE is re-established only when it was effective pre-change.
DO $stage1b_acl_revoke$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT typed_signature, prior_service_role_execute
             FROM stage1b_private.rpc_state_snapshot
            WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening'
            ORDER BY typed_signature
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.typed_signature::regprocedure);
    IF r.prior_service_role_execute THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.typed_signature::regprocedure);
    END IF;
  END LOOP;
END
$stage1b_acl_revoke$;

-- Stage 1B body changes follow below. PUBLIC_ANON and role allowlists are
-- exact-signature grants near the end of this migration.

-- These status RPCs are consumed by the founder outreach/inbox pages. Keep the
-- existing response shape while requiring a founder/admin or trusted backend.
CREATE OR REPLACE FUNCTION public.get_business_outbound_status(_business_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  RETURN jsonb_build_object(
    'business_name', _business_name,
    'system_mode', public.get_system_mode(),
    'has_live_ready_inbox', public.has_live_ready_inbox(_business_name),
    'live_ready_inbox_count', (
      SELECT COUNT(*) FROM public.inboxes
       WHERE business_name = _business_name
         AND active = true
         AND provider_type = 'ionos_smtp'::public.inbox_provider_type
         AND live_readiness = 'live_ready'::public.inbox_live_readiness
    ),
    'simulated', public.get_system_mode() = 'sandbox' AND NOT public.has_live_ready_inbox(_business_name)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_outbound_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  RETURN jsonb_build_object(
    'system_mode', public.get_system_mode(),
    'provider_configured', COALESCE(
      (SELECT value FROM public.system_settings WHERE key='outbound_provider_configured'),
      'false'::jsonb
    )::boolean,
    'test_passed_at', (
      SELECT value FROM public.system_settings WHERE key='outbound_provider_test_passed_at'
    ),
    'simulated', (public.get_system_mode() = 'sandbox')
  );
END;
$function$;

-- Server-side authorization hardening for public.activate_outreach_campaign(_campaign_id uuid)
CREATE OR REPLACE FUNCTION public.activate_outreach_campaign(_campaign_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.outreach_campaigns%ROWTYPE;
  v_mode text;
  v_seq_count int;
  v_contact_count int;
  v_inbox public.inboxes%ROWTYPE;
  v_has_creds boolean;
  v_business_live boolean;
  v_effective_mode text;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT * INTO c FROM public.outreach_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'campaign not found'; END IF;

  v_mode := public.get_system_mode();
  v_business_live := public.has_live_ready_inbox(c.business_name);

  SELECT COUNT(*) INTO v_seq_count FROM public.outreach_sequences WHERE campaign_id = _campaign_id;
  IF v_seq_count = 0 THEN
    RAISE EXCEPTION 'cannot activate: no sequence steps defined' USING ERRCODE='check_violation';
  END IF;

  SELECT COUNT(*) INTO v_contact_count FROM public.contacts WHERE assigned_business = c.business_name;
  IF v_contact_count = 0 THEN
    RAISE EXCEPTION 'cannot activate: no contacts found for business %', c.business_name USING ERRCODE='check_violation';
  END IF;

  IF v_mode = 'live' OR v_business_live THEN
    SELECT * INTO v_inbox FROM public.inboxes
     WHERE business_name = c.business_name
       AND active = true
       AND provider_type = 'ionos_smtp'::public.inbox_provider_type
       AND live_readiness = 'live_ready'::public.inbox_live_readiness
     ORDER BY last_test_send_at DESC NULLS LAST, created_at DESC LIMIT 1;
    IF NOT FOUND THEN
      IF v_mode = 'live' THEN
        RAISE EXCEPTION 'cannot activate in live mode: no Live Ready inbox for business %', c.business_name USING ERRCODE='check_violation';
      END IF;
    ELSE
      IF v_inbox.last_test_send_status IS DISTINCT FROM 'passed' THEN
        RAISE EXCEPTION 'cannot activate: inbox % has not passed a real test send', v_inbox.email_address USING ERRCODE='check_violation';
      END IF;
      SELECT EXISTS(SELECT 1 FROM public.inbox_credentials WHERE inbox_id = v_inbox.id AND smtp_password_enc IS NOT NULL)
        INTO v_has_creds;
      IF NOT v_has_creds THEN
        RAISE EXCEPTION 'cannot activate: inbox % has no provider credentials', v_inbox.email_address USING ERRCODE='check_violation';
      END IF;
    END IF;
  END IF;

  v_effective_mode := CASE
    WHEN v_mode = 'live' THEN 'live'
    WHEN v_business_live THEN 'business_live'
    ELSE 'simulated'
  END;

  UPDATE public.outreach_campaigns SET status = 'active' WHERE id = _campaign_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('campaign_activated',
    format('Campaign %s activated in %s mode (business=%s)', c.campaign_name, v_effective_mode, c.business_name),
    'outreach_campaign', _campaign_id);

  RETURN jsonb_build_object('ok', true, 'mode', v_effective_mode, 'system_mode', v_mode, 'business_live', v_business_live);
END;
$function$;

-- Server-side authorization hardening for public.apollo_credit_status()
CREATE OR REPLACE FUNCTION public.apollo_credit_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pol public.apollo_portfolio_credit_policy%ROWTYPE;
  used integer;
  reserved integer;
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin') AND auth.role() IS DISTINCT FROM 'service_role' AND NOT (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  SELECT * INTO pol FROM public.apollo_portfolio_credit_policy WHERE provider = 'apollo';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'policy_missing', 'paid_enrichment_enabled', false);
  END IF;
  SELECT COALESCE(SUM(credits_used), 0) INTO used FROM public.apollo_credit_ledger;
  SELECT COALESCE(SUM(estimated_credits), 0) INTO reserved
    FROM public.apollo_credit_reservations WHERE status = 'reserved';
  RETURN jsonb_build_object(
    'ok', true,
    'provider', pol.provider,
    'paid_enrichment_enabled', pol.paid_enrichment_enabled,
    'hard_credit_limit', pol.hard_credit_limit,
    'safety_reserve', pol.safety_reserve,
    'per_run_cap', pol.per_run_cap,
    'allow_phone_reveal', pol.allow_phone_reveal,
    'allow_personal_email_reveal', pol.allow_personal_email_reveal,
    'allow_waterfall', pol.allow_waterfall,
    'credits_used', used,
    'credits_reserved', reserved,
    'credits_remaining', GREATEST(0, pol.hard_credit_limit - pol.safety_reserve - used - reserved)
  );
END;
$function$;

-- Server-side authorization hardening for public.check_outreach_allowed(_contact_id uuid)
CREATE OR REPLACE FUNCTION public.check_outreach_allowed(_contact_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.contacts%ROWTYPE;
  recent_bounce boolean;
  recent_real_outbound timestamptz;
  recent_inbound timestamptz;
  recent_last_contacted_real boolean;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'CONTACT_NOT_FOUND');
  END IF;

  IF c.status = 'DO_NOT_CONTACT' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DO_NOT_CONTACT');
  END IF;

  IF c.status IN ('ENGAGED', 'QUALIFIED', 'CLIENT') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'STATUS_BLOCKED', 'status', c.status);
  END IF;

  IF c.conversation_active = true THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'CONVERSATION_ACTIVE');
  END IF;

  -- Block on any genuine inbound communication in last 24h (always real, never synthetic)
  SELECT MAX(timestamp) INTO recent_inbound
    FROM public.communications
   WHERE contact_id = _contact_id
     AND direction = 'inbound'
     AND ignored_for_send_check = false
     AND timestamp > (now() - interval '24 hours');

  IF recent_inbound IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'RECENT_COMMUNICATION_24H',
      'detail', 'recent_inbound_reply',
      'last_communication_at', recent_inbound
    );
  END IF;

  -- Block on outbound communication in last 24h ONLY when it represents a real SMTP send.
  -- A real outbound is one that has a corresponding email_queue row with smtp_accepted_at populated
  -- within the last 24 hours, OR a non-ignored manual/founder communication.
  SELECT MAX(cm.timestamp) INTO recent_real_outbound
    FROM public.communications cm
   WHERE cm.contact_id = _contact_id
     AND cm.direction = 'outbound'
     AND cm.ignored_for_send_check = false
     AND cm.timestamp > (now() - interval '24 hours')
     AND (
       -- Real SMTP-backed: there is an email_queue row marking actual SMTP acceptance
       EXISTS (
         SELECT 1 FROM public.email_queue eq
          WHERE eq.contact_id = _contact_id
            AND eq.smtp_accepted_at IS NOT NULL
            AND eq.smtp_accepted_at > (now() - interval '24 hours')
       )
       -- Or a manual/non-AI communication (founder/human) — treat as real
       OR cm.ai_generated = false
     );

  IF recent_real_outbound IS NOT NULL THEN
    -- Double check: if the only matching cm is a non-AI but no real SMTP, still block (manual contact)
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'RECENT_COMMUNICATION_24H',
      'detail', 'recent_real_smtp',
      'last_communication_at', recent_real_outbound
    );
  END IF;

  -- last_contacted_at < 48h: only honor when there is a real SMTP-backed send corroborating it
  IF c.last_contacted_at IS NOT NULL AND c.last_contacted_at > (now() - interval '48 hours') THEN
    SELECT EXISTS(
      SELECT 1 FROM public.email_queue eq
       WHERE eq.contact_id = _contact_id
         AND eq.smtp_accepted_at IS NOT NULL
         AND eq.smtp_accepted_at > (now() - interval '48 hours')
    ) INTO recent_last_contacted_real;

    IF recent_last_contacted_real THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'RECENTLY_CONTACTED',
        'detail', 'recent_real_smtp',
        'last_contacted_at', c.last_contacted_at
      );
    END IF;
    -- else: stale/ghost stamp from simulated/failed send — do not block
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.email_events
     WHERE contact_id = _contact_id AND event_type = 'bounced'
  ) INTO recent_bounce;

  IF recent_bounce THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'EMAIL_BOUNCED');
  END IF;

  IF c.assigned_inbox_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'NO_INBOX_ASSIGNED');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'inbox_id', c.assigned_inbox_id);
END;
$function$;

-- Server-side authorization hardening for public.check_outreach_allowed(p_contact_id uuid, p_business_id uuid)
CREATE OR REPLACE FUNCTION public.check_outreach_allowed(p_contact_id uuid, p_business_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c public.contacts%ROWTYPE;
  bcr public.business_contact_relationships%ROWTYPE;
  reasons text[] := ARRAY[]::text[];
  retention_valid boolean := false;
  unsub_present boolean := false;
  basis_present boolean := false;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT * INTO c FROM public.contacts WHERE id=p_contact_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'blocker_reasons', ARRAY['contact_not_found']); END IF;
  basis_present := c.lawful_basis IS NOT NULL AND length(c.lawful_basis) > 0;
  unsub_present := c.unsubscribe_token IS NOT NULL;
  retention_valid := c.retention_until IS NOT NULL AND c.retention_until > now();
  IF NOT basis_present THEN reasons := reasons || 'no_lawful_basis'; END IF;
  IF NOT unsub_present THEN reasons := reasons || 'no_unsubscribe_token'; END IF;
  IF NOT retention_valid THEN reasons := reasons || 'retention_invalid_or_expired'; END IF;
  IF c.is_globally_suppressed THEN reasons := reasons || 'globally_suppressed'; END IF;
  IF c.hard_bounced THEN reasons := reasons || 'hard_bounced'; END IF;
  IF c.unsubscribed_at IS NOT NULL THEN reasons := reasons || 'unsubscribed'; END IF;
  IF c.status='DO_NOT_CONTACT'::contact_status THEN reasons := reasons || 'status_do_not_contact'; END IF;
  IF c.compliance_status IN ('unsubscribed','hard_bounced','do_not_contact','pending_review','retained_no_outreach') THEN
    reasons := reasons || ('compliance_status_' || c.compliance_status);
  END IF;
  IF p_business_id IS NOT NULL THEN
    SELECT * INTO bcr FROM public.business_contact_relationships WHERE contact_id=p_contact_id AND business_id=p_business_id LIMIT 1;
    IF FOUND THEN
      IF bcr.do_not_contact THEN reasons := reasons || 'bcr_do_not_contact'; END IF;
      IF NOT bcr.campaign_eligible THEN reasons := reasons || 'bcr_not_campaign_eligible'; END IF;
      IF bcr.qualification <> 'qualified'::bcr_qualification THEN reasons := reasons || 'bcr_not_qualified'; END IF;
    ELSE
      reasons := reasons || 'bcr_missing';
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'allowed', array_length(reasons, 1) IS NULL,
    'blocker_reasons', reasons,
    'compliance_status', c.compliance_status,
    'unsubscribe_token_present', unsub_present,
    'lawful_basis_present', basis_present,
    'retention_valid', retention_valid
  );
END; $function$;

-- Server-side authorization hardening for public.claim_portfolio_contact(p_contact_id uuid, p_business_name text, p_campaign_key text, p_campaign_id uuid, p_founder_override boolean, p_override_reason text)
CREATE OR REPLACE FUNCTION public.claim_portfolio_contact(p_contact_id uuid, p_business_name text, p_campaign_key text DEFAULT NULL::text, p_campaign_id uuid DEFAULT NULL::uuid, p_founder_override boolean DEFAULT false, p_override_reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact public.contacts%ROWTYPE;
  v_owner public.portfolio_contact_ownership%ROWTYPE;
  v_business_id uuid;
  v_cooldown_days integer;
  v_cooldown_until timestamptz;
  v_hard text[] := '{}';
  v_soft text[] := '{}';
  v_new_id uuid;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT * INTO v_contact FROM public.contacts WHERE id = p_contact_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision', 'blocked', 'reason_codes', ARRAY['contact_not_found'], 'hard_blocked', true);
  END IF;

  SELECT cross_brand_cooldown_days INTO v_cooldown_days FROM public.portfolio_collision_policy LIMIT 1;
  v_cooldown_days := COALESCE(v_cooldown_days, 30);

  SELECT id INTO v_business_id FROM public.businesses WHERE name = p_business_name LIMIT 1;

  IF COALESCE(v_contact.is_globally_suppressed, false) THEN v_hard := v_hard || 'global_suppression'; END IF;
  IF COALESCE(v_contact.hard_bounced, false) THEN v_hard := v_hard || 'hard_bounce'; END IF;
  IF v_contact.unsubscribed_at IS NOT NULL THEN v_hard := v_hard || 'unsubscribed'; END IF;
  IF v_contact.do_not_contact_at IS NOT NULL THEN v_hard := v_hard || 'do_not_contact'; END IF;

  SELECT * INTO v_owner
  FROM public.portfolio_contact_ownership
  WHERE contact_id = p_contact_id AND status = 'active'
  FOR UPDATE;

  IF FOUND AND v_owner.business_name = p_business_name AND array_length(v_hard, 1) IS NULL THEN
    INSERT INTO public.portfolio_ownership_events
      (contact_id, ownership_id, business_name, campaign_key, event_type, decision, reason_codes, actor_id)
    VALUES (p_contact_id, v_owner.id, p_business_name, p_campaign_key, 'claim', 'allowed',
            ARRAY['already_owned_by_requesting_brand'], auth.uid());
    RETURN jsonb_build_object(
      'decision', 'allowed', 'reason_codes', ARRAY['already_owned_by_requesting_brand'],
      'hard_blocked', false, 'ownership_id', v_owner.id, 'current_owner_business', v_owner.business_name);
  END IF;

  IF COALESCE(v_contact.conversation_active, false)
     AND (NOT FOUND OR v_owner.business_name <> p_business_name) THEN
    v_hard := v_hard || 'active_conversation_block';
  END IF;

  IF FOUND AND v_owner.business_name <> p_business_name THEN
    v_soft := v_soft || 'owned_by_other_brand';
  END IF;

  SELECT max(cooldown_until) INTO v_cooldown_until
  FROM public.portfolio_contact_ownership
  WHERE contact_id = p_contact_id
    AND status = 'released'
    AND business_name <> p_business_name
    AND cooldown_until IS NOT NULL
    AND cooldown_until > now();
  IF v_cooldown_until IS NOT NULL THEN v_soft := v_soft || 'cross_brand_cooldown'; END IF;

  IF array_length(v_hard, 1) IS NOT NULL THEN
    INSERT INTO public.portfolio_ownership_events
      (contact_id, business_name, campaign_key, event_type, decision, reason_codes, founder_override, override_reason, actor_id)
    VALUES (p_contact_id, p_business_name, p_campaign_key, 'claim', 'blocked', v_hard || v_soft,
            COALESCE(p_founder_override, false), COALESCE(p_override_reason, ''), auth.uid());
    RETURN jsonb_build_object('decision', 'blocked', 'reason_codes', v_hard || v_soft,
      'hard_blocked', true, 'overridable', false,
      'explanation', 'Hard safety block; founder override cannot bypass this.');
  END IF;

  IF array_length(v_soft, 1) IS NOT NULL AND NOT COALESCE(p_founder_override, false) THEN
    INSERT INTO public.portfolio_ownership_events
      (contact_id, business_name, campaign_key, event_type, decision, reason_codes, actor_id)
    VALUES (p_contact_id, p_business_name, p_campaign_key, 'claim', 'blocked', v_soft, auth.uid());
    RETURN jsonb_build_object('decision', 'blocked', 'reason_codes', v_soft,
      'hard_blocked', false, 'overridable', true,
      'current_owner_business', v_owner.business_name,
      'cooldown_until', v_cooldown_until);
  END IF;

  IF v_owner.id IS NOT NULL AND v_owner.business_name <> p_business_name THEN
    UPDATE public.portfolio_contact_ownership
       SET status = 'released',
           released_at = now(),
           reason_code = 'released_by_founder_override',
           cooldown_until = now() + (v_cooldown_days || ' days')::interval,
           updated_at = now()
     WHERE id = v_owner.id;
    INSERT INTO public.portfolio_ownership_events
      (contact_id, ownership_id, business_name, event_type, decision, reason_codes, founder_override, override_reason, actor_id)
    VALUES (p_contact_id, v_owner.id, v_owner.business_name, 'release', 'allowed',
            ARRAY['released_by_founder_override'], true, COALESCE(p_override_reason, ''), auth.uid());
  END IF;

  INSERT INTO public.portfolio_contact_ownership
    (contact_id, business_id, business_name, campaign_key, campaign_id, status, reason_code,
     founder_override, override_reason, claimed_by)
  VALUES (p_contact_id, v_business_id, p_business_name, p_campaign_key, p_campaign_id, 'active',
          CASE WHEN COALESCE(p_founder_override, false) THEN 'claimed_with_override' ELSE 'claimed' END,
          COALESCE(p_founder_override, false), COALESCE(p_override_reason, ''), auth.uid())
  RETURNING id INTO v_new_id;

  INSERT INTO public.portfolio_ownership_events
    (contact_id, ownership_id, business_name, campaign_key, event_type, decision, reason_codes,
     founder_override, override_reason, actor_id)
  VALUES (p_contact_id, v_new_id, p_business_name, p_campaign_key, 'claim', 'allowed',
          CASE WHEN array_length(v_soft, 1) IS NULL THEN ARRAY['no_conflict'] ELSE v_soft END,
          COALESCE(p_founder_override, false), COALESCE(p_override_reason, ''), auth.uid());

  RETURN jsonb_build_object('decision', 'allowed', 'ownership_id', v_new_id,
    'reason_codes', CASE WHEN array_length(v_soft, 1) IS NULL THEN ARRAY['no_conflict'] ELSE v_soft END,
    'hard_blocked', false, 'founder_override_applied', COALESCE(p_founder_override, false) AND array_length(v_soft, 1) IS NOT NULL,
    'current_owner_business', p_business_name);
END;
$function$;

-- Server-side authorization hardening for public.cleanup_stale_ai_leases()
CREATE OR REPLACE FUNCTION public.cleanup_stale_ai_leases()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n int;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  UPDATE public.ai_concurrency_leases
     SET status='expired', released_at = now()
   WHERE status='active' AND expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;

  IF n > 0 THEN
    INSERT INTO public.ai_runtime_events (event_type, severity, message, metadata)
    VALUES ('stale_lease_cleanup', 'warning',
            'Expired ' || n || ' stale AI concurrency lease(s)',
            jsonb_build_object('expired_count', n));
  END IF;

  RETURN n;
END;
$function$;

-- Server-side authorization hardening for public.compare_system_versions(_version_a integer, _version_b integer)
CREATE OR REPLACE FUNCTION public.compare_system_versions(_version_a integer, _version_b integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_a record;
  v_b record;
  v_diff jsonb;
  v_added integer;
  v_removed integer;
  v_modified integer;
  v_id uuid;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT * INTO v_a FROM public.system_versions WHERE version_number = _version_a;
  SELECT * INTO v_b FROM public.system_versions WHERE version_number = _version_b;
  IF v_a.id IS NULL OR v_b.id IS NULL THEN
    RAISE EXCEPTION 'Version not found';
  END IF;

  v_diff := jsonb_build_object(
    'pages',         jsonb_build_object('a', v_a.pages_count,        'b', v_b.pages_count,        'delta', v_b.pages_count        - v_a.pages_count),
    'content',       jsonb_build_object('a', v_a.content_count,      'b', v_b.content_count,      'delta', v_b.content_count      - v_a.content_count),
    'backend',       jsonb_build_object('a', v_a.backend_count,      'b', v_b.backend_count,      'delta', v_b.backend_count      - v_a.backend_count),
    'workflows',     jsonb_build_object('a', v_a.workflow_count,     'b', v_b.workflow_count,     'delta', v_b.workflow_count     - v_a.workflow_count),
    'rules',         jsonb_build_object('a', v_a.rule_count,         'b', v_b.rule_count,         'delta', v_b.rule_count         - v_a.rule_count),
    'integrations',  jsonb_build_object('a', v_a.integration_count,  'b', v_b.integration_count,  'delta', v_b.integration_count  - v_a.integration_count),
    'data_flows',    jsonb_build_object('a', v_a.data_flow_count,    'b', v_b.data_flow_count,    'delta', v_b.data_flow_count    - v_a.data_flow_count),
    'coverage',      jsonb_build_object('a', v_a.coverage_score,     'b', v_b.coverage_score,     'delta', v_b.coverage_score     - v_a.coverage_score)
  );

  v_added := GREATEST(0, (v_b.pages_count - v_a.pages_count))
           + GREATEST(0, (v_b.backend_count - v_a.backend_count))
           + GREATEST(0, (v_b.workflow_count - v_a.workflow_count))
           + GREATEST(0, (v_b.rule_count - v_a.rule_count))
           + GREATEST(0, (v_b.integration_count - v_a.integration_count))
           + GREATEST(0, (v_b.data_flow_count - v_a.data_flow_count));

  v_removed := GREATEST(0, (v_a.pages_count - v_b.pages_count))
             + GREATEST(0, (v_a.backend_count - v_b.backend_count))
             + GREATEST(0, (v_a.workflow_count - v_b.workflow_count))
             + GREATEST(0, (v_a.rule_count - v_b.rule_count))
             + GREATEST(0, (v_a.integration_count - v_b.integration_count))
             + GREATEST(0, (v_a.data_flow_count - v_b.data_flow_count));

  v_modified := ABS(v_b.coverage_score - v_a.coverage_score);

  INSERT INTO public.system_version_diffs (version_a, version_b, diff_summary, added_count, removed_count, modified_count)
  VALUES (_version_a, _version_b, v_diff, v_added, v_removed, v_modified)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'diff_id', v_id,
    'version_a', _version_a,
    'version_b', _version_b,
    'added', v_added,
    'removed', v_removed,
    'modified', v_modified,
    'summary', v_diff
  );
END;
$function$;

-- Server-side authorization hardening for public.crm_match_interaction_preview(p_interaction_id uuid, p_provider_event_id uuid, p_contact_email text, p_provider_message_id text, p_provider_campaign_id text, p_business_id uuid)
CREATE OR REPLACE FUNCTION public.crm_match_interaction_preview(p_interaction_id uuid DEFAULT NULL::uuid, p_provider_event_id uuid DEFAULT NULL::uuid, p_contact_email text DEFAULT NULL::text, p_provider_message_id text DEFAULT NULL::text, p_provider_campaign_id text DEFAULT NULL::text, p_business_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_contact_email, '')));
  v_provider_type text;
  v_external_event_id text;
  v_provider_msg text := p_provider_message_id;
  v_provider_camp text := p_provider_campaign_id;
  v_business_id uuid := p_business_id;
  v_interaction_type text;
  v_candidates jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_recommended jsonb := NULL;
  v_dedupe_key text := NULL;
  v_should_create_conv boolean := false;
  v_founder_review boolean := false;
  r record;
  v_confidence numeric;
BEGIN
  -- Authorization
  IF session_user NOT IN ('postgres', 'supabase_admin') AND auth.role() IS DISTINCT FROM 'service_role' AND NOT (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Hydrate from ledger
  IF p_interaction_id IS NOT NULL THEN
    SELECT lower(trim(coalesce(contact_email, ''))), provider_type, provider_message_id, provider_campaign_id, external_event_id, interaction_type, business_id
    INTO v_email, v_provider_type, v_provider_msg, v_provider_camp, v_external_event_id, v_interaction_type, v_business_id
    FROM public.crm_interaction_ledger WHERE id = p_interaction_id;
  END IF;

  -- Hydrate from provider event
  IF p_provider_event_id IS NOT NULL THEN
    SELECT
      coalesce(v_provider_type, provider_type),
      coalesce(v_external_event_id, external_event_id),
      coalesce(v_provider_camp, provider_campaign_id),
      coalesce(v_provider_msg, provider_message_id),
      coalesce(NULLIF(v_email,''), lower(trim(coalesce(contact_email,''))))
    INTO v_provider_type, v_external_event_id, v_provider_camp, v_provider_msg, v_email
    FROM public.outbound_provider_events WHERE id = p_provider_event_id;
  END IF;

  -- 1. provider lead mapping
  IF v_provider_type IS NOT NULL AND v_provider_camp IS NOT NULL AND v_email <> '' THEN
    FOR r IN
      SELECT liftor_contact_id, business_id, liftor_campaign_id
      FROM public.outbound_provider_lead_mappings
      WHERE provider_type = v_provider_type
        AND provider_campaign_id = v_provider_camp
        AND lower(contact_email) = v_email
      LIMIT 3
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','provider_lead_mapping','confidence',0.98,
        'contact_id',r.liftor_contact_id,'business_id',r.business_id,'campaign_id',r.liftor_campaign_id);
    END LOOP;
  END IF;

  -- 2. provider campaign mapping
  IF v_provider_type IS NOT NULL AND v_provider_camp IS NOT NULL THEN
    FOR r IN
      SELECT liftor_campaign_id, business_id
      FROM public.outbound_provider_campaign_mappings
      WHERE provider_type = v_provider_type
        AND provider_campaign_id = v_provider_camp
      LIMIT 3
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','provider_campaign_mapping','confidence',0.7,
        'campaign_id',r.liftor_campaign_id,'business_id',r.business_id);
    END LOOP;
  END IF;

  -- 3. exact contact email
  IF v_email <> '' THEN
    FOR r IN
      SELECT id FROM public.contacts WHERE lower(trim(email)) = v_email LIMIT 5
    LOOP
      v_confidence := 0.9;
      v_candidates := v_candidates || jsonb_build_object(
        'method','contact_email_exact','confidence',v_confidence,'contact_id',r.id);
    END LOOP;
  END IF;

  -- 4. communication by provider_message_id
  IF v_provider_msg IS NOT NULL THEN
    FOR r IN
      SELECT c.id, c.contact_id
      FROM public.communications c
      WHERE c.message ILIKE '%' || v_provider_msg || '%'
      LIMIT 2
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','communication_provider_message_id','confidence',0.6,
        'communication_id',r.id,'contact_id',r.contact_id);
    END LOOP;
  END IF;

  -- 5. email_events by provider_message_id
  IF v_provider_msg IS NOT NULL THEN
    BEGIN
      FOR r IN EXECUTE 'SELECT contact_id FROM public.email_events WHERE provider_message_id = $1 LIMIT 2' USING v_provider_msg
      LOOP
        v_candidates := v_candidates || jsonb_build_object(
          'method','email_event_provider_message_id','confidence',0.85,'contact_id',r.contact_id);
      END LOOP;
    EXCEPTION WHEN undefined_column OR undefined_table THEN
      NULL;
    END;
  END IF;

  -- 6. existing conversation by contact/business
  IF v_email <> '' THEN
    FOR r IN
      SELECT cv.id, cv.contact_id
      FROM public.conversations cv
      JOIN public.contacts ct ON ct.id = cv.contact_id
      WHERE lower(trim(ct.email)) = v_email
      ORDER BY cv.last_message_at DESC
      LIMIT 2
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','conversation_by_contact','confidence',0.7,
        'conversation_id',r.id,'contact_id',r.contact_id);
    END LOOP;
  END IF;

  -- 7. BCR by contact/business
  IF v_email <> '' THEN
    FOR r IN
      SELECT bcr.id, bcr.contact_id, bcr.business_id
      FROM public.business_contact_relationships bcr
      JOIN public.contacts ct ON ct.id = bcr.contact_id
      WHERE lower(trim(ct.email)) = v_email
      LIMIT 3
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'method','bcr_by_contact','confidence',0.6,
        'business_contact_relationship_id',r.id,'contact_id',r.contact_id,'business_id',r.business_id);
    END LOOP;
  END IF;

  -- 9. fallback by business_id
  IF v_business_id IS NOT NULL THEN
    v_candidates := v_candidates || jsonb_build_object(
      'method','business_only_fallback','confidence',0.2,'business_id',v_business_id);
  END IF;

  -- Recommended = highest confidence
  SELECT to_jsonb(c)
  INTO v_recommended
  FROM jsonb_array_elements(v_candidates) c
  ORDER BY (c->>'confidence')::numeric DESC NULLS LAST
  LIMIT 1;

  -- Warnings
  IF v_email = '' THEN
    v_warnings := v_warnings || to_jsonb('no_contact_email'::text);
  END IF;
  IF jsonb_array_length(v_candidates) = 0 THEN
    v_warnings := v_warnings || to_jsonb('no_candidates_found'::text);
    v_founder_review := true;
  END IF;
  IF jsonb_array_length(v_candidates) > 1 AND v_recommended IS NOT NULL
     AND (v_recommended->>'confidence')::numeric < 0.7 THEN
    v_founder_review := true;
  END IF;

  -- dedupe_key recommendation
  IF v_provider_type IS NOT NULL AND v_external_event_id IS NOT NULL THEN
    v_dedupe_key := v_provider_type || ':' || v_external_event_id;
  ELSIF v_provider_type IS NOT NULL AND v_provider_msg IS NOT NULL AND v_interaction_type IS NOT NULL THEN
    v_dedupe_key := v_provider_type || ':' || v_provider_msg || ':' || v_interaction_type;
  ELSIF v_email <> '' AND v_interaction_type IS NOT NULL THEN
    v_dedupe_key := 'email:' || v_email || ':' || v_interaction_type;
  END IF;

  -- should create conversation later
  IF v_recommended IS NOT NULL
     AND v_recommended ? 'contact_id'
     AND NOT (v_recommended ? 'conversation_id') THEN
    v_should_create_conv := true;
  END IF;

  RETURN jsonb_build_object(
    'candidates', v_candidates,
    'recommended', v_recommended,
    'confidence', COALESCE((v_recommended->>'confidence')::numeric, 0),
    'warnings', v_warnings,
    'dedupe_key', v_dedupe_key,
    'should_create_conversation_later', v_should_create_conv,
    'founder_review_required', v_founder_review,
    'inputs', jsonb_build_object(
      'contact_email', v_email,
      'provider_type', v_provider_type,
      'provider_campaign_id', v_provider_camp,
      'provider_message_id', v_provider_msg,
      'external_event_id', v_external_event_id,
      'business_id', v_business_id,
      'interaction_type', v_interaction_type
    )
  );
END;
$function$;

-- Server-side authorization hardening for public.detect_anomalies()
CREATE OR REPLACE FUNCTION public.detect_anomalies()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  flagged_count int := 0;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  -- a) email_queue stuck > 30 min in pending/delayed/throttled with scheduled_at past
  FOR r IN
    SELECT id, business_name, campaign_id, status, scheduled_at
      FROM public.email_queue
     WHERE status IN ('pending','delayed','throttled')
       AND scheduled_at < now() - interval '30 minutes'
     LIMIT 50
  LOOP
    PERFORM public.log_system_event(
      'email_queue_stuck', 'email_queue', r.id, COALESCE(r.business_name,''),
      'medium',
      'Queue item stuck in ' || r.status::text || ' for >30min',
      jsonb_build_object('scheduled_at', r.scheduled_at, 'campaign_id', r.campaign_id)
    );
    -- Auto-correction: requeue (only for delayed/throttled past their retry window)
    INSERT INTO public.retry_queue (entity_type, entity_id, action_type, next_retry_at)
    VALUES ('email_queue', r.id, 'send_email', now())
    ON CONFLICT DO NOTHING;
    flagged_count := flagged_count + 1;
  END LOOP;

  -- b) campaign with 0 replies after 50+ sends (last 7 days)
  FOR r IN
    SELECT cm.campaign_id, oc.business_name, oc.campaign_name, cm.total_sent, cm.total_replies
      FROM public.campaign_metrics cm
      JOIN public.outreach_campaigns oc ON oc.id = cm.campaign_id
     WHERE cm.total_sent >= 50
       AND cm.total_replies = 0
       AND oc.status::text = 'active'
  LOOP
    PERFORM public.log_system_event(
      'campaign_zero_replies', 'campaign', r.campaign_id, COALESCE(r.business_name,''),
      'high',
      'Campaign "' || r.campaign_name || '" has ' || r.total_sent || ' sends and 0 replies',
      jsonb_build_object('total_sent', r.total_sent)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- c) AI actions exceeding daily limit (20 per conversation)
  FOR r IN
    SELECT conversation_id, COUNT(*)::int AS cnt
      FROM public.ai_actions
     WHERE created_at >= date_trunc('day', now())
     GROUP BY conversation_id
    HAVING COUNT(*) > 20
  LOOP
    PERFORM public.log_system_event(
      'ai_daily_limit_exceeded', 'conversation', r.conversation_id, '',
      'high',
      'Conversation has ' || r.cnt || ' AI actions today (>20)',
      jsonb_build_object('actions_today', r.cnt)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- d) assignments not updated > 24h while still in active states
  FOR r IN
    SELECT id, business_name, status, updated_at
      FROM public.assignments
     WHERE status::text IN ('assigned','acknowledged','in_progress')
       AND updated_at < now() - interval '24 hours'
     LIMIT 100
  LOOP
    PERFORM public.log_system_event(
      'assignment_idle', 'assignment', r.id, COALESCE(r.business_name,''),
      'medium',
      'Assignment idle >24h in status ' || r.status::text,
      jsonb_build_object('last_update', r.updated_at)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- e) invoices overdue > 14 days
  FOR r IN
    SELECT id, business_name, invoice_number, due_date
      FROM public.invoices
     WHERE status IN ('OVERDUE','PARTIALLY_PAID')
       AND due_date < CURRENT_DATE - interval '14 days'
     LIMIT 100
  LOOP
    PERFORM public.log_system_event(
      'invoice_overdue_14d', 'invoice', r.id, COALESCE(r.business_name,''),
      'high',
      'Invoice ' || r.invoice_number || ' overdue >14 days',
      jsonb_build_object('due_date', r.due_date)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- f) entities with compliance_score > 70
  FOR r IN
    SELECT entity_type, entity_id, score
      FROM public.compliance_scores
     WHERE score > 70
       AND last_event_at > now() - interval '24 hours'
     LIMIT 100
  LOOP
    PERFORM public.log_system_event(
      'compliance_score_high', r.entity_type::text, r.entity_id, '',
      'high',
      'Compliance score ' || r.score || ' exceeds 70',
      jsonb_build_object('score', r.score)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  -- g) inbox reputation < 20
  FOR r IN
    SELECT id, business_name, email_address, reputation_score
      FROM public.inboxes
     WHERE active = true AND reputation_score < 20
  LOOP
    PERFORM public.log_system_event(
      'inbox_reputation_critical', 'inbox', r.id, COALESCE(r.business_name,''),
      'critical',
      'Inbox ' || r.email_address || ' reputation ' || r.reputation_score || ' (<20) — sending paused',
      jsonb_build_object('reputation', r.reputation_score)
    );
    flagged_count := flagged_count + 1;
  END LOOP;

  RETURN jsonb_build_object('flagged', flagged_count, 'ran_at', now());
END;
$function$;

-- Server-side authorization hardening for public.detect_orphan_content()
CREATE OR REPLACE FUNCTION public.detect_orphan_content()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_orphans jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_row record;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  FOR v_row IN
    SELECT c.id, c.page, c.content_type, c.linked_feature
    FROM public.system_content c
    LEFT JOIN public.system_pages_index p ON p.route_path = c.page
    WHERE p.id IS NULL
       OR c.linked_feature IS NULL
       OR c.linked_feature = ''
  LOOP
    v_count := v_count + 1;
    v_orphans := v_orphans || jsonb_build_object(
      'id', v_row.id, 'page', v_row.page,
      'type', v_row.content_type, 'linked_feature', v_row.linked_feature
    );
  END LOOP;

  IF v_count > 0 THEN
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES (
      'orphan_content_detected',
      'system_content',
      'medium',
      'Orphan content found: ' || v_count || ' entries unlinked',
      jsonb_build_object('orphans', v_orphans)
    );
  END IF;

  RETURN jsonb_build_object(
    'orphans_found', v_count,
    'details', v_orphans,
    'checked_at', now()
  );
END;
$function$;

-- Server-side authorization hardening for public.eligible_suppliers_for_deal(_deal_id uuid)
CREATE OR REPLACE FUNCTION public.eligible_suppliers_for_deal(_deal_id uuid)
 RETURNS SETOF suppliers
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.*
    FROM public.suppliers s
    JOIN public.supplier_availability sa ON sa.supplier_id = s.id
    JOIN public.deals d ON d.id = _deal_id
   WHERE (auth.role() = 'service_role' OR public._is_founder_or_admin())
   AND s.status = 'APPROVED'
     AND sa.status = 'available'
     AND (d.business_name = '' OR s.business_name = '' OR s.business_name = d.business_name)
     AND (
       COALESCE(array_length(d.required_skills, 1), 0) = 0
       OR s.skills && d.required_skills
     )
   ORDER BY
     -- prefer suppliers matching MORE required skills
     COALESCE(array_length(ARRAY(SELECT unnest(s.skills) INTERSECT SELECT unnest(d.required_skills)), 1), 0) DESC,
     s.created_at ASC;
$function$;

-- Server-side authorization hardening for public.export_full_system_snapshot()
CREATE OR REPLACE FUNCTION public.export_full_system_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_snapshot jsonb;
  v_version integer;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT COALESCE(MAX(version_number), 1) INTO v_version FROM public.system_versions;

  v_snapshot := jsonb_build_object(
    'exported_at', now(),
    'manual_version', v_version,
    'pages',         (SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb) FROM public.system_pages_index p),
    'content',       (SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public.system_content c),
    'backend',       (SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) FROM public.system_backend_objects b),
    'workflows',     (SELECT COALESCE(jsonb_agg(to_jsonb(w)), '[]'::jsonb) FROM public.system_workflows_full w),
    'workflow_steps',(SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.system_workflow_steps s),
    'rules',         (SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.system_rules r),
    'integrations',  (SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]'::jsonb) FROM public.system_integrations_full i),
    'data_flows',    (SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb) FROM public.system_data_flows f),
    'versions',      (SELECT COALESCE(jsonb_agg(to_jsonb(v)), '[]'::jsonb) FROM public.system_versions v),
    'changes',       (SELECT COALESCE(jsonb_agg(to_jsonb(ch)), '[]'::jsonb) FROM (SELECT * FROM public.system_changes ORDER BY created_at DESC LIMIT 500) ch)
  );

  RETURN v_snapshot;
END;
$function$;

-- Server-side authorization hardening for public.finance_target_vs_actual(_business_name text, _month date)
CREATE OR REPLACE FUNCTION public.finance_target_vs_actual(_business_name text DEFAULT NULL::text, _month date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date)
 RETURNS TABLE(business_name text, monthly_target numeric, pipeline_target numeric, pipeline_value numeric, closed_value numeric, collected_value numeric, outstanding_value numeric, overdue_value numeric, progress_pct numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  month_start date := date_trunc('month', _month)::date;
  month_end date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  RETURN QUERY
  WITH businesses AS (
    SELECT DISTINCT b FROM (
      SELECT business_name AS b FROM public.deals
      UNION SELECT business_name FROM public.invoices
      UNION SELECT business_name FROM public.revenue_targets
    ) s
    WHERE _business_name IS NULL OR s.b = _business_name
  ),
  target AS (
    SELECT rt.business_name, rt.monthly_target, rt.pipeline_target
      FROM public.revenue_targets rt WHERE rt.month = month_start
  ),
  pipeline AS (
    SELECT d.business_name,
           COALESCE(SUM((d.estimated_value_min + d.estimated_value_max) / 2.0), 0) AS pipeline_value
      FROM public.deals d WHERE d.status NOT IN ('WON','LOST')
     GROUP BY d.business_name
  ),
  closed AS (
    SELECT d.business_name,
           COALESCE(SUM((d.estimated_value_min + d.estimated_value_max) / 2.0), 0) AS closed_value
      FROM public.deals d
     WHERE d.status = 'WON' AND d.won_at >= month_start AND d.won_at <= month_end + interval '1 day'
     GROUP BY d.business_name
  ),
  collected AS (
    SELECT i.business_name, COALESCE(SUM(p.amount_received), 0) AS collected_value
      FROM public.payments p JOIN public.invoices i ON i.id = p.invoice_id
     WHERE p.received_date BETWEEN month_start AND month_end
     GROUP BY i.business_name
  ),
  outstanding AS (
    SELECT i.business_name,
           COALESCE(SUM(COALESCE(i.expected_amount, (i.amount_min + i.amount_max)/2.0)), 0) AS outstanding_value,
           COALESCE(SUM(CASE WHEN i.status = 'OVERDUE'
                             THEN COALESCE(i.expected_amount, (i.amount_min + i.amount_max)/2.0)
                             ELSE 0 END), 0) AS overdue_value
      FROM public.invoices i
     WHERE i.status IN ('SENT','OVERDUE','PARTIALLY_PAID')
     GROUP BY i.business_name
  )
  SELECT
    b.b, COALESCE(target.monthly_target, 0), COALESCE(target.pipeline_target, 0),
    COALESCE(pipeline.pipeline_value, 0), COALESCE(closed.closed_value, 0),
    COALESCE(collected.collected_value, 0),
    COALESCE(outstanding.outstanding_value, 0), COALESCE(outstanding.overdue_value, 0),
    CASE WHEN COALESCE(target.monthly_target, 0) > 0
         THEN ROUND((COALESCE(collected.collected_value, 0) / target.monthly_target) * 100, 2)
         ELSE 0 END
  FROM businesses b
  LEFT JOIN target ON target.business_name = b.b
  LEFT JOIN pipeline ON pipeline.business_name = b.b
  LEFT JOIN closed ON closed.business_name = b.b
  LEFT JOIN collected ON collected.business_name = b.b
  LEFT JOIN outstanding ON outstanding.business_name = b.b
  ORDER BY b.b;
END;
$function$;

-- Server-side authorization hardening for public.founder_confirm_assignment(_assignment_id uuid)
CREATE OR REPLACE FUNCTION public.founder_confirm_assignment(_assignment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a public.assignments;
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin') AND auth.role() IS DISTINCT FROM 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT * INTO a FROM public.assignments WHERE id = _assignment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  END IF;
  IF a.status <> 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_COMPLETED', 'status', a.status);
  END IF;
  IF a.completion_confirmed_by_founder THEN
    RETURN jsonb_build_object('ok', true, 'already_confirmed', true);
  END IF;

  UPDATE public.assignments
     SET completion_confirmed_by_founder = true,
         confirmed_at = now(),
         requires_finance_action = true,
         updated_at = now()
   WHERE id = _assignment_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('assignment_ready_for_billing',
          'Assignment ' || _assignment_id::text || ' confirmed complete by founder — finance action required',
          'assignment', _assignment_id);

  RETURN jsonb_build_object('ok', true, 'assignment_id', _assignment_id);
END; $function$;

-- Server-side authorization hardening for public.get_crm_contact_360_summary(p_contact_id uuid, p_business_id uuid)
CREATE OR REPLACE FUNCTION public.get_crm_contact_360_summary(p_contact_id uuid, p_business_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contact jsonb;
  v_bcr jsonb;
  v_compliance jsonb;
  v_latest jsonb;
  v_comm jsonb;
  v_proposal_count int;
  v_demo_count int;
  v_deal_count int;
  v_invoice_count int;
  v_payment_count int;
  v_open_conversations int;
  v_risk jsonb := '[]'::jsonb;
  v_next text;
  v_score int := 0;
  v_business_names text[];
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin') AND auth.role() IS DISTINCT FROM 'service_role' AND NOT (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT to_jsonb(c) INTO v_contact FROM public.contacts c WHERE c.id = p_contact_id;
  IF v_contact IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'contact_not_found');
  END IF;

  SELECT array_agg(business_name) INTO v_business_names
  FROM public.business_contact_relationships
  WHERE contact_id = p_contact_id
    AND (p_business_id IS NULL OR business_id = p_business_id);

  SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) INTO v_bcr
  FROM (
    SELECT * FROM public.business_contact_relationships
    WHERE contact_id = p_contact_id
      AND (p_business_id IS NULL OR business_id = p_business_id)
    ORDER BY updated_at DESC
  ) b;

  SELECT jsonb_build_object(
    'open_count', COUNT(*) FILTER (WHERE NOT resolved),
    'high_critical_open', COUNT(*) FILTER (WHERE NOT resolved AND severity::text IN ('high','critical')),
    'last_event_at', MAX(created_at)
  ) INTO v_compliance
  FROM public.compliance_events
  WHERE (entity_type::text='contact' AND entity_id = p_contact_id)
     OR (business_name = ANY(COALESCE(v_business_names,'{}')));

  SELECT to_jsonb(t) INTO v_latest FROM (
    SELECT * FROM public.get_crm_contact_timeline(p_contact_id, p_business_id, 1) LIMIT 1
  ) t;

  SELECT jsonb_build_object(
    'last_inbound_at', MAX(c."timestamp") FILTER (WHERE c.direction='inbound'::communication_direction),
    'last_outbound_at', MAX(c."timestamp") FILTER (WHERE c.direction='outbound'::communication_direction),
    'last_ai_at', MAX(c."timestamp") FILTER (WHERE c.ai_generated)
  ) INTO v_comm
  FROM public.communications c WHERE c.contact_id = p_contact_id;

  SELECT count(*) INTO v_proposal_count FROM public.internal_proposals WHERE contact_id = p_contact_id;
  SELECT count(*) INTO v_demo_count FROM public.demo_access WHERE contact_id = p_contact_id;
  SELECT count(*) INTO v_deal_count FROM public.deals
   WHERE contact_id = p_contact_id OR business_name = ANY(COALESCE(v_business_names,'{}'));
  SELECT count(*) INTO v_invoice_count FROM public.invoices
   WHERE contact_id = p_contact_id OR business_name = ANY(COALESCE(v_business_names,'{}'));
  SELECT count(*) INTO v_payment_count FROM public.payments py
   JOIN public.invoices i ON i.id = py.invoice_id
   WHERE i.contact_id = p_contact_id OR py.business_name = ANY(COALESCE(v_business_names,'{}'));
  SELECT count(*) INTO v_open_conversations FROM public.conversations
   WHERE contact_id = p_contact_id AND status::text='OPEN';

  IF (v_compliance->>'high_critical_open')::int > 0 THEN
    v_risk := v_risk || to_jsonb('compliance_open_high_critical'::text);
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_contact_relationships
              WHERE contact_id = p_contact_id AND do_not_contact = true) THEN
    v_risk := v_risk || to_jsonb('do_not_contact'::text);
  END IF;

  IF (v_compliance->>'high_critical_open')::int > 0 THEN
    v_next := 'Resolve open high/critical compliance events before any outreach';
  ELSIF v_open_conversations > 0 THEN
    v_next := 'Review open conversation and decide on next reply';
  ELSIF v_demo_count > 0 AND v_deal_count = 0 THEN
    v_next := 'Move demo viewer into a deal record';
  ELSIF v_proposal_count > 0 AND v_payment_count = 0 THEN
    v_next := 'Follow up on outstanding proposal / invoice';
  ELSE
    v_next := 'Capture latest interaction into ledger and assess intent';
  END IF;

  v_score := LEAST(100,
    (CASE WHEN v_contact->>'email' <> '' THEN 20 ELSE 0 END)
    + (CASE WHEN v_bcr <> '[]'::jsonb THEN 20 ELSE 0 END)
    + (CASE WHEN v_latest IS NOT NULL THEN 20 ELSE 0 END)
    + (CASE WHEN COALESCE((v_compliance->>'high_critical_open')::int,0) = 0 THEN 20 ELSE 0 END)
    + (CASE WHEN v_open_conversations > 0 OR v_proposal_count > 0 OR v_deal_count > 0 THEN 20 ELSE 0 END)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'contact', v_contact,
    'business_relationships', v_bcr,
    'business_names', COALESCE(to_jsonb(v_business_names), '[]'::jsonb),
    'compliance_state', COALESCE(v_compliance, '{}'::jsonb),
    'latest_interaction', v_latest,
    'latest_inbound', jsonb_build_object('last_inbound_at', v_comm->'last_inbound_at'),
    'latest_outbound', jsonb_build_object('last_outbound_at', v_comm->'last_outbound_at'),
    'latest_ai', jsonb_build_object('last_ai_at', v_comm->'last_ai_at'),
    'proposal_count', v_proposal_count,
    'demo_count', v_demo_count,
    'deal_count', v_deal_count,
    'invoice_count', v_invoice_count,
    'payment_count', v_payment_count,
    'open_conversations', v_open_conversations,
    'risk_flags', v_risk,
    'next_recommended_action', v_next,
    'timeline_readiness_score', v_score,
    'safety', jsonb_build_object('read_only', true, 'no_writes', true, 'no_send', true)
  );
END;
$function$;

-- Server-side authorization hardening for public.get_crm_contact_timeline(p_contact_id uuid, p_business_id uuid, p_limit integer)
CREATE OR REPLACE FUNCTION public.get_crm_contact_timeline(p_contact_id uuid, p_business_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(timeline_id text, source_table text, source_id text, occurred_at timestamp with time zone, source_system text, source_channel text, interaction_type text, direction text, subject text, summary text, status text, business_id uuid, contact_id uuid, conversation_id uuid, proposal_id uuid, demo_access_id uuid, deal_id uuid, invoice_id uuid, payment_id uuid, compliance_status text, founder_review_required boolean, ai_relevant boolean, risk_flags jsonb, next_step text, metadata jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin') AND auth.role() IS DISTINCT FROM 'service_role' AND NOT (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH bcrs AS (
    SELECT bcr.business_name
    FROM public.business_contact_relationships bcr
    WHERE bcr.contact_id = p_contact_id
      AND (p_business_id IS NULL OR bcr.business_id = p_business_id)
  ),
  business_names AS (SELECT DISTINCT business_name FROM bcrs WHERE business_name IS NOT NULL),
  unioned AS (
    SELECT
      ('cil:'||l.id::text) AS timeline_id, 'crm_interaction_ledger'::text AS source_table,
      l.id::text AS source_id, l.occurred_at,
      l.source_system, l.source_channel, l.interaction_type, l.direction,
      l.subject, l.summary, l.matched_status AS status,
      l.business_id, l.contact_id, l.conversation_id,
      l.internal_proposal_id, l.demo_access_id, l.deal_id, l.invoice_id, l.payment_id,
      NULL::text, l.founder_review_required, l.ai_relevant,
      '[]'::jsonb, NULL::text,
      jsonb_build_object('provider_type', l.provider_type, 'provider_message_id', l.provider_message_id)
    FROM public.crm_interaction_ledger l
    WHERE l.contact_id = p_contact_id
       OR (p_business_id IS NOT NULL AND l.business_id = p_business_id)

    UNION ALL
    SELECT ('comm:'||c.id::text), 'communications', c.id::text, c."timestamp",
      'native','communication',
      CASE WHEN c.direction='inbound'::communication_direction THEN 'native_email_reply_received'
           WHEN c.ai_generated THEN 'ai_reply_sent' ELSE 'native_email_sent' END,
      c.direction::text, LEFT(c.message,120), LEFT(c.message,400), NULL,
      NULL::uuid, c.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, c.ai_generated, '[]'::jsonb, NULL::text,
      jsonb_build_object('inbox_id', c.inbox_id, 'channel', c.channel)
    FROM public.communications c WHERE c.contact_id = p_contact_id

    UNION ALL
    SELECT ('ee:'||e.id::text), 'email_events', e.id::text, e."timestamp",
      'native','email_event','native_email_'||e.event_type::text, NULL::text,
      NULL::text, NULL::text, e.event_type::text,
      NULL::uuid, e.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('email_id', e.email_id)
    FROM public.email_events e WHERE e.contact_id = p_contact_id

    UNION ALL
    SELECT ('ope:'||ope.id::text), 'outbound_provider_events', ope.id::text, ope.received_at,
      ope.provider_type,'provider_event',
      ope.provider_type||'_'||lower(ope.provider_event_type), NULL::text,
      NULL::text, NULL::text, ope.processing_status,
      NULL::uuid, ope.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, true, '[]'::jsonb, NULL::text,
      jsonb_build_object('provider_event_id', ope.provider_event_id, 'provider_campaign_id', ope.provider_campaign_id, 'provider_lead_id', ope.provider_lead_id)
    FROM public.outbound_provider_events ope
    WHERE ope.contact_id = p_contact_id
       OR EXISTS (SELECT 1 FROM public.outbound_provider_lead_mappings m
                   WHERE m.liftor_contact_id = p_contact_id
                     AND m.provider_type = ope.provider_type
                     AND m.provider_campaign_id = ope.provider_campaign_id)

    UNION ALL
    SELECT ('aia:'||a.id::text), 'ai_actions', a.id::text, a.created_at,
      'liftor_ai','ai_action',
      CASE WHEN a.status::text='success' THEN 'ai_action_recorded' ELSE 'ai_action_'||a.status::text END,
      'internal', LEFT(a.classification,120), LEFT(a.reply_preview,400), a.status::text,
      NULL::uuid, a.contact_id, a.conversation_id,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, (a.ai_quality_flag::text <> 'pass'), true,
      CASE WHEN a.ai_quality_flag::text <> 'pass' THEN jsonb_build_array(a.ai_quality_flag::text) ELSE '[]'::jsonb END,
      NULL::text,
      jsonb_build_object('action_type', a.action_type, 'tokens_used', a.tokens_used)
    FROM public.ai_actions a WHERE a.contact_id = p_contact_id

    UNION ALL
    SELECT ('aid:'||d.id::text), 'ai_drafts', d.id::text, d.created_at,
      'liftor_ai','ai_draft','ai_reply_draft_created','internal',
      LEFT(d.classification,120), LEFT(d.draft_body,400), d.status::text,
      NULL::uuid, d.contact_id, d.conversation_id,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, (d.status::text='pending'), true, '[]'::jsonb, NULL::text,
      jsonb_build_object('inbox_id', d.inbox_id, 'suggested_tags', d.suggested_tags)
    FROM public.ai_drafts d WHERE d.contact_id = p_contact_id

    UNION ALL
    SELECT ('prop:'||p.id::text), 'internal_proposals', p.id::text, p.created_at,
      'liftor','proposal','proposal_created','outbound',
      p.title, LEFT(p.business_problem,400), NULL,
      NULL::uuid, p.contact_id, NULL::uuid,
      p.id, NULL::uuid, p.deal_id, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('business_name', p.business_name, 'industry', p.industry)
    FROM public.internal_proposals p WHERE p.contact_id = p_contact_id

    UNION ALL
    SELECT ('dma:'||da.id::text), 'demo_access', da.id::text, da.created_at,
      'liftor','demo','demo_access_created','outbound',
      da.business_name, NULL::text, da.status::text,
      NULL::uuid, da.contact_id, NULL::uuid,
      da.proposal_id, da.id, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('high_intent', da.high_intent, 'access_count', da.access_count)
    FROM public.demo_access da WHERE da.contact_id = p_contact_id

    UNION ALL
    SELECT ('dme:'||de.id::text), 'demo_events', de.id::text, de."timestamp",
      'liftor','demo',
      CASE WHEN de.event_type::text='completed' THEN 'demo_completed' ELSE 'demo_'||de.event_type::text END,
      'inbound', NULL::text, NULL::text, NULL::text,
      NULL::uuid, da.contact_id, NULL::uuid,
      da.proposal_id, da.id, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('session_duration_seconds', de.session_duration_seconds)
    FROM public.demo_events de
    JOIN public.demo_access da ON da.id = de.demo_id
    WHERE da.contact_id = p_contact_id

    UNION ALL
    SELECT ('deal:'||d.id::text), 'deals', d.id::text, COALESCE(d.won_at, d.lost_at, d.updated_at),
      'liftor','deal',
      CASE WHEN d.status::text='WON' THEN 'deal_won'
           WHEN d.status::text='LOST' THEN 'deal_lost'
           WHEN d.created_at = d.updated_at THEN 'deal_created'
           ELSE 'deal_stage_changed' END,
      'internal', d.deal_name, d.notes, d.status::text,
      NULL::uuid, d.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, d.id, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('business_name', d.business_name, 'probability', d.probability,
                         'estimated_value_min', d.estimated_value_min, 'estimated_value_max', d.estimated_value_max)
    FROM public.deals d
    WHERE d.contact_id = p_contact_id
       OR d.business_name IN (SELECT business_name FROM business_names)

    UNION ALL
    SELECT ('inv:'||i.id::text), 'invoices', i.id::text, i.created_at,
      'liftor','finance','invoice_created','outbound',
      i.invoice_number, i.notes, i.status::text,
      NULL::uuid, i.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, i.deal_id, i.id, NULL::uuid,
      NULL::text, i.payment_risk_flag, false,
      CASE WHEN i.payment_risk_flag THEN jsonb_build_array('payment_risk') ELSE '[]'::jsonb END,
      NULL::text,
      jsonb_build_object('business_name', i.business_name, 'amount_min', i.amount_min, 'amount_max', i.amount_max, 'currency', i.currency)
    FROM public.invoices i
    WHERE i.contact_id = p_contact_id
       OR i.business_name IN (SELECT business_name FROM business_names)

    UNION ALL
    SELECT ('pay:'||py.id::text), 'payments', py.id::text, py.created_at,
      'liftor','finance','payment_received','inbound',
      py.business_name, py.reference, py.method::text,
      NULL::uuid, i.contact_id, NULL::uuid,
      NULL::uuid, NULL::uuid, i.deal_id, i.id, py.id,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('amount_received', py.amount_received, 'received_date', py.received_date)
    FROM public.payments py
    JOIN public.invoices i ON i.id = py.invoice_id
    WHERE i.contact_id = p_contact_id
       OR py.business_name IN (SELECT business_name FROM business_names)

    UNION ALL
    SELECT ('ce:'||ce.id::text), 'compliance_events', ce.id::text, ce.created_at,
      'liftor','compliance','compliance_event_created','system',
      ce.flag_type, ce.message, CASE WHEN ce.resolved THEN 'resolved' ELSE 'open' END,
      NULL::uuid,
      CASE WHEN ce.entity_type::text='contact' THEN ce.entity_id ELSE NULL END,
      NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      ce.severity::text,
      (NOT ce.resolved AND ce.severity::text IN ('high','critical')),
      false,
      jsonb_build_array(ce.severity::text, ce.flag_type), NULL::text,
      jsonb_build_object('jurisdiction', ce.jurisdiction, 'business_name', ce.business_name)
    FROM public.compliance_events ce
    WHERE (ce.entity_type::text='contact' AND ce.entity_id = p_contact_id)
       OR (ce.business_name IN (SELECT business_name FROM business_names))

    UNION ALL
    SELECT ('al:'||al.id::text), 'activity_log', al.id::text, al.created_at,
      'liftor','system','system_event_created','system',
      al.event_type, LEFT(al.description,400), NULL,
      NULL::uuid,
      CASE WHEN al.entity_type='contact' THEN al.entity_id ELSE NULL END,
      NULL::uuid,
      NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid, NULL::uuid,
      NULL::text, false, false, '[]'::jsonb, NULL::text,
      jsonb_build_object('business_name', al.business_name, 'entity_type', al.entity_type)
    FROM public.activity_log al
    WHERE (al.entity_type='contact' AND al.entity_id = p_contact_id)
       OR (al.business_name IN (SELECT business_name FROM business_names))
  )
  SELECT * FROM unioned
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT GREATEST(p_limit, 1);
END;
$function$;

-- Server-side authorization hardening for public.get_crm_interaction_ledger_summary(p_business_id uuid)
CREATE OR REPLACE FUNCTION public.get_crm_interaction_ledger_summary(p_business_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total INT;
  v_matched INT;
  v_unmatched INT;
  v_last7 INT;
  v_review INT;
  v_ai INT;
  v_compliance INT;
  v_dupes INT;
  v_by_source JSONB;
  v_by_type JSONB;
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin') AND auth.role() IS DISTINCT FROM 'service_role' AND NOT (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT count(*) INTO v_total FROM public.crm_interaction_ledger l
    WHERE p_business_id IS NULL OR l.business_id = p_business_id;
  SELECT count(*) INTO v_matched FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND matched_status = 'matched';
  SELECT count(*) INTO v_unmatched FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND matched_status <> 'matched';
  SELECT count(*) INTO v_last7 FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND occurred_at > now() - interval '7 days';
  SELECT count(*) INTO v_review FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND founder_review_required = true;
  SELECT count(*) INTO v_ai FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND ai_relevant = true;
  SELECT count(*) INTO v_compliance FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND compliance_relevant = true;

  SELECT coalesce(jsonb_object_agg(source_system, c), '{}'::jsonb) INTO v_by_source FROM (
    SELECT source_system, count(*)::int AS c FROM public.crm_interaction_ledger l
      WHERE (p_business_id IS NULL OR l.business_id = p_business_id)
      GROUP BY source_system
  ) x;
  SELECT coalesce(jsonb_object_agg(interaction_type, c), '{}'::jsonb) INTO v_by_type FROM (
    SELECT interaction_type, count(*)::int AS c FROM public.crm_interaction_ledger l
      WHERE (p_business_id IS NULL OR l.business_id = p_business_id)
      GROUP BY interaction_type
  ) y;

  SELECT count(*) INTO v_dupes FROM (
    SELECT dedupe_key FROM public.crm_interaction_ledger
      WHERE dedupe_key IS NOT NULL
      GROUP BY dedupe_key HAVING count(*) > 1
  ) d;

  RETURN jsonb_build_object(
    'ok', true,
    'total_interactions', v_total,
    'matched_interactions', v_matched,
    'unmatched_interactions', v_unmatched,
    'interactions_last_7_days', v_last7,
    'interactions_by_source_system', v_by_source,
    'interactions_by_type', v_by_type,
    'interactions_requiring_founder_review', v_review,
    'ai_relevant_interactions', v_ai,
    'compliance_relevant_interactions', v_compliance,
    'duplicate_dedupe_conflicts', v_dupes,
    'ledger_ready', true
  );
END;
$function$;

-- Server-side authorization hardening for public.has_role(_user_id uuid, _role app_role)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.role() IS DISTINCT FROM 'service_role'
         AND _user_id IS DISTINCT FROM auth.uid()
      THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END
$function$;

-- Server-side authorization hardening for public.is_founder_or_admin(_uid uuid)
CREATE OR REPLACE FUNCTION public.is_founder_or_admin(_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.role() IS DISTINCT FROM 'service_role'
         AND _uid IS DISTINCT FROM auth.uid()
      THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _uid AND role IN ('founder','admin')
    )
  END
$function$;

-- Server-side authorization hardening for public.ma_generate_default_data_room(_asset_id uuid)
CREATE OR REPLACE FUNCTION public.ma_generate_default_data_room(_asset_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  inserted_count integer := 0;
  rec record;
  defaults text[][] := ARRAY[
    ['domain',         'Domain ownership records'],
    ['brand',          'Brand files & trademarks'],
    ['ip',             'IP ownership documentation'],
    ['contracts',      'Core commercial contracts'],
    ['supplier',       'Supplier / freelancer assignments'],
    ['customer_data',  'Customer data map'],
    ['crm',            'CRM records export'],
    ['campaign_metrics','Campaign metrics history'],
    ['finance',        'Financial records (P&L, balance sheet)'],
    ['approval_logs',  'Founder approval logs'],
    ['agent_logs',     'Liftor agent execution logs'],
    ['compliance',     'Compliance evidence pack'],
    ['buyer_map',      'Buyer map & warm-up history'],
    ['valuation',      'Valuation assumptions & benchmarks'],
    ['other',          'Monthly performance reports']
  ];
  i integer;
BEGIN
  IF session_user NOT IN ('postgres', 'supabase_admin') AND auth.role() IS DISTINCT FROM 'service_role' AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role)) THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  FOR i IN 1 .. array_length(defaults, 1) LOOP
    PERFORM 1 FROM ma_data_room_items
      WHERE portfolio_asset_id = _asset_id
        AND item_name = defaults[i][2];
    IF NOT FOUND THEN
      INSERT INTO ma_data_room_items (portfolio_asset_id, item_category, item_name, status)
      VALUES (_asset_id, defaults[i][1]::ma_data_room_category, defaults[i][2], 'missing');
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$function$;

-- Server-side authorization hardening for public.map_billionaire_network_evidence()
CREATE OR REPLACE FUNCTION public.map_billionaire_network_evidence()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_pnm_matched int; v_pnm_amb int; v_pnm_total int; v_hic int; v_sai int;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  -- Giving Pledge / philanthropy network members -> billionaires (unique normalized name both sides only)
  WITH old AS (SELECT id, public.bi_normalize_name(full_name) n FROM public.billionaire_intelligence),
       oldc AS (SELECT n, count(*) c FROM old GROUP BY n),
       mem AS (SELECT id, public.bi_normalize_name(member_display_name) n FROM public.philanthropy_network_members),
       memc AS (SELECT n, count(*) c FROM mem GROUP BY n),
       pair AS (
         SELECT m.id mid, o.id oid FROM mem m JOIN old o ON o.n = m.n
         JOIN oldc oc ON oc.n = m.n JOIN memc mc ON mc.n = m.n
         WHERE oc.c = 1 AND mc.c = 1 AND m.n IS NOT NULL
       )
  INSERT INTO public.billionaire_network_links (billionaire_id, network_member_id, match_method, confidence_score, route_status, outreach_allowed)
  SELECT oid, mid, 'exact_normalized_name', 90, 'researched', false FROM pair
  ON CONFLICT (billionaire_id, network_member_id) DO UPDATE
    SET match_method = EXCLUDED.match_method, confidence_score = GREATEST(public.billionaire_network_links.confidence_score, EXCLUDED.confidence_score);

  SELECT count(*) INTO v_pnm_total FROM public.philanthropy_network_members;
  SELECT count(DISTINCT network_member_id) INTO v_pnm_matched FROM public.billionaire_network_links;
  SELECT count(*) INTO v_pnm_amb FROM (
    SELECT public.bi_normalize_name(m.member_display_name) n
    FROM public.philanthropy_network_members m
    WHERE EXISTS (SELECT 1 FROM public.billionaire_intelligence b
                  WHERE public.bi_normalize_name(b.full_name) = public.bi_normalize_name(m.member_display_name))
      AND NOT EXISTS (SELECT 1 FROM public.billionaire_network_links l WHERE l.network_member_id = m.id)
  ) x;

  -- historical investor connections: concrete evidence only
  UPDATE public.historical_investor_connections h
  SET billionaire_link_status = CASE WHEN b.id IS NOT NULL THEN 'linked_evidence' ELSE 'no_match_manual_review' END,
      metadata = COALESCE(h.metadata,'{}'::jsonb) || jsonb_build_object('billionaire_id', b.id, 'match_method','exact_normalized_name'),
      updated_at = now()
  FROM (SELECT public.bi_normalize_name(person_name) n, id FROM public.historical_investor_connections) src
  LEFT JOIN LATERAL (
    SELECT bi.id FROM public.billionaire_intelligence bi
    WHERE public.bi_normalize_name(bi.full_name) = src.n
    LIMIT 1
  ) b ON true
  WHERE h.id = src.id;
  GET DIAGNOSTICS v_hic = ROW_COUNT;

  UPDATE public.strategic_access_intermediaries s SET updated_at = now() WHERE true;
  GET DIAGNOSTICS v_sai = ROW_COUNT;

  RETURN jsonb_build_object(
    'philanthropy_network_members', v_pnm_total,
    'philanthropy_members_matched', v_pnm_matched,
    'philanthropy_members_unmatched', v_pnm_total - v_pnm_matched,
    'philanthropy_members_needing_manual_link', v_pnm_amb,
    'historical_investor_connections_processed', v_hic,
    'historical_investor_connections_linked', (SELECT count(*) FROM public.historical_investor_connections WHERE billionaire_link_status = 'linked_evidence'),
    'strategic_intermediaries', v_sai);
END; $function$;

-- Server-side authorization hardening for public.match_billionaire_wealth_snapshots(_source text, _snapshot_date date)
CREATE OR REPLACE FUNCTION public.match_billionaire_wealth_snapshots(_source text DEFAULT 'forbes_world_billionaires_2026'::text, _snapshot_date date DEFAULT '2026-03-01'::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  UPDATE public.billionaire_wealth_snapshots
  SET billionaire_id = NULL, match_status = 'unmatched_new_2026', match_method = NULL,
      match_confidence = 0, match_notes = NULL, updated_at = now()
  WHERE source_name = _source AND snapshot_date = _snapshot_date AND match_status <> 'manual_review';

  WITH old AS (SELECT id, citizenship, public.bi_normalize_name(full_name) n FROM public.billionaire_intelligence),
       oldc AS (SELECT n, count(*) c FROM old GROUP BY n),
       snap AS (SELECT id, citizenship, normalized_name n FROM public.billionaire_wealth_snapshots
                WHERE source_name = _source AND snapshot_date = _snapshot_date AND match_status <> 'manual_review'),
       snapc AS (SELECT n, count(*) c FROM snap GROUP BY n),
       uniq AS (
         SELECT s.id sid, o.id oid,
                lower(COALESCE(s.citizenship,'')) = lower(COALESCE(o.citizenship,'')) AS cit_match
         FROM snap s JOIN old o ON o.n = s.n
         JOIN oldc oc ON oc.n = s.n JOIN snapc sc ON sc.n = s.n
         WHERE oc.c = 1 AND sc.c = 1
       )
  UPDATE public.billionaire_wealth_snapshots b
  SET billionaire_id = u.oid, match_status = 'matched', match_method = 'exact_normalized_name',
      match_confidence = CASE WHEN u.cit_match THEN 98 ELSE 88 END,
      match_notes = CASE WHEN u.cit_match THEN 'unique normalised name, citizenship agrees'
                         ELSE 'unique normalised name, citizenship differs or missing' END,
      updated_at = now()
  FROM uniq u WHERE b.id = u.sid;

  WITH old AS (SELECT id, citizenship, public.bi_normalize_name(full_name) n FROM public.billionaire_intelligence bi
               WHERE NOT EXISTS (SELECT 1 FROM public.billionaire_wealth_snapshots s
                                 WHERE s.billionaire_id = bi.id
                                   AND s.source_name = _source AND s.snapshot_date = _snapshot_date)),
       snap AS (SELECT id, citizenship, normalized_name n FROM public.billionaire_wealth_snapshots
                WHERE source_name = _source AND snapshot_date = _snapshot_date AND match_status = 'unmatched_new_2026'),
       pair AS (
         SELECT s.id sid, o.id oid, s.n, lower(COALESCE(s.citizenship,'')) cit
         FROM snap s JOIN old o ON o.n = s.n
         WHERE lower(COALESCE(s.citizenship,'')) = lower(COALESCE(o.citizenship,''))
           AND COALESCE(s.citizenship,'') <> ''
       ),
       uniqp AS (SELECT sid, (array_agg(oid))[1] AS oid FROM pair GROUP BY sid, n, cit HAVING count(*) = 1),
       dedup AS (SELECT oid, (array_agg(sid))[1] AS sid FROM uniqp GROUP BY oid HAVING count(*) = 1)
  UPDATE public.billionaire_wealth_snapshots b
  SET billionaire_id = d.oid, match_status = 'matched', match_method = 'name_plus_citizenship',
      match_confidence = 80, match_notes = 'ambiguous name resolved by unique citizenship agreement', updated_at = now()
  FROM dedup d WHERE b.id = d.sid;

  UPDATE public.billionaire_wealth_snapshots b
  SET match_status = 'ambiguous', match_method = 'name_collision',
      match_notes = 'same normalised name exists in the 2025 universe but could not be resolved safely', updated_at = now()
  WHERE b.source_name = _source AND b.snapshot_date = _snapshot_date AND b.match_status = 'unmatched_new_2026'
    AND EXISTS (SELECT 1 FROM public.billionaire_intelligence o
                WHERE public.bi_normalize_name(o.full_name) = b.normalized_name);

  SELECT jsonb_build_object(
    'snapshot_rows', count(*),
    'matched', count(*) FILTER (WHERE match_status = 'matched'),
    'matched_high_confidence', count(*) FILTER (WHERE match_status = 'matched' AND match_confidence >= 80),
    'ambiguous', count(*) FILTER (WHERE match_status = 'ambiguous'),
    'new_2026_not_in_old_universe', count(*) FILTER (WHERE match_status = 'unmatched_new_2026'),
    'manual_review', count(*) FILTER (WHERE match_status = 'manual_review')
  ) INTO v FROM public.billionaire_wealth_snapshots
  WHERE source_name = _source AND snapshot_date = _snapshot_date;
  RETURN v;
END; $function$;

-- Server-side authorization hardening for public.rebuild_billionaire_coverage()
CREATE OR REPLACE FUNCTION public.rebuild_billionaire_coverage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  PERFORM public.derive_billionaire_route_evidence_states();

  -- candidate routes derived from meaningful affiliations, ranked by usefulness
  INSERT INTO public.billionaire_candidate_routes
    (billionaire_id, source_affiliation_id, candidate_type, organisation_name, route_basis,
     derived_from, website_url, confidence_score, evidence_summary, source_url, priority_rank)
  SELECT DISTINCT ON (a.billionaire_id, a.affiliation_type, lower(a.organisation_name))
    a.billionaire_id, a.id, a.affiliation_type, a.organisation_name,
    CASE WHEN a.affiliation_type IN ('foundation','philanthropic_initiative') THEN 'philanthropic_entity_public_channel'
         WHEN a.affiliation_type = 'family_office' THEN 'family_office_institutional_channel'
         WHEN a.affiliation_type IN ('network','institutional_connector','philanthropic_advisor') THEN 'network_institutional_channel'
         ELSE 'institutional_company_channel' END,
    'affiliation', a.website_url,
    LEAST(60, COALESCE(a.confidence_score, 20)),
    a.evidence_summary, a.evidence_url,
    CASE a.affiliation_type
      WHEN 'foundation' THEN 1 WHEN 'philanthropic_initiative' THEN 1
      WHEN 'family_office' THEN 2
      WHEN 'philanthropic_advisor' THEN 3 WHEN 'network' THEN 3 WHEN 'institutional_connector' THEN 3
      WHEN 'bank' THEN 4 WHEN 'adviser' THEN 4 WHEN 'private_equity' THEN 4
      WHEN 'company' THEN 5 ELSE 6 END
  FROM public.billionaire_affiliations a
  WHERE a.organisation_name IS NOT NULL AND btrim(a.organisation_name) <> ''
    AND a.affiliation_type IN ('foundation','family_office','company','bank','adviser','private_equity',
                               'network','institutional_connector','philanthropic_advisor',
                               'wealth_source_company','philanthropic_initiative')
  ON CONFLICT (billionaire_id, candidate_type, lower(organisation_name)) DO UPDATE
    SET website_url = COALESCE(EXCLUDED.website_url, public.billionaire_candidate_routes.website_url),
        evidence_summary = COALESCE(EXCLUDED.evidence_summary, public.billionaire_candidate_routes.evidence_summary),
        source_url = COALESCE(EXCLUDED.source_url, public.billionaire_candidate_routes.source_url),
        priority_rank = EXCLUDED.priority_rank,
        updated_at = now();

  WITH pw AS (
    SELECT billionaire_id,
      count(*) FILTER (WHERE route_evidence_state = 'verified_public_institutional') AS inst,
      count(*) FILTER (WHERE route_evidence_state = 'verified_warm_intermediary')    AS interm,
      count(*) FILTER (WHERE route_evidence_state = 'researched_candidate')          AS researched,
      bool_or(outreach_allowed AND route_evidence_state IN ('verified_public_institutional','verified_warm_intermediary')
              AND (COALESCE(public_email,'') <> '' OR COALESCE(contact_url,'') <> '')) AS sendable,
      max(COALESCE(confidence_score,0)) AS conf
    FROM public.billionaire_access_pathways
    WHERE route_evidence_state <> 'rejected'
    GROUP BY billionaire_id
  ), cand AS (
    SELECT billionaire_id, count(*) AS n,
      count(*) FILTER (WHERE candidate_type IN ('foundation','philanthropic_initiative')) AS fnd,
      count(*) FILTER (WHERE candidate_type = 'family_office') AS fo,
      count(*) FILTER (WHERE candidate_type IN ('company','wealth_source_company')) AS co
    FROM public.billionaire_candidate_routes GROUP BY billionaire_id
  ), pledge AS (
    SELECT l.billionaire_id, count(*) AS n,
           bool_or(m.network_name ILIKE '%giving pledge%') AS pledged,
           jsonb_agg(DISTINCT jsonb_build_object('network', m.network_name, 'source', m.source_url)) AS ev
    FROM public.billionaire_network_links l
    JOIN public.philanthropy_network_members m ON m.id = l.network_member_id
    GROUP BY l.billionaire_id
  ), warm AS (
    SELECT (metadata->>'billionaire_id')::uuid AS billionaire_id, count(*) AS n
    FROM public.historical_investor_connections
    WHERE billionaire_link_status = 'linked_evidence' AND metadata->>'billionaire_id' IS NOT NULL
    GROUP BY 1
  ), snap AS (
    SELECT billionaire_id, networth_usd_m, snapshot_date, source_name, match_confidence
    FROM public.billionaire_wealth_snapshots
    WHERE match_status = 'matched' AND match_confidence >= 80 AND billionaire_id IS NOT NULL
  ), base AS (
    SELECT b.id, b.full_name, b.citizenship,
      COALESCE(NULLIF(b.industries::text,'null'),'') AS ind_txt,
      COALESCE(NULLIF(b.wealth_sources::text,'null'),'') AS src_txt,
      CASE WHEN jsonb_typeof(b.industries) = 'array' THEN b.industries->>0 ELSE NULLIF(b.industries::text,'null') END AS primary_industry,
      b.networth_usd_m AS hist_nw, b.snapshot_date AS hist_date,
      s.networth_usd_m AS cur_nw, s.snapshot_date AS cur_date, s.source_name AS cur_src,
      COALESCE(p.inst,0) AS inst, COALESCE(p.interm,0) AS interm, COALESCE(p.researched,0) AS researched,
      COALESCE(p.sendable,false) AS sendable, COALESCE(p.conf,0) AS pconf,
      COALESCE(c.n,0) AS cand_n, COALESCE(c.fnd,0) AS fnd, COALESCE(c.fo,0) AS fo, COALESCE(c.co,0) AS co,
      COALESCE(pl.n,0) AS pnm_n, COALESCE(pl.pledged,false) AS pledged, pl.ev AS pledge_ev,
      COALESCE(w.n,0) AS warm_n
    FROM public.billionaire_intelligence b
    LEFT JOIN pw p ON p.billionaire_id = b.id
    LEFT JOIN cand c ON c.billionaire_id = b.id
    LEFT JOIN pledge pl ON pl.billionaire_id = b.id
    LEFT JOIN warm w ON w.billionaire_id = b.id
    LEFT JOIN snap s ON s.billionaire_id = b.id
  ), scored AS (
    SELECT base.*,
      (base.inst + base.interm) > 0 AS has_verified,
      COALESCE(base.cur_nw, base.hist_nw) AS eff_nw,
      CASE WHEN base.cur_date IS NOT NULL AND base.cur_date > (current_date - interval '210 days') THEN 'current'
           WHEN base.cur_date IS NOT NULL AND base.cur_date > (current_date - interval '400 days') THEN 'recent'
           WHEN base.hist_date IS NULL THEN 'unknown'
           WHEN base.hist_date > (current_date - interval '540 days') THEN 'historical'
           ELSE 'stale' END AS freshness,
      CASE WHEN base.cur_nw IS NOT NULL AND base.hist_nw > 0 AND base.cur_nw > 0
           THEN round(((base.cur_nw - base.hist_nw) / base.hist_nw) * 100, 2) END AS change_pct,
      (CASE WHEN base.fnd > 0 THEN 40 ELSE 0 END
       + CASE WHEN base.pledged THEN 25 ELSE 0 END
       + CASE WHEN base.src_txt ILIKE '%philanthrop%' OR base.ind_txt ILIKE '%philanthrop%' THEN 15 ELSE 0 END
       + CASE WHEN base.fo > 0 THEN 15 ELSE 0 END)::smallint AS phil,
      (CASE WHEN base.ind_txt ILIKE '%health%' OR base.src_txt ILIKE '%pharma%' OR base.src_txt ILIKE '%health%'
                 OR base.src_txt ILIKE '%hospital%' OR base.src_txt ILIKE '%biotech%' THEN 100 ELSE 0 END)::smallint AS health,
      (CASE WHEN base.citizenship IN ('Nigeria','South Africa','Egypt','Morocco','Algeria','Tanzania','Zimbabwe','Kenya','Ghana','Uganda','Angola','Ethiopia','Sudan','Ivory Coast','Senegal','Namibia','Botswana','Zambia','Mozambique','Rwanda') THEN 100
            WHEN base.src_txt ILIKE '%africa%' OR base.ind_txt ILIKE '%africa%' THEN 70 ELSE 0 END)::smallint AS africa
    FROM base
  ), final AS (
    SELECT s.*,
      LEAST(100, GREATEST(0, (ln(GREATEST(s.eff_nw,1)) / ln(200000)) * 100))::smallint AS capacity,
      CASE WHEN s.freshness = 'current' THEN 1.0 WHEN s.freshness = 'recent' THEN 0.9
           WHEN s.freshness = 'historical' THEN 0.7 WHEN s.freshness = 'stale' THEN 0.55 ELSE 0.5 END AS fresh_factor,
      CASE WHEN s.change_pct IS NULL THEN 'unknown'
           WHEN s.change_pct > 10 THEN 'rising'
           WHEN s.change_pct < -10 THEN 'falling'
           ELSE 'stable' END AS trajectory,
      CASE WHEN s.has_verified THEN 100 WHEN s.cand_n > 0 THEN 35 ELSE 0 END AS route_strength,
      (s.cur_nw IS NULL) AS match_missing
    FROM scored s
  )
  INSERT INTO public.billionaire_coverage AS t (
    billionaire_id, full_name, citizenship, primary_industry,
    verified_institutional_routes, verified_intermediary_routes, researched_route_count, candidate_route_count,
    foundation_count, family_office_count, company_route_count,
    enrichment_status, outreach_readiness, outreach_blocker_reason,
    last_enriched_at, next_enrichment_priority, research_confidence,
    historical_networth_usd_m, historical_networth_as_of,
    current_networth_usd_m, current_networth_as_of, current_networth_source, current_networth_change_pct,
    snapshot_match_status, dropoff_candidate,
    wealth_data_freshness, wealth_trajectory,
    liquidity_capacity_score, urgency_priority_score,
    ghat_fit_score, philanthropy_intensity_score, health_relevance_score, africa_relevance_score,
    giving_pledge_signal, philanthropy_network_matches, warm_relationship_evidence_count,
    has_foundation, has_family_office, ghat_priority_score, evidence
  )
  SELECT f.id, f.full_name, f.citizenship, f.primary_industry,
    f.inst, f.interm, f.researched, f.cand_n, f.fnd, f.fo, f.co,
    CASE WHEN f.has_verified THEN 'verified_route' WHEN f.cand_n > 0 THEN 'candidate_only' ELSE 'queued' END,
    CASE WHEN f.sendable AND f.fresh_factor >= 0.9 THEN 'ready'
         WHEN f.sendable THEN 'ready_low_confidence'
         WHEN f.has_verified THEN 'blocked'
         WHEN f.cand_n > 0 THEN 'candidate_only'
         ELSE 'no_route' END,
    CASE WHEN f.sendable THEN NULL
         WHEN f.has_verified THEN 'verified route exists but outreach not approved / no public contact channel'
         WHEN f.cand_n > 0 THEN 'candidate routes only — require verification before any outreach'
         ELSE 'no public or institutional route identified yet' END,
    now(),
    LEAST(100, GREATEST(1, round(
        (CASE WHEN f.has_verified THEN 20 ELSE 60 END)
      + (CASE WHEN f.match_missing THEN 15 ELSE 0 END)
      + (f.fnd * 10) + (f.fo * 5) + (CASE WHEN f.pledged THEN 15 ELSE 0 END)
      + (0.3 * ((ln(GREATEST(f.eff_nw,1)) / ln(200000)) * 100))
    )))::int,
    LEAST(100, GREATEST(0, round(
        (CASE WHEN f.has_verified THEN 55 WHEN f.cand_n > 0 THEN 25 ELSE 5 END) * f.fresh_factor
      + (CASE WHEN f.pconf > 0 THEN f.pconf * 0.3 ELSE 0 END)
      + (CASE WHEN f.match_missing THEN -10 ELSE 10 END)
    )))::smallint,
    f.hist_nw, f.hist_date,
    f.cur_nw, f.cur_date, f.cur_src, f.change_pct,
    CASE WHEN f.cur_nw IS NOT NULL THEN 'matched_2026' ELSE '2026_list_match_missing' END,
    f.match_missing,
    f.freshness, f.trajectory,
    f.capacity,
    LEAST(100, GREATEST(0, round(f.capacity * f.fresh_factor)))::smallint,
    LEAST(100, GREATEST(0, round(0.45 * f.capacity + 0.35 * f.phil + 0.20 * f.route_strength)))::smallint,
    f.phil, f.health, f.africa,
    f.pledged, f.pnm_n, f.warm_n,
    f.fnd > 0, f.fo > 0,
    LEAST(100, GREATEST(0, round((
        0.22 * LEAST(100, 0.45 * f.capacity + 0.35 * f.phil + 0.20 * f.route_strength)
      + 0.20 * f.phil + 0.15 * f.health + 0.13 * f.africa
      + 0.15 * f.route_strength + 0.15 * f.capacity) * f.fresh_factor)))::smallint,
    jsonb_build_object('derived_at', now(), 'pathway_confidence', f.pconf,
      'candidate_routes', f.cand_n, 'wealth_change_pct', f.change_pct,
      'wealth_basis', CASE WHEN f.cur_nw IS NOT NULL THEN 'forbes_2026_matched_snapshot' ELSE 'forbes_jan_2025_historical_only' END,
      'philanthropy_network_evidence', f.pledge_ev, 'warm_relationship_evidence', f.warm_n)
  FROM final f
  ON CONFLICT (billionaire_id) DO UPDATE SET
    full_name = EXCLUDED.full_name, citizenship = EXCLUDED.citizenship, primary_industry = EXCLUDED.primary_industry,
    verified_institutional_routes = EXCLUDED.verified_institutional_routes,
    verified_intermediary_routes = EXCLUDED.verified_intermediary_routes,
    researched_route_count = EXCLUDED.researched_route_count,
    candidate_route_count = EXCLUDED.candidate_route_count,
    foundation_count = EXCLUDED.foundation_count, family_office_count = EXCLUDED.family_office_count,
    company_route_count = EXCLUDED.company_route_count,
    enrichment_status = CASE WHEN t.enrichment_status IN ('in_progress','needs_manual_review','no_public_route')
                             AND EXCLUDED.enrichment_status <> 'verified_route'
                        THEN t.enrichment_status ELSE EXCLUDED.enrichment_status END,
    outreach_readiness = EXCLUDED.outreach_readiness,
    outreach_blocker_reason = EXCLUDED.outreach_blocker_reason,
    last_enriched_at = EXCLUDED.last_enriched_at,
    next_enrichment_priority = EXCLUDED.next_enrichment_priority,
    research_confidence = EXCLUDED.research_confidence,
    historical_networth_usd_m = EXCLUDED.historical_networth_usd_m,
    historical_networth_as_of = EXCLUDED.historical_networth_as_of,
    current_networth_usd_m = COALESCE(EXCLUDED.current_networth_usd_m, t.current_networth_usd_m),
    current_networth_as_of = COALESCE(EXCLUDED.current_networth_as_of, t.current_networth_as_of),
    current_networth_source = COALESCE(EXCLUDED.current_networth_source, t.current_networth_source),
    current_networth_change_pct = COALESCE(EXCLUDED.current_networth_change_pct, t.current_networth_change_pct),
    snapshot_match_status = EXCLUDED.snapshot_match_status,
    dropoff_candidate = EXCLUDED.dropoff_candidate,
    wealth_data_freshness = EXCLUDED.wealth_data_freshness,
    wealth_trajectory = EXCLUDED.wealth_trajectory,
    liquidity_capacity_score = EXCLUDED.liquidity_capacity_score,
    urgency_priority_score = EXCLUDED.urgency_priority_score,
    ghat_fit_score = EXCLUDED.ghat_fit_score,
    philanthropy_intensity_score = EXCLUDED.philanthropy_intensity_score,
    health_relevance_score = EXCLUDED.health_relevance_score,
    africa_relevance_score = EXCLUDED.africa_relevance_score,
    giving_pledge_signal = EXCLUDED.giving_pledge_signal,
    philanthropy_network_matches = EXCLUDED.philanthropy_network_matches,
    warm_relationship_evidence_count = EXCLUDED.warm_relationship_evidence_count,
    has_foundation = EXCLUDED.has_foundation, has_family_office = EXCLUDED.has_family_office,
    ghat_priority_score = EXCLUDED.ghat_priority_score,
    evidence = EXCLUDED.evidence, updated_at = now();

  -- enrichment queue: anyone lacking a verified route
  INSERT INTO public.billionaire_enrichment_queue (billionaire_id, status, priority, batch_key, next_check_at, notes)
  SELECT c.billionaire_id, 'pending', c.next_enrichment_priority,
         'access-' || to_char(now(),'YYYYMMDD'), now(), 'auto-queued: ' || c.enrichment_status
  FROM public.billionaire_coverage c
  WHERE (c.verified_institutional_routes + c.verified_intermediary_routes) = 0
  ON CONFLICT (billionaire_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = CASE WHEN public.billionaire_enrichment_queue.status IN ('in_progress','needs_manual_review','no_public_route')
                  THEN public.billionaire_enrichment_queue.status ELSE 'pending' END,
    updated_at = now();

  -- wealth-match manual review batch for old records with no confident 2026 match
  UPDATE public.billionaire_enrichment_queue q
  SET batch_key = 'wealth-match-review',
      notes = COALESCE(q.notes,'') || ' | no confident 2026 list match — dropoff candidate, not confirmed drop-off',
      updated_at = now()
  FROM public.billionaire_coverage c
  WHERE c.billionaire_id = q.billionaire_id AND c.dropoff_candidate
    AND COALESCE(q.batch_key,'') <> 'wealth-match-review';

  INSERT INTO public.billionaire_enrichment_queue (billionaire_id, status, priority, batch_key, next_check_at, notes)
  SELECT c.billionaire_id, 'needs_manual_review', 90, 'wealth-match-review', now(),
         'no confident 2026 list match — dropoff candidate, not confirmed drop-off'
  FROM public.billionaire_coverage c WHERE c.dropoff_candidate
  ON CONFLICT (billionaire_id) DO UPDATE SET
    status = CASE WHEN public.billionaire_enrichment_queue.status IN ('verified','no_public_route') THEN public.billionaire_enrichment_queue.status ELSE 'needs_manual_review' END,
    batch_key = 'wealth-match-review', updated_at = now();

  UPDATE public.billionaire_enrichment_queue q
  SET status = 'verified', last_checked_at = now(), updated_at = now()
  FROM public.billionaire_coverage c
  WHERE c.billionaire_id = q.billionaire_id
    AND (c.verified_institutional_routes + c.verified_intermediary_routes) > 0
    AND q.status <> 'verified';

  SELECT jsonb_build_object(
    'universe', (SELECT count(*) FROM public.billionaire_intelligence),
    'coverage_records', (SELECT count(*) FROM public.billionaire_coverage),
    'missing_coverage', (SELECT count(*) FROM public.billionaire_intelligence b WHERE NOT EXISTS (SELECT 1 FROM public.billionaire_coverage c WHERE c.billionaire_id = b.id)),
    'verified_public_institutional', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes > 0),
    'verified_warm_intermediary', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_intermediary_routes > 0),
    'researched_or_candidate_only', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes = 0 AND (candidate_route_count > 0 OR researched_route_count > 0)),
    'no_route', (SELECT count(*) FROM public.billionaire_coverage WHERE verified_institutional_routes + verified_intermediary_routes + candidate_route_count + researched_route_count = 0),
    'current_wealth', (SELECT count(*) FROM public.billionaire_coverage WHERE current_networth_as_of IS NOT NULL),
    'stale_wealth', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_data_freshness IN ('stale','historical','unknown')),
    'rising', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'rising'),
    'stable', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'stable'),
    'falling', (SELECT count(*) FROM public.billionaire_coverage WHERE wealth_trajectory = 'falling'),
    'dropoff_candidates', (SELECT count(*) FROM public.billionaire_coverage WHERE dropoff_candidate),
    'giving_pledge', (SELECT count(*) FROM public.billionaire_coverage WHERE giving_pledge_signal),
    'foundations_unique', (SELECT count(*) FROM public.billionaire_coverage WHERE has_foundation),
    'family_offices_unique', (SELECT count(*) FROM public.billionaire_coverage WHERE has_family_office),
    'outreach_ready', (SELECT count(*) FROM public.billionaire_coverage WHERE outreach_readiness IN ('ready','ready_low_confidence')),
    'queued', (SELECT count(*) FROM public.billionaire_enrichment_queue WHERE status IN ('pending','in_progress','needs_manual_review'))
  ) INTO v_result;
  RETURN v_result;
END; $function$;

-- Server-side authorization hardening for public.rebuild_full_manual()
CREATE OR REPLACE FUNCTION public.rebuild_full_manual()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_version integer;
  v_pages integer; v_content integer; v_backend integer;
  v_wf integer; v_rules integer; v_integrations integer; v_flows integer;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  -- Backend objects: tables
  INSERT INTO system_backend_objects (object_kind, object_name, schema_name, purpose, inputs, outputs, dependencies, documented, updated_at)
  SELECT 'table', t.table_name, 'public',
         'Public schema table',
         (SELECT string_agg(c.column_name || ':' || c.data_type, ', ' ORDER BY c.ordinal_position)
            FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = t.table_name),
         '', '', true, now()
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  ON CONFLICT (object_kind, schema_name, object_name) DO UPDATE
    SET inputs = EXCLUDED.inputs, updated_at = now(), documented = true;

  -- Backend objects: functions
  INSERT INTO system_backend_objects (object_kind, object_name, schema_name, purpose, documented, updated_at)
  SELECT 'function', r.routine_name, 'public', 'PL/pgSQL routine', true, now()
  FROM information_schema.routines r
  WHERE r.routine_schema = 'public' AND r.routine_type = 'FUNCTION'
  ON CONFLICT (object_kind, schema_name, object_name) DO UPDATE
    SET updated_at = now(), documented = true;

  -- Backend objects: triggers
  INSERT INTO system_backend_objects (object_kind, object_name, schema_name, purpose, dependencies, documented, updated_at)
  SELECT DISTINCT 'trigger', tg.trigger_name, 'public',
         'Trigger on ' || tg.event_object_table,
         tg.event_object_table, true, now()
  FROM information_schema.triggers tg
  WHERE tg.trigger_schema = 'public'
  ON CONFLICT (object_kind, schema_name, object_name) DO UPDATE
    SET updated_at = now(), documented = true;

  -- Backend objects: edge functions (static catalogue — auto-discovered list)
  INSERT INTO system_backend_objects (object_kind, object_name, schema_name, purpose, documented, updated_at) VALUES
    ('edge_function','ai-conversation-engine','functions','AI reply generation for inbound conversations',true,now()),
    ('edge_function','crm-send-check','functions','Pre-send sanity check gating outbound communications',true,now()),
    ('edge_function','finance-chase-overdue','functions','Automatic overdue invoice chaser',true,now()),
    ('edge_function','founder-copilot','functions','Founder Co-Pilot AI assistant',true,now()),
    ('edge_function','generate-proposal','functions','Public AI proposal generator',true,now()),
    ('edge_function','internal-proposal-generate','functions','Internal proposal drafting from deal data',true,now()),
    ('edge_function','internal-proposal-send','functions','Send internal proposal via assigned inbox',true,now()),
    ('edge_function','outreach-import-leads','functions','CSV lead import to outreach pipeline',true,now()),
    ('edge_function','outreach-inbound-webhook','functions','Inbound email webhook handler',true,now()),
    ('edge_function','outreach-schedule-batch','functions','Schedule next outreach batch',true,now()),
    ('edge_function','outreach-send-worker','functions','Outbound email send worker',true,now()),
    ('edge_function','platform-diagnostics','functions','Platform self-diagnostics agent',true,now()),
    ('edge_function','platform-sandbox','functions','Sandbox mode toggle and reset',true,now()),
    ('edge_function','platform-testing','functions','End-to-end automated test runner',true,now())
  ON CONFLICT (object_kind, schema_name, object_name) DO UPDATE
    SET updated_at = now(), documented = true, purpose = EXCLUDED.purpose;

  -- Workflows (top-level)
  INSERT INTO system_workflows_full (workflow_key, workflow_name, description, start_module, end_module, step_count, documented, updated_at) VALUES
    ('lead_to_payment','Lead to Payment','End-to-end revenue cycle: imported lead becomes paid invoice','outreach-import-leads','payments',10,true,now()),
    ('reply_to_proposal','Reply to Proposal','Inbound reply triggers AI conversation, qualification, and proposal generation','outreach-inbound-webhook','internal-proposal-send',6,true,now()),
    ('proposal_to_demo','Proposal to Demo','Sent proposal generates demo access and tracks engagement','internal_proposals','demo_access',4,true,now()),
    ('demo_to_deal','Demo to Deal','High-intent demo activity converts to a Deal record','demo_events','deals',3,true,now()),
    ('deal_to_invoice','Deal to Invoice','WON deal automatically issues an invoice','deals','invoices',2,true,now()),
    ('deal_to_assignment','Deal to Assignment','WON deal assigned to balanced supplier','deals','assignments',3,true,now()),
    ('assignment_to_completion','Assignment to Completion','Supplier delivers; founder confirms; payment recorded','assignments','payments',4,true,now()),
    ('compliance_oversight','Compliance Oversight','Compliance checks fire on every contact, communication, deal, invoice','run_compliance_checks','compliance_events',5,true,now()),
    ('priority_engine','Priority Engine','Recalculates priority scores across contacts, deals, assignments, invoices','recalculate_priority','priority_scores',5,true,now()),
    ('oversight_recovery','Oversight & Recovery','Detects anomalies, retries safe operations, escalates failures','detect_anomalies','retry_queue',6,true,now())
  ON CONFLICT (workflow_key) DO UPDATE
    SET workflow_name = EXCLUDED.workflow_name, description = EXCLUDED.description,
        start_module = EXCLUDED.start_module, end_module = EXCLUDED.end_module,
        step_count = EXCLUDED.step_count, updated_at = now(), documented = true;

  -- Add missing canonical lead_to_payment steps without replacing existing
  -- rows. Existing step IDs, customizations, history, and extra versioned rows
  -- are preserved; this backfill is idempotent by workflow and step index.
  INSERT INTO system_workflow_steps (workflow_id, step_index, step_name, trigger_source, data_input, data_output, linked_tables, failure_points)
  SELECT w.id, s.idx, s.name, s.trigger, s.din, s.dout, s.tables, s.fails FROM system_workflows_full w
  CROSS JOIN (VALUES
    (1,'Import Lead','Founder upload / outreach-import-leads','CSV row','contacts row','imported_leads, contacts','Bad email format, duplicate email'),
    (2,'Schedule Outreach','outreach-schedule-batch cron','contact + campaign','email_queue row','email_queue, inboxes','No inbox available, throttle cap'),
    (3,'Send Email','outreach-send-worker','queued email','email_events sent','email_queue, email_events','Bounce, SMTP error, reputation drop'),
    (4,'Inbound Reply','outreach-inbound-webhook','webhook payload','communications inbound','communications, conversations','Webhook missing inbox mapping'),
    (5,'AI Reply','ai-conversation-engine','conversation history','ai_actions row','ai_actions, communications','Token cap, quality fail'),
    (6,'Generate Proposal','internal-proposal-generate','contact + deal context','internal_proposals row','internal_proposals','Quality score below threshold'),
    (7,'Send Proposal','internal-proposal-send','proposal id','communications outbound','internal_proposals, communications','Inbox paused, send blocked'),
    (8,'Demo Engagement','demo_access link','contact opens demo','demo_events row','demo_access, demo_events','Demo expired, low engagement'),
    (9,'Deal Won','founder updates deal','deals.status = WON','invoices row','deals, invoices','FK violation, missing contact'),
    (10,'Payment Received','handle_payment_received trigger','payments row','priority recalculation','payments, priority_scores','Currency mismatch, late payment')
  ) AS s(idx,name,trigger,din,dout,tables,fails)
  WHERE w.workflow_key = 'lead_to_payment'
    AND NOT EXISTS (
      SELECT 1
      FROM system_workflow_steps AS existing
      WHERE existing.workflow_id = w.id
        AND existing.step_index = s.idx
    );

  -- Rules registry (declarative seed of canonical rules)
  INSERT INTO system_rules (rule_key, rule_name, module, condition_text, action_text, severity, source_function, documented, updated_at) VALUES
    ('compliance_engaged_block','Block sends to engaged contacts','compliance','contact.status IN (ENGAGED, QUALIFIED, CLIENT, DO_NOT_CONTACT) OR conversation_active','Block outbound communication','high','check_outreach_allowed',true,now()),
    ('compliance_24h_window','24h communication window','compliance','Any communication on contact within last 24h','Block outbound send','medium','check_outreach_allowed',true,now()),
    ('compliance_48h_contact','48h re-contact gate','compliance','last_contacted_at less than 48h ago','Block outbound send','medium','check_outreach_allowed',true,now()),
    ('compliance_bounced','Bounced events suppress','compliance','Any bounced email_events for contact','Mark DO_NOT_CONTACT','high','handle_email_bounce',true,now()),
    ('compliance_inbox_required','Inbox assignment required','compliance','contact.assigned_inbox_id IS NULL','Block outbound send','high','check_outreach_allowed',true,now()),
    ('priority_critical_invoice','Overdue invoice critical','priority','invoice age greater than 14 days AND status not in (PAID, VOID)','Score boosted to 81-100','critical','priority_score_invoice',true,now()),
    ('priority_critical_assignment','Failed assignment critical','priority','assignment.status = failed','Score 95 critical','critical','priority_score_assignment',true,now()),
    ('priority_high_value_deal','High value deal','priority','deal.estimated_value_max greater than 100000','Boost into critical band','critical','priority_score_deal',true,now()),
    ('priority_intent_boost','Intent score engagement boost','priority','contact.intent_score greater than 0','Add 0.7 * intent_score to engagement factor','low','priority_score_contact',true,now()),
    ('throttle_inbox_daily','Inbox daily limit','timing','current_send_count greater than or equal daily_send_limit','Block further sends today','medium','check_send_throttle',true,now()),
    ('throttle_low_reputation','Low reputation pause','timing','reputation_score less than 20','Inbox paused','high','pick_inbox_for_business',true,now()),
    ('throttle_warmup','Warmup ramp','timing','warmup_status = warming','Daily limit overridden by warmup curve','low','inbox_warmup_limit',true,now()),
    ('oversight_stuck_queue','Stuck email queue','oversight','email_queue items pending greater than 30 minutes','Enqueue retry + system_event','high','detect_anomalies',true,now()),
    ('oversight_idle_assignment','Idle assignment','oversight','assignment unchanged greater than 24h while in_progress','Flag system_event','medium','detect_anomalies',true,now()),
    ('oversight_overdue_invoice','Overdue invoice oversight','oversight','invoice age greater than 14 days unpaid','Flag system_event high','high','detect_anomalies',true,now()),
    ('oversight_compliance_score','High compliance risk','oversight','business compliance_score greater than 70','Flag critical system_event','critical','detect_anomalies',true,now()),
    ('oversight_low_reputation','Low inbox reputation','oversight','inbox reputation_score less than 20','Flag system_event','high','detect_anomalies',true,now()),
    ('retry_exhaustion','Retry exhaustion','oversight','retry_count greater than or equal 3','Mark queue failed + critical event','critical','escalate_retry_failure',true,now()),
    ('test_mode_lock','Test mode safety','oversight','system_settings.system_mode = test','Outbound senders simulate, no real SMTP','medium','get_system_mode',true,now())
  ON CONFLICT (rule_key) DO UPDATE
    SET rule_name = EXCLUDED.rule_name, module = EXCLUDED.module,
        condition_text = EXCLUDED.condition_text, action_text = EXCLUDED.action_text,
        severity = EXCLUDED.severity, source_function = EXCLUDED.source_function,
        updated_at = now(), documented = true;

  -- Integrations
  INSERT INTO system_integrations_full (integration_key, integration_name, layer, description, endpoint, related_objects, documented, updated_at) VALUES
    ('outbound_email','Outbound Email Sender','outbound_email','Sends queued emails through inbox pool','outreach-send-worker','email_queue, inboxes, communications',true,now()),
    ('inbound_webhook','Inbound Email Webhook','inbound_webhook','Receives reply webhooks from email infra','outreach-inbound-webhook','communications, email_events, conversations',true,now()),
    ('crm_sanity_check','CRM Send Check','outbound_email','Pre-send compliance gate','crm-send-check','contacts, inboxes, check_outreach_allowed',true,now()),
    ('finance_chaser','Finance Overdue Chaser','outbound_email','Auto-chase overdue invoices','finance-chase-overdue','invoices, communications',true,now()),
    ('proposal_send','Internal Proposal Send','outbound_email','Send internal proposals via assigned inbox','internal-proposal-send','internal_proposals, communications',true,now()),
    ('supplier_login_rpc','Supplier Login RPC','supplier_rpc','Token-based supplier authentication','supplier_login_with_token','suppliers, supplier_users',true,now()),
    ('supplier_assignment_rpc','Supplier Assignment Confirmation','supplier_rpc','Supplier accepts/completes assignment','founder_confirm_assignment','assignments, suppliers',true,now()),
    ('ai_gateway_conversation','AI Gateway — Conversation','ai_gateway','Lovable AI Gateway used by ai-conversation-engine','ai-conversation-engine','ai_actions, conversations',true,now()),
    ('ai_gateway_proposal','AI Gateway — Proposal Generator','ai_gateway','Lovable AI Gateway used by generate-proposal','generate-proposal','proposal_requests',true,now()),
    ('ai_gateway_copilot','AI Gateway — Founder Co-Pilot','ai_gateway','Lovable AI Gateway used by founder-copilot','founder-copilot','copilot_threads, copilot_messages',true,now()),
    ('platform_testing','Platform Testing Runner','other','Edge function executing test runs','platform-testing','platform_test_runs, platform_test_results',true,now()),
    ('platform_diagnostics','Platform Diagnostics Agent','other','30-min health check agent','platform-diagnostics','system_health, system_events',true,now())
  ON CONFLICT (integration_key) DO UPDATE
    SET integration_name = EXCLUDED.integration_name, layer = EXCLUDED.layer,
        description = EXCLUDED.description, endpoint = EXCLUDED.endpoint,
        related_objects = EXCLUDED.related_objects, updated_at = now(), documented = true;

  -- Data flows (canonical entity graph)
  INSERT INTO system_data_flows (source_entity, target_entity, relationship, description) VALUES
    ('imported_leads','contacts','writes_to','Imported leads upserted into contacts'),
    ('contacts','email_queue','writes_to','Outreach scheduler enqueues emails per contact'),
    ('email_queue','communications','writes_to','Sent queue items recorded as outbound communications'),
    ('communications','conversations','writes_to','Inbound communications open/reopen conversations'),
    ('conversations','ai_actions','writes_to','AI engine logs each reply action'),
    ('ai_actions','communications','writes_to','AI replies persisted as outbound comms'),
    ('contacts','internal_proposals','writes_to','Proposals generated for qualified contacts'),
    ('internal_proposals','demo_access','writes_to','Sent proposals issue demo tokens'),
    ('demo_access','demo_events','writes_to','Demo sessions log events'),
    ('contacts','deals','writes_to','Qualified contacts become deals'),
    ('deals','invoices','writes_to','WON deals create invoices via handle_deal_won'),
    ('deals','assignments','writes_to','WON deals are assigned to suppliers'),
    ('suppliers','assignments','writes_to','Suppliers receive assignments'),
    ('assignments','payments','writes_to','Completed work generates payments'),
    ('invoices','payments','writes_to','Payments settle invoices'),
    ('contacts','priority_scores','writes_to','Priority engine scores contacts'),
    ('deals','priority_scores','writes_to','Priority engine scores deals'),
    ('assignments','priority_scores','writes_to','Priority engine scores assignments'),
    ('invoices','priority_scores','writes_to','Priority engine scores invoices'),
    ('compliance_rules','compliance_events','writes_to','Active rules raise events'),
    ('compliance_events','system_events','writes_to','High severity compliance events bubble to oversight'),
    ('email_queue','retry_queue','writes_to','Stuck queue items requeued for retry'),
    ('retry_queue','system_events','writes_to','Exhausted retries escalated as critical events')
  ON CONFLICT (source_entity, target_entity, relationship) DO UPDATE SET description = EXCLUDED.description;

  -- Pages index : seed canonical routes and link to manual_pages where module_name matches
  -- Public + Founder + Portal + Partner + Supplier
  INSERT INTO system_pages_index (route_path, page_name, area, purpose, documented, updated_at) VALUES
    ('/','Home','public','Marketing landing page',true,now()),
    ('/what-we-build','What We Build','public','Capabilities overview',true,now()),
    ('/industries','Industries','public','Target industries',true,now()),
    ('/method','Method','public','5-step engineering sequence',true,now()),
    ('/case-studies','Case Studies','public','Client outcomes',true,now()),
    ('/partners','Partner Program','public','Partner ecosystem',true,now()),
    ('/project-discovery','Project Discovery','public','AI proposal intake form',true,now()),
    ('/about','About','public','Company background',true,now()),
    ('/ai-proposal','AI Proposal','public','AI proposal generator UI',true,now()),
    ('/platform','Platform','public','Platform overview',true,now()),
    ('/systems','Systems','public','Eight-system credibility',true,now()),
    ('/architecture','Architecture','public','Public architecture flows',true,now()),
    ('/legal','Legal Hub','public','Index of legal documents',true,now()),
    ('/portal/login','Portal Login','auth','Client login',true,now()),
    ('/portal/signup','Portal Signup','auth','Client signup',true,now()),
    ('/portal/forgot-password','Forgot Password','auth','Password reset request',true,now()),
    ('/portal/reset-password','Reset Password','auth','Password reset confirm',true,now()),
    ('/portal/dashboard','Client Dashboard','portal','Client home',true,now()),
    ('/portal/projects','Client Projects','portal','Client project list',true,now()),
    ('/portal/documents','Client Documents','portal','Shared documents',true,now()),
    ('/portal/messages','Client Messages','portal','Messaging',true,now()),
    ('/portal/support','Client Support','portal','Support requests',true,now()),
    ('/portal/maintenance','Maintenance Dashboard','portal','Subscription maintenance',true,now()),
    ('/portal/monitoring','Client Monitoring','portal','Live monitoring',true,now()),
    ('/portal/systems','Client Control Panel','portal','System control',true,now()),
    ('/portal/analytics','Client Analytics','portal','Analytics',true,now()),
    ('/portal/optimisation','Client Optimisation','portal','Optimisation insights',true,now()),
    ('/founder','Founder Overview','founder','Founder home',true,now()),
    ('/founder/proposals','Founder Proposals','founder','Public proposal requests',true,now()),
    ('/founder/pipeline','Lead Pipeline','founder','Lead pipeline view',true,now()),
    ('/founder/projects','Founder Projects','founder','All projects',true,now()),
    ('/founder/activity','Founder Activity','founder','Activity log',true,now()),
    ('/founder/documents','Founder Documents','founder','Document library',true,now()),
    ('/founder/monitoring','Monitoring','founder','Systems monitoring',true,now()),
    ('/founder/agents','Agent Directory','founder','AI agents',true,now()),
    ('/founder/workflows','Workflow Directory','founder','Automation workflows',true,now()),
    ('/founder/integrations','Integration Directory','founder','Integrations',true,now()),
    ('/founder/executions','Execution Dashboard','founder','Workflow executions',true,now()),
    ('/founder/command-center','Command Center','founder','Command center',true,now()),
    ('/founder/processes','Process Directory','founder','Business processes',true,now()),
    ('/founder/architectures','Architecture Directory','founder','System architectures',true,now()),
    ('/founder/deployments','Deployment Directory','founder','Deployments',true,now()),
    ('/founder/analytics','Founder Analytics','founder','Platform analytics',true,now()),
    ('/founder/optimisation','Optimisation Dashboard','founder','Optimisation insights',true,now()),
    ('/founder/knowledge','Knowledge Directory','founder','Knowledge base',true,now()),
    ('/founder/operations','Global Operations','founder','Global ops',true,now()),
    ('/founder/organisations','Organisation Directory','founder','Multi-tenant orgs',true,now()),
    ('/founder/access-control','Access Control','founder','RBAC management',true,now()),
    ('/founder/security','Security Dashboard','founder','Security & anomalies',true,now()),
    ('/founder/templates','Template Directory','founder','System templates',true,now()),
    ('/founder/expansion','Platform Expansion','founder','Venture launcher',true,now()),
    ('/founder/manual','Founder Manual','founder','Self-updating manual',true,now()),
    ('/founder/manual/full','Full System Mirror','founder','Complete system mirror',true,now()),
    ('/founder/build-log','Build Log','founder','Append-only build log',true,now()),
    ('/founder/revenue','Founder Revenue','founder','Revenue console',true,now()),
    ('/founder/brain','Brain Core','founder','AI Brain Core',true,now()),
    ('/founder/decisions','Decision Engine','founder','Decision recommendations',true,now()),
    ('/founder/strategy','Strategy Engine','founder','Strategic plans',true,now()),
    ('/founder/copilot','Founder Co-Pilot','founder','AI co-pilot chat',true,now()),
    ('/founder/testing','Platform Testing','founder','Automated tests',true,now()),
    ('/founder/legal','Founder Legal Console','founder','Legal compliance',true,now()),
    ('/founder/compliance','Compliance Dashboard','founder','Compliance overview',true,now()),
    ('/founder/compliance/events','Compliance Events','founder','Event log',true,now()),
    ('/founder/compliance/rules','Compliance Rules','founder','Rule management',true,now()),
    ('/founder/crm','CRM Dashboard','founder','CRM master',true,now()),
    ('/founder/crm/contacts','CRM Contacts','founder','Contact registry',true,now()),
    ('/founder/crm/inboxes','CRM Inboxes','founder','Inbox management',true,now()),
    ('/founder/finance','Finance Dashboard','founder','Finance overview',true,now()),
    ('/founder/finance/targets','Finance Targets','founder','Revenue targets',true,now()),
    ('/founder/finance/deals','Finance Deals','founder','Deal pipeline',true,now()),
    ('/founder/finance/invoices','Finance Invoices','founder','Invoice ledger',true,now()),
    ('/founder/finance/payments','Finance Payments','founder','Payment ledger',true,now()),
    ('/founder/outreach','Outreach Dashboard','founder','Outreach overview',true,now()),
    ('/founder/outreach/imports','Outreach Imports','founder','Lead imports',true,now()),
    ('/founder/outreach/campaigns','Outreach Campaigns','founder','Campaigns',true,now()),
    ('/founder/outreach/queue','Outreach Queue','founder','Send queue',true,now()),
    ('/founder/conversations','Conversations Dashboard','founder','AI conversations',true,now()),
    ('/founder/internal-proposals','Internal Proposals','founder','Internal proposals',true,now()),
    ('/founder/demos','Demos Dashboard','founder','Demo access',true,now()),
    ('/founder/suppliers','Suppliers Dashboard','founder','Supplier directory',true,now()),
    ('/founder/assignments','Assignments Dashboard','founder','Assignments',true,now()),
    ('/founder/priority','Priority Dashboard','founder','Priority engine',true,now()),
    ('/founder/sending','Sending Health','founder','Inbox/domain health',true,now()),
    ('/founder/system','System Oversight','founder','Oversight dashboard',true,now()),
    ('/founder/system/events','System Events','founder','Event log',true,now()),
    ('/founder/system/health','System Health','founder','Health metrics',true,now()),
    ('/proposals/view/:token','Public Proposal View','public','Public proposal view',true,now()),
    ('/proposals/accept/:token','Public Proposal Accept','public','Public proposal accept',true,now()),
    ('/demo/:token','Public Demo','public','Public demo session',true,now()),
    ('/supplier/login','Supplier Login','supplier','Supplier login',true,now()),
    ('/supplier/dashboard','Supplier Dashboard','supplier','Supplier home',true,now()),
    ('/supplier/assignments','Supplier Assignments','supplier','Supplier assignments',true,now()),
    ('/partner','Partner Dashboard','partner','Partner home',true,now()),
    ('/partner/opportunities','Partner Opportunities','partner','Opportunities',true,now()),
    ('/partner/projects','Partner Projects','partner','Projects',true,now()),
    ('/partner/documents','Partner Documents','partner','Documents',true,now()),
    ('/partner/messages','Partner Messages','partner','Messages',true,now())
  ON CONFLICT (route_path) DO UPDATE
    SET page_name = EXCLUDED.page_name, area = EXCLUDED.area,
        purpose = EXCLUDED.purpose, updated_at = now(), documented = true;

  -- Seed minimal content fragments (canonical anchors per major page)
  INSERT INTO system_content (page, content_type, text_value, linked_feature, source_path, last_updated) VALUES
    ('/','heading','AI infrastructure for organisations that need to win','marketing','src/pages/Index.tsx',now()),
    ('/founder','heading','Founder Overview','founder_console','src/pages/founder/FounderOverview.tsx',now()),
    ('/founder/manual','heading','Founder Manual','documentation','src/pages/founder/FounderManual.tsx',now()),
    ('/founder/manual/full','heading','Full System Mirror','documentation','src/pages/founder/FullSystemMirror.tsx',now()),
    ('/founder/system','heading','System Oversight','oversight','src/pages/founder/system/SystemDashboard.tsx',now()),
    ('/founder/crm','heading','CRM Dashboard','crm','src/pages/founder/CRMDashboard.tsx',now()),
    ('/founder/finance','heading','Finance Dashboard','finance','src/pages/founder/finance/FinanceDashboard.tsx',now())
  ON CONFLICT DO NOTHING;

  -- Counts
  SELECT count(*) INTO v_pages FROM system_pages_index;
  SELECT count(*) INTO v_content FROM system_content;
  SELECT count(*) INTO v_backend FROM system_backend_objects;
  SELECT count(*) INTO v_wf FROM system_workflows_full;
  SELECT count(*) INTO v_rules FROM system_rules;
  SELECT count(*) INTO v_integrations FROM system_integrations_full;
  SELECT count(*) INTO v_flows FROM system_data_flows;

  -- Bump version
  SELECT COALESCE(MAX(version_number),0)+1 INTO v_version FROM system_versions;
  INSERT INTO system_versions (version_number, pages_count, content_count, backend_count, workflow_count, rule_count, integration_count, data_flow_count, coverage_score, notes)
  VALUES (v_version, v_pages, v_content, v_backend, v_wf, v_rules, v_integrations, v_flows, 100, 'Auto rebuild');

  -- Log change
  PERFORM record_system_change('manual', NULL, 'rebuild_full_manual', 'regenerated',
    format('Rebuilt manual: %s pages, %s backend, %s workflows, %s rules', v_pages, v_backend, v_wf, v_rules), v_version);
  PERFORM log_activity('manual_rebuilt',
    format('Full manual rebuilt to v%s — %s pages, %s backend objects', v_version, v_pages, v_backend), 'system_versions', NULL, 'platform');

  RETURN jsonb_build_object(
    'version', v_version, 'pages', v_pages, 'content', v_content,
    'backend', v_backend, 'workflows', v_wf, 'rules', v_rules,
    'integrations', v_integrations, 'data_flows', v_flows
  );
END; $function$;

-- Server-side authorization hardening for public.recompute_video_buyer_handover_ready(_video_id uuid)
CREATE OR REPLACE FUNCTION public.recompute_video_buyer_handover_ready(_video_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v RECORD;
  seg_count INT;
  ready BOOLEAN := false;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT id, external_url, privacy_status, approval_status, module_coverage, dashboard_area, video_type
    INTO v FROM public.video_library_items WHERE id = _video_id;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT COUNT(*) INTO seg_count FROM public.video_transcript_segments WHERE video_id = _video_id;

  ready := seg_count > 0
       AND v.external_url IS NOT NULL
       AND v.privacy_status IN ('approved_internal','approved_customer','approved_buyer')
       AND v.approval_status = 'approved'
       AND ( (v.module_coverage IS NOT NULL AND array_length(v.module_coverage,1) > 0)
             OR v.dashboard_area IS NOT NULL );

  UPDATE public.video_library_items SET buyer_handover_ready = ready WHERE id = _video_id;
  RETURN ready;
END $function$;

-- Server-side authorization hardening for public.release_portfolio_contact(p_contact_id uuid, p_business_name text, p_reason text)
CREATE OR REPLACE FUNCTION public.release_portfolio_contact(p_contact_id uuid, p_business_name text, p_reason text DEFAULT 'released'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner public.portfolio_contact_ownership%ROWTYPE;
  v_cooldown_days integer;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT cross_brand_cooldown_days INTO v_cooldown_days FROM public.portfolio_collision_policy LIMIT 1;
  v_cooldown_days := COALESCE(v_cooldown_days, 30);

  SELECT * INTO v_owner FROM public.portfolio_contact_ownership
  WHERE contact_id = p_contact_id AND status = 'active' AND business_name = p_business_name
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('decision', 'noop', 'reason_codes', ARRAY['no_active_ownership']);
  END IF;

  UPDATE public.portfolio_contact_ownership
     SET status = 'released', released_at = now(), reason_code = p_reason,
         cooldown_until = now() + (v_cooldown_days || ' days')::interval, updated_at = now()
   WHERE id = v_owner.id;

  INSERT INTO public.portfolio_ownership_events
    (contact_id, ownership_id, business_name, event_type, decision, reason_codes, actor_id)
  VALUES (p_contact_id, v_owner.id, p_business_name, 'release', 'allowed', ARRAY[p_reason], auth.uid());

  RETURN jsonb_build_object('decision', 'released', 'ownership_id', v_owner.id,
    'cooldown_days', v_cooldown_days);
END;
$function$;

-- Server-side authorization hardening for public.suggest_replacement_supplier(_assignment_id uuid)
CREATE OR REPLACE FUNCTION public.suggest_replacement_supplier(_assignment_id uuid)
 RETURNS SETOF suppliers
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE a public.assignments;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT * INTO a FROM public.assignments WHERE id = _assignment_id;
  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT s.*
    FROM public.suppliers s
    JOIN public.supplier_availability sa ON sa.supplier_id = s.id
   WHERE s.status = 'APPROVED'
     AND sa.status = 'available'
     AND s.id <> a.supplier_id
     AND (a.business_name = '' OR s.business_name = '' OR s.business_name = a.business_name)
     AND (
       COALESCE(array_length(a.required_skills,1),0) = 0
       OR s.skills && a.required_skills
     )
   ORDER BY
     COALESCE(array_length(ARRAY(SELECT unnest(s.skills) INTERSECT SELECT unnest(a.required_skills)), 1), 0) DESC,
     s.supplier_score DESC,
     s.created_at ASC
   LIMIT 5;
END;
$function$;

-- Server-side authorization hardening for public.supplier_portal_stats()
CREATE OR REPLACE FUNCTION public.supplier_portal_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_24h int;
  updates_24h int;
  total_completed int;
  total_finished int;
  completion_rate numeric;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT COUNT(*) INTO active_24h
    FROM public.supplier_users
   WHERE last_login_at > now() - interval '24 hours';

  SELECT COUNT(*) INTO updates_24h
    FROM public.activity_log
   WHERE event_type = 'supplier_status_update'
     AND created_at > now() - interval '24 hours';

  SELECT COUNT(*) FILTER (WHERE status = 'completed'),
         COUNT(*) FILTER (WHERE status IN ('completed','failed'))
    INTO total_completed, total_finished
    FROM public.assignments;

  completion_rate := CASE WHEN total_finished > 0
                          THEN ROUND((total_completed::numeric / total_finished) * 100, 1)
                          ELSE 0 END;

  RETURN jsonb_build_object(
    'active_suppliers_24h', active_24h,
    'updates_24h', updates_24h,
    'completion_rate', completion_rate,
    'completed_total', total_completed
  );
END;
$function$;

-- Server-side authorization hardening for public.upsert_contact(_email text, _name text, _company text, _role text, _source text, _assigned_business text, _assigned_inbox_id uuid)
CREATE OR REPLACE FUNCTION public.upsert_contact(_email text, _name text DEFAULT NULL::text, _company text DEFAULT NULL::text, _role text DEFAULT NULL::text, _source text DEFAULT NULL::text, _assigned_business text DEFAULT NULL::text, _assigned_inbox_id uuid DEFAULT NULL::uuid)
 RETURNS contacts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result public.contacts;
  v_business public.businesses%ROWTYPE;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;

  IF _email IS NULL OR btrim(_email) = '' THEN
    RAISE EXCEPTION 'email_required' USING ERRCODE='22023';
  END IF;

  -- Resolve the requested business against the server-owned portfolio catalog.
  -- The argument is retained for RPC compatibility but represents a BCR target;
  -- it is never written as the person's authoritative business on contacts.
  IF _assigned_business IS NOT NULL AND btrim(_assigned_business) <> '' THEN
    SELECT * INTO v_business
      FROM public.businesses
     WHERE name = btrim(_assigned_business);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'business_not_authorized' USING ERRCODE='42501';
    END IF;
  END IF;

  -- Inbox assignment is business-specific operational state. This legacy RPC
  -- has no canonical business relationship column for it, so fail closed rather
  -- than attaching the inbox to the global person row.
  IF _assigned_inbox_id IS NOT NULL THEN
    RAISE EXCEPTION 'inbox_assignment_requires_business_relationship' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.contacts (email, name, company, role, source)
  VALUES (
    lower(_email),
    COALESCE(_name, ''),
    COALESCE(_company, ''),
    COALESCE(_role, ''),
    COALESCE(_source, '')
  )
  ON CONFLICT (email) DO UPDATE
    SET name = COALESCE(NULLIF(EXCLUDED.name, ''), public.contacts.name),
        company = COALESCE(NULLIF(EXCLUDED.company, ''), public.contacts.company),
        role = COALESCE(NULLIF(EXCLUDED.role, ''), public.contacts.role),
        source = COALESCE(NULLIF(EXCLUDED.source, ''), public.contacts.source),
        updated_at = now()
  RETURNING * INTO result;

  IF v_business.id IS NOT NULL THEN
    INSERT INTO public.business_contact_relationships (contact_id, business_id, business_name)
    VALUES (result.id, v_business.id, v_business.name)
    ON CONFLICT (contact_id, business_name) DO NOTHING;
  END IF;

  RETURN result;
END;
$function$;

-- Server-side authorization hardening for public.validate_campaign_activation(_campaign_id uuid)
CREATE OR REPLACE FUNCTION public.validate_campaign_activation(_campaign_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign public.outreach_campaigns;
  v_issues text[] := '{}';
  v_messages jsonb := '{}'::jsonb;
  v_active_inboxes int;
  v_mapped_inboxes int;
  v_low_rep int;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  SELECT * INTO v_campaign FROM public.outreach_campaigns WHERE id=_campaign_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'issues', jsonb_build_array('campaign_not_found'));
  END IF;

  SELECT COUNT(*) INTO v_active_inboxes
    FROM public.inboxes
   WHERE business_name = v_campaign.business_name AND active = true;
  IF v_active_inboxes = 0 THEN
    v_issues := array_append(v_issues, 'no_active_inbox_for_business');
    v_messages := v_messages || jsonb_build_object(
      'no_active_inbox_for_business',
      format('No active inbox is configured for %s. Add and activate an inbox before activating campaigns.', v_campaign.business_name)
    );
  END IF;

  -- An inbox is "inbound-mapped" if EITHER:
  --   (a) classic webhook+domain path is wired, OR
  --   (b) IMAP polling is enabled with a monitored mailbox and inbound status has reached at least test_passed.
  SELECT COUNT(*) INTO v_mapped_inboxes
    FROM public.inboxes
   WHERE business_name = v_campaign.business_name
     AND active = true
     AND (
       (COALESCE(inbound_webhook_url,'') <> '' AND sending_domain_id IS NOT NULL)
       OR (
         COALESCE(inbound_polling_enabled, false) = true
         AND COALESCE(monitored_mailbox, '') <> ''
         AND inbound_status IN ('inbound_test_passed'::public.inbound_status_type, 'live_ready'::public.inbound_status_type)
       )
     );
  IF v_active_inboxes > 0 AND v_mapped_inboxes = 0 THEN
    v_issues := array_append(v_issues, 'inbound_mapping_missing');
    v_messages := v_messages || jsonb_build_object(
      'inbound_mapping_missing',
      'This campaign needs an inbound reply route. Configure either inbound IMAP polling (set the monitored mailbox/folder and pass an inbound test) or an inbound webhook with a sending domain on at least one inbox for this business.'
    );
  END IF;

  SELECT COUNT(*) INTO v_low_rep
    FROM public.inboxes
   WHERE business_name = v_campaign.business_name
     AND active = true
     AND reputation_score < 50;
  IF v_low_rep > 0 THEN
    v_issues := array_append(v_issues, 'inbox_reputation_below_50');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sending_domains sd
    JOIN public.inboxes i ON i.sending_domain_id = sd.id
    WHERE i.business_name = v_campaign.business_name AND sd.domain_reputation_score < 20
  ) THEN
    v_issues := array_append(v_issues, 'sending_domain_paused');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.outreach_sequences WHERE campaign_id=_campaign_id) THEN
    v_issues := array_append(v_issues, 'no_sequences_configured');
  END IF;

  RETURN jsonb_build_object(
    'allowed', cardinality(v_issues)=0,
    'issues', COALESCE(to_jsonb(v_issues), '[]'::jsonb),
    'messages', v_messages,
    'campaign_id', _campaign_id
  );
END;
$function$;

-- Server-side authorization hardening for public.validate_full_system_coverage()
CREATE OR REPLACE FUNCTION public.validate_full_system_coverage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_pages integer;
  v_doc_pages integer;
  v_total_tables integer;
  v_doc_tables integer;
  v_total_funcs integer;
  v_doc_funcs integer;
  v_total_wf integer;
  v_doc_wf integer;
  v_total_rules integer;
  v_doc_rules integer;
  v_total_integrations integer;
  v_doc_integrations integer;
  v_total_flows integer;
  v_doc_flows integer;
  v_total_content integer;
  v_score integer;
  v_gaps integer := 0;
  v_details jsonb := '{}'::jsonb;
  v_report_id uuid;
  v_orphan_check jsonb;
  v_runtime_check jsonb;
  v_table record;
  v_func record;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  v_total_pages := 100;
  SELECT COUNT(*) INTO v_doc_pages FROM public.system_pages_index;
  IF v_doc_pages > v_total_pages THEN v_total_pages := v_doc_pages; END IF;

  SELECT COUNT(*) INTO v_total_tables
  FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';
  SELECT COUNT(*) INTO v_doc_tables FROM public.system_backend_objects WHERE object_kind='table';

  SELECT COUNT(*) INTO v_total_funcs
  FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION';
  SELECT COUNT(*) INTO v_doc_funcs FROM public.system_backend_objects WHERE object_kind='function';

  SELECT COUNT(*) INTO v_doc_wf FROM public.system_workflows_full;
  v_total_wf := GREATEST(v_doc_wf, 10);
  SELECT COUNT(*) INTO v_doc_rules FROM public.system_rules;
  v_total_rules := GREATEST(v_doc_rules, 19);
  SELECT COUNT(*) INTO v_doc_integrations FROM public.system_integrations_full;
  v_total_integrations := GREATEST(v_doc_integrations, 5);
  SELECT COUNT(*) INTO v_doc_flows FROM public.system_data_flows;
  v_total_flows := GREATEST(v_doc_flows, 5);
  SELECT COUNT(*) INTO v_total_content FROM public.system_content;

  FOR v_table IN
    SELECT t.table_name FROM information_schema.tables t
    LEFT JOIN public.system_backend_objects b ON b.object_kind='table' AND b.object_name=t.table_name
    WHERE t.table_schema='public' AND t.table_type='BASE TABLE' AND b.id IS NULL
  LOOP
    v_gaps := v_gaps + 1;
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES ('coverage_gap_table','system_mirror','critical',
      'Undocumented table: ' || v_table.table_name,
      jsonb_build_object('table', v_table.table_name));
  END LOOP;

  FOR v_func IN
    SELECT r.routine_name FROM information_schema.routines r
    LEFT JOIN public.system_backend_objects b ON b.object_kind='function' AND b.object_name=r.routine_name
    WHERE r.routine_schema='public' AND r.routine_type='FUNCTION' AND b.id IS NULL
  LOOP
    v_gaps := v_gaps + 1;
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES ('coverage_gap_function','system_mirror','critical',
      'Undocumented function: ' || v_func.routine_name,
      jsonb_build_object('function', v_func.routine_name));
  END LOOP;

  v_orphan_check := public.detect_orphan_content();
  v_runtime_check := public.validate_runtime_vs_documentation();
  v_gaps := v_gaps
          + COALESCE((v_orphan_check->>'orphans_found')::int, 0)
          + COALESCE((v_runtime_check->>'mismatches_found')::int, 0);

  v_score := ROUND(
    (LEAST(v_doc_pages, v_total_pages)::numeric / NULLIF(v_total_pages,0)) * 20 +
    (v_doc_tables::numeric / NULLIF(v_total_tables,0)) * 20 +
    (v_doc_funcs::numeric  / NULLIF(v_total_funcs,0))  * 20 +
    (v_doc_wf::numeric     / NULLIF(v_total_wf,0))     * 10 +
    (v_doc_rules::numeric  / NULLIF(v_total_rules,0))  * 10 +
    (v_doc_integrations::numeric / NULLIF(v_total_integrations,0)) * 10 +
    (v_doc_flows::numeric  / NULLIF(v_total_flows,0))  * 10
  )::int;

  v_details := jsonb_build_object(
    'pages', jsonb_build_object('documented', v_doc_pages, 'total', v_total_pages),
    'tables', jsonb_build_object('documented', v_doc_tables, 'total', v_total_tables),
    'functions', jsonb_build_object('documented', v_doc_funcs, 'total', v_total_funcs),
    'workflows', jsonb_build_object('documented', v_doc_wf, 'total', v_total_wf),
    'rules', jsonb_build_object('documented', v_doc_rules, 'total', v_total_rules),
    'integrations', jsonb_build_object('documented', v_doc_integrations, 'total', v_total_integrations),
    'data_flows', jsonb_build_object('documented', v_doc_flows, 'total', v_total_flows),
    'content_count', v_total_content,
    'orphan_content', v_orphan_check,
    'runtime_check', v_runtime_check
  );

  INSERT INTO public.system_coverage_reports (
    total_pages, documented_pages, total_tables, documented_tables,
    total_functions, documented_functions, total_workflows, documented_workflows,
    total_rules, documented_rules, coverage_score, gaps_found, details
  ) VALUES (
    v_total_pages, v_doc_pages, v_total_tables, v_doc_tables,
    v_total_funcs, v_doc_funcs, v_total_wf, v_doc_wf,
    v_total_rules, v_doc_rules, v_score, v_gaps, v_details
  ) RETURNING id INTO v_report_id;

  -- Only raise the blocking "below 100%" event when there are REAL gaps.
  -- A score that dips below 100% with zero gaps is informational only.
  IF v_gaps > 0 THEN
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES ('coverage_below_100','system_mirror','critical',
      'System coverage below 100% (' || v_score || '%) — ' || v_gaps || ' gap(s)',
      v_details);
    INSERT INTO public.activity_log (event_type, description, entity_type)
    VALUES ('system_alert','Coverage validation: '||v_score||'% with '||v_gaps||' gaps','system_mirror');
  END IF;

  RETURN jsonb_build_object(
    'report_id', v_report_id,
    'coverage_score', v_score,
    'gaps_found', v_gaps,
    'details', v_details
  );
END;
$function$;

-- Server-side authorization hardening for public.validate_runtime_vs_documentation()
CREATE OR REPLACE FUNCTION public.validate_runtime_vs_documentation()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mismatches jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_workflow record;
  v_required_tables text[];
  v_table text;
  v_exists boolean;
BEGIN

  IF session_user NOT IN ('postgres', 'supabase_admin')
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public._is_founder_or_admin() THEN
    RAISE EXCEPTION 'not_authorised';
  END IF;
  -- For each documented workflow, verify that every linked_table on each step actually exists
  FOR v_workflow IN
    SELECT w.workflow_key, w.workflow_name, s.step_index, s.step_name,
           string_to_array(COALESCE(s.linked_tables, ''), ',') AS tables_arr
    FROM public.system_workflows_full w
    JOIN public.system_workflow_steps s ON s.workflow_id = w.id
  LOOP
    FOREACH v_table IN ARRAY v_workflow.tables_arr LOOP
      v_table := trim(v_table);
      IF v_table = '' THEN CONTINUE; END IF;
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = v_table
      ) INTO v_exists;
      IF NOT v_exists THEN
        v_count := v_count + 1;
        v_mismatches := v_mismatches || jsonb_build_object(
          'workflow', v_workflow.workflow_key,
          'step', v_workflow.step_name,
          'missing_table', v_table
        );
      END IF;
    END LOOP;
  END LOOP;

  IF v_count > 0 THEN
    INSERT INTO public.system_events (event_type, entity_type, severity, message, metadata)
    VALUES (
      'runtime_documentation_mismatch',
      'system_mirror',
      'critical',
      'Runtime/documentation mismatch: ' || v_count || ' issue(s) detected',
      jsonb_build_object('mismatches', v_mismatches)
    );
    INSERT INTO public.activity_log (event_type, description, entity_type)
    VALUES ('system_alert', 'Runtime vs documentation mismatch detected (' || v_count || ')', 'system_mirror');
  END IF;

  RETURN jsonb_build_object(
    'mismatches_found', v_count,
    'details', v_mismatches,
    'checked_at', now()
  );
END;
$function$;

-- Server-side authorization hardening for public.worker_has_active_window(_worker_id uuid, _portal_type text)
CREATE OR REPLACE FUNCTION public.worker_has_active_window(_worker_id uuid, _portal_type text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT NOT public.is_kill_switch_active()
     AND (auth.role() = 'service_role' OR _worker_id = public.current_worker_id())
     AND EXISTS (
       SELECT 1 FROM public.worker_access_windows
       WHERE worker_id = _worker_id
         AND portal_type = _portal_type
         AND status IN ('scheduled','active')
         AND now() BETWEEN start_time AND end_time
     )
$function$;

-- Explicit PUBLIC_ANON execution allowlist (8 exact public functions).
DO $stage1b_grants$
DECLARE
  v_signature text;
  v_oid oid;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.accept_proposal_by_token(text)',
'public.get_customer_quarterly_report_by_token(text)',
'public.get_customer_survey_request_by_token(text)',
'public.get_proposal_by_token(text)',
'public.log_demo_event(text, text, jsonb)',
'public.supplier_list_assignments(text)',
'public.supplier_login_with_token(text)',
'public.supplier_update_assignment_status(text, uuid, text, text)'
  ] LOOP
    v_oid := to_regprocedure(v_signature);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'Stage 1B grant allowlist references missing function %', v_signature;
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', v_oid::regprocedure);
  END LOOP;
END
$stage1b_grants$;

-- Explicit FOUNDER_ADMIN_ONLY execution allowlist (31 exact public functions).
DO $stage1b_grants$
DECLARE
  v_signature text;
  v_oid oid;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.activate_outreach_campaign(uuid)',
'public.apollo_credit_status()',
'public.check_outreach_allowed(uuid)',
'public.claim_portfolio_contact(uuid, text, text, uuid, boolean, text)',
'public.cleanup_stale_ai_leases()',
'public.compare_system_versions(integer, integer)',
'public.detect_anomalies()',
'public.detect_orphan_content()',
'public.eligible_suppliers_for_deal(uuid)',
'public.export_full_system_snapshot()',
'public.finance_target_vs_actual(text, date)',
'public.founder_confirm_assignment(uuid)',
'public.get_business_outbound_status(text)',
'public.get_crm_contact_360_summary(uuid, uuid)',
'public.get_crm_contact_timeline(uuid, uuid, integer)',
'public.get_crm_interaction_ledger_summary(uuid)',
'public.get_outbound_status()',
'public.list_inbox_credentials_public(uuid)',
'public.ma_generate_default_data_room(uuid)',
'public.map_billionaire_network_evidence()',
'public.match_billionaire_wealth_snapshots(text, date)',
'public.rebuild_billionaire_coverage()',
'public.rebuild_full_manual()',
'public.recompute_video_buyer_handover_ready(uuid)',
'public.release_portfolio_contact(uuid, text, text)',
'public.suggest_replacement_supplier(uuid)',
'public.supplier_portal_stats()',
'public.upsert_contact(text, text, text, text, text, text, uuid)',
'public.validate_campaign_activation(uuid)',
'public.validate_full_system_coverage()',
'public.validate_runtime_vs_documentation()'
  ] LOOP
    v_oid := to_regprocedure(v_signature);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'Stage 1B grant allowlist references missing function %', v_signature;
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_oid::regprocedure);
  END LOOP;
END
$stage1b_grants$;

-- Explicit RLS_HELPER execution allowlist (7 exact public functions; authenticated only).
DO $stage1b_grants$
DECLARE
  v_signature text;
  v_oid oid;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public._is_founder_or_admin()',
'public.current_worker_id()',
'public.has_role(uuid, app_role)',
'public.is_founder()',
'public.is_founder_or_admin(uuid)',
'public.is_oversight_reviewer()',
'public.worker_has_active_window(uuid, text)'
  ] LOOP
    v_oid := to_regprocedure(v_signature);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'Stage 1B grant allowlist references missing function %', v_signature;
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_oid::regprocedure);
  END LOOP;
END
$stage1b_grants$;

-- Only has_role() is referenced by RLS policies targeted to PUBLIC/anon.
DO $stage1b_grants$
DECLARE
  v_oid oid := to_regprocedure('public.has_role(uuid, app_role)');
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'Stage 1B grant allowlist references missing function public.has_role(uuid, app_role)';
  END IF;
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', v_oid::regprocedure);
END
$stage1b_grants$;

-- Freeze the verified post-change state so rollback refuses to overwrite later edits.
UPDATE stage1b_private.rpc_state_snapshot s
SET after_raw_acl = p.proacl::text,
    after_definition_md5 = md5(pg_get_functiondef(p.oid)),
    after_service_role_execute = has_function_privilege('service_role', p.oid, 'EXECUTE')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE s.change_id = '20260923130000_stage1b_rpc_authorization_hardening'
  AND n.nspname = 'public'
  AND p.prokind = 'f'
  AND format('%I.%I(%s)', n.nspname, p.proname, COALESCE((
    SELECT string_agg(format_type(a, NULL), ', ' ORDER BY u.ordinality)
    FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY AS u(a, ordinality)
  ), '')) = s.typed_signature;

DO $stage1b_poststate_check$
BEGIN
  IF (SELECT count(*) FROM stage1b_private.rpc_state_snapshot
       WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening'
         AND after_definition_md5 IS NOT NULL) <> 241 THEN
    RAISE EXCEPTION 'Stage 1B post-state snapshot is incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM stage1b_private.rpc_state_snapshot
     WHERE change_id = '20260923130000_stage1b_rpc_authorization_hardening'
       AND prior_service_role_execute IS TRUE
       AND after_service_role_execute IS DISTINCT FROM TRUE
  ) THEN
    RAISE EXCEPTION 'Stage 1B changed pre-existing service_role EXECUTE access';
  END IF;
END
$stage1b_poststate_check$;

COMMIT;
