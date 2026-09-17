# Section U — Standalone applications (Giving Rail platform)

`apps/giving-platform` is a **separate application**, not a Liftor founder surface. It has its own `package.json`, Vite config, tsconfig, Supabase client and migrations. Liftor core does not import it and it does not use Liftor's router, auth context or Supabase client.

Keep three things distinct:

| Thing | What it is | Status |
|---|---|---|
| **Liftor core** | the founder operating system in `src/**` | `BUILT_IN_CODE` / `LIVE_CONFIGURED` |
| **GHAT giving rail (Liftor-side)** | founder SME sales-linked giving surfaces inside Liftor core, documented in Section K7 | `BUILT_IN_CODE` |
| **Giving Rail platform (this section)** | the standalone multi-tenant public product in `apps/giving-platform` | `BUILT_IN_CODE`, **not deployed** |

## U1. Source-tree divergence at this audit

The stated audit boundary `f565c09876a5cfe0207dc31981ad026073508a55` ("Add Giving Rail production backend and controlled workflows") is **ahead of** this workspace's HEAD `e5fe720e5b5e4add8cbd81863a00291357f48437`; HEAD is an ancestor of it.

The entire delta — 19 files, +2,568 / −400 — is confined to `apps/giving-platform/`. **Liftor core (`src/**`, `supabase/functions/**`, `supabase/migrations/**`, workflows, configs) is byte-identical between the two commits.** Sections A–T therefore describe the audit commit accurately. This section documents the delta, read directly from history rather than from the working tree, and every claim here is labelled accordingly.

Delta files: `.env.example`, `BRAND.md`, `LAUNCH_CHECKLIST.md`, `README.md`, `index.html`, `package.json`, `public/favicon.svg`, `public/manifest.webmanifest`, `public/og-card.svg`, `src/App.tsx`, `src/lib/platformApi.ts`, `src/lib/supabase.ts`, `src/styles.css`, `supabase/README.md`, `supabase/functions/gr-public-intake/index.ts`, and three migrations.

## U2. Data model (`gr_` prefix)

18 tables: `gr_profiles`, `gr_organizations`, `gr_organization_members`, `gr_business_profiles`, `gr_charity_profiles`, `gr_verification_checks`, `gr_projects`, `gr_project_follows`, `gr_campaigns`, `gr_campaign_approvals`, `gr_campaign_events`, `gr_payment_records`, `gr_volunteer_opportunities`, `gr_volunteer_profiles`, `gr_volunteer_applications`, `gr_pilot_leads`, `gr_complaints`, `gr_audit_log` — plus a rate-limit table from the intake migration.

13 enums: `gr_org_kind`, `gr_org_status`, `gr_member_role`, `gr_verification_status`, `gr_payment_status`, `gr_project_status`, `gr_campaign_status`, `gr_giving_basis`, `gr_approval_status`, `gr_volunteer_status`, `gr_application_status`, `gr_payment_record_status`, `gr_complaint_status`.

All 18 tables `enable row level security` in-migration, and the two schema migrations carry GRANT blocks (6 and 5 statements respectively).

## U3. Functions / RPCs

| Migration | Functions |
|---|---|
| `20260917190000_giving_rail_core.sql` | `gr_set_updated_at`, `gr_is_org_member`, `gr_has_org_role` (security-definer membership checks used by RLS) |
| `20260917190500_giving_rail_workflows.sql` | `gr_handle_new_user`, `gr_create_organization`, `gr_campaign_bootstrap`, `gr_submit_campaign`, `gr_decide_campaign`, `gr_start_campaign`, `gr_submit_reconciliation`, `gr_record_payment_and_settle`, `gr_guard_campaign_client_status` |
| `20260917191000_giving_rail_public_intake.sql` | `gr_take_rate_limit`, `gr_prune_rate_limits` |

Campaign state machine: `draft → submitted → under_review → approved → live → reconciliation_due → settled → closed`, with `suspended` / `declined` branches. `gr_guard_campaign_client_status` prevents a client from moving its own campaign into a privileged state — status transitions belong to the RPCs, not to client updates.

## U4. Edge function — `gr-public-intake`

| Property | Value |
|---|---|
| Auth model | **public** (unauthenticated by design — a marketing intake form) |
| Method | `POST` only; `OPTIONS` for CORS; 405 otherwise |
| Env vars | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (names only; returns 503 if absent) |
| Abuse controls | honeypot field `website_confirm` (silent 200); IP+user-agent SHA-256 rate key via `gr_take_rate_limit`, **8 requests / 900 s**, 429 on exceed; fields trimmed and length-capped; email regex + 254-char cap |
| Writes | `gr_pilot_leads` (service role) |
| Provider/network calls | none |
| Failure mode | `FAIL_CLOSED` — a rate-limit RPC error returns 503 and writes nothing |
| Capability | internal write only; sends no email, charges nothing |
| Idempotency | none beyond rate limiting — `UNKNOWN — NOT VERIFIED` whether duplicate submissions are deduped downstream |

## U5. Frontend

`src/App.tsx` (rewritten in the delta), `src/lib/supabase.ts` (own client, `VITE_*` publishable keys per `.env.example`), `src/lib/platformApi.ts` (typed RPC/table wrappers), `src/styles.css`, plus PWA manifest, favicon and OG card. `BRAND.md` and `LAUNCH_CHECKLIST.md` are product documents, not Liftor manuals.

## U6. Live status — the important part

Read-only query against the Liftor production database at audit time:

```sql
select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'gr\_%';
-- 0
```

**Zero `gr_*` tables exist.** Therefore:

| Claim | Label |
|---|---|
| Giving Rail schema, workflows and RLS written | `BUILT_IN_CODE` |
| Giving Rail schema applied to a database | `UNKNOWN — NOT VERIFIED` for any other project; **not present** in the Liftor project |
| `gr-public-intake` deployed | `UNKNOWN — NOT VERIFIED` (not in Liftor's `supabase/functions/`, so not deployed to the Liftor project) |
| Any real pilot lead, campaign, payment or volunteer record | none — `BLOCKED` on deployment |
| End-to-end proof | `END_TO_END_PROVED`: **no** |

The migrations live under `apps/giving-platform/supabase/migrations/`, outside Liftor's migration directory, so Liftor's migration pipeline will never apply them. Deploying this platform is a separate, deliberate act against a separate Supabase project — not a Liftor change.
