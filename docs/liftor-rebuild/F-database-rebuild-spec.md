# Section F — Database rebuild specification

All figures below come from read-only catalog queries against the live production database on 17 September 2026. Nothing in this section was inferred from code.

## F1. Totals

| Object | Count |
|---|---|
| Tables (`public`) | 1,112 |
| Views (`public`) | 26 |
| Functions/RPCs (`public`) | 390 (includes pgvector/pg_trgm extension functions) |
| RLS policies | 1,520 |
| Triggers (non-internal) | 803 |
| Indexes | 2,774 |
| Foreign keys | 934 |
| Tables with RLS **off** | 3 |
| RLS-enabled tables with no policy | 1 (`inbox_credentials`, deny-by-default by design) |

Regenerate any of these with:

```sql
select (select count(*) from pg_tables where schemaname='public') tables,
       (select count(*) from pg_views where schemaname='public') views,
       (select count(*) from pg_policies where schemaname='public') policies,
       (select count(*) from pg_constraint where contype='f' and connamespace='public'::regnamespace) fks;
```

## F2. Domain inventory (table-name prefix = subsystem)

The schema is organised by subsystem prefix. Counts are exact at the audit date; the full per-table list is machine-derivable with the query in F6 and is intentionally not pasted here — the category map below is the canonical structure.

| Domain prefix | Tables | Subsystem (manual section) |
|---|---|---|
| `social_*` | 110 | Social autopilot, distribution, inbox, relationships, viral radar (K6) |
| `business_*` | 90 | Business lifecycle, activation, knowledge, daily/weekly loops (M) |
| `ma_*` | 58 | M&A / exit engine, buyers, data room, advisers (K5) |
| `customer_*` | 54 | Customer success, voice, surveys, onboarding, win-back (K4) |
| `ai_*` | 43 | AI gateway, agents, budgets, evals, compliance, kill switch (L) |
| `system_*` | 24 | Execution modes, health, tasks, events, versions |
| `liftor_*` | 17 | Platform-level registries and configuration |
| `portfolio_*` | 15 | Portfolio CRM ownership, collisions, memory (K1) |
| `support_*` | 15 | Support desk, SLAs, escalations |
| `video_*` | 15 | Searchable video library |
| `agent_*` | 15 | Agent registry, permissions, handovers, boundaries (L) |
| `billionaire_*` | 13 | Wealth-network intelligence (K3) |
| `founder_*` | 13 | Founder console, approvals, decisions |
| `funding_*`, `acquisition_*` | 16 | Funding and acquisition-funding radars |
| `worker_*`, `seller_*`, `partner_*`, `supplier_*` | 33 | Portals |
| `crm_*`, `contacts`, `organisations`, `business_contact_relationships` | 13+ | Portfolio CRM spine (K1) |
| `apollo_*` | 9 | Apollo discovery + credit firewall (I1) |
| `gsm_*`, `mailbox_*`, `inbox_*`, `sending_*`, `outbound_*`, `smartlead_*` | 17 | Sending estate and outbound mapping (N) |
| `revenue_*`, `sales_*`, `qtc_*`, `collections_*`, `invoices`, `payments`, `fx_*`, `reconciliation_*` | 40+ | Finance, quote-to-cash, reconciliation (K4) |
| `compliance_*`, `legal_*`, `policy_*`, `privacy_*`, `consent_*`, `evidence_*`, `statutory_*` | 25+ | Legal/compliance stack (K8) |
| `healthcare_*` | 7 | Healthcare overlay — **readiness overlay only, not live, no clinical features** |
| `philanthropy_*`, `philanthropic_institutions`, `trust_*` | 7 | Giving rail / GHAT (K7) |
| remaining single-purpose prefixes | ~200 | catalogued by the prefix query in F6 |

## F3. Views (26, exhaustive)

`billionaire_access_summary`, `billionaire_completion_metrics`, `billionaire_ghat_actionable`, `billionaire_operational_coverage`, `billionaire_access_research_2026_summary`, `education_commercial_funnel`, `gsm_mailbox_readiness`, `apollo_raw_leads`, `system_health_score`, `blocked_sends_24h`, `hot_conversations`, `crm_universal_interaction_log`, `proposal_crm_reconciliation`, `command_centre_active_inboxes`, `high_priority_deals`, `lead_lifecycle_summary`, `cadence_status`, `at_risk_assignments`, `lead_quality_overview`, `high_priority_contacts`, `crm_spine_summary`, `high_intent_review_queue`, `domain_usage_summary`, `ma_approval_queue_open`, `inbox_health_summary`, `warmup_progress`.

Operationally load-bearing: `gsm_mailbox_readiness` (mailbox campaign-readiness state machine, Section N), `education_commercial_funnel` (Section K2), `system_health_score`, `blocked_sends_24h`, `warmup_progress`, `inbox_health_summary`.

## F4. Function/RPC categories (390 total)

| Category | Representative functions |
|---|---|
| Role & security | `_is_founder_or_admin`, `has_role`, `current_worker_id` |
| Apollo credit firewall | `apollo_credit_reserve`, `apollo_credit_release`, `apollo_credit_settle`, `apollo_credit_status`, `apollo_encrypt_key`, `apollo_decrypt_key` |
| Outbound safety | `check_outreach_allowed`, `check_send_throttle`, `apply_reply_stop_suppression`, `cancel_queue_on_reply`, `cancel_queue_on_inbound_comm`, `enforce_inbox_ramp`, `bump_inbox_send_count`, `assign_inbox_for_contact`, `domain_for_inbox` |
| Compliance checks | `compliance_check_contact`, `compliance_check_outbound_communication`, `compliance_check_invoice`, `compliance_check_payment`, `compliance_check_proposal`, `compliance_check_demo`, `compliance_check_assignment`, `compliance_score_for` |
| CRM / portfolio | `claim_portfolio_contact`, `crm_match_interaction_preview`, `get_crm_contact_360_summary`, `get_crm_contact_timeline`, `get_crm_relationship_timeline`, `enrich_contact`, `enrich_all_contacts` |
| AI governance | `acquire_ai_lease`, `cleanup_stale_ai_leases`, `ai_actions_today`, `evaluate_ai_reply` |
| Finance | `generate_invoice_number`, `finance_mark_overdue_invoices`, `finance_target_vs_actual` |
| Public token access | `get_proposal_by_token`, `accept_proposal_by_token`, `get_customer_quarterly_report_by_token`, `get_customer_survey_request_by_token` |
| System state | `get_active_execution_mode`, `get_system_mode`, `compute_system_health`, `export_full_system_snapshot`, `compare_system_versions` |
| Extension functions | pgvector (`cosine_distance`, `binary_quantize`, `array_to_vector`…) and pg_trgm (`gtrgm_*`, `gin_trgm_*`) — not application logic |

803 non-internal triggers implement `updated_at` maintenance, compliance enforcement (e.g. `enforce_founder_approval_for_buyer_outreach`, `enforce_founder_approval_for_warm_up_action`, `block_activation_log_mutation`), audit append-only behaviour and derived-state recomputation.

## F5. RLS findings (current, unfixed)

| Table | RLS | Policies | Finding |
|---|---|---|---|
| `billionaire_institution_links` | **off** | 0 | publicly readable wealth-relationship data — critical |
| `philanthropic_institutions` | **off** | 0 | publicly readable institution/principal contact data — critical |
| `billionaire_enrichment_batches` | **off** | 0 | publicly readable internal batch metadata — warning |
| `inbox_credentials` | on | 0 | deny-by-default; service role only. Correct, but should carry an explicit comment/policy for clarity |

Any earlier manual statement that "every public table has RLS" is **wrong** and is superseded by this table.

## F6. Rebuild procedure

1. Create a Supabase project; enable extensions used by the schema (`pgvector`, `pg_trgm`, `pgcrypto`).
2. Apply `supabase/migrations/*.sql` in filename order (Section G lists what each establishes).
3. Verify object counts against F1.
4. Verify RLS: every new public table must have `GRANT`s + `ENABLE ROW LEVEL SECURITY` + policies in the same migration. The three exceptions in F5 are known defects, not a pattern to copy.
5. Seed: `user_roles` founder row, `businesses`, `external_action_gates` (19 rows, all `enabled = false`), `system_execution_modes`, `ai_kill_switch_state` singleton.

Verification queries:

```sql
-- per-table RLS + policy count
select t.tablename, c.relrowsecurity,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.tablename) policies
from pg_tables t join pg_class c on c.relname=t.tablename and c.relnamespace='public'::regnamespace
where t.schemaname='public' order by 2, 3, 1;

-- subsystem inventory
select split_part(tablename,'_',1) domain, count(*) from pg_tables
where schemaname='public' group by 1 order by 2 desc;
```

## F7. Uninspectable / not enumerated here

- Per-table column definitions for 1,112 tables are not pasted into this manual; they are fully reproducible from `supabase/migrations/**` (Section G) and from `information_schema.columns`. This is a deliberate exclusion, not an omission.
- Policy bodies (1,520) are likewise reproducible from the migrations and `pg_policies`.
- Storage buckets and their policies are managed through Supabase tooling and are not represented in the migration files.
