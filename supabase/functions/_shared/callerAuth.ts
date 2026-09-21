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
 * Founder or admin only. Rejects anonymous callers and ordinary authenticated
 * users with 401/403 before any privileged client exists.
 */
export async function requireFounderOrAdmin(
  req: Request,
  headers = callerCorsHeaders,
): Promise<CallerResult> {
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
  const admin = adminClient();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return { error: authJson({ ok: false, error: "forbidden" }, 403, headers) };
  }
  return { admin, user_id: u.user.id, trigger_source: "founder" };
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
