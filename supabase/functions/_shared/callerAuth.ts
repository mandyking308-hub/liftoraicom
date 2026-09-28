/**
 * Stage 1 — canonical caller authorization for external-capable and
 * state-claiming Edge Functions.
 *
 * Rules enforced here:
 *  - The service-role client is NEVER created before the caller is authorised.
 *  - Founder/admin is the default posture for anything that can send, mutate
 *    external state, or mark externally meaningful state.
 *  - Machine callers (cron/scheduler) must present an explicit shared secret.
 *
 * This helper performs no provider call and sends nothing.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const callerCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const authJson = (body: unknown, status = 200, headers = callerCorsHeaders) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

export type CallerOk = {
  admin: SupabaseClient;
  user_id: string | null;
  trigger_source: "founder" | "cron";
};
export type CallerResult = CallerOk | { error: Response };

export type FounderAdminAuthorization = {
  user_id: string;
  trigger_source: "founder";
  /** Construct only after the caller has bound the request to an authorised business. */
  createAdminClient: () => SupabaseClient;
};
export type FounderAdminAuthorizationResult = FounderAdminAuthorization | { error: Response };

export function isCallerError(r: CallerResult): r is { error: Response } {
  return (r as { error?: Response }).error instanceof Response;
}

function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/**
 * Validates a founder/admin JWT and role without constructing a service-role
 * client. Business-scoped handlers can bind their request context first.
 */
export async function authorizeFounderOrAdmin(
  req: Request,
  headers = callerCorsHeaders,
): Promise<FounderAdminAuthorizationResult> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return { error: authJson({ ok: false, error: "auth_missing" }, 401, headers) };
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
  );
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) {
    return { error: authJson({ ok: false, error: "auth_invalid" }, 401, headers) };
  }
  // user_roles has an RLS policy allowing a caller to read only their own
  // roles. Check authorization through the caller-scoped client so no
  // service-role client exists until both JWT and founder/admin status pass.
  const { data: roles, error: rolesError } = await userClient.from("user_roles").select("role").eq("user_id", u.user.id);
  if (rolesError) {
    return { error: authJson({ ok: false, error: "caller_role_lookup_failed" }, 503, headers) };
  }
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return { error: authJson({ ok: false, error: "forbidden" }, 403, headers) };
  }
  return {
    user_id: u.user.id,
    trigger_source: "founder",
    createAdminClient: adminClient,
  };
}

/** Founder/admin only; for handlers that do not need a business preflight. */
export async function requireFounderOrAdmin(
  req: Request,
  headers = callerCorsHeaders,
): Promise<CallerResult> {
  const authorization = await authorizeFounderOrAdmin(req, headers);
  if ("error" in authorization) return authorization;
  return {
    admin: authorization.createAdminClient(),
    user_id: authorization.user_id,
    trigger_source: authorization.trigger_source,
  };
}

/**
 * Founder/admin JWT OR a valid `x-cron-secret` matching CRON_SECRET.
 * Fail-closed: if no secret is configured, the secret path is unavailable and
 * only a founder/admin JWT is accepted.
 */
export async function requireFounderOrCron(
  req: Request,
  headers = callerCorsHeaders,
): Promise<CallerResult> {
  const expected = (Deno.env.get("CRON_SECRET") ?? "").trim();
  const provided = (req.headers.get("x-cron-secret") ?? "").trim();
  if (expected && provided && provided === expected) {
    return { admin: adminClient(), user_id: null, trigger_source: "cron" };
  }
  if (provided && !expected) {
    return { error: authJson({ ok: false, error: "cron_secret_not_configured" }, 401, headers) };
  }
  return requireFounderOrAdmin(req, headers);
}
