# Liftor GitHub CI lockfile fix — 16 Nov 2026

Base HEAD: 3fddf876d7713124ac2fa7b10001d236cb7fa36b
Failing run: https://github.com/mandyking308-hub/liftoraicom/actions/runs/43903266621 (job 133425242187) — `npm ci` EUSAGE: lockfile missing `@lovable.dev/vite-plugin-dev-server-bridge@1.3.3` and `@lovable.dev/vite-plugin-hmr-gate@1.8.3`.

## Change
- `package-lock.json` only: regenerated with `npm install --package-lock-only --ignore-scripts`.
- Diff: +32 lines, exactly two added entries (the two dev-only plugins). 0 existing package versions changed, 0 removed.
- No changes to workflow, package.json, vite config, app code, database, providers or email gates.

## Local verification (fresh copy without node_modules, Node v20.20.2 / npm 10.8.2 = CI's node-version 20)
| Step (same as workflow) | Result |
|---|---|
| npm ci --no-audit --no-fund | PASS (638 packages) |
| npx tsc --noEmit -p tsconfig.app.json | PASS |
| targeted safety tests (winnrPostPurchase, gsmSenderEstate) | PASS |
| npx vitest run | PASS 1110 passed / 20 skipped (96 files + 2 opt-in DB skipped) |
| npm run build | PASS |

## GitHub CI
UNVERIFIED at time of writing: the sandbox cannot push or read GitHub Actions. The platform pushes this commit after the turn; the new run conclusion must be checked on the repository Actions tab.
