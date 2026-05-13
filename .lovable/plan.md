## Liftor Autonomous Apollo-to-Outreach Pipeline

Convert the current manual-approval-per-batch flow into a policy-controlled autonomous pipeline. Founder approves the policy once; Liftor executes within it. All existing safety guardrails remain hard-enforced.

### 1. Data model (new migration)

**`business_autopilot_settings`** (one row per business, FK `business_name`):
- `apollo_candidate_pull_enabled boolean default true`
- `apollo_email_reveal_autonomous boolean default false` (founder must enable)
- `apollo_reveal_daily_credit_budget int default 50`
- `apollo_reveal_monthly_credit_budget int default 500`
- `apollo_reveal_min_quality_score numeric default 7`
- `apollo_reveal_max_domain_frequency int default 2`
- `apollo_reveal_exclude_legacy_hold boolean default true`
- `apollo_reveal_exclude_previous_no_email boolean default true`
- `apollo_reveal_exclude_existing_crm boolean default true`
- `apollo_reveal_exclude_duplicates boolean default true`
- `apollo_reveal_exclude_poor_fit boolean default true`
- `auto_promote_after_valid_reveal boolean default true`
- `auto_promote_only_verified_email boolean default true`
- `auto_promote_only_crm_new boolean default true`
- `auto_promote_only_campaign_fit boolean default true`
- `auto_queue_after_promotion boolean default true`
- `auto_queue_campaign_id uuid` (resolves to "Early Access Collaboration Test")
- `auto_queue_step int default 1`
- `auto_queue_domain_cap int default 2`
- `auto_send_after_queue boolean default false`
- `sending_provider_mode text default 'ionos_proof'` — `ionos_proof | external_scale`
- `daily_send_budget int default 20`
- RLS: founder/admin only via `has_role`.

**`apollo_credit_ledger`** (append-only):
- `business_name`, `function_source` (`reveal | enrich`), `credits_used int`, `apollo_person_ids text[]`, `created_at`.
- RLS: founder read.

**`autopilot_run_log`** (append-only audit):
- `business_name`, `stage` (`reveal|promote|queue|send|skip`), `actor` (`autopilot|founder`), `candidate_id`, `contact_id`, `outcome`, `reason`, `metadata jsonb`, `created_at`.

**`founder_decision_queue`**:
- `business_name`, `decision_type` (`policy_change|budget_increase|ambiguous_lead|provider_approval|enable_auto_send|large_suppression|copy_change`), `payload jsonb`, `status` (`pending|approved|rejected`), `requested_at`, `resolved_at`, `resolver_user_id`.
- RLS: founder/admin.

Seed a NeonCandy row with the defaults above.

### 2. Edge functions

**New `autopilot-orchestrator`** (cron every 15 min + manual trigger):
Single entry point that runs the pipeline for one business at a time:
1. Load policy from `business_autopilot_settings`.
2. Compute today/month credit usage from `apollo_credit_ledger`; stop reveal stage if budget exceeded.
3. Query `lead_quality_profiles` for candidates in `email_reveal_required` matching: score ≥ threshold, not in CRM, not duplicate (apollo_person_id), not bounced/suppressed/internal, not previous-no-email, not poor-fit, domain count under cap. Order by `reveal_score desc`.
4. Compute `reveal_batch_size = min(eligible_count, daily_remaining, monthly_remaining)`. No artificial 25 cap.
5. If `apollo_email_reveal_autonomous` → call internal Apollo enrichment; classify outcomes (`safe_to_promote_after_reveal | already_in_crm_after_reveal | reveal_attempted_no_email | reveal_invalid_email | needs_founder_review`). Log credit spend.
6. If `auto_promote_after_valid_reveal` → for `safe_to_promote_after_reveal` rows that are verified, CRM-new, campaign-fit, not suppressed: insert into `contacts` + `business_contact_relationship`, link back to `lead_quality_profiles.promoted_contact_id`.
7. If `auto_queue_after_promotion` → insert Step 1 rows in `email_queue` for promoted contacts that pass `crm-send-check` style guardrails and respect `auto_queue_domain_cap`. Reuses existing inbox assignment + NeonCandy `hello@neoncandy.online` hard guard.
8. If `auto_send_after_queue=false` → stop. Otherwise rely on existing `outreach-send-worker` (no change), bounded by `daily_send_budget` and `sending_provider_mode`.
9. Every action writes a row in `autopilot_run_log`. Anything ambiguous (catch-all email, score in grey zone, suspected duplicate) → row in `founder_decision_queue` instead of acting.

**Update `lead-quality-autopilot`**: stop recommending "Review Apollo email reveal shortlist" when policy `apollo_email_reveal_autonomous=true` — instead recommend "View autonomous pipeline status".

**Update `apollo-pull-verified`**: after staging candidates, if `apollo_candidate_pull_enabled=true` and `apollo_email_reveal_autonomous=true` invoke `autopilot-orchestrator` (fire-and-forget) so a fresh pull immediately enters the policy flow.

**Cron**: `pg_cron` job every 15 minutes invoking `autopilot-orchestrator` for each business with `apollo_candidate_pull_enabled=true`.

**No change** to `outreach-send-worker`, `crm-send-check`, suppression logic — guardrails remain authoritative.

### 3. UI changes

**New `src/components/founder/AutopilotPolicyPanel.tsx`** — form bound to `business_autopilot_settings` with grouped toggles + budget inputs. "Save policy" writes one row; saving sensitive changes (enabling auto-send, raising credit budget >2x, changing provider) inserts a `founder_decision_queue` row tagged auto-approved by the saving founder.

**New `src/components/founder/AutonomousPipelineStatus.tsx`** — Command Centre section showing live counters (today/this run):
- Apollo candidates pulled · passed quality policy · revealed · credits used today/month (with budget bars)
- Valid emails returned · no-email outcomes · auto-promoted · auto-queued · waiting for send provider
- Blocked by policy (with breakdown) · founder decisions pending
- Next automatic run time
- Policy status row: Reveal / Auto-promote / Auto-queue / Auto-send ON/OFF chips, credit budget remaining, sending provider mode.

**`src/components/founder/ApolloRevealShortlist.tsx`** (existing): collapse to read-only "Recent autonomous reveal batches" when `apollo_email_reveal_autonomous=true`. Keep manual override button.

**`src/pages/founder/CommandCentre.tsx`**: insert `AutonomousPipelineStatus` near the top of the Apollo section and `AutopilotPolicyPanel` inside a collapsible "Operating policy" card.

**New `src/components/founder/FounderDecisionQueue.tsx`** — list pending `founder_decision_queue` items with approve/reject buttons.

### 4. Safety (unchanged hard guardrails)

- `outreach-send-worker` continues to enforce: bounced/suppressed/internal block, duplicate-pending block, NeonCandy inbox guard, sequence chain-on-success.
- `crm-send-check` still gates queue insertion.
- `auto_send_after_queue` defaults to **false** — IONOS proof mode only. Founder must explicitly enable scaled sending after external provider is configured.
- All policy changes, budget overrides, and `auto_send_after_queue=true` flips create `founder_decision_queue` audit rows.

### 5. Acceptance verification

After deploy:
- `business_autopilot_settings` has a NeonCandy row with `auto_send_after_queue=false`.
- Manual trigger of `autopilot-orchestrator` for NeonCandy in `dry_run=true` returns a plan: how many would reveal, promote, queue.
- `autopilot_run_log` has rows for every action.
- No live sends occur (auto-send off).
- No Apollo credits are spent during this implementation task (orchestrator default `dry_run=true` for first run; founder flips to live via UI).

### Notes / out of scope

- External provider (Smartlead) integration: stub `sending_provider_mode='external_scale'` only — actual provider code in a follow-up.
- `auto_send_after_queue` flag is wired but stays off; existing send worker handles the rest.
- No AI calls anywhere in orchestrator — all checks are deterministic.
