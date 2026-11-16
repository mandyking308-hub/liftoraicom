# Liftor GitHub quality gate — Node runtime and typecheck memory (16 Nov 2026)

## Failure (reported)
Run https://github.com/mandyking308-hub/liftoraicom/actions/runs/43940553875, job 133556613942, SHA `c315713b`:
`npm ci` passed, but Node v20.20.2 is below `>=22` required by current `@supabase/*` packages, and
`npx tsc --noEmit -p tsconfig.app.json` hit V8's default heap limit (fatal, exit 134). Not a TS diagnostic.

## Config inspection
- `tsconfig.app.json` `include: ["src"]`, `skipLibCheck: true`; no node_modules/dist/generated scan.
- `tsc --extendedDiagnostics`: 2,640 files (src + referenced lib `.d.ts`), **Memory used 2,158,606K (~2.16 GB)** — just above the ~2 GB default heap, which explains the OOM. No typecheck weakening needed.

## Change (workflow only: `.github/workflows/frontend-build.yml`)
- `node-version: "22.12.0"` (pinned, satisfies `>=22`).
- Job env `NODE_OPTIONS: --max-old-space-size=5120` (ubuntu-latest has 16 GB RAM).
- `timeout-minutes` 20 → 30 (typecheck alone ~150 s locally). All steps unchanged; nothing skipped.

## Local CI-like proof (clean copy, no node_modules, Node 22, CI=true, same NODE_OPTIONS)
| Step | Result |
|---|---|
| `npm ci --no-audit --no-fund` | PASS, 638 packages, 0 EBADENGINE |
| `npx tsc --noEmit -p tsconfig.app.json` | PASS, 0 errors, 151 s, ~2.16 GB |
| Winnr/GSM safety tests | PASS 53/53 |
| Full Vitest | PASS 1,110 passed / 20 skipped (opt-in DB) |
| `npm run build` | PASS |

Note: sandbox Node was 22.23.5, not exactly 22.12.0.

## GitHub CI
UNVERIFIED — this sandbox cannot push or read/trigger Actions. The run starts when the platform pushes this commit (workflow file is in `paths`). Confirm on the Actions tab.

No deployments, sends, DB writes, customer data access or gate/integration changes.
