# Central CRM Gap Closure — Implementation Plan

## Goal
Harden the Liftor central CRM spine so every lead, contact, conversation, proposal, deal and send reconciles to `contacts`. No live sends, no Apollo credits, no AI, no new dashboard.

## Approach
One additive migration → data backfill via insert tool → edge function hardening → UI summary tile in existing Lead Quality panel → re-audit report.

---

## PART 1 — Migration (additive, safe)

`supabase/migrations/<ts>_crm_spine_hardening.sql`:

1. **`internal_email_identities`** — ensure unique index on `lower(email)`; add columns if missing: `kind` (founder|system|sender|test), `notes`, `created_by`.
2. **`contacts`** — add columns if missing: `is_internal boolean default false`, `sendable_status text default 'sendable'` (sendable|suppressed|hard_bounced|review), `archived_at timestamptz`, `archive_reason text`. Index on `(is_internal)`, `(sendable_status)`.
3. **`business_contact_relationships`** — add nullable `business_id uuid` referencing `businesses(id)`; index `(business_id)`. Keep `business_name` text as legacy/display.
4. **`proposals`** — add nullable `contact_id uuid` referencing `contacts(id)`, nullable `business_id uuid` referencing `businesses(id)`, `crm_reconciliation_status text default 'pending'` (matched|unmatched|needs_review|pending). Indexes.
5. **View `crm_spine_summary`** — single-row counts: total contacts, with BCR, missing BCR, internal identities, suppressed/bounced, apollo promoted, apollo needs verification, duplicates collapsed, proposals needing reconciliation, safe-to-unlock count.
6. **View `proposal_crm_reconciliation`** — proposal_id, contact_email, matched contact_id, matched business_id, status.
7. **Function `resolve_contact_by_email(text) returns uuid`** — case-insensitive lookup.
8. **Trigger `proposals_reconcile_trg`** — on insert/update of `contact_email`, set `contact_id`/`business_id`/`crm_reconciliation_status` automatically (no contact creation).
9. **Function `is_internal_identity(text) returns boolean`** — checks `internal_email_identities`.

---

## PART 2 — Data backfill (insert tool, after migration approved)

1. Seed `internal_email_identities`: `mandyking308@gmail.com` (founder), `hello@neoncandy.online` (system/sender), any `from_email` found on `outreach_queue`/`communications`.
2. Reclassify `hello@neoncandy.online` contact → `is_internal=true`, `sendable_status='suppressed'`, cancel any pending queue rows.
3. Audit 20 BCR-less contacts:
   - If email matches `internal_email_identities` → mark internal/suppressed, no BCR.
   - Match `mailer-daemon`, `postmaster`, `no-reply`, `notifications@` patterns → archive as `stale/system`.
   - Real prospects (have `apollo_person_id` or `imported_leads` source) → create BCR row linked to NeonCandy `business_id`.
   - Else → mark `archived_at` with `archive_reason='needs_founder_review'`.
4. Backfill NDR contacts: parse 8 NDR inbound rows for original recipient → set those contacts `sendable_status='hard_bounced'`, cancel pending queue rows.
5. Backfill `business_contact_relationships.business_id` for all rows where `business_name ilike 'neon candy'` → NeonCandy `businesses.id`.
6. Run proposal trigger: `UPDATE proposals SET contact_email = contact_email` to populate `contact_id`/`business_id`/`crm_reconciliation_status`.

---

## PART 3 — Edge function hardening

- **`outreach-inbound-poll`** & **`outreach-inbound-webhook`**: detect NDR (subject contains `Undelivered`/`Mail Delivery`/`failure notice`, or from `mailer-daemon`/`postmaster`), parse original recipient, mark contact suppressed, cancel queue rows. Detect internal-identity senders → tag, do not create prospect.
- **`apollo-unlock-shortlist`** & **`apollo-unlock-selected`**: pre-check `contacts` (by email/apollo_person_id), `business_contact_relationships`, `email_queue`, `communications`, `conversations`, `proposals`, `internal_email_identities`, `sendable_status`. Adjust credit estimate to count only safe new leads. Add `crm_check` to response payload.
- **`outreach-send-worker`**: refuse to send when contact `is_internal=true` or `sendable_status != 'sendable'`.

---

## PART 4 — UI

`src/components/founder/LeadQualityPanel.tsx`: add a compact `CRM Spine Summary` card (above existing content) reading from `crm_spine_summary` view. Tiles: Contacts / With BCR / Missing BCR / Internal / Suppressed / Apollo Promoted / Needs Verification / Duplicates Collapsed / Proposals Needing Recon / Safe-to-Unlock. No new route.

---

## PART 5 — Re-audit report

After data backfill, generate `/mnt/documents/central_crm_audit_v2.md` with:
- contacts total, duplicates, missing BCR
- internal identities count
- NDR handling status (suppressed counts)
- proposal reconciliation matched/unmatched
- BCR business_id coverage
- Apollo safe-to-unlock count
- All 10 acceptance tests pass/fail

---

## Out of scope
- No live sends, no Apollo credits, no AI, no auto-promote, no new dashboard, no contact auto-creation from proposals, no fake/demo data, TEST mode stays off.

## Deployment order
1. Migration (await user approval)
2. Data backfills via insert tool
3. Edge function deploys
4. UI panel update
5. Re-audit report

Ready to proceed with the migration on your approval.