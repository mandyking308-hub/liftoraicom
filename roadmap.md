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
