# Stage 1A — post-change privilege evidence

Migration: `supabase/migrations/20260923085046_stage1_application_privilege_hardening.sql`

The migration was applied to the connected Liftor database on 2026-09-23. It only revoked `TRUNCATE`, `TRIGGER`, `REFERENCES`, and `MAINTAIN` from `anon` and `authenticated` on public relations and removed those four privileges from `postgres`'s future public-table defaults. No data, RLS policy, owner, service-role grant, provider, gate, or external system was changed.

## Final database counts

| Measure | Count |
|---|---:|
| Public base tables | 1,112 |
| Public views | 26 |
| Public materialized views | 0 |
| Public relations total | 1,138 |
| RLS-enabled tables | 1,112 |
| RLS-disabled tables | 0 |
| `anon` effective TRUNCATE | 0 |
| `authenticated` effective TRUNCATE | 0 |
| `anon` effective TRIGGER | 0 |
| `authenticated` effective TRIGGER | 0 |
| `anon` effective REFERENCES | 0 |
| `authenticated` effective REFERENCES | 0 |
| `anon` effective MAINTAIN | 0 |
| `authenticated` effective MAINTAIN | 0 |

Views do not have table RLS; the 26 views are therefore not counted as RLS-disabled tables. The effective privilege query covered all 1,138 public relations.

## Preserved access

`has_table_privilege` after the migration returned the same CRUD counts as the frozen pre-change evidence:

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| `anon` | 1,132 | 1,132 | 1,132 | 1,132 |
| `authenticated` | 1,137 | 1,137 | 1,137 | 1,137 |

`service_role` retained all four dangerous privileges and all CRUD privileges on all 1,138 public relations. Its permissions were not changed.

There are no remaining direct dangerous ACL entries for `anon`, `authenticated`, or `PUBLIC` on public relations. Role membership was not changed; the effective checks therefore cover direct ACLs, PUBLIC, and inherited membership paths.

## Future defaults and managed boundary

- `postgres` public-table defaults no longer grant any of the four dangerous privileges to `anon` or `authenticated`.
- `supabase_admin` still has its Supabase-managed public-table default containing those privileges. This is recorded as a platform residual, not an application-controlled default.
- Current public relations owned by `supabase_admin`: **0**.
- Current public relations owned by `postgres`: **1,138**.
- No current public relation receives a dangerous effective table privilege from the dormant `supabase_admin` default.

The exact post-change default ACL and effective checks are reproducible with `scripts/stage1a-corrected-privilege-audit.sql`. Drift protection is in `scripts/check-stage1-privilege-drift.sql`.

## Adjacent permission surfaces

The public schema has `USAGE` for `anon`, `authenticated`, and `PUBLIC`, but no effective or direct `CREATE` grant for application roles or `PUBLIC`.

The read-only routine audit found a separate systemic RPC exposure that prevents final Stage 1 closure:

| Routine surface | Count |
|---|---:|
| Public functions | 386 |
| `anon` effective EXECUTE | 375 |
| `authenticated` effective EXECUTE | 378 |
| SECURITY DEFINER functions | 211 |
| SECURITY DEFINER + apparent mutating/DDL body, `anon` executable | 99 |
| SECURITY DEFINER + apparent mutating/DDL body, `authenticated` executable | 100 |
| Any apparent mutating/DDL body, `anon` executable | 105 |
| Any apparent mutating/DDL body, `authenticated` executable | 108 |

This pass did not revoke routine execution. The scope is systemic and requires a separate function-by-function authorization review. Per the Stage 1A stop condition, remaining Stage 1 blockers were not widened into this turn.

## Rollback procedure (not executed)

1. Confirm the dependency and obtain approval to roll back.
2. Use the frozen per-relation ACL evidence in `docs/liftor-rebuild/stage1a-prechange-acl-inventory.jsonl` to generate only the pre-change `GRANT` statements for `anon` and `authenticated`; do not use a blanket grant, because six relations did not have the same pre-change effective state for `anon` and one did not for `authenticated`.
3. Restore the pre-change `postgres` table default with:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLES TO anon, authenticated;
```

4. Re-run the frozen inventory query and compare every relation, grantor, privilege, grantability flag, and effective check before considering rollback complete.

No rollback was executed.

## Stage result

`STAGE 1 PARTIAL` — the application-controlled table privilege remediation is proven, but systemic public mutating/SECURITY DEFINER RPC execution exposure remains unreviewed. No Stage 2 work was started.
