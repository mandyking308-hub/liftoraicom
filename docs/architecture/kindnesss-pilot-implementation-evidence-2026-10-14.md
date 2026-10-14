# Kindnesss → Liftor: implementation evidence (14 Oct 2026)

Start HEAD verified: `5597b4c8`. For GitHub issue #45 (paste as comment; no GitHub access from this workspace).
NOT a launch. No deploy, no hosted writes/migrations, no provider calls, no sends.

## Built (source + offline tests)
- `supabase/functions/_shared/kindnesssEnquiryHandoff.ts` — auth/validation core (moved from src/lib; `src/lib/inbound/kindnesssEnquiryHandoff.ts` re-exports). New `authenticateAndValidate`.
- `supabase/functions/_shared/kindnesssEnquiryReceiver.ts` — runtime handler: raw-bytes HMAC + timestamp, allowlist, child/private rejection, **atomic unique claim** (replaces race-prone exists pre-check), business-scoped contact lookup, quarantine, durable failed→reclaim retry, dead-letter after 6, audit, never sends. **No entrypoint deployed.**
- `src/lib/kindnesss/outboundEligibility.ts` — deterministic bulk classifier (country policy config, fail-closed), 4-working-day schedule (13 Oct refused), copy token/thread check, stop rules, 30-lead preflight.
- `docs/architecture/kindnesss-enquiry-handoff-candidate.sql.md` — review-only table + atomic claim RPC.

## Tests
- 3 new files, 34 tests pass; full suite 78 files / 940 tests pass; TypeScript clean.

## Live read-only facts (14 Oct 10:40–10:54 UTC)
- Campaign 4103531 DRAFTED, 6 preloaded leads (not deleted), 0 sent, cap 3/day.
- Senders 24265073 / 24265132: SMTP/IMAP ok, 50/day, Liftor readiness `warming`, last provider check 8 Oct.
- 30 contacts: 0 eligible. 27 no lawful basis, 3 provisional. Countries: UK 12, UAE 5, HK 4, Spain 2, Malaysia 2, US/Argentina/Mexico/Brazil/Pakistan/Egypt/Lebanon/Iraq 1 each.
- Under current country policy only UK (12) and US (1) could pass once a final basis is recorded; Spain needs consent; 15 contacts are in countries with no policy entry yet (fail closed).
- All 19 external action gates OFF.

## Preflight result: NO-GO
eligible_0_of_30; both senders not campaign_ready; 6 preloaded leads to reconcile; start/lead-push gates off; webhook signing unverified; copy not launch-approved; signature/unsubscribe render untested; no actual start date.

## Blockers by owner
- USER/legal: record final lawful basis per contact; approve country policy (add UAE, HK, MY, etc. or exclude); approve copy; choose real start date.
- Supplier (Winnr/Smartlead): confirm warm-up and campaign readiness of the two senders; provision webhook signing secret.
- Approval-gated engineering: apply candidate SQL; add receiver entrypoint; set secret + flag; Kindnesss outbox (separate Kindnesss task after its B02/B03, C03, Dodo, C13 holds clear).

## Controls still OFF
Receiver (no entrypoint, flag unset, no secret, no table), all 19 gates, Smartlead webhook receiver, warm-up unchanged, cap 3/day, no leads added/removed.
