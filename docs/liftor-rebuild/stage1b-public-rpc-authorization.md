# Stage 1B — Public RPC authorization hardening

Status: **The 18-signature live reconciliation is complete. The migration remains unapplied to production.** Worker 1 repaired the import authorization and contact-upsert paths and uses an exact-signature gate with a runtime rollback snapshot.

## Live catalog reconciliation

Authoritative read-only catalog evidence was captured through the Liftor Lovable cloud database on 2026-09-24. The query returned exactly **18** postgres-owned `public` functions with effective `anon EXECUTE`. For all 18, the live owner is `postgres`, `SECURITY DEFINER` is true, configured `search_path` is `public`, `anon EXECUTE` and `authenticated EXECUTE` are true, and direct `PUBLIC EXECUTE` is false. The exact raw ACL on each is `{postgres=X/postgres,service_role=X/postgres,anon=X/postgres,authenticated=X/postgres}`.

The exact signatures, owner/security/search path, raw and expanded ACLs, and `pg_get_functiondef` text plus MD5 are captured in [stage1b-live-rpc-catalog-evidence.json](./stage1b-live-rpc-catalog-evidence.json). The full 18-row caller, authorization, proposed-grant, and definition-parity matrix is [stage1b-rpc-reconciliation.json](./stage1b-rpc-reconciliation.json).

The live `has_role`, `is_founder_or_admin`, and `worker_has_active_window` definitions differ from the frozen September 23 review snapshot. Stage 1B intentionally hardens the first two with null-safe caller-ID checks; its `worker_has_active_window` definition matches the live body. The matrix records each full live-definition hash and candidate migration body hash.

The live migration-history query returned zero versions `>= 20260923000000`; Stage 1B and the September 23 Worker 2/3 migrations are not present in live history. The current live catalog is the pre-Stage-1B baseline. No SQL was applied to production.

The Stage 1B migration’s pre-change gate now matches all 18 exact live signatures. Its proposed post-change grants retain anon access for the eight token/capability RPCs and `has_role(uuid, app_role)` because 288 live RLS policies target `PUBLIC` and call that helper. The nine other internal/status helpers lose anon EXECUTE. The planned post-change state is nine anon grants, 17 authenticated grants, zero direct PUBLIC grants, and all 18 existing service-role grants preserved.

The read-only collection query is [stage1b-live-catalog-evidence.sql](../../scripts/stage1b-live-catalog-evidence.sql). It emits:

- all current public function signatures, owners, languages, ACLs and expanded grantors/grant options;
- SECURITY DEFINER and configured settings/search paths;
- effective EXECUTE availability for `anon`, `authenticated`, and `service_role`, plus direct `PUBLIC` ACL grants;
- exact current definitions and hashes for the catalog, the anon-callable application functions, and all candidate migration targets;
- global and public-schema future-function defaults;
- the exact matching migration-history rows without assuming a specific history-table column layout.

The classifier now verifies the exact 18-signature live pre-change set against the migration gate and the 18-row evidence matrix. The SQL drift checker is the post-Stage-1B check: its intended anon surface is nine functions (eight public token/capability RPCs plus `has_role` for `PUBLIC` RLS policies). Against the unapplied live baseline it will correctly report pre-migration exposure until the candidate is applied in an authorized environment.

## Function review

The frozen registry explicitly classifies all 386 functions. Current class counts are:

| Classification | Count |
|---|---:|
| PUBLIC_ANON | 8 |
| AUTHENTICATED_USER | 0 |
| FOUNDER_ADMIN_ONLY | 31 |
| SERVICE_ROLE_INTERNAL | 29 |
| WEBHOOK_SYSTEM | 4 |
| DB_INTERNAL | 283 |
| DEAD_OR_LEGACY | 31 |
| UNKNOWN_REQUIRES_REVIEW | 0 |

The frozen review still accounts for 386 public functions (211 SECURITY DEFINER). The authoritative live catalog now reconciles all 18 anon application signatures against repository callers and function bodies. The migration checks the frozen 386-function set and requires its exact 18-signature pre-change gate to match live before snapshot or DDL; the checked-in gate matches the captured live set.

The earlier source review found these authorization issues and local body fixes remain in the candidate migration:

- `apollo_credit_status()` used `current_user` in a SECURITY DEFINER authorization check. It now uses the request identity and founder/admin role checks.
- Thirty service-role guards used nullable `auth.role() <> 'service_role'` comparisons. They now use null-safe comparisons.
- `has_role`, `is_founder_or_admin`, and `worker_has_active_window` bind supplied identity IDs to the authenticated caller (while retaining the backend path).
- The two outbound status RPCs require founder/admin or trusted backend access.
- `is_kill_switch_active()` is not granted directly to application roles; its nested database call remains.
- The two-argument `check_outreach_allowed(uuid, uuid)` overload remains service-role-only. Its named parameters do not match the repository calls to the one-argument overload, and no repository caller is inferred for it.

The eight `PUBLIC_ANON` endpoints have been checked against their exact live definitions: proposal accept/view, customer report/survey shares, demo event capture, and supplier token routes. The matrix records the bearer-token checks and the reason each retains anon EXECUTE; direct `PUBLIC EXECUTE` remains revoked.

## Import authorization and CRM relationship model

`outreach-import-leads` now requires a valid bearer JWT, verifies the user through Supabase Auth, checks that the user has a founder/admin role, and resolves the submitted exact `business_name` to a server-owned `businesses` row before it performs service-role writes. Missing, invalid, unauthorized, unresolvable, or unavailable identity/business scope fails closed. Imports are capped at 5,000 rows per request.

The current repository has a global founder/admin role model and no user-to-business membership table. Under that existing model, founder/admin operators may select any existing portfolio business; ordinary authenticated clients and client-role users cannot use this function as a service-role cross-business proxy. Any narrower operator-to-business permission model needs a canonical membership source before it can be enforced.

Existing contacts are treated as duplicates only when they already have a `business_contact_relationships` row for the selected business. A person already in global `contacts` can therefore be attached to another business without duplicating the person.

`upsert_contact` retains its RPC parameter names for compatibility, but treats `_assigned_business` only as a requested BCR target. It validates that name against `businesses`, inserts/updates the global person row without writing `contacts.assigned_business`, then creates an idempotent `business_contact_relationships` row with `business_id` and canonical `business_name`. Existing BCR state is not overwritten. Non-null `_assigned_inbox_id` fails closed because the canonical BCR model currently has no corresponding relationship-scoped inbox field.

## ACL and rollback plan

The draft's schema-wide function revoke/grant and default-privilege statements have been removed. The revised candidate:

1. checks the exact frozen catalog count/signature set and current owners;
2. stops unless the live anon application EXECUTE set exactly equals the reviewed 18-signature target;
3. records exact pre-change definitions, owners, raw ACLs, expanded ACL grantors/grant options in their original ACL-array order, security settings, and effective `anon`, `authenticated`, and `service_role` EXECUTE plus direct `PUBLIC` EXECUTE state in a non-exposed `stage1b_private` snapshot; it refuses to proceed if any affected ACL is raw `NULL`, has a non-owner grantor, or cannot be reconstructed in exact order;
4. changes ACLs one function at a time from that captured object list, leaving managed `supabase_admin` routines untouched and restoring service-role access only where it existed before;
5. records exact post-change body/ACL fingerprints so rollback refuses to overwrite later changes.

The [rollback script](./stage1b-rpc-rollback.sql) reads only that runtime snapshot. Before it restores anything, it checks all affected functions against the recorded post-state. A mismatch aborts the transaction. It restores function definitions and owners, then replays direct ACL entries in captured original array order with their grantors and grant options. It verifies exact definitions, owners, SECURITY DEFINER, search_path settings, expanded ACL entries including ordinals, raw ACL text, and prior effective anon/authenticated/service_role plus direct PUBLIC EXECUTE. The live rollback preflight passed for all 241 postgres-owned public functions: zero NULL raw ACLs, zero non-owner grantors, owner EXECUTE at ordinal 1, zero duplicate grantee/grantor entries, zero non-EXECUTE entries, and zero grant options.

The `rebuild_full_manual()` workflow seed no longer deletes or reseeds `lead_to_payment` rows. It inserts only missing `(workflow_id, step_index)` steps, preserving existing row IDs, values, extra rows, and workflow capability.

The migration no longer changes future-function default ACLs. The global/default privilege state and eight `supabase_admin` managed defaults remain unresolved; the catalog capture query collects them. This is a remaining Stage 1 closeout blocker, separate from the unchanged Stage 1A table-privilege baseline.

## Verification state

Rebuild checkpoint results on `recovery/worker1-rebuild-20260928`:

- Stage 1A security perimeter: **19 passed**.
- Stage 1B RPC authorization and migration guards: **14 passed**.
- Outreach import authorization: **6 passed**.
- Social relationship contract, including selecting the defining migration: **46 passed**.
- Stage 1B classifier/static guard: **PASS**; all **18/18** expected anonymous application RPC signatures match the authoritative live catalog evidence, with **0 unresolved**. Proposed grants are nine anon, 17 authenticated, zero direct PUBLIC, and all 18 prior service-role paths preserved.

The full Vitest, TypeScript, production build, JWT-off, destructive SQL, and diff-check results for this rebuild are recorded in the attached commit manifest. The migration remains unapplied; no SQL was run against production. Definition and caller details are in the [18-row reconciliation matrix](./stage1b-rpc-reconciliation.json) and [live catalog evidence](./stage1b-live-rpc-catalog-evidence.json). Rollback remains transaction-guarded and catalog-preflight verified; runtime rollback has not been exercised because the migration is unapplied.
