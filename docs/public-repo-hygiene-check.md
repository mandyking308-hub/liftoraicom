# Public Repo Hygiene Check

Date: 2026-06-17
Scope: Pre-private-flip cleanup. No product/founder feature changes.

## A. Overall status
**PASS**

## B. Actions taken
1. **Removed committed `.env`** from the repository. Runtime values remain in Lovable Cloud / Supabase settings — only the committed copy is gone.
2. **`.env.example`** rewritten with empty placeholders only:
   ```
   VITE_SUPABASE_PROJECT_ID=
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```
3. **`.gitignore`** verified — already ignores `.env` and `.env.*` (keeps `.env.example`). No change needed.
4. **`public/robots.txt`** belt-and-braces additions under `User-agent: *`:
   ```
   Disallow: /founder/
   Disallow: /portal-admin/
   Disallow: /portal/
   ```
   Auth gates remain the real security boundary; robots.txt is hint-only.
5. **README.md** replaced with neutral wording. No mention of buyer warm-up, M&A, exit, command centre, healthcare overlay, operating brain, data room, or business factory.

## C. FounderRoute clarification
`src/components/founder/FounderRoute.tsx` allows role `founder` only. Left unchanged — founder-only route gate is intentional. Database RLS via `_is_founder_or_admin()` may still grant founder/admin where appropriate; the two layers are independent by design.

## D. Verification
- `.env` no longer present in the repo (`ls .env` → not found).
- `.env.example` exists with placeholders only, no secret values.
- No service role keys, SMTP creds, webhook secrets, or private API keys grep in source — all live in Lovable Cloud secret store and are read via `Deno.env.get(...)` in edge functions only.
- `public/sitemap.xml` lists public marketing + legal routes only — no `/founder/*`, `/portal/*`, `/portal-admin/*`.
- `src/components/layout/Navbar.tsx` and `Footer.tsx` contain no `/founder` links.
- TypeScript build pipeline unaffected (no source files changed except README/docs/robots/.env.example).

## E. Remaining notes
- After flipping the repo to private, the robots.txt `Disallow` lines become moot but harmless.
- Branch protection on `main` still needs manual setup in the GitHub UI (see `docs/PRIVATE_MODE_READINESS.md` §5).
- Recommend a fresh founder snapshot via `/founder/recovery` before the private flip.

## F. Plain-English answer
**Yes — the repo is clean enough to keep public briefly while Mandy finishes review, before making it private.** The committed `.env` is gone, only placeholders remain in `.env.example`, robots.txt now discourages crawlers from internal paths, the README reveals nothing about internal modules, and no private secrets are committed. Founder/admin routes remain protected by auth and RLS regardless of repo visibility.
