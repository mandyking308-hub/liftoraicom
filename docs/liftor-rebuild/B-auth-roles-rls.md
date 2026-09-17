# Section B — Authentication, roles, route guards, tenancy and RLS

## B1. Authentication

Supabase Auth, email/password. `src/contexts/AuthContext.tsx` is the only auth source of truth in the frontend: it subscribes to `supabase.auth.onAuthStateChange` first, then calls `getSession()`, and exposes `{ user, session, loading, signOut }` through `useAuth()`. Nothing else reads the session directly.

The Supabase client is `src/integrations/supabase/client.ts` (auto-generated, never hand-edited) with `src/integrations/supabase/previewAuthStorage.ts` for preview session storage.

## B2. Roles

Roles live in `public.user_roles` (`user_id`, `role app_role`) — never on a profile or user row. `app_role` includes at least `founder`, `admin`, `partner`, plus portal/worker roles resolved through `profiles.role` for worker surfaces.

Server-side checks use the security-definer function `public._is_founder_or_admin` and related `has_role`-style helpers so RLS policies never recurse into `user_roles`.

Primary founder/admin account: `mandyking308@gmail.com`.

## B3. Route guards (frontend)

| Guard | File | Rule | Redirect on failure |
|---|---|---|---|
| `FounderRoute` | `src/components/founder/FounderRoute.tsx` | queries `user_roles` for `role = 'founder'` | no user → `/portal/login`; non-founder → `/portal/dashboard` |
| `ProtectedRoute` | `src/components/portal/ProtectedRoute.tsx` | any authenticated user | `/portal/login` |
| `PartnerRoute` | `src/components/partner/PartnerRoute.tsx` | `role in ('partner','founder')` | `/portal/login` or `/portal/dashboard` |
| `SupplierRoute` | `src/components/supplier/SupplierRoute.tsx` | session + supplier role record | `/supplier/login` |
| `WorkerRoute` | `src/components/worker/WorkerRoute.tsx` | worker profile role, routed to the matching portal by `portalForRole()` | role-specific login path |

Route counts at this commit: 800 `FounderRoute`, 15 `ProtectedRoute`, 7 `PartnerRoute`, 46 public, 6 redirects (see Section C).

**Guards are UX, not security.** Any browser can call PostgREST directly. Real enforcement is RLS (B5) and the edge-function guards (B4).

## B4. Edge-function authorisation

`supabase/functions/_shared/socialAuth.ts` exports `requireFounder(req)`, used across the founder-operated functions:

1. Requires an `Authorization: Bearer …` header → else `401 auth_missing`.
2. Validates the JWT with an anon-key client → else `401 auth_invalid`.
3. Loads the caller's `user_roles` with a service-role client; requires `founder` or `admin` → else `403 forbidden`.
4. On success returns `{ admin, user }`, so the handler's privileged work runs under the service role only after the role check.

The same module exports `corsHeaders` and the `json()` responder used by most functions.

16 functions run with `verify_jwt = false` in `supabase/config.toml` because they are webhook/public-token surfaces; each one must (and in the audited code does) apply its own secret/HMAC/token check or fail closed. Full list and posture: Section H and Section O.

## B5. RLS model

- 1,112 public tables. **1,109 have RLS enabled; 3 do not.**
- 1,520 policies. 1 RLS-enabled table has no policy at all (`inbox_credentials` — deny-by-default, which is intentional for a credentials table since only the service role should reach it).
- Typical pattern: founder/admin full access via `_is_founder_or_admin(auth.uid())`; tenant-scoped tables additionally filter by `business_id` or `user_id`; service role always granted for edge-function access; `anon` granted only on genuinely public surfaces (public proposal/demo/survey token views).

### B5.1 Current RLS findings (not fixed — recorded)

| Table | Finding | Risk |
|---|---|---|
| `billionaire_institution_links` | RLS off, 0 policies | wealth-relationship data on private individuals readable by anyone with the anon key |
| `philanthropic_institutions` | RLS off, 0 policies | institution and principal contact data publicly readable |
| `billionaire_enrichment_batches` | RLS off, 0 policies | internal enrichment batch metadata publicly readable |

These are the three critical findings shown by the security scanner. They are **not** part of the sending or provider path, so they do not block outbound work, but they are a live data-protection exposure. Remediation is a separate approved change: enable RLS and add founder/admin-only policies plus correct GRANTs.

## B6. Tenancy / business scoping

Liftor is a single-tenant founder platform that manages many *businesses*. `public.businesses` (14 rows today) is the scoping spine; most operational tables carry `business_id`. Portals (client, partner, supplier, worker) are scoped by role plus the linking tables for that portal.

Cross-business leakage is guarded by `src/lib/crossBusinessIntegrityEngine.ts` and `contextGuardEngine.ts`, plus the context/cross-contamination tables (`business_context_envelopes`, `business_context_validation_events`).
