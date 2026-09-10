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

## Done — Chat 3 (Education Commercial Layer, 10 Sep 2026)
- Four canonical education businesses reconciled (Billy preserved; Aurelia, Kindnesss, Kingsbridge Global
  created idempotently). Neon Candy untouched.
- Deterministic per-business relevance engine on `business_contact_relationships` (no duplicate contacts),
  separate from the Apollo role score.
- Portfolio ownership/collision: one active owner, reply/suppression/unsubscribe/DNC/bounce hard blocks,
  30-day cross-brand cooldown, audited founder override.
- Four non-live campaign shells in `outreach_campaign_drafts` (external send blocked, unapproved, unmapped).
- Reusable outreach eligibility gate (TS + read-only `education-outreach-eligibility` function, deployed).
- `education_commercial_funnel` view + founder page `/founder/education-commercial`.
- 12 business manuals in `docs/business-manuals/` rendered in-app at `/founder/business-manuals` via raw imports.
- Manuals reconciled: Technical Section 102, User Manual Section 112, Slim Mandy v1.5.
- 41 focused tests; full suite 535/535; typecheck + build green.

## Waiting on you (Chat 3)
- Assigning education contacts to brands (needs the 152-company load from Chat 1).
- Billy's controlled 25–50 launch (needs Chat 2 mailbox/Smartlead readiness plus founder approval).
