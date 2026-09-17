# Roadmap

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
