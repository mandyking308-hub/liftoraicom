# Operator handoff — Kindnesss commercial enquiry → Liftor (14 Oct 2026)

Status: SOURCE + OFFLINE TESTS ONLY. Receiver OFF. Not live. Kindnesss project not modified.

## Built in Liftor
- `src/lib/inbound/kindnesssEnquiryHandoff.ts` — pure decision core: HMAC-SHA256 over `${timestamp}.${rawBody}`, ±300s replay window, source→business allowlist (`kindnesss` → `640de582-a112-4d16-a221-03c27f00c6ec`, no fallback), strict field allowlist, child/parent/pupil/class/family/Kindness Passport key + text rejection, exact idempotency key `inbound:kindnesss:<business_id>:<event_id>`, exact normalised-email contact/BCR match within business only, unmatched/ambiguous → founder quarantine, `autoSend: false` always, sender retry/dead-letter policy.
- `src/lib/__tests__/kindnesssEnquiryHandoff.test.ts` — 11 offline contract tests.
- `docs/architecture/kindnesss-enquiry-handoff-candidate.sql.md` — review-only table/RLS candidate.

## Kindnesss outbox change needed later (do NOT do now)
1. Keep `submit_commercial_enquiry` writing `commercial_enquiries` first; success to the visitor must never depend on Liftor.
2. In the same transaction, insert an `enquiry_outbox` row (event_id uuid, enquiry_id, payload JSON with ONLY allowlisted fields, attempts, next_attempt_at, status, last_status).
3. A server-side worker (never the browser) signs and POSTs to the Liftor receiver with headers `X-Liftor-Source: kindnesss`, `X-Liftor-Timestamp`, `X-Liftor-Signature: sha256=<hex>`; same event_id on every retry.
4. Retry: 2xx done; 4xx (except 408/429) dead-letter; else backoff 30s·2^n up to 1h, max 6 attempts, then dead-letter for admin review.
5. Never include child, parent, pupil, class, family or Kindness Passport data.

## Secrets / settings needed later
- Liftor: `KINDNESSS_HANDOFF_SIGNING_SECRET`, `KINDNESSS_HANDOFF_RECEIVER_ENABLED=true` (only at activation).
- Kindnesss: same signing secret + receiver URL, stored as server-side secrets only.

## Minimum enable steps after approval
1. Founder reviews/approves candidate SQL; apply migration.
2. Create receiver edge function wrapping `decideHandoff` (durable insert first, unique key, service role writes, CORS not needed).
3. Add secrets; keep flag off; sandbox test with a synthetic enquiry: valid, bad signature, replay, wrong business, duplicate, forbidden field — confirm rows/quarantine and no sends.
4. Implement Kindnesss outbox (separate approved Kindnesss task); verify outage-then-retry delivery.
5. Turn flag on. Verify one real enquiry end-to-end before claiming live.

## First-pilot Smartlead status (read-only, 14 Oct 10:40 UTC snapshot)
- Campaign 4103531: DRAFTED, 6 leads not started, 0 sent/replies/bounces, cap 3/day, open/click tracking off.
- Senders 24265073 gsm.connect@gsmlabs.co and 24265132 gsm.partnerships@globalsolutionsmanagementhub.com: SMTP/IMAP ok, 50/day, 0 sent today.
- Kindnesss contacts: 30 total, 0 campaign-eligible.
- All 19 external action gates OFF.
- Sequence loaded 13 Oct used 13 Oct-specific gaps (6,4,6,6). **That date is expired**; gaps must be recomputed for the actual launch date (four business days apart) before any launch.

## Go/no-go blockers (unsatisfied)
- Sender warm-up/readiness unverified (warm-up previously off; 0 mailboxes campaign_ready).
- 0 eligible contacts; 27 lack lawful basis, 3 provisional.
- Campaign holds 6 stale leads vs. intended 30-contact plan; no lead changes made.
- Signature + rendered unsubscribe not verified by a real test send.
- Smartlead webhook signing secret not provisioned; receiver disabled.
- Sequence schedule tied to expired 13 Oct start.
- Copy loaded but not launch-authorised in Liftor.
- Inbound handoff: migration not applied, receiver not built, secrets not set, Kindnesss outbox not built.
