# Kindnesss 101-action register imported into Liftor — 16 Nov 2026 (L-12/L-13, internal only)

**Source:** `docs/import/kindnesss-101-action-manifest-2026-11-16.json`
- Commit `33c33ac1fe8f296c6ce1130b0ed627add9cee75e`
- SHA-256 `69d435a20c91cf6d7cad3e802672e672dd8505759b1b4ed64cf0a95261ac17bd`
- Size 91,125 bytes; 101 unique IDs: KND 15, J 26, L 18, O 26, C 10, F 6

**Target:** `public.master_work_items`, active Kindnesss `640de582-a112-4d16-a221-03c27f00c6ec` only.
- Before the import, `product_bugs` and `product_roadmap_items` had no unique source key. `work_item_evidence` does not exist.
- `master_work_items` has `UNIQUE(source_module, source_table, source_record_id)` and no triggers, so the import has no side effects.

**Identity key:** (`kindnesss_101_register`, `kindnesss-2026-11-16`, `<action ID>`), also stored as `audit_metadata.identity_key = kindnesss-2026-11-16:<ID>`. Rows are never matched by title.

**Import script:** `supabase/pending/kindnesss-101-register-import-2026-11-16.sql`. It uses `ON CONFLICT DO NOTHING`.

## Field mapping
- The full original record is kept verbatim in `audit_metadata.original`: task, close_when, priority, gate, owner, status_at_2026_11_16, dependencies, evidence and source.
- `status`:
  - `new` for every item outside group F, with the 16 Nov baseline kept in `audit_metadata`.
  - `parked` for F01..F06, flagged `deferred_future=true`. These are not pilot blockers.
  - **0 rows marked completed.**
- `priority`: mapped to the allowed values (gates/P1 → high, P3/Future → low, else normal). The exact original is preserved.
- `owner_type=founder`, `approval_required=true`, `internal_planning_only=true`, `external_actions_authorised=false`.
- `verification_level`: "source-tested (evidence reference only; live release gate open)" for the 41 KND/J items that carry evidence, and "not verified" for all others.

## Process and counts
| Step | Result |
|---|---|
| Before: Kindnesss rows (active / legacy) | 0 / 0 (table total 29) |
| Synthetic test: 2 rows + duplicate inside BEGIN…ROLLBACK | 2 inserted, duplicate ignored, 0 after rollback |
| Import run 1 | INSERT 101 |
| Import run 2 (idempotency check) | INSERT 0 |
| After: rows / distinct keys / duplicates | 101 / 101 / 0 |
| Groups | KND 15, J 26, L 18, O 26, C 10, F 6 (parked) |
| Rows on legacy `993b9b12…` or any other business (including GHAT) | 0 |
| Table total | 130 (29 + 101) |

## BUILT / TESTED / LIVE
- LIVE: 101 internal planning rows exist in the production database for active Kindnesss (verified by read-back).
- No external sends, campaigns, provider calls, publishing, gate changes, business identity edits, or customer/child data.
- Not done: no Liftor UI change was made to show these rows; existing work-item views may display them.
- Re-running the script inserts nothing. A changed manifest needs a new reviewed update, because existing rows are never overwritten.
