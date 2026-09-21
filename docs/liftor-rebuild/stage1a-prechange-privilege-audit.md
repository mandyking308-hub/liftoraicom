# Stage 1A — Step 1: pre-change privilege audit (evidence only)

Captured: 2026-09-21 (see `captured_at` in the inventory summary)
Repository HEAD at capture: `4c0abaa3be03eafc3e1ddc545f2cbd1a46a21b31`
Scope: **read-only**. No migration, no schema/data write, no provider call, no gate change.

## Artifacts

| File | Contents |
|---|---|
| `scripts/stage1a-freeze-acl.sql` | Reproducible read-only query that regenerates every field below |
| `docs/liftor-rebuild/stage1a-prechange-acl-inventory.jsonl` | Line 1 = summary object; lines 2–1139 = one record per public relation (owner, raw `relacl`, direct ACL entries for PUBLIC/anon/authenticated/service_role with grantor, privilege, grantability and source, plus effective-privilege booleans) |
| `docs/liftor-rebuild/stage1a-prechange-acl-inventory.json` | Compact summary only (counts, owners, default ACLs, role memberships, effective totals) |

## Live object counts (public schema)

| Object type | Count |
|---|---|
| Base tables | 1,112 |
| Views | 26 |
| Materialized views | 0 |
| Total relations recorded | 1,138 |

Matches the expected 1,112 / 26 / 0.

## Ownership

All 1,138 public relations are owned by **`postgres`**. No other owner exists in the public schema.

## Effective privileges (has_table_privilege, per relation)

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | TRIGGER | REFERENCES |
|---|---|---|---|---|---|---|---|
| `anon` | 1,132 | 1,132 | 1,132 | 1,132 | 1,132 | 1,132 | 1,132 |
| `authenticated` | 1,137 | 1,137 | 1,137 | 1,137 | 1,137 | 1,137 | 1,137 |
| `service_role` | 1,138 | 1,138 | 1,138 | 1,138 | 1,138 | 1,138 | 1,138 |

1,137 relations expose TRUNCATE / TRIGGER / REFERENCES / UPDATE / DELETE to `anon` or `authenticated`. RLS still constrains row visibility on base tables, but TRUNCATE and TRIGGER are **not** constrained by RLS — this is the dangerous-privilege surface Stage 1A exists to remove.

## Default ACLs (`pg_default_acl`)

Two role/schema defaults grant the dangerous privileges on **future** public tables:

| Default owner role | Schema | Objtype | ACL |
|---|---|---|---|
| `postgres` | `public` | table (`r`) | `postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres, sandbox_exec=ar/postgres` |
| `supabase_admin` | `public` | table (`r`) | `postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin` |

(`arwdDxtm` = INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN.) Equivalent sequence (`S`) and function (`f`) defaults exist for both roles. Full raw and expanded rows are in the inventory summary under `default_acls`.

## Role context

- `current_user` / `session_user` in the read-only audit connection used to capture this evidence: `sandbox_exec` (the restricted read role).
- The migration execution context runs as **`postgres`**, which owns every public relation and can therefore alter its own default ACL and revoke on existing objects.
- `pg_has_role('postgres','supabase_admin','MEMBER')` = **false**. `postgres` is a member of `supabase_privileged_role`, `pg_read_all_data`, `pg_monitor`, `pg_signal_backend`, `pg_create_subscription`, `sandbox_exec`, `anon`, `authenticated`, `service_role`, `authenticator` — but **not** `supabase_admin`.

## Blocker recorded (not fixed in this step)

**Future-default blocker.** The `supabase_admin`-owned `ALTER DEFAULT PRIVILEGES ... IN SCHEMA public` entry cannot be altered from the migration context, because `ALTER DEFAULT PRIVILEGES` may only be issued by the role that owns the default (or a member of it), and `postgres` is not a member of `supabase_admin`.

Consequences to handle explicitly in the Stage 1A migration step:

1. The migration can revoke dangerous privileges on all **existing** public relations, and can change the `postgres`-owned public default.
2. It **cannot** remove the `supabase_admin` public-table default. Any future table created by `supabase_admin` (or via managed tooling running as that role) will again grant `arwdDxtm` to `anon` and `authenticated`.
3. Therefore Stage 1A must be paired with a standing **drift check** (a recurring read-only assertion that no public relation grants TRUNCATE/TRIGGER/REFERENCES to `anon`/`authenticated`) rather than relying on defaults alone.

No remediation, migration, or write of any kind was performed in this step.

## Confirmation

Zero schema writes, zero data writes, zero migrations created or edited, zero provider calls, zero transmissions, zero gate changes. Only the three evidence files listed above were added.
