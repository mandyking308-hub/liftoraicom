# Apollo Education Universe Recovery — 2026-08-24

## What happened
Education buyer research enriched through Apollo was not durably mirrored into Liftor.
Only 110 Education contacts survived in `public.relationship_intelligence_contacts`.

## What was rebuilt
Reconstructed the Global Education buyer universe using Apollo **FREE People Search**
(`POST /api/v1/mixed_people/api_search`) only. No `people/match`, no bulk enrichment,
no phone reveal — **zero lead credits consumed** (balance is 0 until 1 Sep 2026).

Final production state (`relationship_type = 'school_education_contact'`):

| Metric | Count |
| --- | --- |
| Total Education rows | 2,520 |
| Verified-email rows (send-ready candidates) | 110 |
| Reveal-required recovery candidates | 1,424 |
| No email on file at Apollo | 986 |
| Distinct organisations | 266 |
| Distinct Apollo person IDs | 2,441 |
| Duplicate Apollo IDs | 0 |
| Duplicate name+organisation pairs | 0 |
| Held at `do_not_contact_yet` | 2,519 |

Apollo's credit-free search masks surnames (`Pr***e`). Masked forms are stored
verbatim — no hidden characters were invented.

## Data safety rules enforced
- Verified emails are never overwritten with masked/null data.
- Dedupe order: Apollo person ID → normalised name+organisation → masked-surname
  match against pre-existing verified rows (so recovery cannot clone the original 110).
- All recovered rows: `outreach_status = 'do_not_contact_yet'`,
  tags `education_customer_universe`, `apollo_recovery_candidate`, `founder_only`,
  `portfolio_relationship_lock`, plus `email_reveal_required` where `has_email=true`.
- `next_action`: reveal/verify email only for selected active outreach after credits
  reset — no blanket re-enrichment.
- No outreach was queued or sent.

## Durable fix (the data-loss cannot recur)
- `supabase/functions/_shared/apolloRelationshipUpsert.ts` — reusable server-side
  upsert. **Invariant: an Apollo result is not complete until this upsert succeeds.**
  Any Apollo workflow must mirror people through it before the next batch.
- `supabase/functions/apollo-education-recovery/index.ts` — admin-safe Apollo
  Education sync/recovery runner (org + title + seniority driven, paged, resumable,
  idempotent, `probe` mode for contract checks).
- Schema: `apollo_person_id` (unique where not null), `email_status`,
  `email_status_reason`, `next_action`, `last_synced_at`, `role_or_title`
  on `relationship_intelligence_contacts`.

## Remaining
Emails for the 1,424 reveal-required records require Apollo enrichment credits
(available 1 Sep 2026) and should be revealed per-campaign, not in bulk.
