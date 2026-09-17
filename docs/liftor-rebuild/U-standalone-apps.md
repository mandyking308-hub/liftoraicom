# Section U — Standalone applications (Giving Rail platform)

`apps/giving-platform` is a **separate application**, not a Liftor founder surface. It has its own `package.json`, Vite config, tsconfig, Supabase client, migrations, edge function and CI workflow. Liftor core does not import it; it does not use Liftor's router, auth context or Supabase client, and it is not part of Liftor's build, test or deployment pipeline.

Keep three things distinct:

| Thing | What it is | Status |
|---|---|---|
| **Liftor core** | the founder operating system in `src/**` | `BUILT_IN_CODE` / `LIVE_CONFIGURED` |
| **GHAT giving rail (Liftor-side)** | founder SME sales-linked giving surfaces inside Liftor core, documented in Section K7; GHAT is a charity counterparty, not this product | `BUILT_IN_CODE` |
| **Giving Rail platform (this section)** | the standalone multi-tenant public product in `apps/giving-platform` | `BUILT_IN_CODE`, **not deployed** |

## U1. Source boundary for this section

Every file described here is present in the working tree at the documented commit (see `00-index.md` for the exact SHA and parity statement). Earlier revisions of this section read part of the delta from git history; that is no longer necessary.

Tracked files (23):

```
.github/workflows/giving-platform-quality.yml
apps/giving-platform/.env.example
apps/giving-platform/BRAND.md
apps/giving-platform/LAUNCH_CHECKLIST.md
apps/giving-platform/README.md
apps/giving-platform/index.html
apps/giving-platform/package.json
apps/giving-platform/tsconfig.json
apps/giving-platform/vite.config.ts
apps/giving-platform/public/favicon.svg
apps/giving-platform/public/manifest.webmanifest
apps/giving-platform/public/og-card.svg
apps/giving-platform/src/App.tsx
apps/giving-platform/src/main.tsx
apps/giving-platform/src/styles.css
apps/giving-platform/src/vite-env.d.ts
apps/giving-platform/src/lib/platformApi.ts
apps/giving-platform/src/lib/supabase.ts
apps/giving-platform/supabase/README.md
apps/giving-platform/supabase/functions/gr-public-intake/index.ts
apps/giving-platform/supabase/migrations/20260917190000_giving_rail_core.sql
apps/giving-platform/supabase/migrations/20260917190500_giving_rail_workflows.sql
apps/giving-platform/supabase/migrations/20260917191000_giving_rail_public_intake.sql
```

All 23 appear in `source-coverage-manifest.md` mapped to this section.

## U2. Data model (`gr_` prefix) — schema written, nowhere applied

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

It lives outside `supabase/functions/`, so Liftor's deploy pipeline never touches it.

## U5. Frontend and persistence

Single-page React 18 + Vite 5 app: `index.html` → `src/main.tsx` → `src/App.tsx` (hash routing, e.g. `#/workspace`), `src/styles.css`, PWA manifest, favicon, OG card. `BRAND.md` and `LAUNCH_CHECKLIST.md` are product documents, not Liftor manuals.

Persistence today, verified in source:

| Path | Behaviour |
|---|---|
| `src/lib/supabase.ts` | creates a Supabase client **only if** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are both set; otherwise `supabase` is `null` and `backendConfigured` is `false`. `requireSupabase()` throws "Giving Rail production backend is not configured in this environment." |
| `src/lib/platformApi.ts` | typed wrappers over magic-link auth and the `gr_*` RPCs/tables; every call goes through `requireSupabase()`, so all of it throws when unconfigured |
| `src/App.tsx` | a `store` helper reading/writing `localStorage` (try/catch, comment: "Browser storage is convenience only") for in-browser draft/journey state |

Net effect: **as shipped in this repository the product has no configured backend.** `.env.example` carries placeholder values only, no real project URL or key is committed, so a default checkout runs as a **local-browser prototype** — content renders, drafts persist in `localStorage`, and any backend-backed action fails closed with the not-configured error. There is **no production database, no deployed edge function, no payment rail and no provider integration** of any kind (no Stripe, no email sender, no accounting connection). Money movement is modelled as records (`gr_payment_records`, `gr_record_payment_and_settle`) and reconciled by a human — nothing charges a card.

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
| Giving Rail schema applied to a database | not present in the Liftor project; `UNKNOWN — NOT VERIFIED` for any other project |
| `gr-public-intake` deployed | not in Liftor's `supabase/functions/`, so not deployed to the Liftor project; elsewhere `UNKNOWN — NOT VERIFIED` |
| Public site hosted at a domain | `UNKNOWN — NOT VERIFIED` — no deployment configuration in this repository |
| Any real pilot lead, campaign, payment or volunteer record | none — `BLOCKED` on deployment |
| End-to-end proof | `END_TO_END_PROVED`: **no** |

## U7. CI — `.github/workflows/giving-platform-quality.yml`

Named "Giving Platform Quality Gate". Triggers on `pull_request` and on `push` to `main`, both path-filtered to `apps/giving-platform/**` and the workflow file itself. `permissions: contents: read`. One `build` job on `ubuntu-latest` with `working-directory: apps/giving-platform`: checkout → Node 20 → `npm install --no-audit --no-fund` → `npm run build` (`tsc -b && vite build`).

What it proves: the standalone app typechecks and builds. What it does **not** prove: no tests, no lint, no migration validation, no deployment, no runtime or security verification. It does not run Liftor core's suite, and Liftor's own workflows ignore `apps/**`.

## U8. Production gates — what must happen before this is real

None of these has been done. Each is a separate, deliberate, approved act, not a side effect of a Liftor change:

1. Create a **separate Supabase project** for the Giving Rail. Do not apply `gr_*` migrations to the Liftor project.
2. Apply the three migrations in filename order and verify RLS and GRANTs on all 18 tables against the live schema.
3. Deploy `gr-public-intake` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in that project (names only — never committed).
4. Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for the frontend build and choose a host/domain.
5. Decide and implement the payment/settlement rail — there is none. Until then `gr_payment_records` is a human-reconciled ledger, and no public copy may imply automated collection or transfer of donor money.
6. Legal/compliance review of charity-facing and donor-facing claims, plus the charity verification workflow (`gr_verification_checks`), before any public launch.
7. Only then a first controlled pilot, with founder approval, as with every other Liftor external-capability launch.

Until all of the above, the correct statement is: **the Giving Rail platform is built in code, runs as a local-browser prototype, and is not live.**
