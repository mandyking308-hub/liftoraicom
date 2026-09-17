# Section A — Repository, build and deployment architecture

## A1. Stack

Single-page React application plus a Supabase backend. There is no custom server.

| Layer | Technology |
|---|---|
| UI framework | React 18.3 + TypeScript 5 |
| Build tool | Vite 5 (`@vitejs/plugin-react-swc`), dev server on port 8080, HMR overlay disabled |
| Styling | Tailwind CSS v3 + `tailwindcss-animate`, design tokens in `src/index.css`, config in `tailwind.config.ts` |
| Component library | shadcn/ui on Radix primitives (`src/components/ui/**`, vendored) |
| Routing | `react-router-dom` v6, all routes registered in `src/App.tsx` |
| Server state | `@tanstack/react-query` v5 |
| Forms | `react-hook-form` + `zod` via `@hookform/resolvers` |
| Charts / PDF / CSV | `recharts`, `jspdf` + `jspdf-autotable`, `papaparse` |
| Motion | `framer-motion` |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions on Deno) |
| Client SDK | `@supabase/supabase-js` ^2.99 |
| Tests | Vitest + Testing Library + Playwright fixture (`playwright.config.ts`, `playwright-fixture.ts`) |

Path alias: `@/*` → `./src/*` (`vite.config.ts` and `tsconfig.json`).

## A2. Commands

| Purpose | Command |
|---|---|
| Dev server | `npm run dev` (Vite, port 8080) |
| Production build | `npm run build` |
| Development-mode build | `npm run build:dev` |
| Lint | `npm run lint` |
| Tests (full) | `npm test` → `vitest run` |
| Tests (watch) | `npm run test:watch` |
| Typecheck | `tsgo --noEmit -p tsconfig.app.json` (or `tsc --noEmit`) |
| Regenerate manual catalogs | `node scripts/generate-rebuild-manual-catalogs.mjs` |

## A3. Folder map

```text
src/
  App.tsx                 876 routes, all providers, the single router
  main.tsx                React root + runtimeEnvCheck import
  index.css               design tokens (dark navy / electric blue)
  pages/                  945 page files — public site, portals, 800 founder surfaces
  components/             419 components; components/ui/** = vendored shadcn primitives
  lib/                    177 deterministic engines, registries, manual sources
  lib/businessManuals/    per-business manual sources rendered in-app
  hooks/, contexts/       AuthContext and UI hooks
  services/               AI usage logging + governor tests
  data/                   large static registries (Montvelle suppliers, portfolio coverage)
  integrations/supabase/  auto-generated client + types — never hand-edited
  test/                   vitest setup
supabase/
  functions/              620 edge functions + _shared/ (52 helper modules)
  migrations/             442 SQL migrations, filename-ordered
  config.toml             per-function verify_jwt settings (auto-managed)
docs/                     normative specs + dated historical evidence + business manuals
docs/liftor-rebuild/      this manual
data/                     exported research snapshots (JSONL/JSON)
scripts/                  validation + manual-generation scripts
.github/workflows/        5 CI workflows
apps/giving-platform/     standalone prototype sub-app (Section A6)
```

## A4. Environment variables

Frontend (`.env`, auto-managed, committed values are publishable only):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
`src/lib/runtimeEnvCheck.ts` runs at boot and fails loudly if they are missing.

Backend secret **names** used by edge functions (values never appear in source, logs or responses):

```text
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
APOLLO_API_KEY, APOLLO_ENCRYPTION_KEY, APOLLO_ENC_KEY, APOLLO_KEY_ENC,
SMARTLEAD_API_KEY, SMARTLEAD_WEBHOOK_SECRET, WINNR_API_TOKEN,
INBOX_CREDENTIALS_KEY, OUTREACH_WEBHOOK_SECRET,
GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, PR_GMAIL_ACCOUNT,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
LOVABLE_API_KEY, OPENAI_API_KEY,
SOCIAL_DISPATCH_SECRET, SOCIAL_RELATIONSHIP_WEBHOOK_SECRET,
SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET, UNIPILE_WEBHOOK_HMAC_SECRET,
CRON_SECRET, PUBLIC_BASE_URL
```

Feature-flag environment switches (all default-off behaviour when unset — see Section J):
`AUTO_SEND_ENABLED`, `CRON_ENABLED`, `SMARTLEAD_LEAD_PUSH_ENABLED`, `SMARTLEAD_AI_INTAKE_APPLY_ENABLED`, `AI_AGENT_TASK_QUEUE_ENABLED`, `AI_DRAFT_SAVE_ENABLED`, `CRM_INTERACTION_CAPTURE_ENABLED`, `CRM_REPAIR_APPLY_ENABLED`, `COMMERCIAL_HANDOFF_APPLY_ENABLED`, `REVENUE_OPERATIONS_APPLY_ENABLED`, `FOUNDER_APPROVAL_RECORDING_ENABLED`, `SOCIAL_DISPATCH_CRON_REGISTERED`.

## A5. Deployment

- Frontend: built by Vite and published to `liftorai.com` / `www.liftorai.com` (custom domain) and the Lovable preview/published URLs.
- Backend: one Supabase project serves both preview and production. There is no separate staging database — this is a material risk, recorded in Section R.
- Edge functions deploy individually; `supabase/config.toml` carries per-function `verify_jwt` settings.
- Migrations are applied through the migration tool and mirrored in `.github/workflows/deploy-supabase-migrations.yml`.

## A6. `apps/giving-platform`

A standalone Vite prototype for the global giving platform, added one commit after the freeze point. It has its own `package.json`, `vite.config.ts` and `tsconfig.json`, is not imported by the main app, and does not share the main router or Supabase client. It is a prototype, not a live product surface. CI coverage: `.github/workflows/giving-platform-quality.yml`.

The related **SME sales-linked giving rail MVP** (the freeze commit itself) is a founder surface inside the main app — see Section K7 and `docs/ghat-sme-sales-linked-giving-rail-mvp.md`.
