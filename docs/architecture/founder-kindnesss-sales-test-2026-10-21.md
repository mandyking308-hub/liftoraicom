# Controlled founder-as-customer sales test — 21 October 2026

## Outcome: NOT SENT; live end-to-end test BLOCKED

Only the requesting founder is authorized as the future test recipient. No recipient
was enrolled, no email was sent, no purchase was fabricated, and no CRM sale was
marked won. This is an offline safety-contract rehearsal, not a successful customer journey.

Starting repository SHA: `02d7457d9c4abebefcfca9f08c7592b155510b09`.
The final revision is managed automatically by Lovable; obtain it after this change is saved.

## Read-only evidence (21 October, approximately 06:50–06:53 UTC)

- Live database: 19 external gates, zero enabled; 30 Kindnesss relationships,
  zero campaign-eligible; zero Kindnesss sales offers, approved offers or checkout intents.
- Campaign snapshot at 06:50:08 UTC: campaign 4103531 DRAFTED, six leads,
  zero sent/replies, 3/day. Direct Smartlead GET independently returned DRAFTED,
  3/day and `REPLY_TO_AN_EMAIL` stop setting.
- Direct GET of campaign email accounts: existing sender IDs 24265073 and
  24265132 each have SMTP/IMAP true. Warm-up status was absent in that response;
  no readiness or deliverability claim follows from those booleans.
- Zero Liftor lead mappings and zero captured activity events for this campaign.
- Secret registry reports `SMARTLEAD_WEBHOOK_SECRET` absent (its last verification
  is historical, 15 May); no receiver deployment attestation returned. This is
  not a fresh inspection of secret values or proof of current receiver operation.
- Existing connection row says connected/healthy, last tested 13 October.
  `webhook_configured=true` does not establish signed event acceptance.

No diagnostic function was invoked: the existing “read-only” connection test writes
provider metadata, and the send dry-run writes an audit row. Direct provider GETs
and database SELECTs avoided those mutations.

## Stage results

| Stage | Real result | Offline result |
|---|---|---|
| GSM/Smartlead introductory email | BLOCKED / NOT SENT: no isolated one-founder sender | Envelope/allowlist/approval/suppression negatives PASS |
| Founder's natural reply | WAITING: no initial email; no invented reply | Exact fixture sender/thread/tenant and replay tests PASS |
| AI reply draft / Liftor reply | BLOCKED pending real scoped reply and draft review | Existing escalation and chase-stop rules PASS; no AI invocation or sent draft |
| Institutional quote/offer | BLOCKED: zero approved Kindnesss offers | Existing approved-offer resolver reused; missing offer fails closed |
| Dodo sandbox checkout | BLOCKED: no Liftor Dodo adapter found | No checkout fabricated; Stripe is not Dodo evidence |
| Verified payment / CRM won | BLOCKED: no authentic Dodo sandbox webhook | Harness always reports unpaid/unwon; existing Stripe contracts separately tested |
| Receipt/onboarding | BLOCKED: no verified payment, school release HOLD unresolved | Activation keys are planning output only; no execution |

## Source implementation and tests

- `src/lib/kindnesss/founderSalesJourneyContract.ts`: offline-only envelope,
  scoped reply/thread contract, duplicate reply rejection, stable test keys,
  existing escalation/stop/offer helpers and explicit seven-stage blocked report.
- `src/lib/__tests__/founderSalesJourneyContract.test.ts`: 38 tests. Synthetic
  `.test` address and fixture reply IDs; no private family/school records or actual replies.
- `AGENTS.md`: fixture success must not authorize sending or represent a paid sale.
- `roadmap.md`: scoped task completion and outstanding live prerequisites.

Focused run: six files, 110 tests PASS (38 new plus 72 existing), 06:52 UTC.
Focused ESLint PASS. Initial automatic compilation caught a discriminated-union
narrowing error; corrected using explicit `ok === false`. Final automatic compilation
and full-suite results are reported separately after verification.

## Next executable prerequisites (not launch authorization)

1. Implement/review an authenticated server-side Smartlead single-message test
   adapter with the exact founder allowlist, one atomic claim per test ID, provider
   message read-back, same-business suppression and sender checks. It must not
   activate campaign 4103531 or enroll its six existing/30 intended prospects.
   No arbitrary send API was invented or called today.
2. Prove durable, signed or securely polled **test-thread** reply ingestion with
   exact sender/business/thread identity and stop-on-reply before enabling that adapter.
   Existing campaign-scoped polling is not evidence for an unrelated test thread.
3. Record an actual approved Kindnesss institutional offer and configure a Liftor
   Dodo sandbox adapter plus authentic signature-verified, replay-safe payment
   ingestion. Revalidate business/contact/offer/product/amount/currency binding;
   a browser success return can never establish paid/won. Do not substitute the
   earlier Wild Forest payment or the existing Stripe integration.
4. Only then send one clearly labelled `INTERNAL SALES JOURNEY TEST` email with
   an actual traceable test ID and working GSM reply-to. Founder replies herself;
   generate a draft for her review, never auto-send. Continue through no-charge
   sandbox payment, verified webhook, isolated CRM and receipt tests.
5. Real school account onboarding, child data and school payments remain held
   until the independently managed Kindnesss permission/release checks pass.

No hosted row/schema writes, secret changes, migrations, deployment, publication,
new campaign/mailbox/provider, Gmail sends, real charges or Kindnesss app edits occurred.
All general gates remain OFF; campaign remains DRAFTED.