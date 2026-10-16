# GIAS establishment search — schema and import procedure (16 Oct 2026)

Status: schema + search + founder UI implemented. **Data populated (16 Oct 2026)** by a separate database operator, batch `5bf59621-3bdb-4b0c-81a0-3b2b557490b3` = `applied`.

## Live population — independently verified by read-only DB query (not browser E2E), 16 Oct 2026
| Check | Result |
|---|---|
| Total rows / distinct URNs | 52,591 / 52,591 |
| Open | 27,158 |
| Open + group "Independent schools" | 1,573 |
| fact_verification_status other than gias_sourced_not_school_confirmed | 0 |
| RLS read policy | founder/admin, authenticated role only |

Source registry `10eb00f4-…` stays internal (customer_visible=false, agent_visible=false). Historical note: the earlier "0 rows imported / ingest blocked" status was accurate before this batch and is superseded, not deleted.

## UI (founder only)
- Nav: "School Register (GIAS)" under Opportunity → `/founder/gias-search` (FounderRoute guard).
- Group filter (e.g. "Independent schools" + status "Open" = 1,573): direct RLS-bound read of `gias_establishments`, allowlisted groups, page size ≤100. Existing `gias_search` RPC unchanged; no migration.
- Limitation: signed-in founder browser check of the page was not run in this change; verification is DB counts + offline tests.

## Scope and provenance
- Source registry row: `knowledge_source_registry` `10eb00f4-453f-4f93-baa3-98e288e7b6ea` (approval_status left `unreviewed`, unchanged).
- Founder statement "licensed and verified" is recorded as founder sign-off to use official DfE GIAS bulk data. It is NOT independent verification of each school fact.
- Every row: `fact_verification_status = gias_sourced_not_school_confirmed`; `snapshot_date_basis = inferred_from_filename` unless an independent timestamp is supplied.
- No third-party terms invented. Institutional public fields only: no people, contacts, emails, leads, CRM links, children or family data.

## Tables (public schema, RLS on, founder/admin only, no anon grants)
| Table | Purpose |
|---|---|
| `gias_establishments` | Live store. Unique `(source_registry_id, urn)`. Website must be http(s). Trigram indexes on name/town/postcode; btree on URN and filters. Read-only to founder/admin; written only via `gias_apply_batch`. |
| `gias_import_batches` | One per file: filename, sha256 (unique per source), expected row count, reconciliation counters, status, block reasons. |
| `gias_import_staging` | Raw rows for a batch with per-row validation results. |
| `gias_import_changes` | Per-batch insert/update log with prior row, used for rollback. |
| `gias_source_decisions` | Founder sign-off records. |

## Functions (EXECUTE revoked from anon)
- `gias_validate_batch(batch)` — trims, validates URN (5–7 digits) and name, sanitises website, flags in-file duplicate URNs, reconciles staged vs expected count. Any mismatch → `blocked`.
- `gias_apply_batch(batch)` — validated only; atomic upsert; unchanged rows (same hash) skipped; re-apply refused.
- `gias_rollback_batch(batch)` — latest applied batch only; deletes its inserts, restores prior rows.
- `gias_search(q, status, phase, type, county, page, page_size)` — RLS-bound, page size capped at 100.

## Import procedure (founder/admin session)
1. `sha256sum file.csv`; `wc -l` minus header = expected count.
2. `insert into gias_import_batches (source_registry_id, source_filename, source_snapshot_date, file_sha256, expected_row_count, created_by) values ('10eb00f4-…', '<file>', '<date from filename>', '<sha>', <n>, auth.uid()) returning id;` (same sha twice is rejected → idempotent).
3. Load rows into `gias_import_staging` (batch_id, row_number, urn, establishment_name, establishment_status, establishment_group, establishment_type, phase, locality, town, county, postcode, country_label, website) in chunks of ≤5,000; a failed chunk can be deleted by `row_number` range and retried.
4. `select * from gias_validate_batch('<id>');` — must return `validated`; otherwise read `block_reasons`, fix the file, start a new batch.
5. `select * from gias_apply_batch('<id>');` — check inserted + updated + unchanged = valid_rows = expected.
6. Confirm: `select count(*), count(*) filter (where establishment_status='Open') from gias_establishments;` Expected for the archived file: 52,591 total, 27,158 Open (and 1,573 "Open Independent" by the file's own definition) — only claim after this count.
7. Undo if needed: `select * from gias_rollback_batch('<id>');`

## Not done / still OFF
No CRM mapping, no outreach, all 19 external-action gates OFF, no publish.
