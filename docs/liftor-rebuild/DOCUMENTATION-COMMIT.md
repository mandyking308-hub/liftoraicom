# Documentation commit record

This file separates the **source** being documented from the **commit** that carries the documentation.

## Current — 13 October 2026

| Field | Value |
|---|---|
| `source_freeze_sha` | `662f42827f40a253c7b99b954de2aba4fff69f43` (real commit; Lovable HEAD at regeneration) |
| Runtime-source proof | `git diff 662f42827f40a253c7b99b954de2aba4fff69f43 -- src supabase apps .github` is empty apart from manual-content modules at the documentation commit |
| `documentation_commit` | the commit that carries this regeneration; reported in the closeout message, not embedded (a commit cannot contain its own hash) |
| Generated files | C, D, E, G, H, V, W, source-coverage-manifest.json/.md, validation-report.json — all stamped `662f42827f40a253c7b99b954de2aba4fff69f43` |
| Archive | `history/2026-09-17-freeze-cf1c1373/` — immutable copy of the 17 Sep generated files |
| Verification | `node scripts/check-rebuild-manual-consistency.mjs` → 12/12 on 13 Oct 2026 |
| Generator change | file list now includes not-yet-committed, non-ignored files so docs added in the same docs-only commit are mapped; no check was weakened |

## HISTORICAL — 17 September 2026

| Field | Value |
|---|---|
| `source_freeze_sha` | `cf1c1373f3affdd66c17a53b97200ac06c3a878f` |
| Parity at freeze | Lovable HEAD and GitHub `main` matched at that SHA |
| Allowed change scope | `docs/**`, `scripts/generate-rebuild-manual-catalogs.mjs`, `scripts/check-rebuild-manual-consistency.mjs`, `src/lib/*ManualContent*.ts` / `manualArchitectureSync2026.ts`, `roadmap.md` |
