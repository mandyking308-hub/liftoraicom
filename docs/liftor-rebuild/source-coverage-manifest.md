# Source Coverage Manifest

_Generated from commit `e5fe720e5b5e4add8cbd81863a00291357f48437` by `scripts/generate-rebuild-manual-catalogs.mjs`. Regenerate with `node scripts/generate-rebuild-manual-catalogs.mjs`._

Every file tracked by git at this commit is accounted for below. Machine-readable twin: `source-coverage-manifest.json`.

**Total tracked files: 2957.**

| Category | Files | % |
|---|---|---|
| documented | 2714 | 91.8% |
| doc | 95 | 3.2% |
| static-asset | 68 | 2.3% |
| supporting | 63 | 2.1% |
| excluded | 17 | 0.6% |

Category meanings: **documented** = described in the named manual section or catalog row; **supporting** = covered collectively by a subsystem section (vendored UI primitives, auto-generated clients, static assets); **static-asset** = generated/exported data covered by the data-assets appendix; **doc** = documentation file classified as normative or historical in the doc index; **excluded** = intentionally outside the current-state manual (agent/workspace metadata, not runtime).

## Coverage by directory

| Directory | Files | Mapped sections |
|---|---|---|
| `src/pages` | 947 | Technical Manual D — Page/surface catalog |
| `supabase/functions` | 673 | Technical Manual H2 — Shared edge helpers; Technical Manual H — Edge function catalog |
| `supabase/migrations` | 442 | Technical Manual G — Migration map |
| `src/components` | 422 | Technical Manual E1 — Component catalog; Technical Manual A/E — shadcn/ui primitives (vendored design-system files) |
| `src/lib` | 177 | Technical Manual P — Tests & CI; Technical Manual E2 — Engine/helper catalog; Technical Manual A/T — Manual source modules |
| `src/data` | 47 | Technical Manual K / data-assets appendix |
| `docs/liftor-rebuild` | 25 | This rebuild manual |
| `src/services` | 18 | Technical Manual P — Tests & CI; Technical Manual L — AI architecture |
| `.lovable/memory` | 16 | Project memory / plan files — not part of the runtime |
| `docs/business-manuals` | 12 | Business Manuals (separate canonical layer) |
| `apps/giving-platform` | 9 | Technical Manual A — standalone sub-app (giving platform prototype) |
| `.github/workflows` | 5 | Technical Manual P — CI workflows |
| `src/hooks` | 3 | Technical Manual E3 — Hooks & contexts |
| `src/integrations` | 3 | Technical Manual B — Supabase client (auto-generated, never edited) |
| `src/test` | 2 | Technical Manual P — Tests & CI |
| `.env` | 1 | Technical Manual A — repository root configuration |
| `.env.example` | 1 | Technical Manual A — repository root configuration |
| `.gitignore` | 1 | Technical Manual A — repository root configuration |
| `.lovable/plan.md` | 1 | Project memory / plan files — not part of the runtime |
| `README.md` | 1 | Technical Manual A — repository root configuration |
| `bun.lock` | 1 | Technical Manual A — repository root configuration |
| `bun.lockb` | 1 | Technical Manual A — repository root configuration |
| `components.json` | 1 | Technical Manual A — repository root configuration |
| `data/global-education-buyers-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-buyers-dukes-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-buyers-gems-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-buyers-globeducate-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-buyers-gulf-batch-2-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-buyers-isp-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-buyers-premium-batch-3-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-buyers-sabis-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-buyers-taaleem-uae-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-launch-queue-2026-08-22.json` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-next-enrichment-queue-2026-08-22.json` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-program-status-2026-08-22.json` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-program-status-2026-08-24.json` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/global-education-research-entity-exclusions-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/montvelle-advisory-program-status-2026-08-24.json` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/montvelle-advisory-public-routes-batch-01-2026-08-24.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/montvelle-advisory-public-routes-batch-02-2026-08-24.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/montvelle-advisory-public-routes-batch-3-2026-08-24.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/philanthropy-network-contacts-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/philanthropy-network-registry-2026-08-22.jsonl` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `data/wealth-intelligence-completion-2026-08-22.json` | 1 | Technical Manual K / data-assets appendix — exported research snapshots |
| `docs/AI_COMPLIANCE_CONTROL_LAYER.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/GITHUB_LOVABLE_EXECUTION_MODEL.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/PRIVATE_MODE_READINESS.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/apollo-education-infrastructure-build-spec-2026-09-10.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/apollo-education-universe-recovery-2026-08-24.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-production-reconciliation-complete-2026-08-24.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-001-2026-top100.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-001-compliance-overrides-2026-08-23.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-002-2026-ranks-101-200.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-003-2026-ranks-201-300.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-004-2026-ranks-301-400.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-005-2026-ranks-401-500.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-006-2026-rows-501-600.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-007-2026-rows-601-700.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-008-2026-rows-701-800.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-009-2026-rows-801-900.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-010-2026-rows-901-1000.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-011-2026-rows-1001-1100.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-012-2026-rows-1101-1200.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-013-2026-rows-1201-1300.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-014-2026-rows-1301-1400.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-015-2026-rows-1401-1500.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-016-2026-rows-1501-1600.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-016-corrections-2026-08-24.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-017-2026-rows-1601-1700.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-018-2026-rows-1701-1800.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-019-2026-rows-1801-1900.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-020-2026-rows-1901-2000.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-021-2026-rows-2001-2100.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-022-2026-rows-2101-2200.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-023-2026-rows-2201-2300.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-024-2026-rows-2301-2400.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-025-2026-rows-2401-2500.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-026-2026-rows-2501-2600.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-027-2026-rows-2601-2700.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-028-2026-rows-2701-2800.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-029-2026-rows-2801-2900.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-030-2026-rows-2901-3000.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-031-2026-rows-3001-3100.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-032-2026-rows-3101-3200.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-033-2026-rows-3201-3300.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-034-2026-rows-3301-3400.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-batch-035-2026-rows-3401-3428.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-access-verification-source-sweep-complete-2026-08-24.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/billionaire-intelligence-completion.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/business-function-coverage-audit.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/daily-driver-polish-pass-2-handoffs.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/data-asset-register.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/education-crm-native-correction-2026-09-10.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/education-data-reconciliation-plan-2026-09-10.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/elyntor-liftor-handoff.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/founder-led-buyer-market-domination-engine.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/founder-led-buyer-warm-up-engine.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/founder-led-exit-sales-engine.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/ghat-sme-sales-linked-giving-rail-mvp.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/global-pr-radar-controlled-live-test-report.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/global-pr-radar-qa-report.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/global-pr-radar.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/gsm-outbound-infrastructure.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/healthcare-overlay-pack.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-business-setup-tunnel-report.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-business-setup-tunnel-wiring-correction-report.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-final-founder-readiness-test.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-first-run-founder-setup-report.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-founder-user-guide.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-master-site-lifecycle-map.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-operational-web-connector-correction.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-operational-web-integration-test.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-pre-live-cleanup-report.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/liftor-sales-target-revenue-pace-engine.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/manual-architecture-reconciliation-2026-08-25.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/manual-architecture-reconciliation-2026-09-10.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/montvelle-1000-supplier-coverage.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/montvelle-concierge-routing.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/montvelle-professional-advisory-network-outreach.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/montvelle-supplier-batch-100-01.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/montvelle-supplier-batch-100-02.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/montvelle-supplier-batch-100-03.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/montvelle-supplier-network.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/next-gen-wealth-networks.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/operating-loops-closure-pack.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/portfolio-crm-architecture-2026-08-23.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/portfolio-crm-next-migration.sql.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/portfolio-crm-schema-notes.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/public-front-preservation-check.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/public-repo-hygiene-check.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/searchable-video-library-founder-review.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/searchable-video-library-qa.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/searchable-video-library.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/smartlead-import-idempotency-migration.sql.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/social-distribution-buffer-live.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/social-distribution-fabric.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/social-distribution-production-qa.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/social-relationship-engine.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `docs/social-viral-opportunity-radar.md` | 1 | Technical Manual R/T — normative or historical doc (see doc index) |
| `eslint.config.js` | 1 | Technical Manual A — repository root configuration |
| `index.html` | 1 | Technical Manual A — repository root configuration |
| `package-lock.json` | 1 | Technical Manual A — repository root configuration |
| `package.json` | 1 | Technical Manual A — repository root configuration |
| `playwright-fixture.ts` | 1 | Technical Manual A — repository root configuration |
| `playwright.config.ts` | 1 | Technical Manual A — repository root configuration |
| `postcss.config.js` | 1 | Technical Manual A — repository root configuration |
| `public/favicon.ico` | 1 | Technical Manual A — static public assets |
| `public/favicon.png` | 1 | Technical Manual A — static public assets |
| `public/favicon.svg` | 1 | Technical Manual A — static public assets |
| `public/llms.txt` | 1 | Technical Manual A — static public assets |
| `public/placeholder.svg` | 1 | Technical Manual A — static public assets |
| `public/robots.txt` | 1 | Technical Manual A — static public assets |
| `public/sitemap.xml` | 1 | Technical Manual A — static public assets |
| `roadmap.md` | 1 | Technical Manual A — repository root configuration |
| `scripts/export-wealth-intelligence.sql` | 1 | Technical Manual P/S — repository scripts |
| `scripts/generate-rebuild-manual-catalogs.mjs` | 1 | Technical Manual P/S — repository scripts |
| `scripts/validate-billionaire-access-research.mjs` | 1 | Technical Manual P/S — repository scripts |
| `scripts/validate-billionaire-reconciliation-migrations.mjs` | 1 | Technical Manual P/S — repository scripts |
| `src/App.css` | 1 | Technical Manual A — Application shell/assets |
| `src/App.tsx` | 1 | Technical Manual C — Route catalog |
| `src/contexts` | 1 | Technical Manual E3 — Hooks & contexts |
| `src/index.css` | 1 | Technical Manual A — Application shell/assets |
| `src/main.tsx` | 1 | Technical Manual A — Application shell/assets |
| `src/vite-env.d.ts` | 1 | Technical Manual A — Application shell/assets |
| `supabase/config.toml` | 1 | Technical Manual A — Supabase project config |
| `tailwind.config.ts` | 1 | Technical Manual A — repository root configuration |
| `tsconfig.app.json` | 1 | Technical Manual A — repository root configuration |
| `tsconfig.json` | 1 | Technical Manual A — repository root configuration |
| `tsconfig.node.json` | 1 | Technical Manual A — repository root configuration |
| `vite.config.ts` | 1 | Technical Manual A — repository root configuration |
| `vitest.config.ts` | 1 | Technical Manual A — repository root configuration |

## Unmapped files

None — every tracked file resolves to a manual section.
