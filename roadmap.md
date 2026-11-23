# Roadmap

## Kindness Habits private feed — 17 Nov 2026
- [x] Connect Liftor to the read-only Kindness Habits summary feed with founder/admin authentication and the saved private key.
- [x] Show validated sign-up totals and freshness on Liftor HQ and the Kindnesss business page; never import child personal data.
- [x] Test refusal, schema/privacy validation, live read-only retrieval and dashboard display; commit the verified changes.

## Founder-approved next steps (17 Nov 2026)
- [x] Tighten the seven remaining loose database access rules without breaking public proposal/partner forms or founder operations.
- [x] Clear only the approved stale/test records: nine pending May emails, eight reconciliation mismatches, and sample collections, shop and marketplace rows.
- [x] Refresh the 131 manual pages against current Liftor behaviour while preserving historical versions and the append-only build log.
- [ ] PAUSED BY FOUNDER: Kindnesss webhook signing key and recipient shortlist; mailbox freshness and sender details verified, no sending or gate changes.
- [x] Trace the add-company journey across all 14 sections; identify which pages share canonical data, which require separate setup, and any broken handoffs.
- [x] Build one canonical internal add-company orchestration with native records across all 14 sections, idempotent synchronisation, per-section status and external actions still off; verified with 27 tests and signed-in UI without running it against a real company.
- [x] Run focused tests and live read-only verification, update truthful evidence, and commit the completed changes.

## Unified inbound portfolio communications — Phase 1 (16 Nov 2026)
- [x] Add a founder-only unified inbox over existing communications data, with truthful source health, quarantine and diagnostics.
- [x] Add source-only, disabled-by-default deterministic Smartlead and Kindnesss fan-in candidates with pending schema.
- [x] Add review-only replies, sender selection, privacy isolation and internal reply/opt-out follow-up blockers.
- [x] Add isolated isolation/concurrency/retry/safety tests; run focused and existing checks without live writes or deployment.
- [x] Record exact evidence, activation prerequisites and remaining controls; commit the completed source changes.
- [x] Correct the review-only sender-evidence trigger/finaliser contradiction and add its write-once regression contract.
- [x] Document the Smartlead Standard Webhooks mismatch with a fail-closed synthetic fixture and signed-test activation blocker.

## Unified inbound durable integration — source and disposable tests (16 Nov 2026)
- [x] Validate and correct the candidate schema against actual Liftor definitions using disposable PostgreSQL, including RLS and concurrency.
- [x] Implement disabled-by-default Kindnesss and Smartlead durable receiver adapters with explicit signed protocol handling.
- [x] Add real sender-to-receiver synthetic integration tests, persistence/recovery, tenant isolation and no-send contracts.
- [x] Run focused/full tests, lint and automatic build; record BUILT / SOURCE TESTED / QA TESTED / LIVE VERIFIED evidence and commit.

## KND-003 privacy metadata handoff — source and isolated tests (16 Nov 2026)
- [x] Match the exact Kindnesss privacy sender signature and ten-field metadata contract in a separate default-off receiver.
- [x] Add review-only founder-only delivery/workstream SQL and a reference-only Communications Centre privacy lane.
- [x] Prove signed delivery, validation, dedupe, retries, isolation, RLS and no-send/no-PII behavior with disposable tests.
- [x] Run full verification, record BUILT / SOURCE TESTED / HOSTED QA / LIVE VERIFIED evidence, and commit without activation.
- [x] Separate privacy cases from the sales inbox into a dedicated founder/admin operations queue.
- [x] Add review-only operator ownership, acknowledgement, triage, due-alert and Kindnesss-only authority controls.
- [x] Run synthetic UI, full-suite and disposable PostgreSQL verification; refresh evidence and commit without activation.

## Kindnesss Apollo retention
- [x] Verify existing retention and provenance; keep paid enrichment and waterfall off.
- [x] Add founder-only idempotent CSV retention and complete audited download using existing tables.
- [x] Test live readback and document external Apollo CSV reconciliation/completeness limits.
- [ ] Import external Apollo exports: waiting for the founder’s 1,893-list and 1,250-contact CSV files.

## Private school admissions — 21 Oct 2026
- [x] Add founder-only admissions tracker and top-level Schools navigation using existing school records.
- [x] Verify preservation, booking semantics, urgency sorting, filters and guarded access; leave unpublished.

## Controlled founder sales journey — 21 Oct 2026
- [x] Audit genuine Smartlead send/reply and Kindnesss Dodo sandbox paths without mutations.
- [x] Implement and run isolated offline journey contracts and negative tests.
- [x] Record stage evidence, no-send decision, unchanged gates and executable blockers.
- [ ] Live founder journey: blocked by missing isolated Smartlead sender/reply proof, approved Kindnesss offer and Dodo sandbox adapter/webhook; real school onboarding also waits on independent release clearance.

## Done — CRM-Native Education Correction (10 Sep 2026)
- [x] `organisations` = canonical education account spine (additive education/source fields, safe partial uniqueness)
- [x] `contacts.organisation_id` FK + minimal education mapping/scoring/reveal fields (keep `company` text)
- [x] `apollo-education-account-import`: upsert CRM organisations first, then link `strategic_target_accounts.existing_organisation_id`
- [x] `apollo-education-discovery`: People Search only; writes non-sendable CRM contacts linked to organisation_id
- [x] Founder-controlled selected education reveal on CRM contact IDs (structurally complete, locked at limit 0)
- [x] Apollo status UI counts become CRM-native
- [x] Manuals updated; Stage-4 RI-placement wording marked superseded
- [x] Tests, type-check, build; additive migration + deploy changed functions; read-only health checks

## Waiting on you
- Controlled load of the 152 education companies (not run; importer stays dry-run until you confirm).

## Notes
- `docs/education-crm-native-correction-2026-09-10.md` is not present in this workspace; building to the
  nine numbered requirements supplied in chat instead.

## Done — Stage 4 (Apollo Education Infrastructure)
- Portfolio Apollo Credit Firewall (policy, reservations, paid attempts, atomic RPCs) — paid enrichment
  disabled, hard limit 0, phone/personal/waterfall false
- All three paid Apollo paths route through the firewall; bulk→single double-spend eliminated
- Education account importer + free-search discovery orchestrator (dry-run default)
- Deterministic campaign-neutral education role scorer
- Founder read-only firewall panel; 54 new safety tests

## GSM estate reconciliation (requested 14 Sep 2026)
- [ ] Reconcile 9 active Winnr GSM domains + 45 existing mailboxes into Liftor via deployed gsm-winnr-sync (metadata only, estate_classification='gsm')
- [ ] Report gsmhq.net provider-side shortfall (5 mailboxes missing); do not create mailboxes
- [ ] Verify GSM domain/mailbox/warmup counts; confirm GHAT still 1 domain / 10 mailboxes untouched
- [ ] Publish frontend GHAT/GSM outbound pages if source parity is safe, else report blocker

## Documentation-only full-repository manual mirror (17 Sep 2026)
- [x] Liftor Rebuild Manual sections A–U written to docs/liftor-rebuild/
- [x] Generated catalogs: routes, pages, components/engines, migrations, edge functions, coverage manifest
- [x] Contradictions resolved / relabelled historical in the three in-app manuals
- [x] Standalone Giving Rail platform documented and separated from Liftor core + GHAT
- [ ] Truth labels (BUILT_IN_CODE / LIVE_CONFIGURED / END_TO_END_PROVED / BLOCKED / FAIL_CLOSED / PARTIAL /
      DEAD_OR_UNREACHABLE / HISTORICAL_ONLY / UNKNOWN) applied across coverage matrices
- [x] Knowledge Base: add 'Education' category (KnowledgeDirectory/KnowledgeDetail)

- [x] Founder-only School Visit Assessments workspace (/founder/school-visits)

- [x] Founder-only lossless Apollo contact intelligence archive (75 columns, chunked idempotent import, readiness separate from sending)
- [ ] Founder uploads the real 7,046-row Apollo CSV via /founder/outreach/apollo (blocked: needs founder upload)
- [x] Kindnesss five-touch draft (Days 0/7/14/21/28), four-touch kept as backup, no remote sync
- [x] Founder-only archive-to-CRM promotion dry-run (counts only, no contact creation)
- [ ] Reversible archive-to-CRM promotion action (blocked: founder review of dry-run counts + lawful basis decision)
- [ ] Deploy 5-step sequence tool + remote read-back (blocked: founder approval of five-touch copy)
- [x] Founder email-audience counts + full deduped candidate export (not limited to eligible_for_review)
- [ ] Send all eligible prospects over time (blocked: founder to supply real Kindnesss sender mailboxes; legal basis per contact; webhook signing key)
- [x] Add confirmed postal address to 4 Kindnesss footers
- [x] Explain legacy dashboards
- [x] Full Liftor capability map (all ~200 founder pages) before designing one dashboard
- [x] Lock founder area + fix 22 open data rules (founder/admin only)
- [x] Review areas one by one (founder picks which pages to keep; the rest hidden, not deleted): 1 Daily running, 2 Radars & prospecting, 3 Sales, 4 Email outreach, 5 Social media (both kept), 6 Marketing (all three kept), 7 Customers (success, support, delivery, portals kept; scheduling and trust-safety hidden)
- [x] Verified hidden Customers pages still open at /founder/scheduling and /founder/trust-safety with no runtime errors (23 Nov 2026)
- [x] Verified all 58 pages left in the founder menu load signed-in with real content and no runtime errors (23 Nov 2026)
- [ ] Review areas 8 Money onwards, one section at a time with the founder choosing
- [ ] Tracking disclosure: open/click tracking is ON for pilot campaign 4103531 and the email copy does not disclose it — founder to switch tracking off, update the privacy notice, or add disclosure before the 24 Nov 10:00 education start
- [ ] Signed-in founders landing on / see the public marketing page; founder to decide whether to go straight to Liftor HQ
- [ ] Lock ~30 open backend functions flagged by deep scan (e.g. founder-copilot, apollo-daily-runner, crm-send-check)
- [ ] Single founder-only login; remove public login links; publish
