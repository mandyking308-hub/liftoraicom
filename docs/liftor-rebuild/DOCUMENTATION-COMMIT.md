# Documentation commit record

This file separates the **source** being documented from the **commit** that carries the documentation.

| Field | Value |
|---|---|
| `source_freeze_sha` | `cf1c1373f3affdd66c17a53b97200ac06c3a878f` |
| Parity at freeze | Lovable HEAD and GitHub `main` independently rechecked and matched at that SHA |
| Runtime-source proof | `git diff cf1c1373f3affdd66c17a53b97200ac06c3a878f -- src supabase apps .github` returns **empty** at the documentation commit — no runtime file changed |
| `documentation_commit` | the head commit of the documentation-only closeout that adds/updates this folder. Its hash is reported in the audit closeout message and is the current parity HEAD; it is not embedded in the generated files, because no commit can contain its own hash |
| Allowed change scope | `docs/**`, `scripts/generate-rebuild-manual-catalogs.mjs`, `scripts/check-rebuild-manual-consistency.mjs`, manual source modules under `src/lib/*ManualContent*.ts` / `manualArchitectureSync2026.ts`, `roadmap.md` |
| Verification | `node scripts/check-rebuild-manual-consistency.mjs` — checks freeze-stamp consistency across every generated file, route/page/edge-function/migration/manifest coverage, founder-route coverage completeness, stale-claim scan and docs-only diff scope |

Every generated file in this folder carries the line `source_freeze_sha: cf1c1373f3affdd66c17a53b97200ac06c3a878f`. If a generated file carries a different SHA, the folder is mid-regeneration and must not be quoted.
