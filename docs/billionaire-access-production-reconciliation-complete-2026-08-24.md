# Billionaire access production reconciliation complete — 2026-08-24

## Outcome

The completed 2026 billionaire access research set is live in the Liftor production database.

- Canonical source: GitHub migration files under `supabase/migrations/`
- Production backend: Lovable Cloud managed Postgres
- Production table: `public.billionaire_access_research_2026`
- Production summary view: `public.billionaire_access_research_2026_summary`
- Source rows loaded: **3,428**
- Source row range: **1–3,428**
- Missing source rows: **0**
- Duplicate source rows: **0**
- Institutional routes missing: **0**
- Outreach enabled: **0**

The historical 2,754-person production universe was preserved. The reconciliation is additive and does not delete or overwrite that historical table.

## Production identity reconciliation

| Result | Rows |
|---|---:|
| Stored 2026 snapshot linked | 3,404 |
| Historical billionaire ID linked / matched | 2,584 |
| New 2026 names | 818 |
| Ambiguous | 2 |
| Manual review | 3 |
| Missing stored snapshot | 21 |

The 26 ambiguous, manual-review, or missing-snapshot rows remain explicit rather than being forced into unsafe matches.

## Verification status totals

| Verification status | Rows |
|---|---:|
| `verified_public_institutional` | 2,217 |
| `verified_institutional_restricted` | 933 |
| `verified_institutional_source_age_warning` | 74 |
| `verified_institutional_switchboard_or_postal` | 18 |
| `legal_compliance_block` | 60 |
| `deceased_remove_from_active_outreach` | 3 |
| `enhanced_compliance_review` | 123 |
| **Total** | **3,428** |

## Security and access

- `outreach_allowed` is false for every production row.
- Row-level security is enabled on the table.
- The management policy is restricted to authenticated founder or admin roles.
- The summary view uses `security_invoker=true`.
- No anonymous table grant is present.
- No outreach or sending was performed.

## Deployment note

Liftor uses Lovable Cloud's built-in Supabase-based backend, not an externally owned Supabase project visible in the connected Supabase dashboard. The reviewed SQL remained controlled in GitHub and was applied directly to the existing Liftor Cloud database. No Lovable AI build prompt was used for this production load.
