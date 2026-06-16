## Operating Loops Closure Pack — Build Plan

Build seven founder/admin-only closed-loop modules on top of existing registers. All tracking-only; no external sends, no cron, no automation of legal/tax/insurance/clinical/investment decisions.

### 1. Database (single migration)

Reuse existing tables where they exist; create new ones only where gaps remain. Every new public table: GRANT to authenticated+service_role (no anon), RLS enabled, `is_founder_or_admin(auth.uid())` policies, `created_at`/`updated_at` with trigger, audit table per domain.

**New / extended tables:**

- `insurance_claims` — business_id, incident_id (→ liability_events/incident_records), policy_id (→ insurance_policy_register), claim_type, insurer, broker_contact, policy_reference, incident_date, opened_date, status (enum: draft→closed), claim_value_estimate, recovered_amount, excess_amount, currency, owner, next_action, next_action_due, evidence_refs jsonb, founder_approval_status, founder_approved_by, founder_approved_at, notes
- `insurance_claim_events` — claim_id, event_type, actor, payload, created_at
- `statutory_filings` — business_id, entity_id, jurisdiction, filing_category (enum), filing_name, authority, period_start, period_end, due_date, owner, adviser_contact, status (enum), evidence_ref, payment_required, payment_amount, currency, filed_date, notes
- `statutory_filing_events` — filing_id, event_type, actor, payload
- `corporate_secretarial_records` — entity_id, jurisdiction, directors jsonb, shareholders jsonb, psc_record jsonb, registered_office, registered_agent, annual_confirmation_due, accounts_due, licence_renewal_due, status (enum), evidence_refs jsonb, notes
- `corporate_secretarial_events` — record_id, event_type (resolution, ownership_change, director_change, review), actor, payload, occurred_at
- `international_expansion_runs` — business_id, target_jurisdiction, launch_purpose, market_relevance_notes, tax_review_status, legal_review_status, payments_status, banking_status, localisation_status, privacy_status, regulatory_status, adviser_status, substance_notes, go_no_go_status (enum), founder_decision, founder_decided_at, evidence_refs jsonb
- `international_expansion_events` — run_id, event_type, actor, payload
- `data_room_access_tokens` — investor_name, organisation, email, domain, access_scope, allowed_folders jsonb, expiry_at, watermark_enabled, download_allowed, view_only, nda_status, approved_by, approved_at, revoked_at, revoked_reason, token_hash (no live link generation by default)
- `data_room_view_audit` — token_id, viewer_fingerprint, item_ref, action (view/download/share_request), occurred_at, ip_hash
- `data_room_share_requests` — investor_name, organisation, requested_scope, justification, status (pending/approved/rejected/revoked), founder_decision, founder_decided_at
- `release_workflow_items` — roadmap_item_id (→ product_roadmap_items, nullable), release_title, release_type (enum), business_id, qa_status, documentation_status, customer_impact, support_impact, release_status (enum), planned_release_date, released_at, customer_comms_draft, internal_notes, founder_approved_by, founder_approved_at
- `release_workflow_events` — item_id, event_type, actor, payload
- `fx_rate_snapshots` — currency, base_currency (GBP), rate, as_of, source (manual/estimate), notes
- `portfolio_fx_warnings` — currency, missing_rate, last_seen_at, business_id, notes

(FX consolidation views read from existing `qtc_invoices`, `qtc_payments`, `revenue_records` and join `fx_rate_snapshots`. No new payment tables.)

### 2. Engines (`src/lib/`)

- `insuranceClaimLoopEngine.ts` — CRUD, status transitions, summary, diagnostics
- `statutoryFilingsEngine.ts` — fetch, upcoming/overdue buckets, summary
- `corporateSecretarialEngine.ts` — register fetch, due-soon detection
- `internationalExpansionEngine.ts` — readiness checklist scoring, go/no-go gate
- `dataRoomHardeningEngine.ts` — token CRUD, approval flow, audit logging
- `releaseWorkflowEngine.ts` — roadmap→release transitions, founder approval gate
- `portfolioFxEngine.ts` — read-only aggregation, FX warning detection

Each engine logs audit events on every status change/approval/revocation.

### 3. UI routes (founder-only, behind `FounderRoute`)

- `/founder/insurance-claims` — list + drawer (extends existing insurance-liability area as new tab)
- `/founder/statutory-filings` — calendar + table with filter chips (30/60/90, overdue, by entity, by jurisdiction)
- `/founder/corporate-secretarial` — register grid with badges
- `/founder/international-expansion` — jurisdiction launch readiness board
- `/founder/data-room` — access tokens + share request approvals (no live external link)
- `/founder/release-workflow` — roadmap→release kanban
- `/founder/portfolio-fx` — read-only FX consolidation dashboard

Each page reuses existing `tech-card`, `Tabs`, `Badge`, semantic tokens — no hex.

### 4. Command Centre integration

Add a single `OperatingLoopsAttentionPanel` to Command Centre summarising:
- claims needing action
- overdue/upcoming filings
- secretarial items due
- expansion blockers
- pending data room approvals
- releases awaiting founder review
- FX warnings

Each item links to the relevant route. No noisy alerts; counts only.

### 5. Safety guardrails

- Every external action (broker email, claim submission, filing, customer release notification, investor link share) is **disabled by default** and only writes a record. UI buttons read "Mark as handed off to adviser" / "Record evidence" / "Approve internally" — never "Send" / "Submit" / "Publish".
- `data_room_access_tokens` does not generate live URLs; it records intent + approval. A note on the page makes this explicit.
- No FX advice / no tax advice / no legal advice — disclaimer banners on every page.

### 6. Docs + memory

- `docs/operating-loops-closure-pack.md` — what was built, what stays adviser-led, what's tracking-only
- Update `docs/business-function-coverage-audit.md` to mark the closed gaps
- New memory file `.lovable/memory/features/operating-loops-closure.md` + index entry

### 7. QA

After build:
- Run `psql` schema check that all tables exist with RLS + GRANTs
- Confirm routes resolve under `/founder/*` with FounderRoute guard
- Confirm audit tables receive a row on every status change
- Spot-check no hex colours / no `text-white`
- Report PASS/PARTIAL/FAIL per audit gap

### Out of scope (explicit)

- No cron / scheduled jobs
- No outbound email / SMS / webhook
- No paid provider activation
- No customer/investor/adviser/regulator notifications
- No public route exposure
- No automated legal/tax/insurance/clinical/investment decisions
- No fake/demo seed data
