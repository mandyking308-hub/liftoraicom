# Founder-approved maintenance — 17 November 2026

## Scope

Four options selected together: tighten data access, clear labelled test data, refresh the manual library, and work Kindnesss readiness blockers without sending or activation. The founder subsequently paused the Smartlead signing-key/recipient work and requested an add-company interworking audit.

## Database access

- Fresh scan initially reported 29 database findings; live `pg_policies` read-back showed 22 already corrected and seven genuinely tautological rules remaining.
- Migration `0026_tighten_remaining_public_and_authenticated_policies.sql` constrained public proposal/partner inserts, publication-aware legal-version reads, founder/admin activity/audit writes, and founder/admin shop/scheduling reads.
- Migration `0027_allow_trusted_proposal_crm_reconciliation.sql` accounted for the existing proposal CRM trigger.
- Live form testing showed direct proposal insertion still conflicted with the trigger/RLS path. Migration `0028_public_proposal_submission_rpc.sql` removed direct public table insertion and added validated `submit_public_proposal(jsonb)`, which forces `submitted` / `new_inquiry` / `pending` and preserves the trusted CRM reconciliation trigger.
- `src/pages/AIProposal.tsx` now uses that entry point.
- Anonymous valid RPC submission returned 200 with ID `15271a10-5afa-4452-a5ca-0ffdacfa59c3`; invalid input returned 400 `invalid_proposal_submission`; direct table insertion returned 401. The test row was deleted.
- Public partner application accepted a valid row; injected `status=approved` and `user_id` returned 401/RLS rejection. Test rows were deleted.
- All 29 persisted database findings were marked fixed after live policy read-back; the basic security scan then reported no issues. Deep endpoint findings are a separate inventory and were not claimed fixed here.

## Approved test-data cleanup

- Nine May Neon Candy `email_queue` rows were changed from `pending` to `cancelled`, preserving history and marking them never sent.
- Removed labelled test rows from collections, reconciliation, shop/ecommerce and marketplace/seller sample graphs.
- Read-back: 0 pending emails, 0 overdue/failed collections rows, 0 reconciliation exceptions/records, 0 shop products, 0 marketplace profiles/listings.
- No Kindnesss contact, real customer, invoice or payment records were targeted.

## Manual library

- Added `Liftor / Kindnesss live operating reconciliation — 17 November 2026` to `manual_pages`.
- Prepended a dated current-state pointer to all 131 earlier pages without removing their original content; incremented their versions.
- Read-back: 132 total pages, 1 new current addendum, 131 pages with the current pointer.
- Added manual version 4 and append-only build-log entry `Manual library refresh — 17 November 2026`.

## Kindnesss readiness (then paused by founder)

- 180 active GSM mailboxes: health 93–100, all `campaign_ready` under the founder-approved 90+ rule, latest registry provider check 17 Nov 2026 at 12:32 UTC.
- Exact draft-campaign senders confirmed: GSM Partnerships and GSM Connect, health 100 and 96, SMTP/IMAP OK and Smartlead connected.
- Smartlead campaign 4103531 snapshot at 15:30 UTC: DRAFTED, six leads, zero sent/replies/bounces/unsubscribes.
- 30 Kindnesss contact relationships: 30 verified email addresses, 0 campaign eligible, 0 sendable, 0 compliance approved; three provisional lawful-basis notes only.
- `SMARTLEAD_WEBHOOK_SECRET` absent from secure inventory; zero Smartlead activity events. The secure-secret request was cancelled and nothing saved. No recipient was shortlisted or cleared.
- All 19 external action gates remain OFF. No emails sent, no providers activated, no paid Apollo calls.

## Add-company interworking audit

See `.lovable/reviews/company-data-flow.md` for the source-referenced 14-area map. Conclusion: one database, but not one seamless onboarding system. Creation, module promotion, Factory, launch apply and runtime activation are separate operations; several handoffs are manual, fallback-only or stale on re-promotion.

## Verification

- `bunx vitest run src/test/remainingDatabaseAccessRules.test.ts src/lib/__tests__/founderAreas.test.ts`: 14/14 passed.
- Latest preview build log: build OK.
- No external send, publish, provider mutation or gate activation performed.
